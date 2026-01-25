import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models
let StudentBilling: any;
let Expenditure: any;
let DailyFeeCollection: any;
let SchoolSite: any;
let Person: any;

try {
    StudentBilling = mongoose.models.StudentBilling || require('@/models/StudentBilling').default;
    Expenditure = mongoose.models.Expenditure || require('@/models/Expenditure').default;
    DailyFeeCollection = mongoose.models.DailyFeeCollection || require('@/models/DailyFeeCollection').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
} catch (error) {
    console.error('Error loading models:', error);
}

/**
 * BILLING ANALYTICS API
 *
 * This endpoint serves as the single source of truth for all financial metrics.
 * All dashboard data is derived exclusively from the StudentBilling collection.
 *
 * Supports:
 * - Proprietor Dashboard (executive-level metrics)
 * - Finance Officer Dashboard (operational metrics)
 * - Period-aware filtering (academic year, term, semester)
 * - School/site-level aggregation
 * - Real-time calculations
 */

interface BillingAnalyticsParams {
    school?: string;
    schoolSite?: string;
    academicYear?: string;
    academicTerm?: number;
    academicSemester?: number;
    periodType?: 'term' | 'semester';
    dashboardType?: 'proprietor' | 'finance';
    dateFrom?: Date;
    dateTo?: Date;
}

// Helper: Get current academic year
function getCurrentAcademicYear(): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

