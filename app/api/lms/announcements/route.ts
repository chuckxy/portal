import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import LMSAnnouncement from '@/models/lms/LMSAnnouncement';
import Subject from '@/models/Subject';
import Person from '@/models/Person';

/**
 * GET /api/lms/announcements
 * Fetch announcements with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const subjectId = searchParams.get('subjectId');
        const schoolSiteId = searchParams.get('schoolSiteId');
        const priority = searchParams.get('priority');
        const activeOnly = searchParams.get('activeOnly') === 'true';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const query: any = { isActive: true };

        if (subjectId) query.subjectId = new mongoose.Types.ObjectId(subjectId);
        if (schoolSiteId) query.schoolSiteId = new mongoose.Types.ObjectId(schoolSiteId);
        if (priority) query.priority = priority;

        // Filter for currently active announcements
        if (activeOnly) {
            const now = new Date();
            query.announcementDate = { $lte: now };
            query.$or = [{ runTill: { $exists: false } }, { runTill: null }, { runTill: { $gte: now } }];
        }

        const [announcements, total] = await Promise.all([
            LMSAnnouncement.find(query)
                .populate('subjectId', 'name code')
                .populate('addedBy', 'firstName lastName photoLink')
                .populate('announcementReply.personId', 'firstName lastName photoLink')
                .sort({ isPinned: -1, announcementDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            LMSAnnouncement.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            announcements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { subjectId, schoolSiteId, title, content, announcementDate, runTill, priority = 'medium', addedBy, isPinned = false, attachmentPaths = [], sendEmail = false, targetAudience = 'enrolled' } = body;

        // Validation
        if (!title || !content || !schoolSiteId || !addedBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: title, content, schoolSiteId, addedBy'
                },
                { status: 400 }
            );
        }

        const newAnnouncement = new LMSAnnouncement({
            subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined,
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            title,
            content,
            announcementDate: announcementDate ? new Date(announcementDate) : new Date(),
            runTill: runTill ? new Date(runTill) : undefined,
            priority,
            addedBy: new mongoose.Types.ObjectId(addedBy),
            isPinned,
            attachmentPaths,
            sendEmail,
            targetAudience,
            viewCount: 0,
            announcementReply: [],
            isActive: true
        });

        await newAnnouncement.save();

        const populatedAnnouncement = await LMSAnnouncement.findById(newAnnouncement._id).populate('subjectId', 'name code').populate('addedBy', 'firstName lastName photoLink').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Announcement created successfully',
                announcement: populatedAnnouncement
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating announcement:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
