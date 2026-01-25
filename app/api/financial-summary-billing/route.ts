import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

/**
 * FINANCIAL SUMMARY API - BILLING MODEL ALIGNED
 *
 * This API provides financial summary data for the Financial Controller Dashboard.
 * ALL financial metrics are now derived from the StudentBilling collection as the
 * single source of truth.
 *
 * MIGRATION NOTE: This replaces the legacy financial-summary API that was
 * deriving balances from FeesConfiguration and FeesPayment separately.
 */

let StudentBilling: any;
let Expenditure: any;
let DailyFeeCollection: any;
let Scholarship: any;
let Person: any;

try {
    StudentBilling = mongoose.models.StudentBilling || require('@/models/StudentBilling').default;
    Expenditure = mongoose.models.Expenditure || require('@/models/Expenditure').default;
    DailyFeeCollection = mongoose.models.DailyFeeCollection || require('@/models/DailyFeeCollection').default;
    Scholarship = mongoose.models.Scholarship || require('@/models/Scholarship').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
} catch (error) {
    console.error('Error loading models:', error);
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const site = searchParams.get('site');
        const school = searchParams.get('school');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const period = searchParams.get('period') || 'month';
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        // Generate current academic year
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentAcademicYear = currentMonth >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
        const effectiveAcademicYear = academicYear || currentAcademicYear;

        // Calculate date range based on period
        let startDate: Date;
        let endDate = new Date();

        switch (period) {
            case 'today':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'term':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 4);
                break;
            case 'year':
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
        }

        if (dateFrom) startDate = new Date(dateFrom);
        if (dateTo) endDate = new Date(dateTo);

        // Build billing query
        const billingQuery: any = {
            academicYear: effectiveAcademicYear
        };

        if (site) {
            billingQuery.schoolSite = new mongoose.Types.ObjectId(site);
        }
        if (school) {
            billingQuery.school = new mongoose.Types.ObjectId(school);
        }
        if (academicTerm) {
            billingQuery.academicTerm = parseInt(academicTerm);
        }

        // ============= BILLING-BASED FINANCIAL METRICS =============

        // Core billing aggregation
        const billingMetrics = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $group: {
                    _id: null,
                    // Expected = Total Billed
                    totalFeesExpected: { $sum: '$totalBilled' },
                    // Received = Total Paid
                    totalFeesReceived: { $sum: '$totalPaid' },
                    // Outstanding (owing amounts only)
                    totalOutstanding: {
                        $sum: {
                            $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0]
                        }
                    },
                    // Arrears carried forward
                    totalBalanceBroughtForward: { $sum: '$balanceBroughtForward' },
                    // Count students
                    studentCount: { $sum: 1 }
                }
            }
        ]);

        const billing = billingMetrics[0] || {
            totalFeesExpected: 0,
            totalFeesReceived: 0,
            totalOutstanding: 0,
            totalBalanceBroughtForward: 0,
            studentCount: 0
        };

        // Critical debtors (< 25% paid with balance > 0)
        const criticalDebtorsResult = await StudentBilling.aggregate([
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

        const criticalDebtors = criticalDebtorsResult[0]?.count || 0;

        // Overdue amount (bills past due date)
        const overdueResult = await StudentBilling.aggregate([
            {
                $match: {
                    ...billingQuery,
                    billingStatus: 'owing',
                    paymentDueDate: { $lt: now }
                }
            },
            {
                $group: {
                    _id: null,
                    overdueAmount: { $sum: '$currentBalance' }
                }
            }
        ]);

        const overdueAmount = overdueResult[0]?.overdueAmount || 0;

        // ============= DAILY COLLECTIONS =============

        const dailyCollectionsQuery: any = {
            collectionDate: { $gte: startDate, $lte: endDate }
        };
        if (site) dailyCollectionsQuery.site = new mongoose.Types.ObjectId(site);
        if (school) dailyCollectionsQuery.school = new mongoose.Types.ObjectId(school);

        const dailyCollections = await DailyFeeCollection.aggregate([
            { $match: dailyCollectionsQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $add: [{ $ifNull: ['$canteenFeeAmount', 0] }, { $ifNull: ['$busFeeAmount', 0] }] } }
                }
            }
        ]);

        const totalDailyCollections = dailyCollections[0]?.total || 0;

        // ============= SCHOLARSHIPS =============

        const scholarshipsQuery: any = {
            academicYear: effectiveAcademicYear,
            status: 'active'
        };
        if (school) scholarshipsQuery.school = new mongoose.Types.ObjectId(school);

        const scholarships = await Scholarship.aggregate([{ $match: scholarshipsQuery }, { $group: { _id: null, total: { $sum: '$totalGranted' } } }]);

        const totalScholarships = scholarships[0]?.total || 0;

        // Total Income from Billing
        const totalIncome = billing.totalFeesReceived + totalDailyCollections;

        // ============= EXPENDITURES =============

        const expendituresQuery: any = {
            expenditureDate: { $gte: startDate, $lte: endDate }
        };
        if (site) expendituresQuery.site = new mongoose.Types.ObjectId(site);
        if (school) expendituresQuery.school = new mongoose.Types.ObjectId(school);

        const expenditures = await Expenditure.find(expendituresQuery).lean();

        const totalExpenditures = expenditures.filter((e: any) => e.status === 'paid').reduce((sum: number, e: any) => sum + e.amount, 0);

        const pendingExpenditures = expenditures.filter((e: any) => e.status === 'pending').reduce((sum: number, e: any) => sum + e.amount, 0);

        const approvedExpenditures = expenditures.filter((e: any) => e.status === 'approved').reduce((sum: number, e: any) => sum + e.amount, 0);

        // Cash positions
        const netCashFlow = totalIncome - totalExpenditures;
        const cashAtHand = billing.totalFeesReceived * 0.3;
        const bankBalance = billing.totalFeesReceived * 0.7;

        // ============= GROWTH COMPARISON =============

        // Previous period billing
        let prevBillingQuery: any = { ...billingQuery };
        if (academicTerm) {
            const prevTerm = parseInt(academicTerm) - 1;
            if (prevTerm < 1) {
                const [startYear] = effectiveAcademicYear.split('/').map(Number);
                prevBillingQuery.academicYear = `${startYear - 1}/${startYear}`;
                prevBillingQuery.academicTerm = 3;
            } else {
                prevBillingQuery.academicTerm = prevTerm;
            }
        }

        const prevBillingMetrics = await StudentBilling.aggregate([
            { $match: prevBillingQuery },
            {
                $group: {
                    _id: null,
                    totalFeesReceived: { $sum: '$totalPaid' }
                }
            }
        ]);

        const prevIncome = prevBillingMetrics[0]?.totalFeesReceived || 0;
        const incomeGrowth = prevIncome > 0 ? ((billing.totalFeesReceived - prevIncome) / prevIncome) * 100 : 0;

        // Previous expenditures
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(endDate);
        const periodDiff = endDate.getTime() - startDate.getTime();
        prevStartDate.setTime(prevStartDate.getTime() - periodDiff);
        prevEndDate.setTime(prevEndDate.getTime() - periodDiff);

        const prevExpenditures = await Expenditure.find({
            ...expendituresQuery,
            expenditureDate: { $gte: prevStartDate, $lte: prevEndDate },
            status: 'paid'
        }).lean();

        const prevExpenses = prevExpenditures.reduce((sum: number, e: any) => sum + e.amount, 0);
        const expenseGrowth = prevExpenses > 0 ? ((totalExpenditures - prevExpenses) / prevExpenses) * 100 : 0;

        // ============= CHART DATA =============

        // Generate billing-based chart data
        const chartLabels: string[] = [];
        const chartIncome: number[] = [];
        const chartExpenses: number[] = [];

        const dataPoints = period === 'today' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12;

        // For billing data, we'll aggregate by payment dates from linked payments
        for (let i = dataPoints - 1; i >= 0; i--) {
            const pointDate = new Date(endDate);

            if (period === 'today') {
                pointDate.setHours(pointDate.getHours() - i);
                chartLabels.push(pointDate.getHours() + ':00');
            } else if (period === 'week' || period === 'month') {
                pointDate.setDate(pointDate.getDate() - i);
                chartLabels.push(pointDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
            } else {
                pointDate.setMonth(pointDate.getMonth() - i);
                chartLabels.push(pointDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
            }

            const pointStart = new Date(pointDate);
            const pointEnd = new Date(pointDate);

            if (period === 'today') {
                pointEnd.setHours(pointEnd.getHours() + 1);
            } else {
                pointEnd.setDate(pointEnd.getDate() + 1);
            }

            // Get payments from billing records for this period
            const pointPayments = await StudentBilling.aggregate([
                { $match: billingQuery },
                { $unwind: '$linkedPayments' },
                {
                    $match: {
                        'linkedPayments.datePaid': { $gte: pointStart, $lt: pointEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$linkedPayments.amount' }
                    }
                }
            ]);

            const pointExpenditures = await Expenditure.find({
                ...expendituresQuery,
                expenditureDate: { $gte: pointStart, $lt: pointEnd },
                status: 'paid'
            }).lean();

            chartIncome.push(pointPayments[0]?.total || 0);
            chartExpenses.push(pointExpenditures.reduce((sum: number, e: any) => sum + e.amount, 0));
        }

        // ============= RECENT TRANSACTIONS =============

        // Recent payments from billing
        const recentPayments = await StudentBilling.aggregate([
            { $match: billingQuery },
            { $unwind: '$linkedPayments' },
            { $sort: { 'linkedPayments.datePaid': -1 } },
            { $limit: 10 },
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
                    type: { $literal: 'payment' },
                    date: '$linkedPayments.datePaid',
                    amount: '$linkedPayments.amount',
                    description: { $concat: ['Fee payment - ', { $ifNull: ['$linkedPayments.paymentMethod', 'N/A'] }] },
                    student: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
                    status: { $literal: 'confirmed' }
                }
            }
        ]);

        const recentExpenditures = await Expenditure.find(expendituresQuery).sort({ expenditureDate: -1 }).limit(10).lean();

        const recentTransactions = [
            ...recentPayments,
            ...recentExpenditures.map((e: any) => ({
                _id: e._id,
                type: 'expenditure' as const,
                date: e.expenditureDate,
                amount: e.amount,
                description: e.description,
                student: e.vendor || 'N/A',
                status: e.status,
                category: e.category
            }))
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20);

        // ============= RESPONSE =============

        return NextResponse.json({
            success: true,
            summary: {
                // From Billing Model
                totalFeesExpected: billing.totalFeesExpected,
                totalFeesReceived: billing.totalFeesReceived,
                totalDailyCollections,
                totalScholarships,
                totalIncome,

                // Expenditures
                totalExpenditures,
                pendingExpenditures,
                approvedExpenditures,

                // Receivables (from Billing)
                totalOutstanding: billing.totalOutstanding,
                totalBalanceBroughtForward: billing.totalBalanceBroughtForward,
                criticalDebtors,
                overdueAmount,

                // Cash Position
                netCashFlow,
                cashAtHand,
                bankBalance,

                // Growth
                incomeGrowth,
                expenseGrowth,

                // Source indicator
                dataSource: 'StudentBilling'
            },
            chartData: {
                labels: chartLabels,
                income: chartIncome,
                expenses: chartExpenses
            },
            recentTransactions,
            period: {
                start: startDate,
                end: endDate,
                type: period
            }
        });
    } catch (error) {
        console.error('Error fetching financial summary (billing):', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch financial summary'
            },
            { status: 500 }
        );
    }
}
