import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models dynamically to avoid TypeScript issues
let Person: any;
let ExamScore: any;
let SiteClass: any;
let Subject: any;
let Faculty: any;
let Department: any;
let FeesConfiguration: any;
let FeesPayment: any;
let Scholarship: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
    Faculty = mongoose.models.Faculty || require('@/models/Faculty').default;
    Department = mongoose.models.Department || require('@/models/Department').default;
    FeesConfiguration = mongoose.models.FeesConfiguration || require('@/models/FeesConfiguration').default;
    FeesPayment = mongoose.models.FeesPayment || require('@/models/FeesPayment').default;
    Scholarship = mongoose.models.Scholarship || require('@/models/Scholarship').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET student dashboard data
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
        }

        // Fetch student details
        const student: any = await Person.findById(studentId)
            .populate('school', 'name')
            .populate('schoolSite', 'name')
            .populate('studentInfo.currentClass', 'className division sequence')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .populate('studentInfo.guardian', 'firstName lastName contact')
            .populate('studentInfo.subjects', 'name code')
            .lean()
            .exec();

        if (!student || student.personCategory !== 'student') {
            return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        }

        const currentAcademicYear = student.studentInfo?.defaultAcademicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1);
        const currentAcademicTerm = student.studentInfo?.defaultAcademicTerm || 1;

        // Get current class details
        const currentClass: any = student.studentInfo?.currentClass ? await SiteClass.findById(student.studentInfo.currentClass).populate('subjects', 'name code').lean().exec() : null;

        // Get all exam scores for this student
        const allExamScores: any[] = await ExamScore.find({
            student: studentId,
            isPublished: true
        })
            .populate('class', 'className')
            .populate('scores.subject', 'name code')
            .sort({ academicYear: -1, academicTerm: -1 })
            .lean()
            .exec();

        // Get current term exam score
        const currentTermScore = allExamScores.find((score) => score.academicYear === currentAcademicYear && score.academicTerm === currentAcademicTerm);

        // Calculate statistics
        const totalExamsRecorded = allExamScores.length;

        // Calculate overall average across all terms
        let totalAverage = 0;
        if (allExamScores.length > 0) {
            totalAverage = allExamScores.reduce((sum, score) => sum + (score.overallAverage || 0), 0) / allExamScores.length;
        }

        // Get best and worst performances
        const sortedScores = [...allExamScores].sort((a, b) => (b.overallAverage || 0) - (a.overallAverage || 0));
        const bestPerformance = sortedScores[0];
        const worstPerformance = sortedScores[sortedScores.length - 1];

        // Calculate subject-wise performance
        const subjectPerformance: any = {};
        allExamScores.forEach((examScore) => {
            examScore.scores?.forEach((score: any) => {
                const subjectId = score.subject?._id?.toString() || score.subject?.toString();
                const subjectName = score.subject?.name || 'Unknown';
                const subjectCode = score.subject?.code || '';

                if (!subjectPerformance[subjectId]) {
                    subjectPerformance[subjectId] = {
                        subject: { _id: subjectId, name: subjectName, code: subjectCode },
                        totalScore: 0,
                        count: 0,
                        grades: []
                    };
                }

                subjectPerformance[subjectId].totalScore += score.totalScore || 0;
                subjectPerformance[subjectId].count += 1;
                if (score.grade) {
                    subjectPerformance[subjectId].grades.push(score.grade);
                }
            });
        });

        const subjectStats = Object.values(subjectPerformance).map((perf: any) => ({
            subject: perf.subject,
            averageScore: perf.count > 0 ? (perf.totalScore / perf.count).toFixed(1) : 0,
            examsCount: perf.count,
            mostFrequentGrade: getMostFrequentGrade(perf.grades)
        }));

        // Calculate attendance statistics
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        allExamScores.forEach((score) => {
            totalPresent += score.attendance?.present || 0;
            totalAbsent += score.attendance?.absent || 0;
            totalLate += score.attendance?.late || 0;
        });
        const totalAttendanceDays = totalPresent + totalAbsent + totalLate;
        const attendanceRate = totalAttendanceDays > 0 ? ((totalPresent / totalAttendanceDays) * 100).toFixed(1) : 0;

        // Get recent exam scores (last 5)
        const recentScores = allExamScores.slice(0, 5);

        // Grade distribution
        const gradeDistribution: any = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        allExamScores.forEach((examScore) => {
            examScore.scores?.forEach((score: any) => {
                if (score.grade && gradeDistribution.hasOwnProperty(score.grade)) {
                    gradeDistribution[score.grade]++;
                }
            });
        });

        // Fetch financial information
        let financialData = null;
        if (student.studentInfo?.currentClass) {
            // Get fee configuration for the student's class
            const feeConfig: any = await FeesConfiguration.findOne({
                class: student.studentInfo.currentClass,
                academicYear: currentAcademicYear,
                academicTerm: currentAcademicTerm,
                isActive: true
            })
                .lean()
                .exec();

            // If no config found for specific term, try to find any config for the year
            const fallbackFeeConfig: any =
                !feeConfig &&
                (await FeesConfiguration.findOne({
                    class: student.studentInfo.currentClass,
                    academicYear: currentAcademicYear,
                    isActive: true
                })
                    .lean()
                    .exec());

            const activeFeeConfig = feeConfig || fallbackFeeConfig;

            if (activeFeeConfig) {
                // Get all payments for this student in current year/term
                const payments: any[] = await FeesPayment.find({
                    student: studentId,
                    academicYear: currentAcademicYear,
                    academicTerm: currentAcademicTerm
                })
                    .sort({ paymentDate: -1 })
                    .lean()
                    .exec();

                // Calculate totals
                const totalFeesRequired = activeFeeConfig.totalAmount || 0;
                const totalFeesPaid = payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
                const outstandingBalance = Math.max(0, totalFeesRequired - totalFeesPaid);
                const percentagePaid = totalFeesRequired > 0 ? (totalFeesPaid / totalFeesRequired) * 100 : 0;

                // Calculate days overdue if payment deadline has passed
                let daysOverdue = undefined;
                if (activeFeeConfig.paymentDeadline) {
                    const deadlineDate = new Date(activeFeeConfig.paymentDeadline);
                    const today = new Date();
                    if (today > deadlineDate && outstandingBalance > 0) {
                        daysOverdue = Math.floor((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
                    }
                }

                // Get last payment info
                const lastPayment = payments.length > 0 ? payments[0] : null;

                // Get active scholarships for this student
                const scholarships: any[] = await Scholarship.find({
                    student: studentId,
                    academicYear: currentAcademicYear,
                    status: 'active'
                })
                    .populate('scholarshipBody', 'name')
                    .lean()
                    .exec();

                financialData = {
                    accountBalance: student.studentInfo?.accountBalance || 0,
                    totalFeesRequired,
                    totalFeesPaid,
                    outstandingBalance,
                    percentagePaid,
                    paymentDeadline: activeFeeConfig.paymentDeadline,
                    daysOverdue,
                    lastPaymentDate: lastPayment?.paymentDate,
                    lastPaymentAmount: lastPayment?.amountPaid,
                    paymentHistory: payments.map((payment) => ({
                        _id: payment._id,
                        paymentDate: payment.paymentDate,
                        amountPaid: payment.amountPaid,
                        paymentMethod: payment.paymentMethod,
                        receiptNumber: payment.receiptNumber,
                        academicYear: payment.academicYear,
                        academicTerm: payment.academicTerm,
                        remarks: payment.remarks
                    })),
                    scholarships: scholarships.map((scholarship) => ({
                        _id: scholarship._id,
                        scholarshipBody: scholarship.scholarshipBody,
                        totalGranted: scholarship.totalGranted,
                        academicYear: scholarship.academicYear,
                        status: scholarship.status
                    })),
                    feeBreakdown:
                        activeFeeConfig.feeItems?.map((item: any) => ({
                            determinant: { name: item.determinant || item.description },
                            amount: item.amount
                        })) || []
                };
            }
        }

        const dashboardData = {
            student: {
                _id: student._id,
                studentId: student.studentInfo?.studentId,
                fullName: `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim(),
                email: student.contact?.email,
                phone: student.contact?.mobilePhone,
                photoLink: student.photoLink,
                dateOfBirth: student.dateOfBirth,
                gender: student.gender,
                school: student.school,
                schoolSite: student.schoolSite,
                dateJoined: student.studentInfo?.dateJoined,
                accountBalance: student.studentInfo?.accountBalance || 0
            },
            academicInfo: {
                currentClass: currentClass
                    ? {
                          _id: currentClass._id,
                          name: currentClass.className,
                          division: currentClass.division,
                          sequence: currentClass.sequence
                      }
                    : null,
                faculty: student.studentInfo?.faculty,
                department: student.studentInfo?.department,
                currentAcademicYear,
                currentAcademicTerm,
                subjects: student.studentInfo?.subjects || []
            },
            guardian: student.studentInfo?.guardian
                ? {
                      _id: student.studentInfo.guardian._id,
                      name: `${student.studentInfo.guardian.firstName} ${student.studentInfo.guardian.lastName}`.trim(),
                      phone: student.studentInfo.guardian.contact?.mobilePhone,
                      relationship: student.studentInfo.guardianRelationship
                  }
                : null,
            performance: {
                totalExamsRecorded,
                overallAverage: totalAverage.toFixed(1),
                currentTermScore: currentTermScore
                    ? {
                          overallAverage: currentTermScore.overallAverage,
                          overallPosition: currentTermScore.overallPosition,
                          totalMarks: currentTermScore.totalMarks,
                          conduct: currentTermScore.conduct,
                          interest: currentTermScore.interest
                      }
                    : null,
                bestPerformance: bestPerformance
                    ? {
                          academicYear: bestPerformance.academicYear,
                          academicTerm: bestPerformance.academicTerm,
                          overallAverage: bestPerformance.overallAverage,
                          overallPosition: bestPerformance.overallPosition
                      }
                    : null,
                worstPerformance:
                    worstPerformance && worstPerformance !== bestPerformance
                        ? {
                              academicYear: worstPerformance.academicYear,
                              academicTerm: worstPerformance.academicTerm,
                              overallAverage: worstPerformance.overallAverage,
                              overallPosition: worstPerformance.overallPosition
                          }
                        : null,
                subjectStats,
                gradeDistribution
            },
            attendance: {
                totalPresent,
                totalAbsent,
                totalLate,
                totalDays: totalAttendanceDays,
                attendanceRate: parseFloat(attendanceRate as string)
            },
            recentExamScores: recentScores.map((score) => ({
                _id: score._id,
                academicYear: score.academicYear,
                academicTerm: score.academicTerm,
                class: score.class,
                overallAverage: score.overallAverage,
                overallPosition: score.overallPosition,
                totalMarks: score.totalMarks,
                isPublished: score.isPublished,
                publishedAt: score.publishedAt,
                conduct: score.conduct,
                interest: score.interest,
                formMasterComment: score.formMasterComment
            })),
            allExamScores: allExamScores.map((score) => ({
                _id: score._id,
                academicYear: score.academicYear,
                academicTerm: score.academicTerm,
                class: score.class,
                overallAverage: score.overallAverage,
                overallPosition: score.overallPosition,
                scores: score.scores,
                attendance: score.attendance,
                conduct: score.conduct,
                interest: score.interest,
                formMasterComment: score.formMasterComment,
                headmasterComment: score.headmasterComment,
                nextTermBegins: score.nextTermBegins,
                promoted: score.promoted
            })),
            financial: financialData
        };

        return NextResponse.json({
            success: true,
            data: dashboardData
        });
    } catch (error: any) {
        console.error('Error fetching student dashboard:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch dashboard data', error: error.message }, { status: 500 });
    }
}

// Helper function to get most frequent grade
function getMostFrequentGrade(grades: string[]): string {
    if (grades.length === 0) return 'N/A';

    const frequency: any = {};
    grades.forEach((grade) => {
        frequency[grade] = (frequency[grade] || 0) + 1;
    });

    return Object.keys(frequency).reduce((a, b) => (frequency[a] > frequency[b] ? a : b));
}
