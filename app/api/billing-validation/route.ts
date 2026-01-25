import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

/**
 * BILLING VALIDATION API
 *
 * This endpoint validates the integrity of billing data and ensures
 * consistency across all financial calculations.
 *
 * Used for:
 * - Audit compliance
 * - Data integrity verification
 * - Reconciliation checks
 * - Period closure validation
 */

let StudentBilling: any;
let FeesPayment: any;
let FeesConfiguration: any;
let Person: any;

try {
    StudentBilling = mongoose.models.StudentBilling || require('@/models/StudentBilling').default;
    FeesPayment = mongoose.models.FeesPayment || require('@/models/FeesPayment').default;
    FeesConfiguration = mongoose.models.FeesConfiguration || require('@/models/FeesConfiguration').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
} catch (error) {
    console.error('Error loading models:', error);
}

interface ValidationResult {
    isValid: boolean;
    checkName: string;
    description: string;
    details?: any;
    severity: 'info' | 'warning' | 'error';
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const schoolSite = searchParams.get('schoolSite');
        const academicYear = searchParams.get('academicYear');

        const validationResults: ValidationResult[] = [];

        // Build base query
        const baseQuery: any = {};
        if (school) baseQuery.school = new mongoose.Types.ObjectId(school);
        if (schoolSite) baseQuery.schoolSite = new mongoose.Types.ObjectId(schoolSite);
        if (academicYear) baseQuery.academicYear = academicYear;

        // ============= VALIDATION CHECKS =============

        // 1. Check for billing records with calculation mismatches
        const calculationMismatch = await StudentBilling.aggregate([
            { $match: baseQuery },
            {
                $addFields: {
                    calculatedTotal: {
                        $add: ['$balanceBroughtForward', '$termOrSemesterBill', '$addedChargesTotal']
                    },
                    calculatedBalance: {
                        $subtract: ['$totalBilled', '$totalPaid']
                    }
                }
            },
            {
                $match: {
                    $or: [{ $expr: { $ne: ['$totalBilled', '$calculatedTotal'] } }, { $expr: { $ne: ['$currentBalance', '$calculatedBalance'] } }]
                }
            },
            { $count: 'count' }
        ]);

        validationResults.push({
            isValid: (calculationMismatch[0]?.count || 0) === 0,
            checkName: 'Calculation Integrity',
            description: 'Verifies that totalBilled and currentBalance are correctly calculated',
            details: {
                mismatchCount: calculationMismatch[0]?.count || 0
            },
            severity: (calculationMismatch[0]?.count || 0) > 0 ? 'error' : 'info'
        });

