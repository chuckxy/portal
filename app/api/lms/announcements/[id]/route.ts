import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import LMSAnnouncement from '@/models/lms/LMSAnnouncement';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/announcements/[id]
 * Get a single announcement by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid announcement ID' }, { status: 400 });
        }

        // Increment view count
        const announcement = await LMSAnnouncement.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
            .populate('subjectId', 'name code description')
            .populate('addedBy', 'firstName lastName photoLink')
            .populate('announcementReply.personId', 'firstName lastName photoLink')
            .lean();

        if (!announcement) {
            return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, announcement });
    } catch (error: any) {
        console.error('Error fetching announcement:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/announcements/[id]
 * Update an announcement by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid announcement ID' }, { status: 400 });
        }

        const { title, content, announcementDate, runTill, priority, isPinned, attachmentPaths, sendEmail, targetAudience, isActive } = body;

        const updateData: any = {};

        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (announcementDate !== undefined) updateData.announcementDate = new Date(announcementDate);
        if (runTill !== undefined) updateData.runTill = runTill ? new Date(runTill) : null;
        if (priority !== undefined) updateData.priority = priority;
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (attachmentPaths !== undefined) updateData.attachmentPaths = attachmentPaths;
        if (sendEmail !== undefined) updateData.sendEmail = sendEmail;
        if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedAnnouncement = await LMSAnnouncement.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('subjectId', 'name code')
            .populate('addedBy', 'firstName lastName photoLink')
            .populate('announcementReply.personId', 'firstName lastName photoLink')
            .lean();

        if (!updatedAnnouncement) {
            return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Announcement updated successfully',
            announcement: updatedAnnouncement
        });
    } catch (error: any) {
        console.error('Error updating announcement:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/announcements/[id]
 * Delete (or deactivate) an announcement
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid announcement ID' }, { status: 400 });
        }

        if (hardDelete) {
            await LMSAnnouncement.findByIdAndDelete(id);
            return NextResponse.json({
                success: true,
                message: 'Announcement permanently deleted'
            });
        }

        // Soft delete
        await LMSAnnouncement.findByIdAndUpdate(id, { isActive: false });

        return NextResponse.json({
            success: true,
            message: 'Announcement archived successfully'
        });
    } catch (error: any) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/lms/announcements/[id]
 * Add a reply to an announcement
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid announcement ID' }, { status: 400 });
        }

        const { action, personId, content, replyIndex } = body;

        if (action === 'addReply') {
            if (!personId || !content) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Missing required fields: personId, content'
                    },
                    { status: 400 }
                );
            }

            const updatedAnnouncement = await LMSAnnouncement.findByIdAndUpdate(
                id,
                {
                    $push: {
                        announcementReply: {
                            personId: new mongoose.Types.ObjectId(personId),
                            content,
                            repliedAt: new Date(),
                            isEdited: false
                        }
                    }
                },
                { new: true }
            )
                .populate('subjectId', 'name code')
                .populate('addedBy', 'firstName lastName photoLink')
                .populate('announcementReply.personId', 'firstName lastName photoLink')
                .lean();

            return NextResponse.json({
                success: true,
                message: 'Reply added successfully',
                announcement: updatedAnnouncement
            });
        }

        if (action === 'deleteReply') {
            if (replyIndex === undefined) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Missing required field: replyIndex'
                    },
                    { status: 400 }
                );
            }

            const announcement = await LMSAnnouncement.findById(id);
            if (!announcement) {
                return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
            }

            announcement.announcementReply.splice(replyIndex, 1);
            await announcement.save();

            const updatedAnnouncement = await LMSAnnouncement.findById(id).populate('subjectId', 'name code').populate('addedBy', 'firstName lastName photoLink').populate('announcementReply.personId', 'firstName lastName photoLink').lean();

            return NextResponse.json({
                success: true,
                message: 'Reply deleted successfully',
                announcement: updatedAnnouncement
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error with announcement action:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
