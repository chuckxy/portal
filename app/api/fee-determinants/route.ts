import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeeDeterminant from '@/models/FeeDeterminant';

// GET - List fee determinants with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const schoolSite = searchParams.get('schoolSite');
        const isActive = searchParams.get('isActive');

        // Build query
        const query: any = {};
        if (school) query.school = school;
        if (schoolSite) query.schoolSite = schoolSite;
        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const feeDeterminants = await FeeDeterminant.find(query).populate('school', 'name').populate('schoolSite', 'siteName').sort({ determinant: 1 }).lean();

        return NextResponse.json({
            success: true,
            feeDeterminants,
            count: feeDeterminants.length
        });
    } catch (error: any) {
        console.error('Error fetching fee determinants:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch fee determinants', details: error.message }, { status: 500 });
    }
}

// POST - Create new fee determinant
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validation
        if (!body.determinant) {
            return NextResponse.json({ success: false, error: 'Fee item name is required' }, { status: 400 });
        }
        if (!body.description) {
            return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
        }
        if (body.amount === null || body.amount === undefined) {
            return NextResponse.json({ success: false, error: 'Amount is required' }, { status: 400 });
        }
        if (!body.school) {
            return NextResponse.json({ success: false, error: 'School is required' }, { status: 400 });
        }

        // Check for duplicate determinant name within the same school and site
        const query: any = {
            school: body.school,
            determinant: body.determinant.trim()
        };
        if (body.schoolSite) {
            query.schoolSite = body.schoolSite;
        } else {
            query.schoolSite = { $exists: false };
        }

        const existingDeterminant = await FeeDeterminant.findOne(query);
        if (existingDeterminant) {
            return NextResponse.json({ success: false, error: 'A fee determinant with this name already exists for this school/site' }, { status: 409 });
        }

        // Create fee determinant
        const feeDeterminant = new FeeDeterminant({
            determinant: body.determinant.trim(),
            description: body.description.trim(),
            amount: body.amount,
            school: body.school,
            schoolSite: body.schoolSite || undefined,
            isActive: body.isActive !== undefined ? body.isActive : true
        });

        await feeDeterminant.save();

        // Populate references
        await feeDeterminant.populate([
            { path: 'school', select: 'name' },
            { path: 'schoolSite', select: 'siteName' }
        ]);

        return NextResponse.json(
            {
                success: true,
                feeDeterminant,
                message: 'Fee determinant created successfully'
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating fee determinant:', error);
        return NextResponse.json({ success: false, error: 'Failed to create fee determinant', details: error.message }, { status: 500 });
    }
}
