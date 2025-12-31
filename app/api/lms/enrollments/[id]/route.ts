import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import LMSEnrollment from '@/models/lms/LMSEnrollment';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/enrollments/[id]
 * Get a single enrollment by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid enrollment ID' }, { status: 400 });
        }

        const enrollment = await LMSEnrollment.findById(id).populate('subjectId', 'name code description').populate('personId', 'firstName lastName email photoLink studentNo').populate('enrolledBy', 'firstName lastName').lean();

        if (!enrollment) {
            return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, enrollment });
    } catch (error: any) {
        console.error('Error fetching enrollment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/enrollments/[id]
 * Update an enrollment by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid enrollment ID' }, { status: 400 });
        }

        const { status, expiryDate, notes, progressPercentage, finalGrade, completionDate } = body;

        const updateData: any = {};

        if (status !== undefined) updateData.status = status;
        if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
        if (notes !== undefined) updateData.notes = notes;
        if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
        if (finalGrade !== undefined) updateData.finalGrade = finalGrade;
        if (completionDate !== undefined) updateData.completionDate = completionDate ? new Date(completionDate) : null;

        // Auto-complete if progress is 100% and status is enrolled
        if (progressPercentage === 100 && status === 'enrolled') {
            updateData.status = 'completed';
            updateData.completionDate = new Date();
        }

        const updatedEnrollment = await LMSEnrollment.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('subjectId', 'name code')
            .populate('personId', 'firstName lastName email photoLink studentNo')
            .populate('enrolledBy', 'firstName lastName')
            .lean();

        if (!updatedEnrollment) {
            return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Enrollment updated successfully',
            enrollment: updatedEnrollment
        });
    } catch (error: any) {
        console.error('Error updating enrollment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/enrollments/[id]
 * Delete (or deactivate) an enrollment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid enrollment ID' }, { status: 400 });
        }

        if (hardDelete) {
            await LMSEnrollment.findByIdAndDelete(id);
            return NextResponse.json({
                success: true,
                message: 'Enrollment permanently deleted'
            });
        }

        // Soft delete
        await LMSEnrollment.findByIdAndUpdate(id, {
            isActive: false,
            status: 'dropped'
        });

        return NextResponse.json({
            success: true,
            message: 'Enrollment deactivated successfully'
        });
    } catch (error: any) {
        console.error('Error deleting enrollment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
