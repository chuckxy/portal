import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeeDeterminant from '@/models/FeeDeterminant';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET - Get single fee determinant by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const feeDeterminant = await FeeDeterminant.findById(id).populate('school', 'name').populate('schoolSite', 'siteName');

        if (!feeDeterminant) {
            return NextResponse.json({ success: false, error: 'Fee determinant not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            feeDeterminant
        });
    } catch (error: any) {
        console.error('Error fetching fee determinant:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch fee determinant', details: error.message }, { status: 500 });
    }
}

// PUT - Update fee determinant
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        // Find existing determinant
        const existingDeterminant = await FeeDeterminant.findById(id);
        if (!existingDeterminant) {
            return NextResponse.json({ success: false, error: 'Fee determinant not found' }, { status: 404 });
        }

        // Check for duplicate name if determinant is being changed
        if (body.determinant && body.determinant !== existingDeterminant.determinant) {
            const query: any = {
                _id: { $ne: id },
                school: body.school || existingDeterminant.school,
                determinant: body.determinant.trim()
            };
            if (body.schoolSite) {
                query.schoolSite = body.schoolSite;
            } else if (existingDeterminant.schoolSite) {
                query.schoolSite = existingDeterminant.schoolSite;
            } else {
                query.schoolSite = { $exists: false };
            }

            const duplicate = await FeeDeterminant.findOne(query);
            if (duplicate) {
                return NextResponse.json({ success: false, error: 'A fee determinant with this name already exists for this school/site' }, { status: 409 });
            }
        }

        // Update fields
        if (body.determinant) existingDeterminant.determinant = body.determinant.trim();
        if (body.description) existingDeterminant.description = body.description.trim();
        if (body.amount !== undefined) existingDeterminant.amount = body.amount;
        if (body.school) existingDeterminant.school = body.school;
        if (body.schoolSite !== undefined) existingDeterminant.schoolSite = body.schoolSite || undefined;
        if (body.isActive !== undefined) existingDeterminant.isActive = body.isActive;

        await existingDeterminant.save();

        // Populate references
        await existingDeterminant.populate([
            { path: 'school', select: 'name' },
            { path: 'schoolSite', select: 'siteName' }
        ]);

        return NextResponse.json({
            success: true,
            feeDeterminant: existingDeterminant,
            message: 'Fee determinant updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating fee determinant:', error);
        return NextResponse.json({ success: false, error: 'Failed to update fee determinant', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete fee determinant
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const feeDeterminant = await FeeDeterminant.findByIdAndDelete(id);

        if (!feeDeterminant) {
            return NextResponse.json({ success: false, error: 'Fee determinant not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Fee determinant deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting fee determinant:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete fee determinant', details: error.message }, { status: 500 });
    }
}
