import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import SchoolSite from '@/models/SchoolSite';
import School from '@/models/School';
import mongoose from 'mongoose';

// GET single school site by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid site ID' },
                { status: 400 }
            );
        }

        const site = await SchoolSite.findOne({ _id: id } as any).lean();

        if (!site) {
            return NextResponse.json(
                { success: false, message: 'School site not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            site
        });
    } catch (error: any) {
        console.error('Error fetching school site:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch school site', error: error.message },
            { status: 500 }
        );
    }
}

// PUT update school site
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid site ID' },
                { status: 400 }
            );
        }

        const body: any = await request.json();

        // Remove fields that shouldn't be updated directly
        delete body._id;

        // Validate email if provided
        if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) {
            return NextResponse.json(
                { success: false, message: 'Invalid email address' },
                { status: 400 }
            );
        }

        const site = await SchoolSite.findOneAndUpdate(
            { _id: id } as any,
            { $set: body },
            { new: true, runValidators: true } as any
        ).lean();

        if (!site) {
            return NextResponse.json(
                { success: false, message: 'School site not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'School site updated successfully',
            site
        });
    } catch (error: any) {
        console.error('Error updating school site:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update school site', error: error.message },
            { status: 500 }
        );
    }
}

// DELETE school site (soft delete - mark as inactive)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid site ID' },
                { status: 400 }
            );
        }

        const site = await SchoolSite.findOneAndUpdate(
            { _id: id } as any,
            { $set: { isActive: false } },
            { new: true } as any
        );

        if (!site) {
            return NextResponse.json(
                { success: false, message: 'School site not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'School site deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting school site:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete school site', error: error.message },
            { status: 500 }
        );
    }
}
