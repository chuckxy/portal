import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * POST /api/student-billing/[id]/charges
 * Add a new charge to an existing billing record
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

        if (billing.isLocked) {
            return NextResponse.json({ error: 'This billing record is locked and cannot be modified' }, { status: 403 });
        }

        const data = await request.json();

        // Extract user from auth header
        const authHeader = request.headers.get('authorization');
        let addedBy = data.addedBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                addedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        if (!addedBy) {
            return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
        }

        // Validate required fields
        if (!data.particulars || !data.amount) {
            return NextResponse.json({ error: 'particulars and amount are required' }, { status: 400 });
        }

        if (data.amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
        }

        // Create charge object
        const charge = {
            chargedDate: data.chargedDate ? new Date(data.chargedDate) : new Date(),
            category: data.category || 'other',
            particulars: data.particulars,
            amount: parseFloat(data.amount),
            addedBy: new mongoose.Types.ObjectId(addedBy),
            reference: data.reference,
            notes: data.notes,
            createdAt: new Date()
        };

        // Add charge to billing record
        billing.additionalCharges.push(charge);

        // Add to audit trail
        billing.auditTrail.push({
            action: 'charge_added',
            performedBy: new mongoose.Types.ObjectId(addedBy),
            performedAt: new Date(),
            details: `Added charge: ${charge.particulars} - ${billing.currency} ${charge.amount}`,
            newValue: charge
        });

        billing.lastModifiedBy = new mongoose.Types.ObjectId(addedBy);

        // Save will trigger pre-save middleware to recalculate totals
        const savedBilling = await billing.save();

        // Populate and return
        const populatedBilling = await StudentBilling.findById(savedBilling._id)
            .populate('student', 'firstName lastName studentInfo.studentId')
            .populate('schoolSite', 'siteName description')
            .populate('class', 'className')
            .populate({
                path: 'additionalCharges.addedBy',
                select: 'firstName lastName'
            })
            .lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Charge added successfully',
                billing: populatedBilling,
                charge: {
                    ...charge,
                    _id: populatedBilling?.additionalCharges[populatedBilling.additionalCharges.length - 1]._id
                }
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error adding charge:', error);
        return NextResponse.json({ error: 'Failed to add charge', details: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'financial',
    actionType: 'create',
    entityType: 'billing',
    entityIdExtractor: (req, res) => res?.billing?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const billing = res?.billing;
        if (billing?.student) {
            return `Added charge to ${billing.student.firstName} ${billing.student.lastName}`;
        }
        return 'Added charge';
    },
    metadataExtractor: (req, res) => {
        if (res?.charge) {
            return {
                chargeAmount: res.charge.amount,
                chargeParticulars: res.charge.particulars,
                chargeCategory: res.charge.category
            };
        }
        return undefined;
    }
});

/**
 * GET /api/student-billing/[id]/charges
 * Get all charges for a billing record
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
        }

        const billing = await StudentBilling.findById(id)
            .populate({
                path: 'additionalCharges.addedBy',
                select: 'firstName lastName'
            })
            .select('additionalCharges addedChargesTotal currency')
            .lean();

        if (!billing) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        return NextResponse.json({
            charges: billing.additionalCharges,
            total: billing.addedChargesTotal,
            currency: billing.currency,
            count: billing.additionalCharges.length
        });
    } catch (error: any) {
        console.error('Error fetching charges:', error);
        return NextResponse.json({ error: 'Failed to fetch charges', details: error.message }, { status: 500 });
    }
}
