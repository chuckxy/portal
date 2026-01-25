import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import FeesPayment from '@/models/FeesPayment';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * POST /api/student-billing/[id]/payments
 * Link a payment to a billing record
 */
const postHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
        }

        const billing = await StudentBilling.findById(id);
        if (!billing) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        const data = await request.json();

        // Extract user from auth header
        const authHeader = request.headers.get('authorization');
        let linkedBy = data.linkedBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                linkedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        if (!linkedBy) {
            return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
        }

        // Validate payment ID
        if (!data.paymentId) {
            return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(data.paymentId)) {
            return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
        }

        // Check if payment exists
        const payment = await FeesPayment.findById(data.paymentId).lean();
        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Verify payment belongs to the same student
        if (payment.student.toString() !== billing.student.toString()) {
            return NextResponse.json({ error: 'Payment does not belong to this student' }, { status: 400 });
        }

        // Check if payment is already linked
        const existingLink = billing.linkedPayments.find((p: any) => p.paymentId.toString() === data.paymentId);

        if (existingLink) {
            return NextResponse.json({ error: 'This payment is already linked to this billing record' }, { status: 409 });
        }

        // Create payment reference
        const paymentRef = {
            paymentId: new mongoose.Types.ObjectId(data.paymentId),
            amount: payment.amountPaid,
            datePaid: payment.datePaid,
            receiptNumber: payment.receiptNumber,
            paymentMethod: payment.paymentMethod
        };

        // Add to linked payments
        billing.linkedPayments.push(paymentRef);

        // Add to audit trail
        billing.auditTrail.push({
            action: 'payment_linked',
            performedBy: new mongoose.Types.ObjectId(linkedBy),
            performedAt: new Date(),
            details: `Linked payment ${payment.receiptNumber || data.paymentId} - ${billing.currency} ${payment.amountPaid}`,
            newValue: paymentRef
        });

        billing.lastModifiedBy = new mongoose.Types.ObjectId(linkedBy);

        // Save will trigger pre-save middleware to recalculate totals
        const savedBilling = await billing.save();

        // Populate and return
        const populatedBilling = await StudentBilling.findById(savedBilling._id).populate('student', 'firstName lastName studentInfo.studentId').populate('schoolSite', 'siteName description').populate('class', 'className').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Payment linked successfully',
                billing: populatedBilling
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error linking payment:', error);
        return NextResponse.json({ error: 'Failed to link payment', details: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'financial',
    actionType: 'update',
    entityType: 'billing',
    entityIdExtractor: (req, res) => res?.billing?._id?.toString(),
    entityNameExtractor: (req, res) => 'Payment linked to billing'
});

/**
 * GET /api/student-billing/[id]/payments
 * Get all linked payments for a billing record
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
        }

        const billing = await StudentBilling.findById(id).select('linkedPayments totalPaid currency student').lean();

        if (!billing) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        // Get full payment details
        const paymentIds = billing.linkedPayments.map((p: any) => p.paymentId);
        const payments = await FeesPayment.find({ _id: { $in: paymentIds } })
            .populate('receivedBy', 'firstName lastName')
            .lean();

        // Also find any unlinked payments for this student in this period
        // This helps finance officers find payments that might need linking

        return NextResponse.json({
            linkedPayments: payments,
            totalPaid: billing.totalPaid,
            currency: billing.currency,
            count: payments.length
        });
    } catch (error: any) {
        console.error('Error fetching linked payments:', error);
        return NextResponse.json({ error: 'Failed to fetch linked payments', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/student-billing/[id]/payments
 * Unlink a payment from a billing record
 */
const deleteHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
        }

        const billing = await StudentBilling.findById(id);
        if (!billing) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        if (billing.isLocked) {
            return NextResponse.json({ error: 'This billing record is locked and cannot be modified' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const paymentId = searchParams.get('paymentId');

        if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
            return NextResponse.json({ error: 'Valid paymentId is required' }, { status: 400 });
        }

        // Extract user from auth header
        const authHeader = request.headers.get('authorization');
        let unlinkedBy: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                unlinkedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        // Find and remove the payment link
        const paymentIndex = billing.linkedPayments.findIndex((p: any) => p.paymentId.toString() === paymentId);

        if (paymentIndex === -1) {
            return NextResponse.json({ error: 'Payment not found in this billing record' }, { status: 404 });
        }

        const removedPayment = billing.linkedPayments[paymentIndex];
        billing.linkedPayments.splice(paymentIndex, 1);

        // Add to audit trail
        if (unlinkedBy) {
            billing.auditTrail.push({
                action: 'payment_linked', // Using same action type for audit
                performedBy: new mongoose.Types.ObjectId(unlinkedBy),
                performedAt: new Date(),
                details: `Unlinked payment ${removedPayment.receiptNumber || paymentId} - ${billing.currency} ${removedPayment.amount}`,
                previousValue: removedPayment
            });
            billing.lastModifiedBy = new mongoose.Types.ObjectId(unlinkedBy);
        }

        await billing.save();

        return NextResponse.json({
            success: true,
            message: 'Payment unlinked successfully'
        });
    } catch (error: any) {
        console.error('Error unlinking payment:', error);
        return NextResponse.json({ error: 'Failed to unlink payment', details: error.message }, { status: 500 });
    }
};

export const DELETE = withActivityLogging(deleteHandler, {
    category: 'financial',
    actionType: 'update',
    entityType: 'billing',
    entityIdExtractor: async (req) => {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        // Path is /api/student-billing/[id]/payments
        return pathParts[pathParts.length - 2];
    }
});
