import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Help Request Schema
 * Student requests for help on specific lessons
 *
 * Integration Note: Maps to LMS HelpRequest
 * References:
 *   - Person (unified from User) for student and responder
 *   - Lesson
 *   - SchoolSite
 */

export interface IHelpRequest extends Document {
    personId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    userQuestion: string;
    questionCategory?: string;
    responseText?: string;
    requestDate: Date;
    responseDate?: Date;
    responderId?: mongoose.Types.ObjectId;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    attachmentPaths: string[];
    responseAttachmentPaths: string[];
    isResolved: boolean;
    resolutionSatisfactory?: boolean;
    feedbackText?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HelpRequestSchema = new Schema<IHelpRequest>(
    {
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
            index: true
        },
        // UNIFIED: References SchoolSite
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        // UNIFIED: References Subject
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        userQuestion: {
            type: String,
            required: true,
            trim: true
        },
        questionCategory: {
            type: String,
            trim: true,
            index: true
        },
        responseText: {
            type: String,
            trim: true
        },
        requestDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        responseDate: {
            type: Date
        },
        // UNIFIED: References Person (replaces responder)
        responderId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            index: true
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'resolved', 'closed'],
            default: 'pending',
            index: true
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
            index: true
        },
        attachmentPaths: [
            {
                type: String,
                trim: true
            }
        ],
        responseAttachmentPaths: [
            {
                type: String,
                trim: true
            }
        ],
        isResolved: {
            type: Boolean,
            default: false,
            index: true
        },
        resolutionSatisfactory: {
            type: Boolean
        },
        feedbackText: {
            type: String,
            trim: true
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
HelpRequestSchema.index({ lessonId: 1, responseDate: 1 });
HelpRequestSchema.index({ responderId: 1, status: 1 });
HelpRequestSchema.index({ schoolSiteId: 1, status: 1, priority: -1 });
HelpRequestSchema.index({ personId: 1, requestDate: -1 });

// Virtual for response time (in hours)
HelpRequestSchema.virtual('responseTimeHours').get(function () {
    if (!this.responseDate) return null;
    const diff = this.responseDate.getTime() - this.requestDate.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
});

// Virtual to check if awaiting response
HelpRequestSchema.virtual('isAwaitingResponse').get(function () {
    return this.status === 'pending' || this.status === 'in_progress';
});

// Backward compatibility virtuals (LMS aliases)
HelpRequestSchema.virtual('userId').get(function () {
    return this.personId;
});

HelpRequestSchema.virtual('responder').get(function () {
    return this.responderId;
});

const HelpRequest: Model<IHelpRequest> = mongoose.models.HelpRequest || mongoose.model<IHelpRequest>('HelpRequest', HelpRequestSchema);

export default HelpRequest;
