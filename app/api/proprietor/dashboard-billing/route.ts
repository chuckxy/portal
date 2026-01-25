import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

/**
 * PROPRIETOR DASHBOARD API - BILLING MODEL ALIGNED
 *
 * This endpoint provides executive-level financial and operational metrics
 * for the Proprietor Dashboard. All financial data is sourced exclusively
 * from the StudentBilling collection to ensure consistency and accuracy.
 *
 * CRITICAL: This is the single source of truth for proprietor financial reporting.
 */

// Import models dynamically
let Person: any;
let School: any;
let SchoolSite: any;
let SiteClass: any;
let Subject: any;
let Department: any;
let Faculty: any;
let StudentBilling: any;
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
    StudentBilling = mongoose.models.StudentBilling || require('@/models/StudentBilling').default;
    Expenditure = mongoose.models.Expenditure || require('@/models/Expenditure').default;
    Scholarship = mongoose.models.Scholarship || require('@/models/Scholarship').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
    DailyFeeCollection = mongoose.models.DailyFeeCollection || require('@/models/DailyFeeCollection').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET proprietor dashboard data (billing-aligned)
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const proprietorId = searchParams.get('proprietorId');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');

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
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        let currentAcademicYear: string;
        if (currentMonth >= 8) {
            currentAcademicYear = `${currentYear}/${currentYear + 1}`;
        } else {
            currentAcademicYear = `${currentYear - 1}/${currentYear}`;
        }

        const currentAcademicTerm = currentMonth >= 8 && currentMonth <= 11 ? 1 : currentMonth >= 0 && currentMonth <= 3 ? 2 : 3;

        const effectiveAcademicYear = academicYear || currentAcademicYear;
        const effectiveAcademicTerm = academicTerm ? parseInt(academicTerm) : currentAcademicTerm;

        // Get all sites for this school
        const schoolSites = await SchoolSite.find({ school: schoolId }).lean();
        const schoolSiteIds = schoolSites.map((site: any) => new mongoose.Types.ObjectId(site._id));

        // ============= FINANCIAL DATA FROM BILLING MODEL =============

        // Build billing query for this school's sites
        const billingQuery: any = {
            schoolSite: { $in: schoolSiteIds },
            academicYear: effectiveAcademicYear
        };

        // If term is specified, filter by term
        if (effectiveAcademicTerm) {
            billingQuery.academicTerm = effectiveAcademicTerm;
        }

        // 1. Core Financial Metrics from Billing Records
        const billingMetrics = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $group: {
                    _id: null,
                    // Expected Revenue = Total Billed (includes arrears + fees + charges)
                    totalExpectedRevenue: { $sum: '$totalBilled' },
                    // Base Term/Semester Fees
                    totalTermFees: { $sum: '$termOrSemesterBill' },
                    // Total Arrears (Balance Brought Forward)
                    totalArrears: { $sum: '$balanceBroughtForward' },
                    // Additional Charges
                    totalAdditionalCharges: { $sum: '$addedChargesTotal' },
                    // Total Collected
                    totalCollected: { $sum: '$totalPaid' },
                    // Total Outstanding (positive balance = owing)
                    totalOutstanding: {
                        $sum: {
                            $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0]
                        }
                    },
                    // Total Overpaid
                    totalOverpaid: {
                        $sum: {
                            $cond: [{ $lt: ['$currentBalance', 0] }, { $abs: '$currentBalance' }, 0]
                        }
                    },
                    // Student counts
                    totalBilledStudents: { $sum: 1 },
                    // Students with clear status
                    clearedStudents: {
                        $sum: { $cond: [{ $eq: ['$billingStatus', 'clear'] }, 1, 0] }
                    },
                    // Students owing
                    owingStudents: {
                        $sum: { $cond: [{ $eq: ['$billingStatus', 'owing'] }, 1, 0] }
                    }
                }
            }
        ]);

        const financialTotals = billingMetrics[0] || {
            totalExpectedRevenue: 0,
            totalTermFees: 0,
            totalArrears: 0,
            totalAdditionalCharges: 0,
            totalCollected: 0,
            totalOutstanding: 0,
            totalOverpaid: 0,
            totalBilledStudents: 0,
            clearedStudents: 0,
            owingStudents: 0
        };

        // 2. Critical Debtors (less than 25% paid)
        const criticalDebtors = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $addFields: {
                    paymentRatio: {
                        $cond: {
                            if: { $gt: ['$totalBilled', 0] },
                            then: { $divide: ['$totalPaid', '$totalBilled'] },
                            else: 1
                        }
                    }
                }
            },
            {
                $match: {
                    paymentRatio: { $lt: 0.25 },
                    currentBalance: { $gt: 0 }
                }
            },
            { $count: 'count' }
        ]);

        const criticalDebtorsCount = criticalDebtors[0]?.count || 0;

        // 3. Collection Rate
        const collectionRate = financialTotals.totalExpectedRevenue > 0 ? (financialTotals.totalCollected / financialTotals.totalExpectedRevenue) * 100 : 0;

        // 4. Daily Collections (supplementary income)
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const dailyCollections = await DailyFeeCollection.find({
            school: new mongoose.Types.ObjectId(schoolId as string),
            collectionDate: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        const totalDailyCollections = dailyCollections.reduce((sum, d) => {
            const canteen = (d as any).canteenFeeAmount || 0;
            const bus = (d as any).busFeeAmount || 0;
            return sum + canteen + bus;
        }, 0);

        // All-time daily collections
        const allTimeDailyCollections = await DailyFeeCollection.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId as string) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $add: ['$canteenFeeAmount', '$busFeeAmount'] } }
                }
            }
        ]);
        const totalDailyCollectionsAllTime = allTimeDailyCollections[0]?.total || 0;

        // 5. Expenditures
        const expendituresResult = await Expenditure.aggregate([
            {
                $match: {
                    school: new mongoose.Types.ObjectId(schoolId as string),
                    status: { $in: ['paid', 'approved'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalExpenses = expendituresResult[0]?.total || 0;

        // Pending expenditure approvals
        const pendingApprovals = await Expenditure.countDocuments({
            status: 'pending',
            school: new mongoose.Types.ObjectId(schoolId as string)
        });

        // 6. Scholarships
        const scholarshipsResult = await Scholarship.aggregate([
            {
                $match: {
                    academicYear: effectiveAcademicYear,
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
        const totalScholarships = scholarshipsResult[0]?.total || 0;

        // Calculate Net Cash Flow
        // Total Income = Billing Collections + Daily Collections
        const totalIncome = financialTotals.totalCollected + totalDailyCollectionsAllTime;
        const netCashFlow = totalIncome - totalExpenses;

        // 7. Financial Performance by Site (from billing)
        const financialBySite = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $lookup: {
                    from: 'schoolsites',
                    localField: 'schoolSite',
                    foreignField: '_id',
                    as: 'siteInfo'
                }
            },
            { $unwind: { path: '$siteInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$schoolSite',
                    siteName: { $first: '$siteInfo.siteName' },
                    location: { $first: '$siteInfo.location' },
                    totalBilled: { $sum: '$totalBilled' },
                    totalCollected: { $sum: '$totalPaid' },
                    totalOutstanding: {
                        $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0] }
                    },
                    studentCount: { $sum: 1 },
                    defaultersCount: {
                        $sum: { $cond: [{ $eq: ['$billingStatus', 'owing'] }, 1, 0] }
                    }
                }
            },
            {
                $addFields: {
                    collectionRate: {
                        $cond: {
                            if: { $gt: ['$totalBilled', 0] },
                            then: { $multiply: [{ $divide: ['$totalCollected', '$totalBilled'] }, 100] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { totalBilled: -1 } }
        ]);

        // 8. Recent Payments from Billing Audit Trail
        const recentPayments = await StudentBilling.aggregate([
            { $match: billingQuery },
            { $unwind: '$linkedPayments' },
            { $sort: { 'linkedPayments.datePaid': -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: 'people',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $project: {
                    _id: '$linkedPayments.paymentId',
                    student: {
                        fullName: '$studentInfo.fullName',
                        _id: '$studentInfo._id'
                    },
                    datePaid: '$linkedPayments.datePaid',
                    amountPaid: '$linkedPayments.amount',
                    receiptNumber: '$linkedPayments.receiptNumber',
                    paymentMethod: '$linkedPayments.paymentMethod',
                    currency: '$currency',
                    status: 'confirmed'
                }
            }
        ]);

        // ============= ENROLLMENT DATA =============

        const totalStudents = await Person.countDocuments({
            personCategory: 'student',
            isActive: true,
            school: schoolId
        });

        const totalTeachers = await Person.countDocuments({
            personCategory: 'teacher',
            isActive: true,
            school: schoolId
        });

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
            { $unwind: { path: '$classData', preserveNullAndEmptyArrays: true } },
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

        // Enrollment trend
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
            enrollmentTrend.push({ period: monthName, count });
        }

        // ============= ACADEMIC DATA =============

        const totalClasses = await SiteClass.countDocuments({
            isActive: true,
            site: { $in: schoolSiteIds }
        });

        const totalSubjects = await Subject.countDocuments({ school: schoolId });

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
            { $project: { studentCount: { $size: '$students' } } },
            { $group: { _id: null, avgSize: { $avg: '$studentCount' } } }
        ]);

        const averageClassSize = classSizes[0]?.avgSize || 0;
        const teacherStudentRatio = totalTeachers > 0 ? `1:${Math.round(totalStudents / totalTeachers)}` : '0:0';

        const performanceResult = await ExamScore.aggregate([
            {
                $match: {
                    isPublished: true,
                    academicYear: effectiveAcademicYear,
                    school: new mongoose.Types.ObjectId(schoolId as string)
                }
            },
            { $group: { _id: null, avgTotal: { $avg: '$totalScore' } } }
        ]);
        const averagePerformance = performanceResult[0]?.avgTotal || 0;

        // ============= SITES WITH STATS =============

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

                // Get financial data for this site from billing
                const siteFinancial = financialBySite.find((f: any) => f._id.toString() === site._id.toString());

                return {
                    _id: site._id,
                    name: site.siteName,
                    location: site.location || 'N/A',
                    students: siteStudents,
                    teachers: siteTeachers,
                    classes: siteClasses,
                    // Financial metrics from billing
                    totalBilled: siteFinancial?.totalBilled || 0,
                    totalCollected: siteFinancial?.totalCollected || 0,
                    collectionRate: siteFinancial?.collectionRate || 0
                };
            })
        );

        // ============= STATISTICS =============

        const totalDepartments = await Department.countDocuments({ school: schoolId });
        const totalFaculties = await Faculty.countDocuments({ school: schoolId });

        // ============= CONSTRUCT RESPONSE =============

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
                // Primary metrics from Billing
                totalIncome,
                totalExpenses,
                netCashFlow,

                // Billing-specific metrics
                totalExpectedRevenue: financialTotals.totalExpectedRevenue,
                totalBilled: financialTotals.totalTermFees,
                totalArrears: financialTotals.totalArrears,
                totalAdditionalCharges: financialTotals.totalAdditionalCharges,
                collectedThisTerm: financialTotals.totalCollected,
                collectedThisMonth: totalDailyCollections, // Approximation
                totalDailyCollections,
                outstandingReceivables: financialTotals.totalOutstanding,
                totalScholarships,
                criticalDebtors: criticalDebtorsCount,
                pendingApprovals,
                pendingPayments: financialTotals.totalOutstanding, // Outstanding is "pending"
                collectionRate,

                // Student counts
                totalBilledStudents: financialTotals.totalBilledStudents,
                clearedStudents: financialTotals.clearedStudents,
                owingStudents: financialTotals.owingStudents,

                currency: 'GHS',

                // Source indicator
                dataSource: 'StudentBilling'
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
                activeSchoolSites: sites.length
            },
            // Period context
            period: {
                academicYear: effectiveAcademicYear,
                academicTerm: effectiveAcademicTerm
            }
        };

        return NextResponse.json({
            success: true,
            data: dashboardData
        });
    } catch (error: any) {
        console.error('Error fetching proprietor dashboard (billing):', error);
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
