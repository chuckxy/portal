import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';
import FeesConfiguration from '@/models/FeesConfiguration';
import FeesPayment from '@/models/FeesPayment';

/**
 * Calculate historical arrears based on student's class history
 * @param studentId - Student ID
 * @param classHistory - Array of class history entries
 * @param currentAcademicYear - Current academic year to exclude from arrears
 * @param currentAcademicTerm - Current academic term to exclude from arrears
 * @returns Total arrears (can be negative if overpaid)
 */
async function calculateHistoricalArrears(studentId: string, classHistory: any[], currentAcademicYear: string, currentAcademicTerm?: number) {
    let totalArrears = 0;

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
    }

    return totalArrears;
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Generate current academic year based on current date
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-indexed (0 = January, 11 = December)
        const currentYear = now.getFullYear();
        const currentAcademicYear =
            currentMonth >= 8 // September or later
                ? `${currentYear}/${currentYear + 1}`
                : `${currentYear - 1}/${currentYear}`;

        const { searchParams } = new URL(request.url);

        const site = searchParams.get('site');
        const classId = searchParams.get('class');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const minBalance = searchParams.get('minBalance');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '10');

        // Build query for students - only get active students with a current class
        const studentQuery: any = {
            personCategory: 'student',
            isActive: true,
            'studentInfo.currentClass': { $exists: true, $ne: null }
        };

        if (search) {
            studentQuery.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { 'studentInfo.studentId': { $regex: search, $options: 'i' } }];
        }

        // Fetch students in batches - only process what we need for this page
        // To get page N with limit L, we need to process enough to have at least (N+1)*L debtors
        // But we don't know which students are debtors until we calculate, so we fetch in chunks
        const STUDENT_BATCH_SIZE = 10;
        const targetDebtorCount = (page + 1) * limit + 5; // Fetch just enough for this page plus a small buffer

        let studentSkip = 0;
        const debtors = [];
        let processedCount = 0;

        while (debtors.length < targetDebtorCount) {
            // Fetch a batch of students
            const students = await Person.find(studentQuery)
                .populate({
                    path: 'studentInfo.currentClass',
                    populate: { path: 'site' }
                })
                .populate('studentInfo.guardian')
                .skip(studentSkip)
                .limit(STUDENT_BATCH_SIZE)
                .lean();

            if (students.length === 0) break; // No more students

            processedCount += students.length;
            studentSkip += STUDENT_BATCH_SIZE;

            for (const student of students) {
                if (!student.studentInfo?.currentClass) continue;

                const currentClass = student.studentInfo.currentClass as any;
                const studentSite = currentClass.site?._id || currentClass.site;

                // Apply filters
                if (site && studentSite?.toString() !== site) continue;
                if (classId && currentClass._id?.toString() !== classId) continue;

                // Build fee configuration query - start with required fields
                const feeConfigQuery: any = {
                    site: studentSite,
                    class: currentClass._id,
                    isActive: true
                };

                // Determine academic year to use
                const effectiveAcademicYear = academicYear || student.studentInfo.defaultAcademicYear || currentAcademicYear;
                feeConfigQuery.academicYear = effectiveAcademicYear;

                // Only add term to query if explicitly provided or student has default
                if (academicTerm) {
                    feeConfigQuery.academicTerm = parseInt(academicTerm);
                } else if (student.studentInfo.defaultAcademicTerm) {
                    feeConfigQuery.academicTerm = student.studentInfo.defaultAcademicTerm;
                }
                // If neither is provided, find any fee config for the year (don't filter by term)

                // Get fee configuration for this student's class
                const feeConfig = await FeesConfiguration.findOne(feeConfigQuery).populate('site').lean();

                if (!feeConfig) {
                    // Try without term filter if we had one
                    if (feeConfigQuery.academicTerm) {
                        delete feeConfigQuery.academicTerm;
                        const feeConfigAnyTerm = await FeesConfiguration.findOne(feeConfigQuery).populate('site').lean();
                        if (!feeConfigAnyTerm) {
                            console.log(`No fee config found for student ${student._id}, class ${currentClass._id}, year ${effectiveAcademicYear}`);
                            continue;
                        }
                        // Use the found config
                        Object.assign(feeConfig as any, feeConfigAnyTerm);
                    } else {
                        console.log(`No fee config found for student ${student._id}, class ${currentClass._id}, year ${effectiveAcademicYear}`);
                        continue;
                    }
                }

                // Get all payments for this student - match the fee config context
                const paymentQuery: any = {
                    student: student._id,
                    class: currentClass._id,
                    site: studentSite,
                    status: { $ne: 'failed' },
                    academicYear: effectiveAcademicYear
                };

                // Only filter by term if fee config has a term
                if (feeConfig.academicTerm) {
                    paymentQuery.academicTerm = feeConfig.academicTerm;
                }

                const payments = await FeesPayment.find(paymentQuery).sort({ datePaid: -1 }).lean();

                const totalFeesPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);

                // Get Balance Brought Forward (opening balance from before computerization)
                const balanceBroughtForward = student.studentInfo?.balanceBroughtForward || 0;

                // Calculate historical arrears from class history
                const classHistory = student.studentInfo?.classHistory || [];
                const historicalArrears = await calculateHistoricalArrears(student._id.toString(), classHistory, effectiveAcademicYear, feeConfig.academicTerm);

                // Calculate outstanding: current period outstanding + historical arrears + balance brought forward
                // Historical arrears can be negative (overpayment) which reduces total
                const currentPeriodOutstanding = feeConfig.totalAmount - totalFeesPaid;
                const outstandingBalance = balanceBroughtForward + historicalArrears + currentPeriodOutstanding;

                // Only include students with outstanding balance > 0 (including balance B/F)
                if (outstandingBalance <= 0) {
                    console.log(`Student ${student._id} has no outstanding balance (${outstandingBalance})`);
                    continue;
                }

                // Apply minimum balance filter
                if (minBalance && outstandingBalance < parseFloat(minBalance)) continue;

                // Calculate percentage paid based on total required (current fees + historical arrears + balance B/F)
                // Note: if historicalArrears is negative (overpaid), it reduces the total required
                const totalRequired = feeConfig.totalAmount + historicalArrears + balanceBroughtForward;
                const percentagePaid = totalRequired > 0 ? (totalFeesPaid / totalRequired) * 100 : 0;

                // Calculate days overdue if deadline exists
                let daysOverdue = 0;
                if (feeConfig.paymentDeadline) {
                    const deadline = new Date(feeConfig.paymentDeadline);
                    const today = new Date();
                    const diffTime = today.getTime() - deadline.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        daysOverdue = diffDays;
                    }
                }

                const lastPayment = payments[0]; // Already sorted by date descending

                debtors.push({
                    _id: student._id,
                    studentId: student.studentInfo.studentId || 'N/A',
                    firstName: student.firstName,
                    lastName: student.lastName,
                    otherNames: student.otherNames,
                    profilePicture: student.profilePicture,
                    contact: student.contact,
                    studentInfo: {
                        guardian: student.studentInfo.guardian,
                        currentClass: currentClass,
                        accountBalance: student.studentInfo.accountBalance,
                        balanceBroughtForward: balanceBroughtForward
                    },
                    site: feeConfig.site,
                    class: currentClass,
                    academicYear: effectiveAcademicYear,
                    academicTerm: feeConfig.academicTerm,
                    totalFeesRequired: feeConfig.totalAmount,
                    balanceBroughtForward: balanceBroughtForward, // Opening balance from before computerization
                    historicalArrears: historicalArrears, // Arrears from previous periods based on class history
                    totalFeesPaid: totalFeesPaid,
                    outstandingBalance: outstandingBalance,
                    percentagePaid: parseFloat(percentagePaid.toFixed(2)),
                    paymentDeadline: feeConfig.paymentDeadline,
                    daysOverdue: daysOverdue,
                    lastPaymentDate: lastPayment?.datePaid,
                    lastPaymentAmount: lastPayment?.amountPaid,
                    paymentCount: payments.length,
                    feeConfiguration: {
                        _id: feeConfig._id,
                        configName: feeConfig.configName,
                        feeItems: feeConfig.feeItems
                    },
                    payments: payments.map((p) => ({
                        _id: p._id,
                        amountPaid: p.amountPaid,
                        datePaid: p.datePaid,
                        paymentMethod: p.paymentMethod,
                        receiptNumber: p.receiptNumber
                    }))
                });
            }

            // If we have enough debtors for this page, stop processing more students
            if (debtors.length >= targetDebtorCount) break;
        }

        // Sort by outstanding balance (highest first)
        debtors.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

        const skip = page * limit;
        const paginatedDebtors = debtors.slice(skip, skip + limit);
        const hasMore = debtors.length > skip + limit;

        console.log(`Processed ${processedCount} students, found ${debtors.length} debtors, returning ${paginatedDebtors.length} for page ${page}`);

        return NextResponse.json({
            success: true,
            debtors: paginatedDebtors,
            count: paginatedDebtors.length,
            totalRecords: debtors.length, // Only debtors found so far, not absolute total
            hasMore,
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching student debtors:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch student debtors'
            },
            { status: 500 }
        );
    }
}
