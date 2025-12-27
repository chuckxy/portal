import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ExamScore from '@/models/ExamScore';

// GET - Check for duplicate exam score
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const student = searchParams.get('student');
        const year = searchParams.get('year');
        const term = searchParams.get('term');

        if (!student || !year || !term) {
            return NextResponse.json({ error: 'Student, year, and term are required' }, { status: 400 });
        }

        const existingScore = await ExamScore.findOne({
            student,
            academicYear: year,
            academicTerm: parseInt(term)
        }).select('_id student academicYear academicTerm');

        if (existingScore) {
            return NextResponse.json({
                exists: true,
                recordId: existingScore._id,
                message: 'Exam record already exists for this student, year, and term'
            });
        }

        return NextResponse.json({ exists: false });
    } catch (error: any) {
        console.error('Error checking duplicate:', error);
        return NextResponse.json({ error: 'Failed to check duplicate', details: error.message }, { status: 500 });
    }
}
