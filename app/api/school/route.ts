import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import School from '@/models/School';

// GET /api/school - Get schools
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('_id');
        const name = searchParams.get('name');
        const schoolType = searchParams.get('schoolType');
        const isActive = searchParams.get('isActive');

        // Build query
        const query: any = {};

        if (schoolId) {
            query._id = schoolId;
        }

        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        if (schoolType) {
            query.schoolType = schoolType;
        }

        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // If specific school ID requested, return single school
        if (schoolId) {
            const school = await School.findById(schoolId).lean();
            if (!school) {
                return NextResponse.json({ error: 'School not found' }, { status: 404 });
            }
            return NextResponse.json(school);
        }

        // Otherwise return list of schools
        const schools = await School.find(query).sort({ name: 1 }).lean();

        return NextResponse.json(schools);
    } catch (error) {
        console.error('Error fetching schools:', error);
        return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }
}
