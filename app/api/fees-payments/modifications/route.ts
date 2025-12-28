import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesPayment from '@/models/FeesPayment';

// Mock payment modifications collection
// In production, you'd create a separate PaymentModification model

interface ModificationRequest {
    paymentId: string;
    modifiedBy: string;
    modifiedAt: Date;
    changes: Record<string, { old: any; new: any }>;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Date;
    approvalNotes?: string;
}

// In-memory store (replace with database in production)
const modifications: ModificationRequest[] = [];

// GET /api/fees-payments/modifications - Get modification requests
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        let filteredModifications = modifications;

        if (status) {
            filteredModifications = modifications.filter((m) => m.status === status);
        }

        // Populate payment and user details
        const populatedModifications = await Promise.all(
            filteredModifications.map(async (mod) => {
                const payment = await FeesPayment.findById(mod.paymentId).populate('student', 'firstName lastName').lean();

                // In production, fetch user details from Person model
                const modifiedBy = { firstName: 'John', lastName: 'Doe' };
                const approvedBy = mod.approvedBy ? { firstName: 'Jane', lastName: 'Smith' } : undefined;

                return {
                    _id: mod.paymentId + '_' + mod.modifiedAt.getTime(),
                    payment: {
                        receiptNumber: payment?.receiptNumber,
                        student: payment?.student,
                        amountPaid: payment?.amountPaid
                    },
                    modifiedBy,
                    modifiedAt: mod.modifiedAt,
                    changes: mod.changes,
                    reason: mod.reason,
                    status: mod.status,
                    approvedBy,
                    approvedAt: mod.approvedAt
                };
            })
        );

        return NextResponse.json(populatedModifications);
    } catch (error) {
        console.error('Error fetching modifications:', error);
        return NextResponse.json({ error: 'Failed to fetch modification requests' }, { status: 500 });
    }
}

// POST /api/fees-payments/modifications - Create modification request
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const data = await request.json();

        // Validate
        if (!data.paymentId || !data.modifiedBy || !data.changes || !data.reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if payment exists
        const payment = await FeesPayment.findById(data.paymentId);
        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Create modification request
        const modification: ModificationRequest = {
            paymentId: data.paymentId,
            modifiedBy: data.modifiedBy,
            modifiedAt: new Date(),
            changes: data.changes,
            reason: data.reason,
            status: 'pending'
        };

        modifications.push(modification);

        return NextResponse.json(
            {
                success: true,
                modification
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating modification request:', error);
        return NextResponse.json({ error: 'Failed to create modification request' }, { status: 500 });
    }
}
