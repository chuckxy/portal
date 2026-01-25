import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';

// GET student count for a specific class
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const classId = params.id;

        // Count students in the class where personCategory is 'student' and isActive is true
        const studentCount = await Person.countDocuments({
            'studentInfo.currentClass': classId,
            personCategory: 'student',
            isActive: true
        });

        return NextResponse.json({
            success: true,
            classId,
            studentCount
        });
    } catch (error: any) {
        console.error('Error fetching student count:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch student count', error: error.message }, { status: 500 });
    }
}
