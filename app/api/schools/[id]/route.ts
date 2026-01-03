import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import School from '@/models/School';

// GET /api/schools/[id] - Get a single school by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectToDatabase();

        const school = await School.findById(params.id).lean();

        if (!school) {
            return NextResponse.json({ success: false, message: 'School not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: school
        });
    } catch (error: any) {
        console.error('Error fetching school:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch school' }, { status: 500 });
    }
}

// PUT /api/schools/[id] - Update a school
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectToDatabase();

        const body = await request.json();

        const school = await School.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });

        if (!school) {
            return NextResponse.json({ success: false, message: 'School not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: school
        });
    } catch (error: any) {
        console.error('Error updating school:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to update school' }, { status: 500 });
    }
}

// DELETE /api/schools/[id] - Delete a school
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectToDatabase();

        const school = await School.findByIdAndDelete(params.id);

        if (!school) {
            return NextResponse.json({ success: false, message: 'School not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'School deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting school:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to delete school' }, { status: 500 });
    }
}
