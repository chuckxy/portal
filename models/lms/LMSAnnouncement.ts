import mongoose, { Schema, Document, Model } from 'mongoose';
import { AnnouncementPriority, IAnnouncementReply } from './types';

/**
 * LMS Announcement Schema
 * Course announcements with embedded replies
 *
 * Integration Note: Maps to LMS Announcement
 * This extends beyond SMS bulletin board with course-specific
 * announcements and reply functionality
 *
 * References:
 *   - Subject (unified from Course)
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface ILMSAnnouncement extends Document {
    subjectId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    title: string;
    content: string;
    announcementDate: Date;
    runTill?: Date;
    priority: AnnouncementPriority;
    addedBy: mongoose.Types.ObjectId;
    announcementReply: IAnnouncementReply[];
    isPinned: boolean;
    attachmentPaths: string[];
    viewCount: number;
    sendEmail: boolean;
    emailSentAt?: Date;
    targetAudience: 'all' | 'enrolled' | 'instructors';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LMSAnnouncementSchema = new Schema<ILMSAnnouncement>(
    {
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            maxlength: 256,
            trim: true,
            index: true
        },
        content: {
            type: String,
            required: true
        },
        announcementDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        runTill: {
            type: Date,
            index: true
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            index: true
        },
        // UNIFIED: References Person (replaces addedByUser)
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        // Embedded replies for better performance
        announcementReply: [
            {
                personId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person',
                    required: true
                },
                content: {
                    type: String,
                    required: true,
                    trim: true
                },
                repliedAt: {
                    type: Date,
                    default: Date.now
                },
                isEdited: {
                    type: Boolean,
                    default: false
                },
                editedAt: {
                    type: Date
                }
            }
        ],
        isPinned: {
            type: Boolean,
            default: false,
            index: true
        },
        attachmentPaths: [
            {
                type: String,
                trim: true
            }
        ],
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },
        sendEmail: {
            type: Boolean,
            default: false
        },
        emailSentAt: {
            type: Date
        },
        targetAudience: {
            type: String,
            enum: ['all', 'enrolled', 'instructors'],
            default: 'enrolled'
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
LMSAnnouncementSchema.index({ subjectId: 1, runTill: 1 });
LMSAnnouncementSchema.index({ subjectId: 1, isPinned: -1, announcementDate: -1 });
LMSAnnouncementSchema.index({ schoolSiteId: 1, isActive: 1, announcementDate: -1 });

// Virtual for reply count
LMSAnnouncementSchema.virtual('replyCount').get(function () {
    return this.announcementReply?.length || 0;
});

// Virtual to check if announcement is currently active
LMSAnnouncementSchema.virtual('isCurrentlyActive').get(function () {
    if (!this.isActive) return false;
    const now = new Date();
    if (this.announcementDate > now) return false;
    if (this.runTill && this.runTill < now) return false;
    return true;
});

// Backward compatibility virtuals (LMS aliases)
LMSAnnouncementSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

LMSAnnouncementSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

LMSAnnouncementSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

const LMSAnnouncement: Model<ILMSAnnouncement> = mongoose.models.LMSAnnouncement || mongoose.model<ILMSAnnouncement>('LMSAnnouncement', LMSAnnouncementSchema);

export default LMSAnnouncement;
