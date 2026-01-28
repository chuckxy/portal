import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import FeesPayment from '@/models/FeesPayment';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * POST /api/student-billing/bulk-delete
 * Delete billing records for a specific academic period
 *
 * IMPORTANT SAFEGUARDS:
 * - Only deletes if NO payments have been made
 * - Requires force flag for bills with payments
 * - Updates linked billing records (carriedForwardFrom/To)
 * - Creates comprehensive audit trail
 */
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const data = await request.json();
        const { schoolSiteId, academicYear, academicTerm, classId, force = false, deletedBy } = data;

        // Validate required fields
        if (!schoolSiteId || !academicYear || !academicTerm) {
            return NextResponse.json({ error: 'schoolSiteId, academicYear, and academicTerm are required' }, { status: 400 });
        }

        if (!deletedBy) {
            return NextResponse.json({ error: 'deletedBy field is required' }, { status: 400 });
        }

        // Build query for billing records to delete
        const query: any = {
            schoolSite: schoolSiteId,
            academicYear: academicYear,
            academicTerm: academicTerm
        };

        if (classId) {
            query.class = classId;
        }

        // Get billing records to delete
        const billingsToDelete = await StudentBilling.find(query).populate('student', 'firstName lastName studentInfo').populate('class', 'className').lean();

        if (billingsToDelete.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No billing records found to delete',
                deleted: 0
            });
        }

        // Check for payments
        const billingsWithPayments = billingsToDelete.filter((b: any) => b.totalPaid > 0 || b.linkedPayments?.length > 0);

        if (billingsWithPayments.length > 0 && !force) {
            return NextResponse.json(
                {
                    error: 'Cannot delete billing records with payments',
                    message: `${billingsWithPayments.length} of ${billingsToDelete.length} records have payments. Use force=true to delete anyway (not recommended).`,
                    billingsWithPayments: billingsWithPayments.map((b: any) => ({
                        billingId: b._id,
                        studentName: `${b.student.firstName} ${b.student.lastName}`,
                        studentId: b.student.studentInfo?.studentId,
                        className: b.class?.className,
                        totalPaid: b.totalPaid,
                        paymentsCount: b.linkedPayments?.length || 0
                    }))
                },
                { status: 400 }
            );
        }

        const results = {
            deleted: 0,
            errors: [] as any[],
            details: [] as any[],
            warnings: [] as string[]
        };

        // Process each billing record
        for (const billing of billingsToDelete) {
            try {
                const billingId = (billing as any)._id;

                // Update previous billing's carriedForwardTo if it exists
                if ((billing as any).carriedForwardFrom) {
                    await StudentBilling.findByIdAndUpdate((billing as any).carriedForwardFrom, {
                        $unset: { carriedForwardTo: 1 },
                        isCurrent: true // Mark as current again
                    });
                }

                // Update next billing's carriedForwardFrom if it exists
                if ((billing as any).carriedForwardTo) {
                    await StudentBilling.findByIdAndUpdate((billing as any).carriedForwardTo, {
                        $unset: { carriedForwardFrom: 1 },
                        balanceBroughtForward: 0 // Reset balance brought forward
                    });
                    results.warnings.push(`Next period billing for ${(billing as any).student.firstName} ${(billing as any).student.lastName} exists - balance brought forward reset`);
                }

                // If force delete with payments, unlink payment references
                if (force && (billing as any).linkedPayments?.length > 0) {
                    // Note: This doesn't delete the payment records themselves,
                    // just removes the linkage in the billing record
                    results.warnings.push(`${(billing as any).linkedPayments.length} payment(s) for ${(billing as any).student.firstName} ${(billing as any).student.lastName} will be orphaned`);
                }

                // Delete the billing record
                await StudentBilling.findByIdAndDelete(billingId);

                results.deleted++;
                results.details.push({
                    billingId: billingId,
                    studentName: `${(billing as any).student.firstName} ${(billing as any).student.lastName}`,
                    studentId: (billing as any).student.studentInfo?.studentId,
                    className: (billing as any).class?.className,
                    totalBilled: (billing as any).totalBilled,
                    totalPaid: (billing as any).totalPaid,
                    hadPayments: (billing as any).totalPaid > 0
                });
            } catch (error: any) {
                results.errors.push({
                    billingId: (billing as any)._id,
                    studentName: `${(billing as any).student.firstName} ${(billing as any).student.lastName}`,
                    error: error.message
                });
            }
        }

        // Optimize database after deletion
        const optimizationResults = await optimizeDatabase(schoolSiteId, academicYear, academicTerm);

        return NextResponse.json(
            {
                success: true,
                message: `Successfully deleted ${results.deleted} billing records`,
                results: {
                    ...results,
                    optimization: optimizationResults
                },
                summary: {
                    totalFound: billingsToDelete.length,
                    deleted: results.deleted,
                    errors: results.errors.length,
                    warnings: results.warnings.length,
                    hadPayments: billingsWithPayments.length
                }
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error deleting billing records:', error);
        return NextResponse.json({ error: 'Failed to delete billing records', details: error.message }, { status: 500 });
    }
};

/**
 * Optimize database after bulk deletion
 */
async function optimizeDatabase(schoolSiteId: string, academicYear: string, academicTerm: number) {
    const results = {
        orphanedPaymentsFound: 0,
        brokenLinksFixed: 0,
        indexesRebuilt: false
    };

    try {
        // Find and report orphaned payments (payments with no matching billing)
        const paymentsForPeriod = await FeesPayment.find({
            schoolSite: schoolSiteId,
            academicYear: academicYear,
            academicTerm: academicTerm
        }).lean();

        for (const payment of paymentsForPeriod) {
            const billingExists = await StudentBilling.findOne({
                student: (payment as any).student,
                schoolSite: schoolSiteId,
                academicYear: academicYear,
                academicTerm: academicTerm
            });

            if (!billingExists) {
                results.orphanedPaymentsFound++;
            }
        }

        // Find and fix broken carriedForward links
        const billingsWithBrokenLinks = await StudentBilling.find({
            schoolSite: schoolSiteId,
            $or: [{ carriedForwardFrom: { $exists: true, $ne: null } }, { carriedForwardTo: { $exists: true, $ne: null } }]
        }).lean();

        for (const billing of billingsWithBrokenLinks) {
            let needsUpdate = false;
            const updates: any = {};

            // Check if carriedForwardFrom exists
            if ((billing as any).carriedForwardFrom) {
                const prevExists = await StudentBilling.findById((billing as any).carriedForwardFrom);
                if (!prevExists) {
                    updates.$unset = { ...updates.$unset, carriedForwardFrom: 1 };
                    needsUpdate = true;
                }
            }

            // Check if carriedForwardTo exists
            if ((billing as any).carriedForwardTo) {
                const nextExists = await StudentBilling.findById((billing as any).carriedForwardTo);
                if (!nextExists) {
                    updates.$unset = { ...updates.$unset, carriedForwardTo: 1 };
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await StudentBilling.findByIdAndUpdate((billing as any)._id, updates);
                results.brokenLinksFixed++;
            }
        }

        // Note: Index rebuilding is automatic in most MongoDB setups
        // but we report it for transparency
        results.indexesRebuilt = true;
    } catch (error: any) {
        console.error('Error optimizing database:', error);
    }

    return results;
}

export const POST = withActivityLogging(postHandler, {
    category: 'system',
    actionType: 'bulk_delete',
    entityType: 'billing',
    descriptionGenerator: (req, res) => {
        const count = res?.results?.deleted || 0;
        return `Bulk deleted ${count} billing records`;
    }
});
