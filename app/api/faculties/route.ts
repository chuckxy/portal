import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Faculty from '@/models/Faculty';

// GET all faculties
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school');
        const siteId = searchParams.get('site');

        let query: any = { isActive: true };

        if (schoolId) query.school = schoolId;
        if (siteId) query.site = siteId;

        const faculties = await Faculty.find(query)
            .populate('head.person', 'firstName lastName')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({
            success: true,
            faculties,
            count: faculties.length
        });
    } catch (error: any) {
        console.error('Error fetching faculties:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch faculties', error: error.message },
            { status: 500 }
        );
    }
}

// POST create new faculty
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body: any = await request.json();

        // Validate required fields
        if (!body.name || !body.school || !body.site) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: name, school, site' },
                { status: 400 }
            );
        }

        // Check if faculty name already exists for this school and site
        const existingFaculty = await Faculty.findOne({
            name: body.name,
            school: body.school,
            site: body.site
        } as any);

        if (existingFaculty) {
            return NextResponse.json(
                { success: false, message: 'Faculty with this name already exists for this school and site' },
                { status: 400 }
            );
        }

        // Create new faculty
        const faculty = new Faculty({
            ...body,
            isActive: true,
            departments: []
        });

        await faculty.save();

        return NextResponse.json({
            success: true,
            message: 'Faculty created successfully',
            faculty
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating faculty:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create faculty', error: error.message },
            { status: 500 }
        );
    }
}
