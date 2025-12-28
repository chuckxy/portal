import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import TimeTable from '@/models/TimeTable';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');

        if (!classId || !academicYear || !academicTerm) {
            return NextResponse.json({ success: false, message: 'Missing required parameters' }, { status: 400 });
        }

        const existingTimetable = await TimeTable.findOne({
            class: classId,
            academicYear,
            academicTerm: parseInt(academicTerm),
            isActive: true
        })
            .populate('class', 'className')
            .populate('site', 'siteName')
            .populate('schedule.subject', 'name')
            .populate('schedule.teacher', 'firstName lastName');

        return NextResponse.json({
            success: true,
            exists: !!existingTimetable,
            timetable: existingTimetable,
            message: existingTimetable ? 'An active timetable exists for this class and term' : 'No active timetable found'
        });
    } catch (error: any) {
        console.error('Error checking timetable:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to check timetable' }, { status: 500 });
    }
}
