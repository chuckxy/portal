import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import SchoolSite from '@/models/SchoolSite';

// GET all school sites
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school');

        let query: any = { isActive: true };

        if (schoolId) query.school = schoolId;

        const sites = await SchoolSite.find(query).select('siteName description phone email address schoolLevel tertiaryType isActive school').sort({ siteName: 1 }).lean();

        return NextResponse.json({
            success: true,
            sites,
            count: sites.length
        });
    } catch (error: any) {
        console.error('Error fetching sites:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch sites', error: error.message }, { status: 500 });
    }
}

// POST create new school site
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body: any = await request.json();

        // Validate required fields
        if (!body.siteName || !body.description || !body.school || !body.schoolLevel) {
            return NextResponse.json({ success: false, message: 'Missing required fields: siteName, description, school, schoolLevel' }, { status: 400 });
        }

        // Validate email if provided
        if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) {
            return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 });
        }

        // Create new school site
        const site = new SchoolSite({
            ...body,
            isActive: true,
            academicYears: [],
            houses: [],
            bulletinBoard: []
        });

        await site.save();

        return NextResponse.json(
            {
                success: true,
                message: 'School site created successfully',
                site
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating school site:', error);
        return NextResponse.json({ success: false, message: 'Failed to create school site', error: error.message }, { status: 500 });
    }
}
