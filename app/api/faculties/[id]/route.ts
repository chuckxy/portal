import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Faculty from '@/models/Faculty';
import mongoose from 'mongoose';

// GET single faculty by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid faculty ID' },
                { status: 400 }
            );
        }

        const faculty = await Faculty.findOne({ _id: id } as any).lean();

        if (!faculty) {
            return NextResponse.json(
                { success: false, message: 'Faculty not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            faculty
        });
    } catch (error: any) {
        console.error('Error fetching faculty:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch faculty', error: error.message },
            { status: 500 }
        );
    }
}

// PUT update faculty
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid faculty ID' },
                { status: 400 }
            );
        }

        const body: any = await request.json();

        // Remove fields that shouldn't be updated directly
        delete body._id;

        // Check if updating name and if it already exists
        if (body.name) {
            const existingFaculty = await Faculty.findOne({
                name: body.name,
                school: body.school,
                site: body.site,
                _id: { $ne: id }
            } as any);

            if (existingFaculty) {
                return NextResponse.json(
                    { success: false, message: 'Faculty with this name already exists for this school and site' },
                    { status: 400 }
                );
            }
        }

        const faculty = await Faculty.findOneAndUpdate(
            { _id: id } as any,
            { $set: body },
            { new: true, runValidators: true } as any
        ).lean();

        if (!faculty) {
            return NextResponse.json(
                { success: false, message: 'Faculty not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Faculty updated successfully',
            faculty
        });
    } catch (error: any) {
        console.error('Error updating faculty:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update faculty', error: error.message },
            { status: 500 }
        );
    }
}

// DELETE faculty (soft delete - mark as inactive)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid faculty ID' },
                { status: 400 }
            );
        }

        const faculty = await Faculty.findOneAndUpdate(
            { _id: id } as any,
            { $set: { isActive: false } },
            { new: true } as any
        );

        if (!faculty) {
            return NextResponse.json(
                { success: false, message: 'Faculty not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Faculty deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting faculty:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete faculty', error: error.message },
            { status: 500 }
        );
    }
}
