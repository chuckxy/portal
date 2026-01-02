import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import School from '@/models/School';

// GET /api/schools - Get all schools in the system
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const schoolType = searchParams.get('schoolType');
        const isActive = searchParams.get('isActive');
        const limit = searchParams.get('limit');
        const skip = searchParams.get('skip');

        // Build query
        const query: any = {};

        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        if (schoolType) {
            query.schoolType = schoolType;
        }

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            query.isActive = isActive === 'true';
        }

        // Build query options
        let queryBuilder = School.find(query).sort({ name: 1 });

        if (skip) {
            queryBuilder = queryBuilder.skip(parseInt(skip, 10));
        }

        if (limit) {
            queryBuilder = queryBuilder.limit(parseInt(limit, 10));
        }

        // Execute query
        const [schools, total] = await Promise.all([queryBuilder.lean(), School.countDocuments(query)]);

        return NextResponse.json({
            schools,
            total,
            count: schools.length
        });
    } catch (error) {
        console.error('Error fetching schools:', error);
        return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }
}
