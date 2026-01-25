import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * GET /api/student-billing/[id]
 * Get a specific billing record with full details
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
                path: 'student',
                select: 'firstName lastName studentInfo profileImage contact'
            })
            .populate('school', 'name')
            .populate('schoolSite', 'siteName description')
            .populate('class', 'className division sequence')
            .populate('feeConfigurationId', 'configName')
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName')
            .populate('carriedForwardFrom', 'academicYear academicTerm currentBalance')
            .populate('carriedForwardTo', 'academicYear academicTerm')
            .populate({
                path: 'additionalCharges.addedBy',
                select: 'firstName lastName'
            })
            .populate({
                path: 'auditTrail.performedBy',
                select: 'firstName lastName'
            })
            .lean();

        if (!billing) {
            return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
        }

        return NextResponse.json(billing);
    } catch (error: any) {
        console.error('Error fetching billing record:', error);
        return NextResponse.json({ error: 'Failed to fetch billing record', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/student-billing/[id]
 * Update billing record (limited updates allowed for audit compliance)
 */
const putHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
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
        let modifiedBy = data.modifiedBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                modifiedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        // Only allow limited fields to be updated
        const allowedUpdates = ['paymentDueDate', 'notes', 'isLocked'];
        const updateFields: any = {};

        for (const field of allowedUpdates) {
            if (data[field] !== undefined) {
                updateFields[field] = data[field];
            }
        }

        if (modifiedBy) {
            updateFields.lastModifiedBy = modifiedBy;
        }

        const updatedBilling = await StudentBilling.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
            .populate('student', 'firstName lastName studentInfo.studentId')
            .populate('schoolSite', 'siteName description')
            .populate('class', 'className')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Billing record updated successfully',
            billing: updatedBilling
        });
    } catch (error: any) {
        console.error('Error updating billing record:', error);
        return NextResponse.json({ error: 'Failed to update billing record', details: error.message }, { status: 500 });
    }
};

export const PUT = withActivityLogging(putHandler, {
    category: 'crud',
    actionType: 'update',
    entityType: 'billing',
    entityIdExtractor: (req, res) => res?.billing?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const billing = res?.billing;
        if (billing?.student) {
            return `${billing.student.firstName} ${billing.student.lastName}`;
        }
        return undefined;
    }
});

/**
 * DELETE /api/student-billing/[id]
 * Delete billing record (restricted - admin only, unlocked records only)
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
            return NextResponse.json({ error: 'Cannot delete a locked billing record' }, { status: 403 });
        }

        // Check if this billing is referenced by another (carriedForwardFrom)
        const referencedBy = await StudentBilling.findOne({
            carriedForwardFrom: id
        });

        if (referencedBy) {
            return NextResponse.json({ error: 'Cannot delete - this billing record is referenced by a subsequent period' }, { status: 400 });
        }

        // Check if there are any linked payments
        if (billing.linkedPayments && billing.linkedPayments.length > 0) {
            return NextResponse.json({ error: 'Cannot delete - this billing record has linked payments' }, { status: 400 });
        }

        // Update the previous billing's carriedForwardTo if it exists
        if (billing.carriedForwardFrom) {
            await StudentBilling.findByIdAndUpdate(billing.carriedForwardFrom, {
                $unset: { carriedForwardTo: 1 },
                isCurrent: true
            });
        }

        await StudentBilling.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Billing record deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting billing record:', error);
        return NextResponse.json({ error: 'Failed to delete billing record', details: error.message }, { status: 500 });
    }
};

export const DELETE = withActivityLogging(deleteHandler, {
    category: 'crud',
    actionType: 'delete',
    entityType: 'billing',
    entityIdExtractor: async (req, res) => {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }
});
