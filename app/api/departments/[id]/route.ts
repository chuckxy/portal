import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Department from '@/models/Department';
import Faculty from '@/models/Faculty';

// GET a single department by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const department = await Department.findById(id).populate('faculty', 'name').populate('school', 'name').populate('site', 'siteName').populate('head.person', 'firstName lastName').populate('subjects', 'name').lean().exec();

        if (!department) {
            return NextResponse.json({ success: false, message: 'Department not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            department
        });
    } catch (error: any) {
        console.error('Error fetching department:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch department', error: error.message }, { status: 500 });
    }
}

// PUT update a department
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const body = await request.json();
        const { name, description, faculty, school, site, head, isActive } = body;

        // Validate required fields
        if (!name || !faculty || !school || !site) {
            return NextResponse.json({ success: false, message: 'Name, faculty, school, and site are required' }, { status: 400 });
        }

        // Check if department exists
        const existingDepartment = await Department.findById(id);
        if (!existingDepartment) {
            return NextResponse.json({ success: false, message: 'Department not found' }, { status: 404 });
        }

        // Extract ObjectId strings properly (handle if they come as objects or strings)
        const oldFacultyId = existingDepartment.faculty.toString();
        const newFacultyId = typeof faculty === 'object' && faculty._id ? faculty._id : faculty.toString();

        // Check if another department with the same name exists in the same faculty
        const duplicateDepartment = await Department.findOne({
            name,
            faculty: newFacultyId,
            school,
            _id: { $ne: id }
        });

        if (duplicateDepartment) {
            return NextResponse.json({ success: false, message: 'A department with this name already exists in the selected faculty' }, { status: 409 });
        }

        // If faculty changed, update both old and new faculty
        if (oldFacultyId !== newFacultyId) {
            // Remove from old faculty
            await Faculty.findByIdAndUpdate(oldFacultyId, {
                $pull: { departments: id }
            });
            // Add to new faculty
            await Faculty.findByIdAndUpdate(newFacultyId, {
                $addToSet: { departments: id }
            });
        } else {
            // Even if faculty didn't change, ensure department is in the faculty's departments array
            await Faculty.findByIdAndUpdate(newFacultyId, {
                $addToSet: { departments: id }
            });
        }

        // Update department
        const updatedDepartment = await Department.findByIdAndUpdate(
            id,
            {
                name,
                description,
                faculty: newFacultyId,
                school,
                site,
                head: head || undefined,
                isActive: isActive !== undefined ? isActive : true
            },
            { new: true, runValidators: true }
        )
            .populate('faculty', 'name')
            .populate('head.person', 'firstName lastName')
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            message: 'Department updated successfully',
            department: updatedDepartment
        });
    } catch (error: any) {
        console.error('Error updating department:', error);
        return NextResponse.json({ success: false, message: 'Failed to update department', error: error.message }, { status: 500 });
    }
}

// DELETE a department
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const department = await Department.findById(id);

        if (!department) {
            return NextResponse.json({ success: false, message: 'Department not found' }, { status: 404 });
        }

        // Check if department has subjects
        if (department.subjects && department.subjects.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete department with assigned subjects. Please remove all subjects first.'
                },
                { status: 400 }
            );
        }

        // Remove department from faculty's departments array
        await Faculty.findByIdAndUpdate(department.faculty, {
            $pull: { departments: id }
        });

        // Soft delete: set isActive to false
        await Department.findByIdAndUpdate(id, { isActive: false });

        // Or hard delete (uncomment if you prefer)
        // await Department.findByIdAndDelete(params.id);

        return NextResponse.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting department:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete department', error: error.message }, { status: 500 });
    }
}
