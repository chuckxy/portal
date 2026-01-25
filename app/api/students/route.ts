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
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '0'); // 0 means no limit

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

        if (academicYear) {
            query['studentInfo.defaultAcademicYear'] = academicYear;
        }

        if (academicTerm) {
            query['studentInfo.defaultAcademicTerm'] = parseInt(academicTerm);
        }

        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Search across student fields
        if (search) {
            query.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { 'studentInfo.studentId': { $regex: search, $options: 'i' } }];
        }

        let studentsQuery = Person.find(query)
            .populate('school', 'name')
            .populate('schoolSite', 'siteName')
            .populate('studentInfo.currentClass', 'className')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .select('-password')
            .sort({ firstName: 1, lastName: 1 });

        // Apply pagination if limit is specified
        if (limit > 0) {
            const skip = (page - 1) * limit;
            studentsQuery = studentsQuery.skip(skip).limit(limit);
        }

        const students = await studentsQuery.lean();

        // Add fullName virtual field to lean results
        const studentsWithFullName = students.map((student: any) => ({
            ...student,
            fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
        }));

        const totalCount = await Person.countDocuments(query);
        return NextResponse.json({
            students: studentsWithFullName,
            total: totalCount,
            page,
            limit: limit || totalCount,
            totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}
