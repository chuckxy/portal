import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Department from '@/models/Department';
import { withActivityLogging } from '@/lib/middleware/activityLogging';
import Faculty from '@/models/Faculty';

// GET all departments
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const facultyId = searchParams.get('faculty');
        const schoolId = searchParams.get('school');
        const siteId = searchParams.get('site');

        let query: any = { isActive: true };

        if (facultyId) query.faculty = facultyId;
        if (schoolId) query.school = schoolId;
        if (siteId) query.site = siteId;

        const departments = await Department.find(query).populate('faculty', 'name').populate('head.person', 'firstName lastName').sort({ name: 1 }).lean().exec();

        return NextResponse.json({
            success: true,
            departments,
            count: departments.length
        });
    } catch (error: any) {
        console.error('Error fetching departments:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch departments', error: error.message }, { status: 500 });
    }
}

// POST create a new department
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();
        const { name, description, faculty, school, site, head, isActive } = body;

        // Validate required fields
        if (!name || !faculty || !school || !site) {
            return NextResponse.json({ success: false, message: 'Name, faculty, school, and site are required' }, { status: 400 });
        }

        // Check if department already exists in the same faculty
        const existingDepartment = await Department.findOne({
            name,
            faculty,
            school
        });

        if (existingDepartment) {
            return NextResponse.json({ success: false, message: 'A department with this name already exists in the selected faculty' }, { status: 409 });
        }

        // Create new department
        const newDepartment = await Department.create({
            name,
            description,
            faculty,
            school,
            site,
            head: head || undefined,
            subjects: [],
            isActive: isActive !== undefined ? isActive : true
        });

        // Add department to faculty's departments array
        await Faculty.findByIdAndUpdate(faculty, {
            $addToSet: { departments: newDepartment._id }
        });

        const populatedDepartment = await Department.findById(newDepartment._id).populate('faculty', 'name').populate('head.person', 'firstName lastName').lean().exec();

        return NextResponse.json(
            {
                success: true,
                message: 'Department created successfully',
                department: populatedDepartment
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating department:', error);
        return NextResponse.json({ success: false, message: 'Failed to create department', error: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'crud',
    actionType: 'create',
    entityType: 'department',
    entityIdExtractor: (req, res) => res?.department?._id?.toString(),
    entityNameExtractor: (req, res) => res?.department?.name
});
