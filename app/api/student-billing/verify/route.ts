import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import Person from '@/models/Person';
import SiteClass from '@/models/SiteClass';

/**
 * GET /api/student-billing/verify
 * Verify billing coverage - find students without billing records for a given period
 * This is a diagnostic endpoint to help identify missing bills
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const schoolSiteId = searchParams.get('schoolSiteId');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const classId = searchParams.get('classId');

        if (!schoolSiteId || !academicYear || !academicTerm) {
            return NextResponse.json({ error: 'schoolSiteId, academicYear, and academicTerm are required' }, { status: 400 });
        }

        // Build query for students
        const studentQuery: any = {
            personCategory: 'student',
            isActive: true,
            schoolSite: schoolSiteId
        };

        if (classId) {
            studentQuery['studentInfo.currentClass'] = classId;
        }

        // Get all active students
        const allStudents = await Person.find(studentQuery).select('_id firstName lastName studentInfo').populate('studentInfo.currentClass', 'className').lean();

        // Get all students with billing for this period
        const billingQuery: any = {
            schoolSite: schoolSiteId,
            academicYear: academicYear,
            academicTerm: parseInt(academicTerm)
        };

        if (classId) {
            billingQuery.class = classId;
        }

        const studentsWithBilling = await StudentBilling.find(billingQuery).select('student').lean();

        const studentIdsWithBilling = new Set(studentsWithBilling.map((b: any) => b.student.toString()));

        // Find students without billing
        const studentsWithoutBilling = allStudents.filter((student: any) => !studentIdsWithBilling.has(student._id.toString()));

        // Group by class
        const byClass: Record<string, any[]> = {};
        studentsWithoutBilling.forEach((student: any) => {
            const className = student.studentInfo?.currentClass?.className || 'No Class Assigned';
            const classIdStr = student.studentInfo?.currentClass?._id?.toString() || 'none';

            if (!byClass[classIdStr]) {
                byClass[classIdStr] = [];
            }

            byClass[classIdStr].push({
                _id: student._id,
                name: `${student.firstName} ${student.lastName}`,
                studentId: student.studentInfo?.studentId,
                className: className,
                classId: student.studentInfo?.currentClass?._id
            });
        });

        // Get class summaries
        const classSummaries = await Promise.all(
            Object.keys(byClass).map(async (classIdStr) => {
                const students = byClass[classIdStr];
                let className = 'No Class Assigned';

                if (classIdStr !== 'none') {
                    const classInfo = await SiteClass.findById(classIdStr).select('className').lean();
                    className = (classInfo as any)?.className || className;
                }

                return {
                    classId: classIdStr,
                    className,
                    missingCount: students.length,
                    students
                };
            })
        );

        return NextResponse.json({
            success: true,
            summary: {
                totalStudents: allStudents.length,
                studentsWithBilling: studentsWithBilling.length,
                studentsWithoutBilling: studentsWithoutBilling.length,
                coveragePercentage: allStudents.length > 0 ? ((studentsWithBilling.length / allStudents.length) * 100).toFixed(2) : 0
            },
            classSummaries,
            filters: {
                schoolSiteId,
                academicYear,
                academicTerm,
                classId
            }
        });
    } catch (error: any) {
        console.error('Error verifying billing coverage:', error);
        return NextResponse.json({ error: 'Failed to verify billing coverage', details: error.message }, { status: 500 });
    }
}
