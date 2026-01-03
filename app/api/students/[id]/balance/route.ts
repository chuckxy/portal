import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';
import FeesPayment from '@/models/FeesPayment';
import FeesConfiguration from '@/models/FeesConfiguration';

/**
 * Calculate historical arrears based on student's class history
 * @param studentId - Student ID
 * @param classHistory - Array of class history entries
 * @param currentAcademicYear - Current academic year to exclude from arrears
 * @param currentAcademicTerm - Current academic term to exclude from arrears
 * @returns Object with total arrears and breakdown
 */
async function calculateHistoricalArrears(studentId: string, classHistory: any[], currentAcademicYear: string, currentAcademicTerm?: number) {
    let totalArrears = 0;
    const arrearsBreakdown: any[] = [];

    // Process each class history entry
    for (const history of classHistory) {
        // Skip current period (will be calculated separately)
        if (history.academicYear === currentAcademicYear) {
            if (currentAcademicTerm === undefined || history.academicTerm === currentAcademicTerm) {
                continue;
            }
            // If current term is specified and this is an earlier term in same year, include it
            if (currentAcademicTerm && history.academicTerm >= currentAcademicTerm) {
                continue;
            }
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

        if (!feeConfig) {
            // No fee config found for this period - skip
            continue;
        }

        const periodFees = feeConfig.totalAmount || 0;

        // Get payments for this specific period
        const periodPayments = await FeesPayment.find({
            student: studentId,
            academicYear: history.academicYear,
            academicTerm: history.academicTerm,
            status: { $in: ['confirmed', 'pending'] }
        }).lean();

        const periodPaid = periodPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const periodArrears = periodFees - periodPaid;

        // Add to total arrears (can be negative if overpaid)
        totalArrears += periodArrears;

        // Track breakdown
        arrearsBreakdown.push({
            academicYear: history.academicYear,
            academicTerm: history.academicTerm,
            class: history.class,
            feesRequired: periodFees,
            feesPaid: periodPaid,
            arrears: periodArrears
        });
    }

    return {
        totalArrears,
        arrearsBreakdown
    };
}

// GET /api/students/[id]/balance - Get student's outstanding balance
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id } = params;
        const searchParams = request.nextUrl.searchParams;
        const academicYear = searchParams.get('year') || '2024/2025';
        const academicTermParam = searchParams.get('term');
        const academicTerm = academicTermParam ? parseInt(academicTermParam) : undefined;

        // Get student
        // @ts-ignore
        const student = await Person.findById(id)
            .populate([
                { path: 'studentInfo.currentClass', select: 'className' },
                { path: 'schoolSite', select: 'siteName' }
            ])
            .lean();

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        if (!student.studentInfo?.currentClass) {
            return NextResponse.json({ error: 'Student has no assigned class' }, { status: 400 });
        }

        // Build fees configuration query
        const feesConfigQuery: any = {
            site: student.schoolSite,
            class: student.studentInfo.currentClass,
            academicYear,
            isActive: true
        };

        // Add term filter if specified
        if (academicTerm) {
            feesConfigQuery.academicTerm = academicTerm;
        }

        // Get fees configuration for this student's class, year, and term
        const feesConfig = await FeesConfiguration.findOne(feesConfigQuery).lean();

        if (!feesConfig) {
            return NextResponse.json(
                {
                    error: "No fees configuration found for this student's class, academic year" + (academicTerm ? ' and term' : ''),
                    details: {
                        class: student.studentInfo.currentClass,
                        site: student.schoolSite,
                        academicYear,
                        academicTerm
                    }
                },
                { status: 404 }
            );
        }

        const totalFees = feesConfig.totalAmount || 0;

        // Get Balance Brought Forward (opening balance from before computerization)
        const balanceBroughtForward = student.studentInfo?.balanceBroughtForward || 0;

        // Calculate historical arrears from class history
        const classHistory = student.studentInfo?.classHistory || [];
        const { totalArrears: historicalArrears, arrearsBreakdown } = await calculateHistoricalArrears(id, classHistory, academicYear, academicTerm);

        // Get all payments for current period
        const paymentFilter: any = {
            student: id,
            academicYear,
            status: { $in: ['confirmed', 'pending'] }
        };

        // Add term filter if specified
        if (academicTerm) {
            paymentFilter.academicTerm = academicTerm;
        }

        const payments = await FeesPayment.find(paymentFilter).select('amountPaid datePaid academicTerm receiptNumber').sort({ datePaid: -1 }).lean();

        const totalPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const outstandingBalance = Math.max(0, totalFees - totalPaid);

        // Total outstanding = B/F + historical arrears + current period outstanding
        // Historical arrears can be negative (overpayment) which reduces total outstanding
        const totalOutstanding = balanceBroughtForward + historicalArrears + outstandingBalance;

        return NextResponse.json({
            student: {
                _id: student._id,
                firstName: student.firstName,
                middleName: student.middleName,
                lastName: student.lastName,
                studentId: student.studentInfo?.studentId,
                currentClass: student.studentInfo?.currentClass,
                schoolSite: student.schoolSite
            },
            balance: {
                studentId: id,
                academicYear,
                academicTerm,
                totalFeesForPeriod: totalFees,
                totalPaid,
                outstandingBalance,
                historicalArrears, // Arrears from previous periods based on class history
                arrearsBreakdown, // Detailed breakdown by period
                balanceBroughtForward, // Opening balance from before computerization
                totalOutstanding,
                currency: feesConfig.currency || 'GHS',
                feesConfiguration: {
                    _id: feesConfig._id,
                    configName: feesConfig.configName,
                    feeItems: feesConfig.feeItems,
                    paymentDeadline: feesConfig.paymentDeadline,
                    installmentAllowed: feesConfig.installmentAllowed
                },
                previousPayments: payments.map((p) => ({
                    _id: p._id,
                    amountPaid: p.amountPaid,
                    datePaid: p.datePaid,
                    term: p.academicTerm,
                    receiptNumber: p.receiptNumber
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching student balance:', error);
        return NextResponse.json({ error: 'Failed to fetch student balance' }, { status: 500 });
    }
}
