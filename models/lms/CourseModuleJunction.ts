import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Course-Module Junction Schema
 * Maps which modules belong to which courses (Subjects)
 *
 * Integration Note: Maps to LMS CourseModule junction table
 * Enables many-to-many relationship between Subjects and Modules
 *
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - SchoolSite (unified from Institution)
 */

export interface ICourseModuleJunction extends Document {
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    sortOrder: number;
    isRequired: boolean;
    unlockDate?: Date;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseModuleJunctionSchema = new Schema<ICourseModuleJunction>(
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
        sortOrder: {
            type: Number,
            default: 0
        },
        isRequired: {
            type: Boolean,
            default: true
        },
        unlockDate: {
            type: Date
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
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

// Compound index for unique course-module pairs per site
CourseModuleJunctionSchema.index({ subjectId: 1, moduleId: 1, schoolSiteId: 1 }, { unique: true });

// Index for retrieving modules for a course in order
CourseModuleJunctionSchema.index({ subjectId: 1, sortOrder: 1 });

// Backward compatibility virtuals (LMS aliases)
CourseModuleJunctionSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

CourseModuleJunctionSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const CourseModuleJunction: Model<ICourseModuleJunction> = mongoose.models.CourseModuleJunction || mongoose.model<ICourseModuleJunction>('CourseModuleJunction', CourseModuleJunctionSchema);

export default CourseModuleJunction;