// Helper: Get current term (1, 2, or 3)
function getCurrentTerm(): number {
    const month = new Date().getMonth();
    if (month >= 8 && month <= 11) return 1; // Sep-Dec
    if (month >= 0 && month <= 3) return 2; // Jan-Apr
    return 3; // May-Aug
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const params: BillingAnalyticsParams = {
            school: searchParams.get('school') || undefined,
            schoolSite: searchParams.get('schoolSite') || searchParams.get('site') || undefined,
            academicYear: searchParams.get('academicYear') || getCurrentAcademicYear(),
            academicTerm: searchParams.get('academicTerm') ? parseInt(searchParams.get('academicTerm')!) : undefined,
            academicSemester: searchParams.get('academicSemester') ? parseInt(searchParams.get('academicSemester')!) : undefined,
            periodType: (searchParams.get('periodType') as 'term' | 'semester') || 'term',
            dashboardType: (searchParams.get('dashboardType') as 'proprietor' | 'finance') || 'proprietor',
            dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
            dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
        };

        // Build base query for billing records
        const billingQuery: any = {
            academicYear: params.academicYear
        };

        if (params.school) {
            billingQuery.school = new mongoose.Types.ObjectId(params.school);
        }

        if (params.schoolSite) {
            billingQuery.schoolSite = new mongoose.Types.ObjectId(params.schoolSite);
        }

        if (params.periodType === 'term' && params.academicTerm) {
            billingQuery.academicTerm = params.academicTerm;
        } else if (params.periodType === 'semester' && params.academicSemester) {
            billingQuery.academicSemester = params.academicSemester;
        }

        // ============= CORE BILLING METRICS (from StudentBilling) =============

        // 1. Total Billed (Expected Revenue)
        const totalBilledResult = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$totalBilled' },
                    termOrSemesterBill: { $sum: '$termOrSemesterBill' },
                    totalArrears: { $sum: '$balanceBroughtForward' },
                    addedChargesTotal: { $sum: '$addedChargesTotal' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: '$currentBalance' },
                    studentCount: { $sum: 1 }
                }
            }
        ]);

        const billingTotals = totalBilledResult[0] || {
            totalBilled: 0,
            termOrSemesterBill: 0,
            totalArrears: 0,
            addedChargesTotal: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            studentCount: 0
        };

        // 2. Billing Status Distribution
        const statusDistribution = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $group: {
                    _id: '$billingStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$currentBalance' }
                }
            }
        ]);

        // 3. Defaulters (students with currentBalance > 0 and past due date OR > threshold)
        const defaulterThreshold = parseFloat(searchParams.get('defaulterThreshold') || '0.5'); // 50% unpaid
        const defaultersQuery = {
            ...billingQuery,
            billingStatus: 'owing',
            $expr: {
                $gt: ['$currentBalance', { $multiply: ['$totalBilled', defaulterThreshold] }]
            }
        };

        const defaultersCount = await StudentBilling.countDocuments(defaultersQuery);

        // More accurate: get students who have paid less than threshold
        const criticalDefaulters = await StudentBilling.aggregate([
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
                    paymentRatio: { $lt: 0.25 }, // Less than 25% paid
                    currentBalance: { $gt: 0 }
                }
            },
            {
                $count: 'criticalDebtors'
            }
        ]);

        const criticalDebtorsCount = criticalDefaulters[0]?.criticalDebtors || 0;

        // 4. Collection Rate
        const collectionRate = billingTotals.totalBilled > 0 ? (billingTotals.totalPaid / billingTotals.totalBilled) * 100 : 0;

        // ============= ADDITIONAL CHARGES BREAKDOWN =============

        const chargesBreakdown = await StudentBilling.aggregate([
            { $match: billingQuery },
            { $unwind: '$additionalCharges' },
            {
                $group: {
                    _id: '$additionalCharges.category',
                    totalAmount: { $sum: '$additionalCharges.amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // ============= BY SCHOOL SITE BREAKDOWN =============

        const bySiteBreakdown = await StudentBilling.aggregate([
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
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: '$currentBalance' },
                    arrears: { $sum: '$balanceBroughtForward' },
                    studentCount: { $sum: 1 },
                    defaultersCount: {
                        $sum: {
                            $cond: [{ $eq: ['$billingStatus', 'owing'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    collectionRate: {
                        $cond: {
                            if: { $gt: ['$totalBilled', 0] },
                            then: { $multiply: [{ $divide: ['$totalPaid', '$totalBilled'] }, 100] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { totalBilled: -1 } }
        ]);

        // ============= BY CLASS BREAKDOWN =============

        const byClassBreakdown = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $lookup: {
                    from: 'siteclasses',
                    localField: 'class',
                    foreignField: '_id',
                    as: 'classInfo'
                }
            },
            { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$class',
                    className: { $first: '$classInfo.className' },
                    level: { $first: '$classInfo.level' },
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: '$currentBalance' },
                    studentCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    collectionRate: {
                        $cond: {
                            if: { $gt: ['$totalBilled', 0] },
                            then: { $multiply: [{ $divide: ['$totalPaid', '$totalBilled'] }, 100] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { level: 1, className: 1 } }
        ]);

        // ============= AGING ANALYSIS =============

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const agingAnalysis = await StudentBilling.aggregate([
            {
                $match: {
                    ...billingQuery,
                    billingStatus: 'owing',
                    currentBalance: { $gt: 0 }
                }
            },
            {
                $addFields: {
                    ageBucket: {
                        $switch: {
                            branches: [
                                {
                                    case: { $gte: ['$billGeneratedDate', thirtyDaysAgo] },
                                    then: '0-30 days'
                                },
                                {
                                    case: {
                                        $and: [{ $lt: ['$billGeneratedDate', thirtyDaysAgo] }, { $gte: ['$billGeneratedDate', sixtyDaysAgo] }]
                                    },
                                    then: '31-60 days'
                                },
                                {
                                    case: {
                                        $and: [{ $lt: ['$billGeneratedDate', sixtyDaysAgo] }, { $gte: ['$billGeneratedDate', ninetyDaysAgo] }]
                                    },
                                    then: '61-90 days'
                                }
                            ],
                            default: '90+ days'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$ageBucket',
                    totalAmount: { $sum: '$currentBalance' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]);

        // ============= EXPENDITURE DATA (for cash flow) =============

        // Get school sites for expenditure query
        let siteIds: mongoose.Types.ObjectId[] = [];
        if (params.schoolSite) {
            siteIds = [new mongoose.Types.ObjectId(params.schoolSite)];
        } else if (params.school) {
            const sites = await SchoolSite.find({ school: params.school }).select('_id').lean();
            siteIds = sites.map((s: any) => new mongoose.Types.ObjectId(s._id));
        }

        // Expenditure query
        const expenditureQuery: any = {};
        if (params.school) {
            expenditureQuery.school = new mongoose.Types.ObjectId(params.school);
        }
        if (params.schoolSite) {
            expenditureQuery.site = new mongoose.Types.ObjectId(params.schoolSite);
        }
        if (params.dateFrom && params.dateTo) {
            expenditureQuery.expenditureDate = {
                $gte: params.dateFrom,
                $lte: params.dateTo
            };
        }

        const expenditureSummary = await Expenditure.aggregate([
            { $match: expenditureQuery },
            {
                $group: {
                    _id: '$status',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const expenditures = {
            total: 0,
            paid: 0,
            pending: 0,
            approved: 0
        };

        expenditureSummary.forEach((exp: any) => {
            if (exp._id === 'paid') expenditures.paid = exp.total;
            if (exp._id === 'pending') expenditures.pending = exp.total;
            if (exp._id === 'approved') expenditures.approved = exp.total;
        });
        expenditures.total = expenditures.paid + expenditures.approved;

        // ============= DAILY COLLECTIONS =============

        const dailyCollectionsQuery: any = {};
        if (params.school) {
            dailyCollectionsQuery.school = new mongoose.Types.ObjectId(params.school);
        }
        if (params.schoolSite) {
            dailyCollectionsQuery.site = new mongoose.Types.ObjectId(params.schoolSite);
        }
        if (params.dateFrom && params.dateTo) {
            dailyCollectionsQuery.collectionDate = {
                $gte: params.dateFrom,
                $lte: params.dateTo
            };
        }

        const dailyCollections = await DailyFeeCollection.aggregate([
            { $match: dailyCollectionsQuery },
            {
                $group: {
                    _id: null,
                    canteenTotal: { $sum: '$canteenFeeAmount' },
                    busTotal: { $sum: '$busFeeAmount' },
                    total: { $sum: { $add: ['$canteenFeeAmount', '$busFeeAmount'] } }
                }
            }
        ]);

        const dailyCollectionsTotals = dailyCollections[0] || { canteenTotal: 0, busTotal: 0, total: 0 };

        // ============= PERIOD COMPARISON (Growth Metrics) =============

        // Get previous period data for comparison
        let previousPeriodQuery: any = { ...billingQuery };
        if (params.periodType === 'term' && params.academicTerm) {
            previousPeriodQuery.academicTerm = params.academicTerm - 1;
            if (previousPeriodQuery.academicTerm < 1) {
                // Go to previous academic year, term 3
                const [startYear] = params.academicYear!.split('/').map(Number);
                previousPeriodQuery.academicYear = `${startYear - 1}/${startYear}`;
                previousPeriodQuery.academicTerm = 3;
            }
        }

        const previousBillingResult = await StudentBilling.aggregate([
            { $match: previousPeriodQuery },
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: '$totalPaid' },
                    totalBilled: { $sum: '$totalBilled' }
                }
            }
        ]);

        const previousTotals = previousBillingResult[0] || { totalPaid: 0, totalBilled: 0 };
        const collectionGrowth = previousTotals.totalPaid > 0 ? ((billingTotals.totalPaid - previousTotals.totalPaid) / previousTotals.totalPaid) * 100 : 0;

        // ============= TOP DEBTORS LIST =============

        const topDebtors = await StudentBilling.aggregate([
            {
                $match: {
                    ...billingQuery,
                    billingStatus: 'owing',
                    currentBalance: { $gt: 0 }
                }
            },
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
                $lookup: {
                    from: 'siteclasses',
                    localField: 'class',
                    foreignField: '_id',
                    as: 'classInfo'
                }
            },
            { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    studentId: '$student',
                    studentName: '$studentInfo.fullName',
                    studentCode: '$studentInfo.studentInfo.studentId',
                    className: '$classInfo.className',
                    totalBilled: 1,
                    totalPaid: 1,
                    currentBalance: 1,
                    balanceBroughtForward: 1,
                    billGeneratedDate: 1,
                    paymentDueDate: 1,
                    paymentRatio: {
                        $cond: {
                            if: { $gt: ['$totalBilled', 0] },
                            then: { $divide: ['$totalPaid', '$totalBilled'] },
                            else: 1
                        }
                    }
                }
            },
            { $sort: { currentBalance: -1 } },
            { $limit: 50 }
        ]);

        // ============= RECENT BILLING ACTIVITY =============

        const recentActivity = await StudentBilling.aggregate([
            { $match: billingQuery },
            { $unwind: '$auditTrail' },
            { $sort: { 'auditTrail.performedAt': -1 } },
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
                $lookup: {
                    from: 'people',
                    localField: 'auditTrail.performedBy',
                    foreignField: '_id',
                    as: 'performerInfo'
                }
            },
            { $unwind: { path: '$performerInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    studentName: '$studentInfo.fullName',
                    action: '$auditTrail.action',
                    details: '$auditTrail.details',
                    performedAt: '$auditTrail.performedAt',
                    performedBy: '$performerInfo.fullName'
                }
            }
        ]);

        // ============= CONSTRUCT RESPONSE =============

        const response = {
            success: true,
            data: {
                // Executive Summary (Proprietor Dashboard)
                summary: {
                    totalExpectedRevenue: billingTotals.totalBilled,
                    totalBilled: billingTotals.termOrSemesterBill,
                    totalArrears: billingTotals.totalArrears,
                    additionalCharges: billingTotals.addedChargesTotal,
                    totalCollections: billingTotals.totalPaid,
                    totalOutstanding: billingTotals.totalOutstanding > 0 ? billingTotals.totalOutstanding : 0,
                    totalOverpaid: billingTotals.totalOutstanding < 0 ? Math.abs(billingTotals.totalOutstanding) : 0,
                    collectionRate: parseFloat(collectionRate.toFixed(2)),
                    collectionGrowth: parseFloat(collectionGrowth.toFixed(2)),
                    studentsBilled: billingTotals.studentCount,
                    defaultersCount,
                    criticalDebtorsCount,
                    currency: 'GHS'
                },

                // Cash Flow
                cashFlow: {
                    totalIncome: billingTotals.totalPaid + dailyCollectionsTotals.total,
                    totalExpenses: expenditures.total,
                    netCashFlow: billingTotals.totalPaid + dailyCollectionsTotals.total - expenditures.total,
                    dailyCollections: dailyCollectionsTotals
                },

                // Expenditure Breakdown
                expenditures,

                // Status Distribution
                statusDistribution: statusDistribution.reduce((acc: any, item: any) => {
                    acc[item._id] = { count: item.count, amount: item.totalAmount };
                    return acc;
                }, {}),

                // Breakdowns
                chargesBreakdown,
                bySite: bySiteBreakdown,
                byClass: byClassBreakdown,

                // Aging Analysis (Finance Officer)
                agingAnalysis,

                // Debtors (Finance Officer)
                topDebtors,

                // Recent Activity
                recentActivity,

                // Query Parameters (for reference)
                filters: {
                    academicYear: params.academicYear,
                    academicTerm: params.academicTerm,
                    academicSemester: params.academicSemester,
                    periodType: params.periodType,
                    school: params.school,
                    schoolSite: params.schoolSite
                }
            }
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Billing Analytics Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch billing analytics'
            },
            { status: 500 }
        );
    }
}
