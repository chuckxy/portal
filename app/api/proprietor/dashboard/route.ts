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
let FeesConfiguration: any;
let Expenditure: any;
let Scholarship: any;
let ExamScore: any;
let DailyFeeCollection: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    School = mongoose.models.School || require('@/models/School').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
    Department = mongoose.models.Department || require('@/models/Department').default;
    Faculty = mongoose.models.Faculty || require('@/models/Faculty').default;
    FeesPayment = mongoose.models.FeesPayment || require('@/models/FeesPayment').default;
    FeesConfiguration = mongoose.models.FeesConfiguration || require('@/models/FeesConfiguration').default;
    Expenditure = mongoose.models.Expenditure || require('@/models/Expenditure').default;
    Scholarship = mongoose.models.Scholarship || require('@/models/Scholarship').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
    DailyFeeCollection = mongoose.models.DailyFeeCollection || require('@/models/DailyFeeCollection').default;
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
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth(); // 0-11
        const currentYear = currentDate.getFullYear();

        let currentAcademicYear: string;
        if (currentMonth >= 8) {
            // September onwards
            currentAcademicYear = `${currentYear}/${currentYear + 1}`;
        } else {
            // January to August
            currentAcademicYear = `${currentYear - 1}/${currentYear}`;
        }

        const currentAcademicTerm = currentMonth <= 3 ? 1 : currentMonth <= 7 ? 2 : 3;

        // Get all sites for this school (needed for FeesPayment queries since it doesn't have school field)
        const schoolSites = await SchoolSite.find({ school: schoolId }).lean();
        const schoolSiteIds = schoolSites.map((site: any) => new mongoose.Types.ObjectId(site._id));

        // ============= FINANCIAL DATA =============

        // Total income (all confirmed payments for this school's sites)
        const totalIncomeResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    site: { $in: schoolSiteIds }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amountPaid' }
                }
            }
        ]);
        const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;

        // Total daily collections (all time for this school)
        const allDailyCollections = await DailyFeeCollection.find({
            school: new mongoose.Types.ObjectId(schoolId as string)
        }).lean();

        const totalDailyCollectionsAllTime = allDailyCollections.reduce((sum, d) => {
            const canteen = (d as any).canteenFeeAmount || 0;
            const bus = (d as any).busFeeAmount || 0;
            return sum + canteen + bus;
        }, 0);

        // Total expenses (paid + approved expenditures for this school)
        const totalExpensesResult = await Expenditure.aggregate([
            {
                $match: {
                    status: { $in: ['paid', 'approved'] },
                    school: new mongoose.Types.ObjectId(schoolId as string)
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;

        // Net cash flow (include daily collections in total income)
        const netCashFlow = totalIncome + totalDailyCollectionsAllTime - totalExpenses;

        // Revenue collected this term for this school
        const termRevenueResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    academicYear: currentAcademicYear,
                    academicTerm: currentAcademicTerm,
                    site: { $in: schoolSiteIds }
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

        // Revenue collected this month for this school
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const monthRevenueResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    datePaid: { $gte: startOfMonth, $lte: endOfMonth },
                    site: { $in: schoolSiteIds }
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

        // Daily collections (canteen and bus fees) for this month
        const dailyCollections = await DailyFeeCollection.find({
            school: new mongoose.Types.ObjectId(schoolId as string),
            collectionDate: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        const totalDailyCollections = dailyCollections.reduce((sum, d) => {
            const canteen = (d as any).canteenFeeAmount || 0;
            const bus = (d as any).busFeeAmount || 0;
            return sum + canteen + bus;
        }, 0);

        // Pending payments (use expected amount for pending, amountPaid might be 0)
        const pendingPaymentsResult = await FeesPayment.aggregate([
            {
                $match: {
                    status: 'pending',
                    site: { $in: schoolSiteIds }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ['$expectedAmount', '$amountPaid'] } }
                }
            }
        ]);
        const pendingPayments = pendingPaymentsResult.length > 0 ? pendingPaymentsResult[0].total : 0;

        // Total scholarships for this school
        const totalScholarshipsResult = await Scholarship.aggregate([
            {
                $match: {
                    academicYear: currentAcademicYear,
                    status: 'active',
                    school: new mongoose.Types.ObjectId(schoolId as string)
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalGranted' }
                }
            }
        ]);
        const totalScholarships = totalScholarshipsResult.length > 0 ? totalScholarshipsResult[0].total : 0;

        // Pending expenditure approvals for this school
        const pendingApprovals = await Expenditure.countDocuments({
            status: 'pending',
            school: new mongoose.Types.ObjectId(schoolId as string)
        });

        // Calculate outstanding receivables and critical debtors
        const students: any[] = await Person.find({
            personCategory: 'student',
            isActive: true,
            school: schoolId,
            'studentInfo.currentClass': { $exists: true, $ne: null }
        })
            .populate('studentInfo.currentClass')
            .lean();

        let outstandingReceivables = 0;
        let totalBalanceBroughtForward = 0; // Aggregate B/F across all students
        let criticalDebtors = 0;
        let expectedFees = 0;
        let collectedFees = collectedThisTerm;

        for (const student of students) {
            const currentClass = student.studentInfo?.currentClass;
            if (!currentClass) continue;

            // Find fee configuration (check for the academic year, not term-specific)
            const feeConfig: any = await FeesConfiguration.findOne({
                class: currentClass._id || currentClass,
                academicYear: currentAcademicYear,
                isActive: true
            }).lean();

            if (feeConfig) {
                // Get Balance Brought Forward (opening balance from before computerization)
                const balanceBroughtForward = student.studentInfo?.balanceBroughtForward || 0;
                totalBalanceBroughtForward += balanceBroughtForward;

                expectedFees += feeConfig.totalAmount || 0;

                // Get only confirmed payments for this student
                const payments: any[] = await FeesPayment.find({
                    student: student._id,
                    academicYear: currentAcademicYear,
                    status: 'confirmed'
                }).lean();

                const totalPaid = payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

                // Calculate outstanding including Balance Brought Forward
                // Formula: totalDebt = balanceBroughtForward + generatedCharges - payments
                const currentPeriodOutstanding = Math.max(0, feeConfig.totalAmount - totalPaid);
                const outstanding = currentPeriodOutstanding + balanceBroughtForward;
                outstandingReceivables += outstanding;

                // Check if critical debtor (<25% paid) - based on total required including B/F
                const totalRequired = feeConfig.totalAmount + balanceBroughtForward;
                const percentagePaid = totalRequired > 0 ? (totalPaid / totalRequired) * 100 : 0;
                if (percentagePaid < 25 && outstanding > 0) {
                    criticalDebtors++;
                }
            }
        }

        // Collection rate
        const collectionRate = expectedFees > 0 ? (collectedFees / expectedFees) * 100 : 0;

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

        // Total classes (only for this proprietor's school sites)
        const totalClasses = await SiteClass.countDocuments({
            isActive: true,
            site: { $in: schoolSiteIds }
        });

        // Total subjects
        const totalSubjects = await Subject.countDocuments({
            school: schoolId
        });

        // Average class size (only for this proprietor's school sites)
        const classSizes = await SiteClass.aggregate([
            { $match: { isActive: true, site: { $in: schoolSiteIds } } },
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

        // Average performance (from exam scores for this school's students)
        const performanceResult = await ExamScore.aggregate([
            {
                $match: {
                    isPublished: true,
                    academicYear: currentAcademicYear,
                    school: new mongoose.Types.ObjectId(schoolId as string)
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
                    site: site._id,
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

        const recentPayments = await FeesPayment.find({ site: { $in: schoolSiteIds } })
            .populate('student', 'firstName middleName lastName fullName')
            .sort({ datePaid: -1 })
            .limit(20)
            .lean();

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
                totalIncome: totalIncome + totalDailyCollectionsAllTime,
                totalExpenses,
                netCashFlow,
                pendingPayments,
                collectedThisTerm,
                collectedThisMonth,
                totalDailyCollections,
                outstandingReceivables,
                totalScholarships,
                criticalDebtors,
                pendingApprovals,
                collectionRate,
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
