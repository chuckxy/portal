import mongoose, { Schema, Document, Model } from 'mongoose';
import { ModuleStatus } from './types';

/**
 * Course Module Schema
 * Represents major sections/modules of a course (Subject)
 *
 * Integration Note: Maps to LMS Module
 * References:
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface ICourseModule {
    _id: mongoose.Types.ObjectId;
    moduleName: string;
    moduleDescription: string;
    subjectId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    addedBy: mongoose.Types.ObjectId;
    moduleFee: number;
    currency: string;
    status: ModuleStatus;
    estimatedDuration?: number; // minutes
    sortOrder: number;
    prerequisites: mongoose.Types.ObjectId[];
    learningObjectives: string[];
    thumbnailPath?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    chapterCount?: number;
    lessonCount?: number;
}

const CourseModuleSchema = new Schema<ICourseModule>(
    {
        moduleName: {
            type: String,
            required: true,
            maxlength: 256,
            trim: true,
            index: true
        },
        moduleDescription: {
            type: String,
            required: true
        },
        // Reference to Subject/Course this module belongs to
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
        // UNIFIED: References Person (replaces addedByUser)
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        moduleFee: {
            type: Number,
            default: 0,
            min: 0
        },
        currency: {
            type: String,
            default: 'GHS',
            uppercase: true,
            maxlength: 3
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true
        },
        estimatedDuration: {
            type: Number,
            min: 0
        },
        sortOrder: {
            type: Number,
            default: 0
        },
        prerequisites: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CourseModule'
            }
        ],
        learningObjectives: [
            {
                type: String,
                trim: true
            }
        ],
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
CourseModuleSchema.index({ schoolSiteId: 1, status: 1, sortOrder: 1 });
CourseModuleSchema.index({ schoolSiteId: 1, moduleName: 1 });
CourseModuleSchema.index({ subjectId: 1, sortOrder: 1 });
CourseModuleSchema.index({ subjectId: 1, status: 1 });

// Virtual for chapter count
CourseModuleSchema.virtual('chapterCount', {
    ref: 'Chapter',
    localField: '_id',
    foreignField: 'moduleId',
    count: true
});

// Virtual for lesson count
CourseModuleSchema.virtual('lessonCount', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'moduleId',
    count: true
});

// Backward compatibility virtuals (LMS aliases)
CourseModuleSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

CourseModuleSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

const CourseModule: Model<ICourseModule> = mongoose.models.CourseModule || mongoose.model<ICourseModule>('CourseModule', CourseModuleSchema);

export default CourseModule;
