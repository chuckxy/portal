import mongoose, { Schema, Document, Model } from 'mongoose';
import { LessonStatus } from './types';

/**
 * Lesson Schema
 * Individual lessons within chapters
 *
 * Integration Note: Maps to LMS ModuleLesson
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - Chapter
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export type TLessonType = 'video' | 'pdf' | 'html' | 'audio' | 'quiz' | 'assignment' | 'interactive' | 'image' | 'link' | 'pdf_link' | 'video_link' | 'image_link' | 'web_page';

export interface ILesson {
    _id: mongoose.Types.ObjectId;
    lessonTitle: string;
    lessonDescription?: string;
    lessonDuration?: number; // minutes
    contentType?: TLessonType;
    contentUrl?: string; // Primary content URL for the lesson
    contentHtml?: string; // HTML content for html type lessons
    schoolSiteId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    hierarchyOrder: number;
    addedBy: mongoose.Types.ObjectId;
    dateAdded: Date;
    status: LessonStatus;
    isFreePreview: boolean;
    allowDownload?: boolean;
    thumbnailPath?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    materialCount?: number;
    quizCount?: number;
}

const LessonSchema = new Schema<ILesson>(
    {
        lessonTitle: {
            type: String,
            required: true,
            maxlength: 512,
            trim: true,
            index: true
        },
        lessonDescription: {
            type: String,
            maxlength: 2048,
            trim: true
        },
        lessonDuration: {
            type: Number,
            min: 0
        },
        contentType: {
            type: String,
            enum: ['video', 'pdf', 'html', 'audio', 'quiz', 'assignment', 'interactive', 'image', 'link', 'pdf_link', 'video_link', 'image_link', 'web_page'],
            default: 'video'
        },
        contentUrl: {
            type: String,
            maxlength: 2048,
            trim: true
        },
        contentHtml: {
            type: String
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        chapterId: {
            type: Schema.Types.ObjectId,
            ref: 'Chapter',
            required: true,
            index: true
        },
        moduleId: {
            type: Schema.Types.ObjectId,
            ref: 'CourseModule',
            required: true,
            index: true
        },
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
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
        dateAdded: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true
        },
        isFreePreview: {
            type: Boolean,
            default: false
        },
        allowDownload: {
            type: Boolean,
            default: false
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
LessonSchema.index({ chapterId: 1, hierarchyOrder: 1 });
LessonSchema.index({ moduleId: 1, status: 1 });
LessonSchema.index({ subjectId: 1, status: 1 });
LessonSchema.index({ schoolSiteId: 1, isActive: 1 });

// Virtual for material count
LessonSchema.virtual('materialCount', {
    ref: 'CourseMaterial',
    localField: '_id',
    foreignField: 'lessonId',
    count: true
});

// Virtual for quiz count
LessonSchema.virtual('quizCount', {
    ref: 'Quiz',
    localField: '_id',
    foreignField: 'lessonId',
    count: true
});

// Backward compatibility virtuals (LMS aliases)
LessonSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

LessonSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

LessonSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

// LMS used moduleChapterLessonId to refer to lessons
LessonSchema.virtual('moduleChapterLessonId').get(function () {
    return this._id;
});

const Lesson: Model<ILesson> = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);

export default Lesson;