        // 2. Check for orphaned billing records (student doesn't exist)
        const orphanedBillings = await StudentBilling.aggregate([
            { $match: baseQuery },
            {
                $lookup: {
                    from: 'people',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            {
                $match: {
                    studentInfo: { $size: 0 }
                }
            },
            { $count: 'count' }
        ]);

        validationResults.push({
            isValid: (orphanedBillings[0]?.count || 0) === 0,
            checkName: 'Orphaned Billing Records',
            description: 'Checks for billing records without valid student references',
            details: {
                orphanedCount: orphanedBillings[0]?.count || 0
            },
            severity: (orphanedBillings[0]?.count || 0) > 0 ? 'warning' : 'info'
        });

        // 3. Check for duplicate billing records (same student, period, site)
        const duplicateBillings = await StudentBilling.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: {
                        student: '$student',
                        academicYear: '$academicYear',
                        academicTerm: '$academicTerm',
                        schoolSite: '$schoolSite'
                    },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        validationResults.push({
            isValid: duplicateBillings.length === 0,
            checkName: 'Duplicate Billing Records',
            description: 'Checks for duplicate billing records per student/period/site',
            details: {
                duplicateGroups: duplicateBillings.length,
                totalDuplicates: duplicateBillings.reduce((sum: number, d: any) => sum + d.count - 1, 0)
            },
            severity: duplicateBillings.length > 0 ? 'error' : 'info'
        });

        // 4. Check for negative totalBilled
        const negativeTotalBilled = await StudentBilling.countDocuments({
            ...baseQuery,
            totalBilled: { $lt: 0 }
        });

        validationResults.push({
            isValid: negativeTotalBilled === 0,
            checkName: 'Negative Total Billed',
            description: 'Checks for billing records with negative totalBilled amounts',
            details: {
                count: negativeTotalBilled
            },
            severity: negativeTotalBilled > 0 ? 'error' : 'info'
        });

        // 5. Check for negative totalPaid
        const negativeTotalPaid = await StudentBilling.countDocuments({
            ...baseQuery,
            totalPaid: { $lt: 0 }
        });

        validationResults.push({
            isValid: negativeTotalPaid === 0,
            checkName: 'Negative Total Paid',
            description: 'Checks for billing records with negative totalPaid amounts',
            details: {
                count: negativeTotalPaid
            },
            severity: negativeTotalPaid > 0 ? 'error' : 'info'
        });

        // 6. Check for status inconsistency
        const statusInconsistent = await StudentBilling.aggregate([
            { $match: baseQuery },
            {
                $match: {
                    $or: [
                        { billingStatus: 'clear', currentBalance: { $ne: 0 } },
                        { billingStatus: 'owing', currentBalance: { $lte: 0 } },
                        { billingStatus: 'overpaid', currentBalance: { $gte: 0 } }
                    ]
                }
            },
            { $count: 'count' }
        ]);

        validationResults.push({
            isValid: (statusInconsistent[0]?.count || 0) === 0,
            checkName: 'Status Consistency',
            description: 'Verifies billing status matches currentBalance value',
            details: {
                inconsistentCount: statusInconsistent[0]?.count || 0
            },
            severity: (statusInconsistent[0]?.count || 0) > 0 ? 'warning' : 'info'
        });

        // 7. Check for unlinked payments (payments not in any billing record)
        const paymentQuery: any = {};
        if (schoolSite) paymentQuery.site = new mongoose.Types.ObjectId(schoolSite);
        if (academicYear) paymentQuery.academicYear = academicYear;

        const allPayments = await FeesPayment.find(paymentQuery).select('_id').lean();
        const allPaymentIds = allPayments.map((p: any) => p._id.toString());

        const linkedPaymentIds = await StudentBilling.aggregate([{ $match: baseQuery }, { $unwind: '$linkedPayments' }, { $group: { _id: null, ids: { $push: { $toString: '$linkedPayments.paymentId' } } } }]);

        const linkedIds = linkedPaymentIds[0]?.ids || [];
        const unlinkedPayments = allPaymentIds.filter((id: string) => !linkedIds.includes(id));

        validationResults.push({
            isValid: unlinkedPayments.length === 0,
            checkName: 'Unlinked Payments',
            description: 'Checks for payments not linked to any billing record',
            details: {
                totalPayments: allPaymentIds.length,
                linkedPayments: linkedIds.length,
                unlinkedCount: unlinkedPayments.length
            },
            severity: unlinkedPayments.length > 0 ? 'warning' : 'info'
        });

        // 8. Check for students without billing records
        const studentQuery: any = {
            personCategory: 'student',
            isActive: true,
            'studentInfo.currentClass': { $exists: true, $ne: null }
        };
        if (school) studentQuery.school = school;
        if (schoolSite) studentQuery.schoolSite = schoolSite;

        const activeStudents = await Person.countDocuments(studentQuery);
        const studentsWithBilling = await StudentBilling.distinct('student', {
            ...baseQuery,
            isCurrent: true
        });

        const studentsWithoutBilling = activeStudents - studentsWithBilling.length;

        validationResults.push({
            isValid: studentsWithoutBilling === 0,
            checkName: 'Students Without Billing',
            description: 'Checks for active students without current billing records',
            details: {
                activeStudents,
                studentsWithBilling: studentsWithBilling.length,
                studentsWithoutBilling
            },
            severity: studentsWithoutBilling > 0 ? 'warning' : 'info'
        });

        // 9. Check for billing vs fee configuration mismatch
        const billingVsConfigMismatch = await StudentBilling.aggregate([
            { $match: { ...baseQuery, feeConfigurationId: { $exists: true } } },
            {
                $lookup: {
                    from: 'feesconfigurations',
                    localField: 'feeConfigurationId',
                    foreignField: '_id',
                    as: 'config'
                }
            },
            { $unwind: '$config' },
            {
                $match: {
                    $expr: { $ne: ['$termOrSemesterBill', '$config.totalAmount'] }
                }
            },
            { $count: 'count' }
        ]);

        validationResults.push({
            isValid: (billingVsConfigMismatch[0]?.count || 0) === 0,
            checkName: 'Billing vs Configuration',
            description: 'Verifies termOrSemesterBill matches linked fee configuration',
            details: {
                mismatchCount: billingVsConfigMismatch[0]?.count || 0
            },
            severity: (billingVsConfigMismatch[0]?.count || 0) > 0 ? 'warning' : 'info'
        });

        // 10. Summary statistics
        const totalBillings = await StudentBilling.countDocuments(baseQuery);
        const totalAmount = await StudentBilling.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: '$currentBalance' }
                }
            }
        ]);

        // Calculate overall validation status
        const hasErrors = validationResults.some((r) => !r.isValid && r.severity === 'error');
        const hasWarnings = validationResults.some((r) => !r.isValid && r.severity === 'warning');

        return NextResponse.json({
            success: true,
            data: {
                overallStatus: hasErrors ? 'FAILED' : hasWarnings ? 'WARNINGS' : 'PASSED',
                validationResults,
                summary: {
                    totalBillingRecords: totalBillings,
                    financials: totalAmount[0] || {
                        totalBilled: 0,
                        totalPaid: 0,
                        totalOutstanding: 0
                    },
                    checksPerformed: validationResults.length,
                    checksPassed: validationResults.filter((r) => r.isValid).length,
                    checksFailed: validationResults.filter((r) => !r.isValid).length
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Billing Validation Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to validate billing data'
            },
            { status: 500 }
        );
    }
}
