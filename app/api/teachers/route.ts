import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';

export const dynamic = 'force-dynamic';

// GET all teachers
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        console.log(searchParams, 'searchParams');
        const schoolId = searchParams.get('school');
        const schoolSiteId = searchParams.get('schoolSite');

        let query: any = { personCategory: 'teacher', isActive: true };

        if (schoolId) query.school = schoolId;
        if (schoolSiteId) query.schoolSite = schoolSiteId;

        const teachers = await Person.find(query).select('firstName middleName lastName contact photoLink employeeInfo').sort({ firstName: 1 }).lean();

        return NextResponse.json({
            success: true,
            teachers,
            count: teachers.length
        });
    } catch (error: any) {
        console.error('Error fetching teachers:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch teachers', error: error.message }, { status: 500 });
    }
}
