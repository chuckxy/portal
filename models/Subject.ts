import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubjectCategory = 'core' | 'elective' | 'extracurricular';
export type ResourceType = 'video' | 'document' | 'image' | 'audio' | 'link' | 'other';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Interface for Topic subdocument
export interface ITopic {
    description: string;
    class?: mongoose.Types.ObjectId;
    academicYear?: string;
    academicTerm?: number;
    weekNumber?: number;
    estimatedHours?: number;
}

// Interface for Resource subdocument
export interface IResource {
    title?: string;
    classCodes: string[];
    resourcePaths: string[];
    uploadDate: Date;
    topic?: string;
    resourceType: ResourceType;
    uploadedBy?: mongoose.Types.ObjectId;
}

// Interface for LMS Course settings (Integration with LMS)
export interface ILMSCourse {
    isLmsCourse: boolean;
    courseBanner?: string;
    courseIntro?: string;
    startDate?: Date;
    endDate?: Date;
    enrollmentLimit?: number;
    currentEnrollment: number;
    isPublished: boolean;
    publishedAt?: Date;
    totalDuration?: number; // minutes
    difficulty: CourseDifficulty;
    prerequisites: mongoose.Types.ObjectId[];
    learningOutcomes: string[];
    categoryId?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    lastUpdatedBy?: mongoose.Types.ObjectId;
    averageRating?: number;
    totalReviews: number;
    completionCertificate: boolean;
}

// Interface for Subject document
export interface ISubject extends Document {
    name: string;
    code?: string;
    category: SubjectCategory;
    isGraded: boolean;
    school: mongoose.Types.ObjectId;
    site?: mongoose.Types.ObjectId;
    department?: mongoose.Types.ObjectId;
    creditHours: number;
    description?: string;
    topics: ITopic[];
    resources: IResource[];
    lmsCourse?: ILMSCourse; // LMS Integration
    isActive: boolean;
    topicCount: number;
    resourceCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const SubjectSchema = new Schema<ISubject>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        code: {
            type: String,
            uppercase: true,
            trim: true,
            sparse: true,
            unique: true
        },
        category: {
            type: String,
            enum: ['core', 'elective', 'extracurricular'],
            default: 'core',
            index: true
        },
        isGraded: {
            type: Boolean,
            default: true
        },
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            index: true
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            index: true
        },
        creditHours: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            trim: true
        },

        topics: [
            {
                description: {
                    type: String,
                    required: true,
                    trim: true
                },
                class: {
                    type: Schema.Types.ObjectId,
                    ref: 'SiteClass'
                },
                academicYear: String,
                academicTerm: {
                    type: Number,
                    min: 1,
                    max: 3
                },
                weekNumber: Number,
                estimatedHours: Number
            }
        ],

        resources: [
            {
                title: {
                    type: String,
                    trim: true
                },
                classCodes: [
                    {
                        type: String,
                        trim: true
                    }
                ],
                resourcePaths: [
                    {
                        type: String,
                        trim: true
                    }
                ],
                uploadDate: {
                    type: Date,
                    default: Date.now
                },
                topic: {
                    type: String,
                    trim: true
                },
                resourceType: {
                    type: String,
                    enum: ['video', 'document', 'image', 'audio', 'link', 'other'],
                    default: 'document'
                },
                uploadedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                }
            }
        ],

        // LMS Integration: Course settings for Learning Management System
        lmsCourse: {
            isLmsCourse: {
                type: Boolean,
                default: false
            },
            courseBanner: {
                type: String,
                trim: true
            },
            courseIntro: {
                type: String,
                trim: true
            },
            startDate: {
                type: Date
            },
            endDate: {
                type: Date
            },
            enrollmentLimit: {
                type: Number,
                min: 1
            },
            currentEnrollment: {
                type: Number,
                default: 0,
                min: 0
            },
            isPublished: {
                type: Boolean,
                default: false
            },
            publishedAt: {
                type: Date
            },
            totalDuration: {
                type: Number, // minutes
                min: 0
            },
            difficulty: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced'],
                default: 'beginner'
            },
            prerequisites: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject'
                }
            ],
            learningOutcomes: [
                {
                    type: String,
                    trim: true
                }
            ],
            categoryId: {
                type: Schema.Types.ObjectId,
                ref: 'CourseCategory'
            },
            createdBy: {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            },
            lastUpdatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            },
            averageRating: {
                type: Number,
                min: 0,
                max: 5
            },
            totalReviews: {
                type: Number,
                default: 0,
                min: 0
            },
            completionCertificate: {
                type: Boolean,
                default: false
            }
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
SubjectSchema.index({ school: 1, name: 1 });
SubjectSchema.index({ school: 1, code: 1 });
SubjectSchema.index({ category: 1, isGraded: 1 });
SubjectSchema.index({ 'lmsCourse.isLmsCourse': 1 }); // LMS Integration
SubjectSchema.index({ 'lmsCourse.isPublished': 1, 'lmsCourse.categoryId': 1 }); // LMS Integration

// Virtual for topic count
SubjectSchema.virtual('topicCount').get(function (this: ISubject) {
    return this.topics ? this.topics.length : 0;
});

// Virtual for resource count
SubjectSchema.virtual('resourceCount').get(function (this: ISubject) {
    return this.resources ? this.resources.length : 0;
});

// Check if model already exists to prevent overwrite error
const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
