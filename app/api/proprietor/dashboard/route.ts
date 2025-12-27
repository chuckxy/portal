import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models dynamically to avoid TypeScript issues
let Person: any;
let School: any;
let SchoolSite: any;
let SiteClass: any;
let Subject: any;
let Department: any;
let Faculty: any;
let FeesPayment: any;
let ExamScore: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    School = mongoose.models.School || require('@/models/School').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
    Department = mongoose.models.Department || require('@/models/Department').default;
    Faculty = mongoose.models.Faculty || require('@/models/Faculty').default;
    FeesPayment = mongoose.models.FeesPayment || require('@/models/FeesPayment').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET proprietor dashboard data
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const proprietorId = searchParams.get('proprietorId');

        if (!proprietorId) {
            return NextResponse.json({ success: false, message: 'Proprietor ID is required' }, { status: 400 });
        }

        // Fetch proprietor details
        const proprietor: any = await Person.findById(proprietorId).populate('school', 'name schoolType dateFounded motto logo').populate('schoolSite', 'name location').lean().exec();

        if (!proprietor || proprietor.personCategory !== 'proprietor') {
            return NextResponse.json({ success: false, message: 'Proprietor not found' }, { status: 404 });
        }

        const schoolId = proprietor.school?._id || proprietor.school;

        // Get current academic year and term
        const currentYear = new Date().getFullYear();
        const currentAcademicYear = `${currentYear}/${currentYear + 1}`;
        const currentMonth = new Date().getMonth() + 1;
        const currentAcademicTerm = currentMonth <= 4 ? 1 : currentMonth <= 8 ? 2 : 3;

        // ============= FINANCIAL DATA =============

        // Total revenue (all confirmed payments)
        const totalRevenueResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amountPaid' }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        // Revenue collected this term
        const termRevenueResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    academicYear: currentAcademicYear,
                    academicTerm: currentAcademicTerm
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amountPaid' }
                }
            }
        ]);
        const collectedThisTerm = termRevenueResult.length > 0 ? termRevenueResult[0].total : 0;

        // Revenue collected this month
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0);
        const monthRevenueResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    datePaid: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amountPaid' }
                }
            }
        ]);
        const collectedThisMonth = monthRevenueResult.length > 0 ? monthRevenueResult[0].total : 0;

        // Pending payments
        const pendingPaymentsResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'pending'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amountPaid' }
                }
            }
        ]);
        const pendingPayments = pendingPaymentsResult.length > 0 ? pendingPaymentsResult[0].total : 0;

        // ============= ENROLLMENT DATA =============

        // Total students
        const totalStudents = await Person.countDocuments({
            personCategory: 'student',
            isActive: true,
            school: schoolId
        });

        // Total teachers
        const totalTeachers = await Person.countDocuments({
            personCategory: 'teacher',
            isActive: true,
            school: schoolId
        });

        // Total staff (all non-student, non-parent personnel)
        const totalStaff = await Person.countDocuments({
            personCategory: { $in: ['teacher', 'headmaster', 'finance', 'librarian', 'admin'] },
            isActive: true,
            school: schoolId
        });

        // Students by level
        const studentsByLevel = await Person.aggregate([
            {
                $match: {
                    personCategory: 'student',
                    isActive: true,
                    school: new mongoose.Types.ObjectId(schoolId as string)
                }
            },
            {
                $lookup: {
                    from: 'siteclasses',
                    localField: 'studentInfo.currentClass',
                    foreignField: '_id',
                    as: 'classData'
                }
            },
            {
                $unwind: {
                    path: '$classData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$classData.level',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    level: { $ifNull: ['$_id', 'Unassigned'] },
                    count: 1
                }
            },
            { $sort: { level: 1 } }
        ]);

        // Enrollment trend (last 6 months)
        const enrollmentTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(currentYear, currentMonth - 1 - i, 1);
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const count = await Person.countDocuments({
                personCategory: 'student',
                isActive: true,
                school: schoolId,
                createdAt: { $lte: monthDate }
            });

            enrollmentTrend.push({
                period: monthName,
                count: count
            });
        }

        // ============= ACADEMIC DATA =============

        // Total classes
        const totalClasses = await SiteClass.countDocuments({
            isActive: true
        });

        // Total subjects
        const totalSubjects = await Subject.countDocuments({
            school: schoolId
        });

        // Average class size
        const classSizes = await SiteClass.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from: 'people',
                    let: { classId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$personCategory', 'student'] }, { $eq: ['$isActive', true] }, { $eq: ['$studentInfo.currentClass', '$$classId'] }]
                                }
                            }
                        }
                    ],
                    as: 'students'
                }
            },
            {
                $project: {
                    studentCount: { $size: '$students' }
                }
            },
            {
                $group: {
                    _id: null,
                    avgSize: { $avg: '$studentCount' }
                }
            }
        ]);
        const averageClassSize = classSizes.length > 0 ? classSizes[0].avgSize : 0;

        // Teacher:Student ratio
        const teacherStudentRatio = totalTeachers > 0 ? `1:${Math.round(totalStudents / totalTeachers)}` : '0:0';

        // Average performance (from exam scores)
        const performanceResult = await ExamScore.aggregate([
            {
                $match: {
                    isPublished: true,
                    academicYear: currentAcademicYear
                }
            },
            {
                $group: {
                    _id: null,
                    avgTotal: { $avg: '$totalScore' }
                }
            }
        ]);
        const averagePerformance = performanceResult.length > 0 ? performanceResult[0].avgTotal : 0;

        // ============= SCHOOL SITES =============

        const sites = await SchoolSite.find({ school: schoolId, isActive: true }).select('siteName location').lean();

        const sitesWithStats = await Promise.all(
            sites.map(async (site: any) => {
                const siteStudents = await Person.countDocuments({
                    personCategory: 'student',
                    isActive: true,
                    schoolSite: site._id
                });

                const siteTeachers = await Person.countDocuments({
                    personCategory: 'teacher',
                    isActive: true,
                    schoolSite: site._id
                });

                const siteClasses = await SiteClass.countDocuments({
                    schoolSite: site._id,
                    isActive: true
                });

                return {
                    _id: site._id,
                    name: site.siteName,
                    location: site.location || 'N/A',
                    students: siteStudents,
                    teachers: siteTeachers,
                    classes: siteClasses
                };
            })
        );

        // ============= RECENT PAYMENTS =============

        const recentPayments = await FeesPayment.find().populate('student', 'firstName middleName lastName fullName').sort({ datePaid: -1 }).limit(20).lean();

        // ============= STATISTICS =============

        const totalDepartments = await Department.countDocuments({ school: schoolId });
        const totalFaculties = await Faculty.countDocuments({ school: schoolId });
        const activeSchoolSites = sites.length;

        // Construct response
        const dashboardData = {
            proprietor: {
                _id: proprietor._id,
                fullName: proprietor.fullName,
                email: proprietor.contact?.email,
                phone: proprietor.contact?.mobilePhone,
                photoLink: proprietor.photoLink,
                school: proprietor.school
            },
            financial: {
                totalRevenue,
                pendingPayments,
                collectedThisTerm,
                collectedThisMonth,
                currency: 'GHS'
            },
            enrollment: {
                totalStudents,
                totalTeachers,
                totalStaff,
                studentsByLevel,
                enrollmentTrend
            },
            academic: {
                totalClasses,
                totalSubjects,
                averageClassSize,
                teacherStudentRatio,
                averagePerformance
            },
            sites: sitesWithStats,
            recentPayments,
            statistics: {
                totalDepartments,
                totalFaculties,
                activeSchoolSites
            }
        };

        return NextResponse.json({
            success: true,
            data: dashboardData
        });
    } catch (error: any) {
        console.error('Error fetching proprietor dashboard:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch proprietor dashboard data',
                error: error.message
            },
            { status: 500 }
        );
    }
}
