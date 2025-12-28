import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import TimeTable from '@/models/TimeTable';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const siteId = searchParams.get('siteId');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const isActive = searchParams.get('isActive');

        const query: any = {};

        if (classId) query.class = classId;
        if (siteId) query.site = siteId;
        if (academicYear) query.academicYear = academicYear;
        if (academicTerm) query.academicTerm = parseInt(academicTerm);
        if (isActive !== null) query.isActive = isActive === 'true';

        const timetables = await TimeTable.find(query)
            .populate('school', 'schoolName')
            .populate('site', 'siteName')
            .populate('class', 'className level')
            .populate('schedule.subject', 'name code')
            .populate('schedule.teacher', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            data: timetables,
            count: timetables.length
        });
    } catch (error: any) {
        console.error('Error fetching timetables:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch timetables' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Extract user ID from authorization header if available
        const authHeader = request.headers.get('authorization');
        let userId = null;
        if (authHeader) {
            // Parse JWT token to get user ID if needed
            // For now, we'll accept it from the request body or set to null
        }

        // If activating a new timetable, deactivate existing ones for the same class/term
        if (body.isActive) {
            await TimeTable.updateMany(
                {
                    class: body.class,
                    academicYear: body.academicYear,
                    academicTerm: body.academicTerm,
                    isActive: true
                },
                { isActive: false, effectiveTo: new Date() }
            );
        }

        // Check for existing timetable to determine version number
        const existingTimetables = await TimeTable.find({
            class: body.class,
            academicYear: body.academicYear,
            academicTerm: body.academicTerm
        })
            .sort({ version: -1 })
            .limit(1);

        const version = existingTimetables.length > 0 ? existingTimetables[0].version + 1 : 1;

        const timetableData = {
            ...body,
            version,
            createdBy: userId || body.createdBy || null
        };

        const timetable = new TimeTable(timetableData);
        await timetable.save();

        const populatedTimetable = await TimeTable.findById(timetable._id)
            .populate('school', 'schoolName')
            .populate('site', 'siteName')
            .populate('class', 'className level')
            .populate('schedule.subject', 'name code')
            .populate('schedule.teacher', 'firstName lastName');

        return NextResponse.json({
            success: true,
            data: populatedTimetable,
            message: body.isActive ? 'Timetable activated successfully' : 'Draft saved successfully'
        });
    } catch (error: any) {
        console.error('Error creating timetable:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to create timetable' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'Timetable ID is required' }, { status: 400 });
        }

        const body = await request.json();

        // If activating, deactivate others
        if (body.isActive) {
            const timetable = await TimeTable.findById(id);
            if (timetable) {
                await TimeTable.updateMany(
                    {
                        class: timetable.class,
                        academicYear: timetable.academicYear,
                        academicTerm: timetable.academicTerm,
                        isActive: true,
                        _id: { $ne: id }
                    },
                    { isActive: false, effectiveTo: new Date() }
                );
            }
        }

        const updatedTimetable = await TimeTable.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true })
            .populate('school', 'schoolName')
            .populate('site', 'siteName')
            .populate('class', 'className level')
            .populate('schedule.subject', 'name code')
            .populate('schedule.teacher', 'firstName lastName');

        if (!updatedTimetable) {
            return NextResponse.json({ success: false, message: 'Timetable not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: updatedTimetable,
            message: 'Timetable updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating timetable:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to update timetable' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'Timetable ID is required' }, { status: 400 });
        }

        const timetable = await TimeTable.findById(id);

        if (!timetable) {
            return NextResponse.json({ success: false, message: 'Timetable not found' }, { status: 404 });
        }

        // Prevent deletion of active timetables
        if (timetable.isActive) {
            return NextResponse.json({ success: false, message: 'Cannot delete active timetable. Deactivate it first.' }, { status: 400 });
        }

        await TimeTable.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Timetable deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting timetable:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to delete timetable' }, { status: 500 });
    }
}
