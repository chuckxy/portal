import mongoose, { Schema, Document, Model } from 'mongoose';
import { MessageReadStatus } from './types';

/**
 * LMS Message Schema
 * Direct messages between users within the LMS context
 *
 * Integration Note: Maps to LMS Message
 * This is separate from potential SMS messaging to support
 * course-contextual messaging and threading
 *
 * References:
 *   - Person (unified from User) for sender and receiver
 *   - SchoolSite (unified from Institution)
 *   - Subject (optional course context)
 */

export interface ILMSMessage extends Document {
    senderId: mongoose.Types.ObjectId;
    receiverId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId; // Optional course context
    subject: string;
    messageBody: string;
    sentDate: Date;
    readStatus: MessageReadStatus;
    readDate?: Date;
    parentMessageId?: mongoose.Types.ObjectId; // For threading
    attachmentPaths: string[];
    isStarred: boolean;
    isArchived: boolean;
    deletedBySender: boolean;
    deletedByReceiver: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LMSMessageSchema = new Schema<ILMSMessage>(
    {
        // UNIFIED: References Person (replaces senderId)
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        // UNIFIED: References Person (replaces receiverId)
        receiverId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
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
        // Optional course context
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            index: true
        },
        subject: {
            type: String,
            maxlength: 512,
            trim: true,
            index: true
        },
        messageBody: {
            type: String,
            required: true
        },
        sentDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        readStatus: {
            type: String,
            enum: ['read', 'unread'],
            default: 'unread',
            index: true
        },
        readDate: {
            type: Date
        },
        parentMessageId: {
            type: Schema.Types.ObjectId,
            ref: 'LMSMessage',
            index: true
        },
        attachmentPaths: [
            {
                type: String,
                trim: true
            }
        ],
        isStarred: {
            type: Boolean,
            default: false,
            index: true
        },
        isArchived: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedBySender: {
            type: Boolean,
            default: false
        },
        deletedByReceiver: {
            type: Boolean,
            default: false
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
LMSMessageSchema.index({ receiverId: 1, readStatus: 1, sentDate: -1 });
LMSMessageSchema.index({ senderId: 1, sentDate: -1 });
LMSMessageSchema.index({ receiverId: 1, isArchived: 1, deletedByReceiver: 1, sentDate: -1 });
LMSMessageSchema.index({ parentMessageId: 1, sentDate: 1 }); // For threading

// Virtual for reply count (if this is a parent message)
LMSMessageSchema.virtual('replyCount', {
    ref: 'LMSMessage',
    localField: '_id',
    foreignField: 'parentMessageId',
    count: true
});

// Virtual to check if message has attachments
LMSMessageSchema.virtual('hasAttachments').get(function () {
    return this.attachmentPaths && this.attachmentPaths.length > 0;
});

// Virtual for conversation display (sender vs receiver perspective)
LMSMessageSchema.virtual('isRead').get(function () {
    return this.readStatus === 'read';
});

// Backward compatibility virtuals (LMS aliases)
LMSMessageSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

// LMS used 'Read'/'Unread' instead of 'read'/'unread'
LMSMessageSchema.virtual('legacyReadStatus').get(function () {
    return this.readStatus === 'read' ? 'Read' : 'Unread';
});

const LMSMessage: Model<ILMSMessage> = mongoose.models.LMSMessage || mongoose.model<ILMSMessage>('LMSMessage', LMSMessageSchema);

export default LMSMessage;
