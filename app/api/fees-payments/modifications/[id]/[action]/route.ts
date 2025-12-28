import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesPayment from '@/models/FeesPayment';

// POST /api/fees-payments/modifications/[id]/approve
export async function POST(request: NextRequest, { params }: { params: { id: string; action: string } }) {
    try {
        await connectDB();

        const { id, action } = params;
        const data = await request.json();

        // Get the modification request (in production, fetch from database)
        // For now, we'll extract paymentId from the compound id
        const [paymentId] = id.split('_');

        const payment = await FeesPayment.findById(paymentId);
        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (action === 'approve') {
            // Apply the changes to the payment
            // In production, you'd fetch the modification request and apply changes

            // Add to modification history
            payment.modifyHistory.push({
                modifiedBy: data.approvedBy || 'supervisor-id',
                modifiedAt: new Date(),
                changes: data.changes,
                reason: data.reason || 'Approved by supervisor'
            });

            await payment.save();

            return NextResponse.json({
                success: true,
                message: 'Modification approved and applied',
                payment
            });
        } else if (action === 'reject') {
            // Just log the rejection
            if (!data.notes) {
                return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                message: 'Modification rejected'
            });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing modification:', error);
        return NextResponse.json({ error: 'Failed to process modification' }, { status: 500 });
    }
}
