import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScholarshipBody from '@/models/ScholarshipBody';

// GET - List scholarship bodies with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');

        // Build query
        const query: any = {};
        if (school) query.school = school;

        const scholarshipBodies = await ScholarshipBody.find(query).populate('school', 'name').sort({ name: 1 }).lean();

        return NextResponse.json({
            success: true,
            scholarshipBodies,
            count: scholarshipBodies.length
        });
    } catch (error: any) {
        console.error('Error fetching scholarship bodies:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scholarship bodies', details: error.message }, { status: 500 });
    }
}

// POST - Create new scholarship body
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validation
        if (!body.name || body.name.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Organization name is required' }, { status: 400 });
        }

        // Optional email validation
        if (body.contactEmail && !/^\S+@\S+\.\S+$/.test(body.contactEmail)) {
            return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
        }

        // Check for duplicate name within the same school
        if (body.school) {
            const existingBody = await ScholarshipBody.findOne({
                name: body.name.trim(),
                school: body.school
            });

            if (existingBody) {
                return NextResponse.json({ success: false, error: 'A scholarship body with this name already exists for this school' }, { status: 409 });
            }
        }

        // Create scholarship body
        const scholarshipBody = new ScholarshipBody({
            name: body.name.trim(),
            contactPerson: body.contactPerson?.trim() || undefined,
            contactPhone: body.contactPhone?.trim() || undefined,
            contactEmail: body.contactEmail?.trim() || undefined,
            school: body.school || undefined
        });

        await scholarshipBody.save();

        // Populate school before returning
        await scholarshipBody.populate('school', 'name');

        return NextResponse.json(
            {
                success: true,
                message: 'Scholarship body created successfully',
                scholarshipBody
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating scholarship body:', error);
        return NextResponse.json({ success: false, error: 'Failed to create scholarship body', details: error.message }, { status: 500 });
    }
}
