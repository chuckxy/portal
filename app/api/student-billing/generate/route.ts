import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import Person from '@/models/Person';
import SiteClass from '@/models/SiteClass';
import FeesConfiguration from '@/models/FeesConfiguration';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * POST /api/student-billing/generate
 * Generate billing records for multiple students based on class and fee configuration
 */
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const data = await request.json();
        console.log(data);
        // Get createdBy from request body
        const createdBy = data.createdBy;

        if (!createdBy) {
            return NextResponse.json({ error: 'createdBy field is required in request body' }, { status: 400 });
        }

        // Validate required fields
        const requiredFields = ['schoolSiteId', 'academicYear', 'academicTerm'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return NextResponse.json({ error: `${field} is required` }, { status: 400 });
            }
        }

        // Get classes to generate billing for
        let classIds: string[] = [];

        if (data.classIds && data.classIds.length > 0) {
            classIds = data.classIds;
        } else if (data.departmentId) {
            // Get all classes in department
            const classes = await SiteClass.find({
                site: data.schoolSiteId,
                department: data.departmentId,
                isActive: true
            })
                .select('_id')
                .lean();
            classIds = classes.map((c: any) => c._id.toString());
        } else {
            // Get all active classes for the site
            const classes = await SiteClass.find({
                site: data.schoolSiteId,
                isActive: true
            })
                .select('_id')
                .lean();
            classIds = classes.map((c: any) => c._id.toString());
        }

        if (classIds.length === 0) {
            return NextResponse.json({ error: 'No classes found to generate billing for' }, { status: 400 });
        }

        const results = {
            generated: 0,
            skipped: 0,
            errors: [] as { studentId: string; studentName?: string; classId?: string; error: string }[],
            details: [] as any[],
            classesProcessed: [] as any[]
        };

        // Process each class
        for (const classId of classIds) {
            // Get fee configuration for this class
            const feeConfig = await FeesConfiguration.findOne({
                site: data.schoolSiteId,
                class: classId,
                academicYear: data.academicYear,
                academicTerm: data.academicTerm,
                isActive: true
            }).lean();

            if (!feeConfig) {
                // Log classes without fee configuration for diagnostic purposes
                const classInfo = await SiteClass.findById(classId).select('className').lean();
                results.classesProcessed.push({
                    classId,
                    className: (classInfo as any)?.className || 'Unknown',
                    status: 'skipped',
                    reason: 'No fee configuration found'
                });
                continue;
            }

            // Get students in this class by their currentClass reference
            // Include schoolSite filter to ensure only students from the correct site are included
            const students = await Person.find({
                personCategory: 'student',
                isActive: true,
                schoolSite: data.schoolSiteId,
                'studentInfo.currentClass': classId
            } as any)
                .select('_id firstName lastName studentInfo school schoolSite')
                .lean();

            console.log(`Found ${students.length} students in class ${classId}`);

            // Track generation stats for this class
            let classGenerated = 0;
            let classSkipped = 0;

            // Generate billing for each student
            for (const student of students) {
                try {
                    // Check if billing already exists
                    const existingBilling = await StudentBilling.findOne({
                        student: student._id,
                        schoolSite: data.schoolSiteId,
                        academicYear: data.academicYear,
                        academicTerm: data.academicTerm
                    });

                    if (existingBilling) {
                        results.skipped++;
                        classSkipped++;
                        continue;
                    }

                    // Get balance brought forward from previous period or student record
                    let balanceBroughtForward = 0;

                    // First check for previous billing record
                    const previousBilling = await StudentBilling.findOne({
                        student: student._id,
                        schoolSite: data.schoolSiteId,
                        isCurrent: true
                    }).sort({ academicYear: -1, academicTerm: -1 });

                    if (previousBilling && previousBilling.currentBalance > 0) {
                        balanceBroughtForward = previousBilling.currentBalance;
                        // Mark previous as not current
                        await StudentBilling.findByIdAndUpdate(previousBilling._id, { isCurrent: false });
                    } else if ((student as any).studentInfo?.balanceBroughtForward > 0) {
                        // Use balance from student record (initial onboarding balance)
                        balanceBroughtForward = (student as any).studentInfo.balanceBroughtForward;
                    }

                    // Create fee breakdown
                    const feeBreakdown = feeConfig.feeItems.map((item: any) => ({
                        determinant: item.determinant,
                        description: item.description,
                        amount: item.amount
                    }));

                    // Create billing record
                    const billing = new StudentBilling({
                        student: student._id,
                        school: (student as any).school,
                        schoolSite: data.schoolSiteId,
                        academicYear: data.academicYear,
                        academicPeriodType: 'term',
                        academicTerm: data.academicTerm,
                        class: classId,
                        balanceBroughtForward,
                        termOrSemesterBill: feeConfig.totalAmount,
                        feeBreakdown,
                        feeConfigurationId: feeConfig._id,
                        paymentDueDate: feeConfig.paymentDeadline,
                        currency: feeConfig.currency || 'GHS',
                        createdBy,
                        carriedForwardFrom: previousBilling?._id,
                        auditTrail: [
                            {
                                action: 'created',
                                performedBy: createdBy,
                                performedAt: new Date(),
                                details: `Billing record auto-generated for ${data.academicYear} Term ${data.academicTerm}`
                            }
                        ]
                    });

                    await billing.save();

                    // Update previous billing's carriedForwardTo
                    if (previousBilling) {
                        await StudentBilling.findByIdAndUpdate(previousBilling._id, {
                            carriedForwardTo: billing._id
                        });
                    }

                    results.generated++;
                    classGenerated++;
                    results.details.push({
                        studentId: student._id,
                        studentName: `${(student as any).firstName} ${(student as any).lastName}`,
                        billingId: billing._id,
                        classId: classId,
                        totalBilled: billing.totalBilled
                    });
                } catch (error: any) {
                    results.errors.push({
                        studentId: (student._id as any).toString(),
                        studentName: `${(student as any).firstName} ${(student as any).lastName}`,
                        classId: classId,
                        error: error.message
                    });
                }
            }

            // Track class processing results
            const classInfo = await SiteClass.findById(classId).select('className').lean();
            results.classesProcessed.push({
                classId,
                className: (classInfo as any)?.className || 'Unknown',
                studentsFound: students.length,
                billsGenerated: classGenerated,
                billsSkipped: classSkipped,
                errors: results.errors.filter((e) => e.classId === classId).length,
                status: 'processed'
            });
        }

        return NextResponse.json(
            {
                success: true,
                message: `Generated ${results.generated} billing records, skipped ${results.skipped} existing${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`,
                results
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error generating billing records:', error);
        return NextResponse.json({ error: 'Failed to generate billing records', details: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'system',
    actionType: 'bulk_operation',
    entityType: 'billing',
    descriptionGenerator: (req, res) => {
        const count = res?.results?.generated || 0;
        return `Bulk generated ${count} billing records`;
    }
});
