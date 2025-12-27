import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import Person from '@/models/Person';

// GET /api/students - Get students with filters
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class');
        const schoolId = searchParams.get('school');
        const siteId = searchParams.get('site');
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');

        // Build query - only get persons with student category
        const query: any = {
            personCategory: 'student'
        };

        if (classId) {
            query['studentInfo.currentClass'] = classId;
        }

        if (schoolId) {
            query.school = schoolId;
        }

        if (siteId) {
            query.schoolSite = siteId;
        }

        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Search across student fields
        if (search) {
            query.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { 'studentInfo.studentId': { $regex: search, $options: 'i' } }];
        }

        const students = await Person.find(query)
            .populate('school', 'name')
            .populate('schoolSite', 'siteName')
            .populate('studentInfo.currentClass', 'className')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .select('-password') // Exclude password
            .sort({ firstName: 1, lastName: 1 })
            .lean();

        return NextResponse.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}
