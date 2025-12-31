import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Chapter Schema
 * Chapters within modules - represents subsections
 *
 * Integration Note: Maps to LMS Chapter
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface IChapter {
    _id: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    chapterName: string;
    description?: string;
    hierarchyOrder: number;
    addedBy: mongoose.Types.ObjectId;
    estimatedDuration?: number; // minutes
    thumbnailPath?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    lessonCount?: number;
}

const ChapterSchema = new Schema<IChapter>(
    {
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        moduleId: {
            type: Schema.Types.ObjectId,
            ref: 'CourseModule',
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
        chapterName: {
            type: String,
            required: true,
            maxlength: 256,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
        hierarchyOrder: {
            type: Number,
            required: true,
            default: 0
        },
        // UNIFIED: References Person (replaces addedByUser)
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        estimatedDuration: {
            type: Number,
            min: 0
        },
        thumbnailPath: {
            type: String,
            maxlength: 256,
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
ChapterSchema.index({ moduleId: 1, hierarchyOrder: 1 });
ChapterSchema.index({ subjectId: 1, moduleId: 1 });
ChapterSchema.index({ schoolSiteId: 1, isActive: 1 });

// Virtual for lesson count
ChapterSchema.virtual('lessonCount', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'chapterId',
    count: true
});

// Backward compatibility virtuals (LMS aliases)
ChapterSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

ChapterSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

ChapterSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', ChapterSchema);

export default Chapter;
