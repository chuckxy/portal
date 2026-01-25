import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Subject from '@/models/Subject';
import Department from '@/models/Department';

// GET all subjects
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school');
        const siteId = searchParams.get('site');
        const departmentId = searchParams.get('department');
        const category = searchParams.get('category');

        let query: any = { isActive: true };

        if (schoolId) query.school = schoolId;
        if (siteId) query.site = siteId;
        if (departmentId) query.department = departmentId;
        if (category) query.category = category;

        const subjects = await Subject.find(query).populate('department', 'name').populate('site', 'siteName').sort({ name: 1 }).lean().exec();

        return NextResponse.json({
            success: true,
            subjects,
            count: subjects.length
        });
    } catch (error: any) {
        console.error('Error fetching subjects:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch subjects', error: error.message }, { status: 500 });
    }
}

// POST create a new subject
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { name, code, category, isGraded, school, site, department, creditHours, description, isActive } = body;

        // Validate required fields
        if (!name || !school) {
            return NextResponse.json({ success: false, message: 'Name and school are required' }, { status: 400 });
        }

        // Check if code already exists (if provided)
        if (code) {
            const existingSubject = await Subject.findOne({ code, school });
            if (existingSubject) {
                return NextResponse.json({ success: false, message: 'A subject with this code already exists' }, { status: 409 });
            }
        }

        // Create new subject
        const newSubject = await Subject.create({
            name,
            code: code || undefined,
            category: category || 'core',
            isGraded: isGraded !== undefined ? isGraded : true,
            school,
            site: site || undefined,
            department: department || undefined,
            creditHours: creditHours || 0,
            description: description || undefined,
            topics: [],
            resources: [],
            isActive: isActive !== undefined ? isActive : true
        });

        // Add subject to department's subjects array if department is specified
        if (department) {
            await Department.findByIdAndUpdate(department, {
                $addToSet: { subjects: newSubject._id }
            });
        }

        const populatedSubject = await Subject.findById(newSubject._id).populate('department', 'name').populate('site', 'siteName').lean().exec();

        return NextResponse.json(
            {
                success: true,
                message: 'Subject created successfully',
                subject: populatedSubject
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating subject:', error);
        return NextResponse.json({ success: false, message: 'Failed to create subject', error: error.message }, { status: 500 });
    }
}
