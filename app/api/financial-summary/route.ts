import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';
import FeesConfiguration from '@/models/FeesConfiguration';
import FeesPayment from '@/models/FeesPayment';
import DailyFeeCollection from '@/models/DailyFeeCollection';
import Expenditure from '@/models/Expenditure';
import Scholarship from '@/models/Scholarship';

/**
 * Calculate historical arrears based on student's class history
 */
async function calculateHistoricalArrears(studentId: string, classHistory: any[], currentAcademicYear: string) {
    let totalArrears = 0;

    for (const history of classHistory) {
        // Skip current period
        if (history.academicYear === currentAcademicYear) {
            continue;
        }

        // Skip future periods
        if (history.academicYear > currentAcademicYear) {
            continue;
        }

        // Get fees configuration for this period and class
        const feeConfig = await FeesConfiguration.findOne({
            class: history.class,
            academicYear: history.academicYear,
            academicTerm: history.academicTerm,
            isActive: true
        }).lean();

        if (!feeConfig) continue;

        const periodFees = feeConfig.totalAmount || 0;

        // Get payments for this specific period
        const periodPayments = await FeesPayment.find({
            student: studentId,
            academicYear: history.academicYear,
            academicTerm: history.academicTerm,
            status: { $in: ['confirmed', 'pending'] }
        }).lean();

        const periodPaid = periodPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        totalArrears += periodFees - periodPaid;
    }

    return totalArrears;
}

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

        // Build base query
        const baseQuery: any = {};
        if (site) baseQuery.site = site;

        // INCOME CALCULATIONS

        // 1. Fee Payments
        const feePaymentsQuery = {
            ...baseQuery,
            academicYear: effectiveAcademicYear,
            status: { $ne: 'failed' },
            datePaid: { $gte: startDate, $lte: endDate }
        };

        const feePayments = await FeesPayment.find(feePaymentsQuery).lean();
        const totalFeesReceived = feePayments.reduce((sum, p) => sum + p.amountPaid, 0);

        // 2. Expected Fees (from configurations)
        const feeConfigQuery: any = {
            isActive: true,
            academicYear: effectiveAcademicYear
        };
        if (site) feeConfigQuery.site = site;

        const feeConfigurations = await FeesConfiguration.find(feeConfigQuery).lean();

        // Get student count per class to calculate expected
        let totalFeesExpected = 0;
        for (const config of feeConfigurations) {
            const studentCount = await Person.countDocuments({
                personCategory: 'student',
                isActive: true,
                'studentInfo.currentClass': config.class
            });
            totalFeesExpected += config.totalAmount * studentCount;
        }

        // 3. Daily Collections
        const dailyCollectionsQuery = {
            ...baseQuery,
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
            ...baseQuery,
            academicYear: effectiveAcademicYear,
            status: 'active'
        };

        const scholarships = await Scholarship.find(scholarshipsQuery).lean();

        const totalScholarships = scholarships.reduce((sum, s) => sum + (s.totalGranted || 0), 0);

        const totalIncome = totalFeesReceived + totalDailyCollections;

        // EXPENSE CALCULATIONS

        // Expenditures
        const expendituresQuery = {
            ...baseQuery,
            expenditureDate: { $gte: startDate, $lte: endDate }
        };

        const expenditures = await Expenditure.find(expendituresQuery).lean();

        const totalExpenditures = expenditures.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

        const pendingExpenditures = expenditures.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

        const approvedExpenditures = expenditures.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);

        // RECEIVABLES

        // Calculate outstanding from all active students
        const studentsQuery: any = {
            personCategory: 'student',
            isActive: true,
            'studentInfo.currentClass': { $exists: true, $ne: null }
        };
        if (site) studentsQuery.schoolSite = site;

        // @ts-ignore
        const students = await Person.find(studentsQuery).populate('studentInfo.currentClass').lean();

        let totalOutstanding = 0;
        let totalBalanceBroughtForward = 0; // Aggregate B/F across all students
        let criticalDebtors = 0;
        let overdueAmount = 0;

        for (const student of students) {
            const currentClass = (student.studentInfo as any)?.currentClass;
            if (!currentClass) continue;

            const classConfig = await FeesConfiguration.findOne({
                class: currentClass._id,
                academicYear: effectiveAcademicYear,
                isActive: true
            }).lean();

            if (!classConfig) continue;

            // Get Balance Brought Forward (opening balance from before computerization)
            const balanceBroughtForward = (student.studentInfo as any)?.balanceBroughtForward || 0;
            totalBalanceBroughtForward += balanceBroughtForward;

            // Calculate historical arrears from class history
            const classHistory = (student.studentInfo as any)?.classHistory || [];
            const historicalArrears = await calculateHistoricalArrears(student._id.toString(), classHistory, effectiveAcademicYear);

            const payments = await FeesPayment.find({
                student: student._id,
                academicYear: effectiveAcademicYear,
                status: { $ne: 'failed' }
            }).lean();

            const paid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

            // Calculate outstanding: B/F + historical arrears + current period outstanding
            // Historical arrears can be negative (overpayment)
            const currentPeriodOutstanding = classConfig.totalAmount - paid;
            const outstanding = balanceBroughtForward + historicalArrears + currentPeriodOutstanding;

            if (outstanding > 0) {
                totalOutstanding += outstanding;

                // Calculate percentage based on total required (current fees + historical arrears + balance B/F)
                const totalRequired = classConfig.totalAmount + historicalArrears + balanceBroughtForward;
                const percentagePaid = totalRequired > 0 ? (paid / totalRequired) * 100 : 0;
                if (percentagePaid < 25) criticalDebtors++;

                // Check if overdue
                if (classConfig.paymentDeadline && new Date(classConfig.paymentDeadline) < now) {
                    overdueAmount += outstanding;
                }
            }
        }

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
            ...baseQuery,
            datePaid: { $gte: prevStartDate, $lte: prevEndDate },
            status: { $ne: 'failed' }
        }).lean();
        const prevIncome = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);

        const prevExpenditures = await Expenditure.find({
            ...baseQuery,
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
                ...baseQuery,
                datePaid: { $gte: pointStart, $lte: pointEnd },
                status: { $ne: 'failed' }
            }).lean();

            const pointExpenditures = await Expenditure.find({
                ...baseQuery,
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
