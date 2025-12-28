import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScholarshipBody from '@/models/ScholarshipBody';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET - Get single scholarship body by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const scholarshipBody = await ScholarshipBody.findById(id).populate('school', 'name');

        if (!scholarshipBody) {
            return NextResponse.json({ success: false, error: 'Scholarship body not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            scholarshipBody
        });
    } catch (error: any) {
        console.error('Error fetching scholarship body:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scholarship body', details: error.message }, { status: 500 });
    }
}

// PUT - Update scholarship body
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        // Find existing scholarship body
        const existingBody = await ScholarshipBody.findById(id);
        if (!existingBody) {
            return NextResponse.json({ success: false, error: 'Scholarship body not found' }, { status: 404 });
        }

        // Validation
        if (body.name && body.name.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Organization name is required' }, { status: 400 });
        }

        // Optional email validation
        if (body.contactEmail && !/^\S+@\S+\.\S+$/.test(body.contactEmail)) {
            return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
        }

        // Check for duplicate name if name is being changed
        if (body.name && body.name !== existingBody.name) {
            const query: any = {
                _id: { $ne: id },
                name: body.name.trim()
            };

            if (body.school || existingBody.school) {
                query.school = body.school || existingBody.school;
            }

            const duplicate = await ScholarshipBody.findOne(query);
            if (duplicate) {
                return NextResponse.json({ success: false, error: 'A scholarship body with this name already exists for this school' }, { status: 409 });
            }
        }

        // Update fields
        if (body.name) existingBody.name = body.name.trim();
        if (body.contactPerson !== undefined) existingBody.contactPerson = body.contactPerson?.trim() || undefined;
        if (body.contactPhone !== undefined) existingBody.contactPhone = body.contactPhone?.trim() || undefined;
        if (body.contactEmail !== undefined) existingBody.contactEmail = body.contactEmail?.trim() || undefined;
        if (body.school !== undefined) existingBody.school = body.school || undefined;

        await existingBody.save();

        // Populate school before returning
        await existingBody.populate('school', 'name');

        return NextResponse.json({
            success: true,
            message: 'Scholarship body updated successfully',
            scholarshipBody: existingBody
        });
    } catch (error: any) {
        console.error('Error updating scholarship body:', error);
        return NextResponse.json({ success: false, error: 'Failed to update scholarship body', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete scholarship body
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const scholarshipBody = await ScholarshipBody.findById(id);
        if (!scholarshipBody) {
            return NextResponse.json({ success: false, error: 'Scholarship body not found' }, { status: 404 });
        }

        // TODO: Check if scholarship body is referenced by any scholarships
        // This would require the Scholarship model to be fully implemented
        // For now, we'll allow deletion

        await ScholarshipBody.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Scholarship body deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting scholarship body:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete scholarship body', details: error.message }, { status: 500 });
    }
}
