import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesPayment from '@/models/FeesPayment';
import DailyFeeCollection from '@/models/DailyFeeCollection';
import Expenditure from '@/models/Expenditure';
import Scholarship from '@/models/Scholarship';
import StudentBilling from '@/models/StudentBilling';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const site = searchParams.get('site');
        const academicYear = searchParams.get('academicYear');
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

        // Build base queries for different models
        const siteQuery: any = {}; // For FeesPayment, DailyFeeCollection, Expenditure
        const schoolSiteQuery: any = {}; // For StudentBilling
        if (site) {
            siteQuery.site = site;
            schoolSiteQuery.schoolSite = site;
        }

        // INCOME CALCULATIONS

        // 1. Fee Payments
        const feePaymentsQuery = {
            ...siteQuery,
            academicYear: effectiveAcademicYear,
            status: { $ne: 'failed' },
            datePaid: { $gte: startDate, $lte: endDate }
        };

        const feePayments = await FeesPayment.find(feePaymentsQuery).lean();
        const totalFeesReceived = feePayments.reduce((sum, p) => sum + p.amountPaid, 0);

        // 2. Expected Fees - Source from StudentBilling collection (single source of truth)
        const expectedFeesQuery: any = {
            academicYear: effectiveAcademicYear,
            isCurrent: true
        };
        if (site) expectedFeesQuery.schoolSite = site;

        const expectedFeesAggregation = await StudentBilling.aggregate([
            { $match: expectedFeesQuery },
            {
                $group: {
                    _id: null,
                    totalExpected: { $sum: '$totalBilled' }
                }
            }
        ]);
        const totalFeesExpected = expectedFeesAggregation[0]?.totalExpected || 0;

        // 3. Daily Collections
        const dailyCollectionsQuery = {
            ...siteQuery,
            collectionDate: { $gte: startDate, $lte: endDate }
        };

        const dailyCollections = await DailyFeeCollection.find(dailyCollectionsQuery).lean();
        const totalDailyCollections = dailyCollections.reduce((sum, d) => {
            const canteen = (d as any).canteenFeeAmount || 0;
            const bus = (d as any).busFeeAmount || 0;
            return sum + canteen + bus;
        }, 0);

        // 4. Scholarships
        const scholarshipsQuery = {
            ...schoolSiteQuery,
            academicYear: effectiveAcademicYear,
            status: 'active'
        };

        const scholarships = await Scholarship.find(scholarshipsQuery).lean();

        const totalScholarships = scholarships.reduce((sum, s) => sum + (s.totalGranted || 0), 0);

        const totalIncome = totalFeesReceived + totalDailyCollections;

        // EXPENSE CALCULATIONS

        // Expenditures
        const expendituresQuery = {
            ...siteQuery,
            expenditureDate: { $gte: startDate, $lte: endDate }
        };

        const expenditures = await Expenditure.find(expendituresQuery).lean();

        const totalExpenditures = expenditures.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

        const pendingExpenditures = expenditures.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

        const approvedExpenditures = expenditures.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);

        // RECEIVABLES - Source from StudentBilling collection (single source of truth)
        // Note: Outstanding receivables should include ALL periods with unpaid balances

        const billingQuery: any = {
            currentBalance: { $gt: 0 } // Only get records with outstanding balance
        };
        if (site) billingQuery.schoolSite = site;
        // Optionally filter by academic year if specified
        if (academicYear) billingQuery.academicYear = effectiveAcademicYear;

        // Aggregate outstanding receivables from StudentBilling
        const billingAggregation = await StudentBilling.aggregate([
            { $match: billingQuery },
            {
                $group: {
                    _id: null,
                    totalOutstanding: {
                        $sum: {
                            $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0]
                        }
                    },
                    totalBalanceBroughtForward: { $sum: '$balanceBroughtForward' },
                    criticalDebtors: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [{ $gt: ['$currentBalance', 0] }, { $gt: ['$totalBilled', 0] }, { $lt: [{ $divide: ['$totalPaid', '$totalBilled'] }, 0.25] }]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    overdueCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [{ $gt: ['$currentBalance', 0] }, { $ne: ['$paymentDueDate', null] }, { $lt: ['$paymentDueDate', now] }]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    overdueAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [{ $gt: ['$currentBalance', 0] }, { $ne: ['$paymentDueDate', null] }, { $lt: ['$paymentDueDate', now] }]
                                },
                                '$currentBalance',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const billingData = billingAggregation[0] || {
            totalOutstanding: 0,
            totalBalanceBroughtForward: 0,
            criticalDebtors: 0,
            overdueAmount: 0
        };

        const totalOutstanding = billingData.totalOutstanding;
        const totalBalanceBroughtForward = billingData.totalBalanceBroughtForward;
        const criticalDebtors = billingData.criticalDebtors;
        const overdueAmount = billingData.overdueAmount;

        // CASH POSITION
        const netCashFlow = totalIncome - totalExpenditures;

        // For demo purposes - these would come from actual cash/bank records
        const cashAtHand = totalFeesReceived * 0.3; // Assume 30% cash
        const bankBalance = totalFeesReceived * 0.7; // Assume 70% banked

        // PERIOD COMPARISONS
        // Calculate previous period for growth comparison
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(endDate);
        const periodDiff = endDate.getTime() - startDate.getTime();
        prevStartDate.setTime(prevStartDate.getTime() - periodDiff);
        prevEndDate.setTime(prevEndDate.getTime() - periodDiff);

        const prevPayments = await FeesPayment.find({
            ...siteQuery,
            datePaid: { $gte: prevStartDate, $lte: prevEndDate },
            status: { $ne: 'failed' }
        }).lean();
        const prevIncome = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);

        const prevExpenditures = await Expenditure.find({
            ...siteQuery,
            expenditureDate: { $gte: prevStartDate, $lte: prevEndDate },
            status: 'paid'
        }).lean();
        const prevExpenses = prevExpenditures.reduce((sum, e) => sum + e.amount, 0);

        const incomeGrowth = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseGrowth = prevExpenses > 0 ? ((totalExpenditures - prevExpenses) / prevExpenses) * 100 : 0;

        // CHART DATA
        const chartLabels: string[] = [];
        const chartIncome: number[] = [];
        const chartExpenses: number[] = [];

        // Generate data points based on period
        const dataPoints = period === 'today' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12;

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

            // Calculate income and expenses for this point
            const pointStart = new Date(pointDate);
            const pointEnd = new Date(pointDate);

            if (period === 'today') {
                pointEnd.setHours(pointEnd.getHours() + 1);
            } else {
                pointEnd.setDate(pointEnd.getDate() + 1);
            }

            const pointPayments = await FeesPayment.find({
                ...siteQuery,
                datePaid: { $gte: pointStart, $lte: pointEnd },
                status: { $ne: 'failed' }
            }).lean();

            const pointExpenditures = await Expenditure.find({
                ...siteQuery,
                expenditureDate: { $gte: pointStart, $lte: pointEnd },
                status: 'paid'
            }).lean();

            chartIncome.push(pointPayments.reduce((sum, p) => sum + p.amountPaid, 0));
            chartExpenses.push(pointExpenditures.reduce((sum, e) => sum + e.amount, 0));
        }

        // RECENT TRANSACTIONS
        const recentPayments = await FeesPayment.find(feePaymentsQuery).sort({ datePaid: -1 }).limit(10).populate('student', 'firstName lastName').lean();

        const recentExpenditures = await Expenditure.find(expendituresQuery).sort({ expenditureDate: -1 }).limit(10).lean();

        const recentTransactions = [
            ...recentPayments.map((p) => ({
                _id: p._id,
                type: 'payment' as const,
                date: p.datePaid,
                amount: p.amountPaid,
                description: `Fee payment - ${p.paymentMethod}`,
                student: (p.student as any)?.firstName + ' ' + (p.student as any)?.lastName,
                status: p.status
            })),
            ...recentExpenditures.map((e) => ({
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

        return NextResponse.json({
            success: true,
            summary: {
                totalFeesExpected,
                totalFeesReceived,
                totalDailyCollections,
                totalScholarships,
                totalIncome,
                totalExpenditures,
                pendingExpenditures,
                approvedExpenditures,
                totalOutstanding,
                totalBalanceBroughtForward, // Aggregate opening balances from before computerization
                criticalDebtors,
                overdueAmount,
                netCashFlow,
                cashAtHand,
                bankBalance,
                incomeGrowth,
                expenseGrowth
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
        console.error('Error fetching financial summary:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch financial summary'
            },
            { status: 500 }
        );
    }
}
