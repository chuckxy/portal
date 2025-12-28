import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';
import FeesConfiguration from '@/models/FeesConfiguration';
import FeesPayment from '@/models/FeesPayment';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Generate current academic year based on current date
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-indexed (0 = January, 11 = December)
        const currentYear = now.getFullYear();
        const currentAcademicYear =
            currentMonth >= 8 // September or later
                ? `${currentYear}/${currentYear + 1}`
                : `${currentYear - 1}/${currentYear}`;

        const { searchParams } = new URL(request.url);

        const site = searchParams.get('site');
        const classId = searchParams.get('class');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const minBalance = searchParams.get('minBalance');
        const search = searchParams.get('search');

        // Build query for students - only get active students with a current class
        const studentQuery: any = {
            personCategory: 'student',
            isActive: true,
            'studentInfo.currentClass': { $exists: true, $ne: null }
        };

        if (search) {
            studentQuery.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { 'studentInfo.studentId': { $regex: search, $options: 'i' } }];
        }

        // Get all students
        const students = await Person.find(studentQuery)
            .populate({
                path: 'studentInfo.currentClass',
                populate: { path: 'site' }
            })
            .populate('studentInfo.guardian')
            .lean();

        const debtors = [];

        for (const student of students) {
            if (!student.studentInfo?.currentClass) continue;

            const currentClass = student.studentInfo.currentClass as any;
            const studentSite = currentClass.site?._id || currentClass.site;

            // Apply filters
            if (site && studentSite?.toString() !== site) continue;
            if (classId && currentClass._id?.toString() !== classId) continue;

            // Build fee configuration query - start with required fields
            const feeConfigQuery: any = {
                site: studentSite,
                class: currentClass._id,
                isActive: true
            };

            // Determine academic year to use
            const effectiveAcademicYear = academicYear || student.studentInfo.defaultAcademicYear || currentAcademicYear;
            feeConfigQuery.academicYear = effectiveAcademicYear;

            // Only add term to query if explicitly provided or student has default
            if (academicTerm) {
                feeConfigQuery.academicTerm = parseInt(academicTerm);
            } else if (student.studentInfo.defaultAcademicTerm) {
                feeConfigQuery.academicTerm = student.studentInfo.defaultAcademicTerm;
            }
            // If neither is provided, find any fee config for the year (don't filter by term)

            // Get fee configuration for this student's class
            const feeConfig = await FeesConfiguration.findOne(feeConfigQuery).populate('site').lean();

            if (!feeConfig) {
                // Try without term filter if we had one
                if (feeConfigQuery.academicTerm) {
                    delete feeConfigQuery.academicTerm;
                    const feeConfigAnyTerm = await FeesConfiguration.findOne(feeConfigQuery).populate('site').lean();
                    if (!feeConfigAnyTerm) {
                        console.log(`No fee config found for student ${student._id}, class ${currentClass._id}, year ${effectiveAcademicYear}`);
                        continue;
                    }
                    // Use the found config
                    Object.assign(feeConfig as any, feeConfigAnyTerm);
                } else {
                    console.log(`No fee config found for student ${student._id}, class ${currentClass._id}, year ${effectiveAcademicYear}`);
                    continue;
                }
            }

            // Get all payments for this student - match the fee config context
            const paymentQuery: any = {
                student: student._id,
                class: currentClass._id,
                site: studentSite,
                status: { $ne: 'failed' },
                academicYear: effectiveAcademicYear
            };

            // Only filter by term if fee config has a term
            if (feeConfig.academicTerm) {
                paymentQuery.academicTerm = feeConfig.academicTerm;
            }

            const payments = await FeesPayment.find(paymentQuery).sort({ datePaid: -1 }).lean();

            const totalFeesPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
            const outstandingBalance = feeConfig.totalAmount - totalFeesPaid;

            // Only include students with outstanding balance > 0
            if (outstandingBalance <= 0) {
                console.log(`Student ${student._id} has no outstanding balance (${outstandingBalance})`);
                continue;
            }

            // Apply minimum balance filter
            if (minBalance && outstandingBalance < parseFloat(minBalance)) continue;

            const percentagePaid = feeConfig.totalAmount > 0 ? (totalFeesPaid / feeConfig.totalAmount) * 100 : 0;

            // Calculate days overdue if deadline exists
            let daysOverdue = 0;
            if (feeConfig.paymentDeadline) {
                const deadline = new Date(feeConfig.paymentDeadline);
                const today = new Date();
                const diffTime = today.getTime() - deadline.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    daysOverdue = diffDays;
                }
            }

            const lastPayment = payments[0]; // Already sorted by date descending

            debtors.push({
                _id: student._id,
                studentId: student.studentInfo.studentId || 'N/A',
                firstName: student.firstName,
                lastName: student.lastName,
                otherNames: student.otherNames,
                profilePicture: student.profilePicture,
                contact: student.contact,
                studentInfo: {
                    guardian: student.studentInfo.guardian,
                    currentClass: currentClass,
                    accountBalance: student.studentInfo.accountBalance
                },
                site: feeConfig.site,
                class: currentClass,
                academicYear: effectiveAcademicYear,
                academicTerm: feeConfig.academicTerm,
                totalFeesRequired: feeConfig.totalAmount,
                totalFeesPaid: totalFeesPaid,
                outstandingBalance: outstandingBalance,
                percentagePaid: parseFloat(percentagePaid.toFixed(2)),
                paymentDeadline: feeConfig.paymentDeadline,
                daysOverdue: daysOverdue,
                lastPaymentDate: lastPayment?.datePaid,
                lastPaymentAmount: lastPayment?.amountPaid,
                paymentCount: payments.length,
                feeConfiguration: {
                    _id: feeConfig._id,
                    configName: feeConfig.configName,
                    feeItems: feeConfig.feeItems
                },
                payments: payments.map((p) => ({
                    _id: p._id,
                    amountPaid: p.amountPaid,
                    datePaid: p.datePaid,
                    paymentMethod: p.paymentMethod,
                    receiptNumber: p.receiptNumber
                }))
            });
        }

        // Sort by outstanding balance (highest first)
        debtors.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

        console.log('Total debtors found:', debtors.length);

        return NextResponse.json({
            success: true,
            debtors,
            count: debtors.length
        });
    } catch (error) {
        console.error('Error fetching student debtors:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch student debtors'
            },
            { status: 500 }
        );
    }
}
