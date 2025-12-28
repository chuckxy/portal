import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';
import FeesPayment from '@/models/FeesPayment';
import FeesConfiguration from '@/models/FeesConfiguration';

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

        // Calculate previous arrears (from all periods before current year/term)
        // Get all fees configurations for this student before current period
        const previousFeesQuery: any = {
            site: student.schoolSite,
            class: student.studentInfo.currentClass,
            isActive: true
        };

        // Filter to get only previous periods
        const allFeesConfigs = await FeesConfiguration.find(previousFeesQuery).lean();

        // Separate current and previous configs
        const previousConfigs = allFeesConfigs.filter((config) => {
            if (config.academicYear === academicYear) {
                // Same year - check term if provided
                if (academicTerm && config.academicTerm) {
                    return config.academicTerm < academicTerm;
                }
                return false; // Same year, same/no term = not previous
            }
            // Different year - simple string comparison (assumes format like "2024/2025")
            return config.academicYear < academicYear;
        });

        const totalPreviousFees = previousConfigs.reduce((sum, config) => sum + (config.totalAmount || 0), 0);

        // Get all payments from previous periods
        const previousPaymentsQuery: any = {
            student: id,
            status: { $in: ['confirmed', 'pending'] }
        };

        const allPayments = await FeesPayment.find(previousPaymentsQuery).select('amountPaid academicYear academicTerm').lean();

        // Filter to get only previous period payments
        const previousPayments = allPayments.filter((payment) => {
            if (payment.academicYear === academicYear) {
                // Same year - check term if provided
                if (academicTerm && payment.academicTerm) {
                    return payment.academicTerm < academicTerm;
                }
                return false; // Same year, same/no term = not previous
            }
            // Different year
            return payment.academicYear < academicYear;
        });

        const totalPreviousPayments = previousPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const previousArrears = Math.max(0, totalPreviousFees - totalPreviousPayments);

        // Total outstanding including previous arrears
        const totalOutstanding = previousArrears + outstandingBalance;

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
                previousArrears,
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
