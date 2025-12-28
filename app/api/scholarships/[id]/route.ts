import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Scholarship from '@/models/Scholarship';
import ScholarshipBody from '@/models/ScholarshipBody';
import mongoose from 'mongoose';

// GET - Get single scholarship by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid scholarship ID' }, { status: 400 });
        }

        const scholarship = await Scholarship.findById(id)
            .populate('student', 'firstName lastName studentId')
            .populate('school', 'name')
            .populate('site', 'siteName')
            .populate('scholarshipBodies', 'name contactPerson contactEmail')
            .populate('grants.scholarshipBody', 'name')
            .populate('usage.approvedBy', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .lean();

        if (!scholarship) {
            return NextResponse.json({ success: false, error: 'Scholarship not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            scholarship
        });
    } catch (error: any) {
        console.error('Error fetching scholarship:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scholarship', details: error.message }, { status: 500 });
    }
}

// PUT - Update scholarship
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid scholarship ID' }, { status: 400 });
        }

        const body = await request.json();

        // Validation
        if (body.student !== undefined && !body.student) {
            return NextResponse.json({ success: false, error: 'Student is required' }, { status: 400 });
        }
        if (body.school !== undefined && !body.school) {
            return NextResponse.json({ success: false, error: 'School is required' }, { status: 400 });
        }
        if (body.site !== undefined && !body.site) {
            return NextResponse.json({ success: false, error: 'Site is required' }, { status: 400 });
        }
        if (body.scholarshipBodies !== undefined && (!body.scholarshipBodies || !Array.isArray(body.scholarshipBodies) || body.scholarshipBodies.length === 0)) {
            return NextResponse.json({ success: false, error: 'At least one scholarship body is required' }, { status: 400 });
        }
        if (body.dateStart !== undefined && !body.dateStart) {
            return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
        }
        if (body.grants !== undefined && (!body.grants || body.grants.length === 0)) {
            return NextResponse.json({ success: false, error: 'At least one grant is required' }, { status: 400 });
        }

        // Validate that each grant has a scholarshipBody
        if (body.grants !== undefined && body.scholarshipBodies !== undefined) {
            for (const grant of body.grants) {
                if (!grant.scholarshipBody) {
                    return NextResponse.json({ success: false, error: 'Each grant must have a scholarship body' }, { status: 400 });
                }
                if (!body.scholarshipBodies.includes(grant.scholarshipBody)) {
                    return NextResponse.json({ success: false, error: 'Grant scholarship body must be from the scholarship bodies list' }, { status: 400 });
                }
            }
        }

        // Update scholarship
        const updateData: any = {};
        if (body.student !== undefined) updateData.student = body.student;
        if (body.school !== undefined) updateData.school = body.school;
        if (body.site !== undefined) updateData.site = body.site;
        if (body.scholarshipType !== undefined) updateData.scholarshipType = body.scholarshipType;
        if (body.scholarshipBodies !== undefined) updateData.scholarshipBodies = body.scholarshipBodies;
        if (body.grants !== undefined) {
            updateData.grants = body.grants;
            // Recalculate totalGranted when grants are updated
            updateData.totalGranted = body.grants.reduce((sum: number, grant: any) => sum + (grant.amount || 0), 0);
        }
        if (body.dateStart !== undefined) updateData.dateStart = new Date(body.dateStart);
        if (body.dateEnd !== undefined) updateData.dateEnd = body.dateEnd ? new Date(body.dateEnd) : null;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.conditions !== undefined) updateData.conditions = body.conditions;
        if (body.documents !== undefined) updateData.documents = body.documents;
        if (body.usage !== undefined) {
            updateData.usage = body.usage;
            // Recalculate balance when usage is updated
            const totalUsed = body.usage.reduce((sum: number, use: any) => sum + (use.amount || 0), 0);
            const totalGranted = updateData.totalGranted !== undefined ? updateData.totalGranted : body.totalGranted || 0;
            updateData.totalUsed = totalUsed;
            updateData.balance = totalGranted - totalUsed;
        }

        // If grants are updated but usage is not, recalculate balance with existing usage
        if (body.grants !== undefined && body.usage === undefined) {
            const existingScholarship = await Scholarship.findById(id);
            if (existingScholarship) {
                const totalUsed = existingScholarship.usage?.reduce((sum: number, use: any) => sum + (use.amount || 0), 0) || 0;
                updateData.totalUsed = totalUsed;
                updateData.balance = updateData.totalGranted - totalUsed;
            }
        }

        const scholarship = await Scholarship.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .populate('student', 'firstName lastName studentId')
            .populate('school', 'name')
            .populate('site', 'siteName')
            .populate('scholarshipBodies', 'name contactPerson contactEmail')
            .populate('grants.scholarshipBody', 'name')
            .populate('usage.approvedBy', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        if (!scholarship) {
            return NextResponse.json({ success: false, error: 'Scholarship not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Scholarship updated successfully',
            scholarship
        });
    } catch (error: any) {
        console.error('Error updating scholarship:', error);
        return NextResponse.json({ success: false, error: 'Failed to update scholarship', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete scholarship
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid scholarship ID' }, { status: 400 });
        }

        const scholarship = await Scholarship.findByIdAndDelete(id);

        if (!scholarship) {
            return NextResponse.json({ success: false, error: 'Scholarship not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Scholarship deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting scholarship:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete scholarship', details: error.message }, { status: 500 });
    }
}
