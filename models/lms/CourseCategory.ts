import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Course Category Schema
 * Categorization for courses/subjects within an institution
 *
 * Integration Note: Maps to LMS CourseCategory
 * References: SchoolSite (unified from Institution)
 */

export interface ICourseCategory extends Document {
    categoryName: string;
    description?: string;
    schoolSiteId: mongoose.Types.ObjectId;
    parentCategory?: mongoose.Types.ObjectId;
    iconPath?: string;
    colorCode?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseCategorySchema = new Schema<ICourseCategory>(
    {
        categoryName: {
            type: String,
            required: true,
            maxlength: 64,
            trim: true,
            index: true
        },
        description: {
            type: String,
            maxlength: 1024,
            trim: true
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        // Support for nested categories
        parentCategory: {
            type: Schema.Types.ObjectId,
            ref: 'CourseCategory',
            index: true
        },
        iconPath: {
            type: String,
            maxlength: 256,
            trim: true
        },
        colorCode: {
            type: String,
            maxlength: 7, // #FFFFFF format
            trim: true
        },
        sortOrder: {
            type: Number,
            default: 0
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
CourseCategorySchema.index({ schoolSiteId: 1, categoryName: 1 }, { unique: true });
CourseCategorySchema.index({ schoolSiteId: 1, isActive: 1, sortOrder: 1 });

// Virtual for subcategories count
CourseCategorySchema.virtual('subcategoryCount', {
    ref: 'CourseCategory',
    localField: '_id',
    foreignField: 'parentCategory',
    count: true
});

// Virtual for courses count
CourseCategorySchema.virtual('coursesCount', {
    ref: 'Subject',
    localField: '_id',
    foreignField: 'lmsCourse.categoryId',
    count: true
});

// Backward compatibility virtual (LMS alias)
CourseCategorySchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const CourseCategory: Model<ICourseCategory> = mongoose.models.CourseCategory || mongoose.model<ICourseCategory>('CourseCategory', CourseCategorySchema);

export default CourseCategory;
