import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Lesson Notes Schema
 * Student notes on lessons
 *
 * Integration Note: Maps to LMS LessonNotes
 * References:
 *   - Person (unified from User)
 *   - Lesson
 *   - SchoolSite
 */

export interface ILessonNotes extends Document {
    personId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    notesTitle: string;
    userNotes: string;
    dateCreated: Date;
    lastModified: Date;
    isBookmarked: boolean;
    tags: string[];
    color?: string;
    isPrivate: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LessonNotesSchema = new Schema<ILessonNotes>(
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
        notesTitle: {
            type: String,
            required: true,
            maxlength: 255,
            trim: true,
            index: true
        },
        userNotes: {
            type: String,
            required: true
        },
        dateCreated: {
            type: Date,
            default: Date.now
        },
        lastModified: {
            type: Date,
            default: Date.now
        },
        isBookmarked: {
            type: Boolean,
            default: false,
            index: true
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true
            }
        ],
        color: {
            type: String,
            maxlength: 7 // #FFFFFF format
        },
        isPrivate: {
            type: Boolean,
            default: true
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
LessonNotesSchema.index({ personId: 1, lessonId: 1 });
LessonNotesSchema.index({ personId: 1, subjectId: 1, isBookmarked: -1 });
LessonNotesSchema.index({ personId: 1, tags: 1 });
// Note: schoolSiteId index is defined inline with index: true

// Pre-save hook to update lastModified
LessonNotesSchema.pre('save', function (next: (err?: Error) => void) {
    if (this.isModified('userNotes') || this.isModified('notesTitle')) {
        this.lastModified = new Date();
    }
    next();
});

// Virtual for word count
LessonNotesSchema.virtual('wordCount').get(function () {
    if (!this.userNotes) return 0;
    return this.userNotes.trim().split(/\s+/).length;
});

// Virtual for character count
LessonNotesSchema.virtual('characterCount').get(function () {
    return this.userNotes?.length || 0;
});

// Backward compatibility virtuals (LMS aliases)
LessonNotesSchema.virtual('userId').get(function () {
    return this.personId;
});

LessonNotesSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

const LessonNotes: Model<ILessonNotes> = mongoose.models.LessonNotes || mongoose.model<ILessonNotes>('LessonNotes', LessonNotesSchema);

export default LessonNotes;
