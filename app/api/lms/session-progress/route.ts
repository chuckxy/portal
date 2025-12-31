import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import UserLessonProgress from '@/models/lms/UserLessonProgress';
import LMSEnrollment from '@/models/lms/LMSEnrollment';
import mongoose from 'mongoose';

/**
 * Session Progress API
 * Handles saving session time spent on lessons and updating enrollment totals
 */

// GET - Fetch lesson progress for a user
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const searchParams = request.nextUrl.searchParams;
        const lessonId = searchParams.get('lessonId');
        const personId = searchParams.get('personId');
        const subjectId = searchParams.get('subjectId');

        if (!personId) {
            return NextResponse.json({ error: 'personId is required' }, { status: 400 });
        }

        const query: any = {
            personId: new mongoose.Types.ObjectId(personId)
        };

        if (lessonId) {
            query.lessonId = new mongoose.Types.ObjectId(lessonId);
        }

        if (subjectId) {
            query.subjectId = new mongoose.Types.ObjectId(subjectId);
        }

        const progress = await UserLessonProgress.find(query).lean();

        return NextResponse.json({ progress });
    } catch (error) {
        console.error('Error fetching session progress:', error);
        return NextResponse.json({ error: 'Failed to fetch session progress' }, { status: 500 });
    }
}

// POST - Save session time for a lesson
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { lessonId, personId, subjectId, moduleId, chapterId, schoolSiteId, timeSpent, completionPercentage, bookmarkPosition, status } = body;

        if (!lessonId || !personId || !subjectId) {
            return NextResponse.json({ error: 'lessonId, personId, and subjectId are required' }, { status: 400 });
        }

        // Build the update operations
        const setFields: Record<string, unknown> = {
            lastAccessedAt: new Date()
        };

        const setOnInsertFields: Record<string, unknown> = {
            lessonId: new mongoose.Types.ObjectId(lessonId),
            personId: new mongoose.Types.ObjectId(personId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            moduleId: new mongoose.Types.ObjectId(moduleId || subjectId),
            chapterId: new mongoose.Types.ObjectId(chapterId || subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId || personId),
            isActive: true,
            dateStarted: new Date(),
            completionPercentage: 0
        };

        const incFields: Record<string, number> = {};
        if (timeSpent && timeSpent > 0) {
            incFields.timeSpent = timeSpent;
        }

        // Set bookmark position if provided
        if (bookmarkPosition !== undefined && typeof bookmarkPosition === 'number') {
            setFields.bookmarkPosition = bookmarkPosition;
        }

        // First, try to find existing record to check status
        const existing = await UserLessonProgress.findOne({
            lessonId: new mongoose.Types.ObjectId(lessonId),
            personId: new mongoose.Types.ObjectId(personId)
        });

        // Handle status - only upgrade, never downgrade
        const normalizedStatus = status === 'in-progress' ? 'in_progress' : status;
        if (normalizedStatus) {
            const statusOrder: Record<string, number> = { not_started: 0, in_progress: 1, completed: 2 };
            const currentStatus = existing?.status || 'not_started';
            const currentOrder = statusOrder[currentStatus] || 0;
            const newOrder = statusOrder[normalizedStatus] || 0;

            if (newOrder > currentOrder) {
                setFields.status = normalizedStatus;
                if (normalizedStatus === 'completed') {
                    setFields.dateCompleted = new Date();
                }
            }
        } else if (!existing) {
            // New record, set to in_progress
            setOnInsertFields.status = 'in_progress';
        }

        // Handle completion percentage (take max)
        if (completionPercentage !== undefined) {
            const currentPercentage = existing?.completionPercentage || 0;
            if (completionPercentage > currentPercentage) {
                setFields.completionPercentage = completionPercentage;
            }
        }

        // Build the update object
        const updateObj: Record<string, unknown> = {
            $set: setFields,
            $setOnInsert: setOnInsertFields
        };

        if (Object.keys(incFields).length > 0) {
            updateObj.$inc = incFields;
        }

        // Use findOneAndUpdate with upsert to avoid race conditions
        const lessonProgress = await UserLessonProgress.findOneAndUpdate(
            {
                lessonId: new mongoose.Types.ObjectId(lessonId),
                personId: new mongoose.Types.ObjectId(personId)
            },
            updateObj,
            {
                upsert: true,
                new: true,
                runValidators: false
            }
        );

        // Also update enrollment total time
        if (subjectId && timeSpent && timeSpent > 0) {
            try {
                await LMSEnrollment.findOneAndUpdate(
                    {
                        subjectId: new mongoose.Types.ObjectId(subjectId),
                        personId: new mongoose.Types.ObjectId(personId)
                    },
                    {
                        $inc: { totalTimeSpent: timeSpent },
                        $set: { lastAccessedAt: new Date() }
                    }
                );
            } catch (enrollmentError) {
                console.error('Error updating enrollment time:', enrollmentError);
                // Don't fail the request if enrollment update fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Session progress saved',
            progress: lessonProgress
        });
    } catch (error) {
        console.error('Error saving session progress:', error);
        return NextResponse.json({ error: 'Failed to save session progress' }, { status: 500 });
    }
}
