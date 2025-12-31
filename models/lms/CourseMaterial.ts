import mongoose, { Schema, Document, Model } from 'mongoose';
import { MaterialType } from './types';

/**
 * Course Material Schema
 * Learning materials (PDFs, videos, links) attached to lessons
 *
 * Integration Note: Maps to LMS CourseMaterial
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - Chapter
 *   - Lesson
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface ICourseMaterial extends Document {
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    materialTitle: string;
    materialDescription?: string;
    materialType: MaterialType;
    materialURL: string;
    uploadDate: Date;
    addedBy: mongoose.Types.ObjectId;
    fileSize?: number; // bytes
    duration?: number; // seconds (for videos)
    pageCount?: number; // for PDFs
    sortOrder: number;
    isDownloadable: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseMaterialSchema = new Schema<ICourseMaterial>(
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
        chapterId: {
            type: Schema.Types.ObjectId,
            ref: 'Chapter',
            required: true,
            index: true
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Lesson',
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
        materialTitle: {
            type: String,
            required: true,
            maxlength: 512,
            trim: true,
            index: true
        },
        materialDescription: {
            type: String,
            trim: true
        },
        materialType: {
            type: String,
            enum: ['pdf', 'video', 'link', 'image', 'pdf_link', 'video_link', 'image_link', 'web_page'],
            required: true,
            index: true
        },
        materialURL: {
            type: String,
            required: true,
            maxlength: 1024,
            trim: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        },
        // UNIFIED: References Person (replaces addedByUser)
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        fileSize: {
            type: Number,
            min: 0
        },
        duration: {
            type: Number,
            min: 0
        },
        pageCount: {
            type: Number,
            min: 0
        },
        sortOrder: {
            type: Number,
            default: 0
        },
        isDownloadable: {
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
CourseMaterialSchema.index({ lessonId: 1, materialType: 1, sortOrder: 1 });
CourseMaterialSchema.index({ chapterId: 1, sortOrder: 1 });
CourseMaterialSchema.index({ moduleId: 1, materialType: 1 });
CourseMaterialSchema.index({ schoolSiteId: 1, isActive: 1 });

// Backward compatibility virtuals (LMS aliases)
CourseMaterialSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

CourseMaterialSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

CourseMaterialSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

CourseMaterialSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

const CourseMaterial: Model<ICourseMaterial> = mongoose.models.CourseMaterial || mongoose.model<ICourseMaterial>('CourseMaterial', CourseMaterialSchema);

export default CourseMaterial;
