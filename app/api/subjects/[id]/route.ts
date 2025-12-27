import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Subject from '@/models/Subject';
import Department from '@/models/Department';

// GET a single subject by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const subject = await Subject.findById(id).populate('department', 'name').populate('school', 'name').populate('site', 'siteName').lean().exec();

        if (!subject) {
            return NextResponse.json({ success: false, message: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            subject
        });
    } catch (error: any) {
        console.error('Error fetching subject:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch subject', error: error.message }, { status: 500 });
    }
}

// PUT update a subject
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const body = await request.json();
        const { name, code, category, isGraded, school, site, department, creditHours, description, isActive } = body;

        // Validate required fields
        if (!name || !school) {
            return NextResponse.json({ success: false, message: 'Name and school are required' }, { status: 400 });
        }

        // Check if subject exists
        const existingSubject = await Subject.findById(id);
        if (!existingSubject) {
            return NextResponse.json({ success: false, message: 'Subject not found' }, { status: 404 });
        }

        // Check if code is being changed and if it already exists
        if (code && code !== existingSubject.code) {
            const duplicateSubject = await Subject.findOne({
                code,
                school,
                _id: { $ne: id }
            });

            if (duplicateSubject) {
                return NextResponse.json({ success: false, message: 'A subject with this code already exists' }, { status: 409 });
            }
        }

        // Extract department IDs properly
        const oldDepartmentId = existingSubject.department?.toString();
        const newDepartmentId = typeof department === 'object' && department?._id ? department._id : department;

        // If department changed, update both old and new department
        if (oldDepartmentId !== newDepartmentId) {
            // Remove from old department if exists
            if (oldDepartmentId) {
                await Department.findByIdAndUpdate(oldDepartmentId, {
                    $pull: { subjects: id }
                });
            }
            // Add to new department if specified
            if (newDepartmentId) {
                await Department.findByIdAndUpdate(newDepartmentId, {
                    $addToSet: { subjects: id }
                });
            }
        } else if (newDepartmentId) {
            // Even if department didn't change, ensure subject is in the department's subjects array
            await Department.findByIdAndUpdate(newDepartmentId, {
                $addToSet: { subjects: id }
            });
        }

        // Update subject
        const updatedSubject = await Subject.findByIdAndUpdate(
            id,
            {
                name,
                code: code || undefined,
                category: category || 'core',
                isGraded: isGraded !== undefined ? isGraded : true,
                school,
                site: site || undefined,
                department: newDepartmentId || undefined,
                creditHours: creditHours || 0,
                description: description || undefined,
                isActive: isActive !== undefined ? isActive : true
            },
            { new: true, runValidators: true }
        )
            .populate('department', 'name')
            .populate('site', 'siteName')
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            message: 'Subject updated successfully',
            subject: updatedSubject
        });
    } catch (error: any) {
        console.error('Error updating subject:', error);
        return NextResponse.json({ success: false, message: 'Failed to update subject', error: error.message }, { status: 500 });
    }
}

// DELETE a subject
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const subject = await Subject.findById(id);

        if (!subject) {
            return NextResponse.json({ success: false, message: 'Subject not found' }, { status: 404 });
        }

        // Remove subject from department's subjects array if department is assigned
        if (subject.department) {
            await Department.findByIdAndUpdate(subject.department, {
                $pull: { subjects: id }
            });
        }

        // Soft delete: set isActive to false
        await Subject.findByIdAndUpdate(id, { isActive: false });

        // Or hard delete (uncomment if you prefer)
        // await Subject.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Subject deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting subject:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete subject', error: error.message }, { status: 500 });
    }
}
