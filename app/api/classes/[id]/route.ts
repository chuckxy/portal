import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import SiteClass from '@/models/SiteClass';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// GET a single class by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const siteClass = await SiteClass.findById(id)
            .populate('department', 'name')
            .populate('site', 'siteName')
            .populate('formMaster.teacher', 'firstName lastName')
            .populate('prefect', 'firstName lastName')
            .populate('subjects', 'name')
            .populate('students', 'firstName lastName')
            .lean()
            .exec();

        if (!siteClass) {
            return NextResponse.json({ success: false, message: 'Class not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            class: siteClass
        });
    } catch (error: any) {
        console.error('Error fetching class:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch class', error: error.message }, { status: 500 });
    }
}

// PUT update a class
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const body = await request.json();
        const { site, department, division, sequence, className, prefect, classLimit, formMaster, subjects, isActive } = body;

        // Validate required fields
        if (!site || !division || !sequence) {
            return NextResponse.json({ success: false, message: 'Site, division, and sequence are required' }, { status: 400 });
        }

        if (sequence < 1) {
            return NextResponse.json({ success: false, message: 'Sequence must be greater than 0' }, { status: 400 });
        }

        // Check if class exists
        const existingClass = await SiteClass.findById(id);
        if (!existingClass) {
            return NextResponse.json({ success: false, message: 'Class not found' }, { status: 404 });
        }

        // Check if another class with same details exists
        const duplicateClass = await SiteClass.findOne({
            site,
            sequence,
            division: division.toUpperCase(),
            _id: { $ne: id }
        });

        if (duplicateClass) {
            return NextResponse.json({ success: false, message: 'A class with this site, level, and division already exists' }, { status: 409 });
        }

        // Extract IDs from potentially populated objects
        const departmentId = typeof department === 'object' && department?._id ? department._id : department;
        const siteId = typeof site === 'object' && site?._id ? site._id : site;

        // Update class
        const updatedClass = await SiteClass.findByIdAndUpdate(
            id,
            {
                site: siteId,
                department: departmentId || undefined,
                division: division.toUpperCase(),
                sequence,
                className: className || `Form ${sequence}${division.toUpperCase()}`,
                prefect: prefect || undefined,
                classLimit: classLimit || 0,
                formMaster: formMaster || undefined,
                subjects: subjects || [],
                isActive: isActive !== undefined ? isActive : true
            },
            { new: true, runValidators: true }
        )
            .populate('department', 'name')
            .populate('site', 'siteName')
            .populate('formMaster.teacher', 'firstName lastName')
            .populate('prefect', 'firstName lastName')
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            message: 'Class updated successfully',
            class: updatedClass
        });
    } catch (error: any) {
        console.error('Error updating class:', error);
        return NextResponse.json({ success: false, message: 'Failed to update class', error: error.message }, { status: 500 });
    }
}

// DELETE a class
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const siteClass = await SiteClass.findById(id);

        if (!siteClass) {
            return NextResponse.json({ success: false, message: 'Class not found' }, { status: 404 });
        }

        // Check if class has students
        if (siteClass.students && siteClass.students.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete class with enrolled students. Please remove all students first.'
                },
                { status: 400 }
            );
        }

        // Soft delete: set isActive to false
        await SiteClass.findByIdAndUpdate(id, { isActive: false });

        // Or hard delete (uncomment if you prefer)
        // await SiteClass.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Class deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting class:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete class', error: error.message }, { status: 500 });
    }
}
