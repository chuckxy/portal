import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubjectCategory = 'core' | 'elective' | 'extracurricular';
export type ResourceType = 'video' | 'document' | 'image' | 'audio' | 'link' | 'other';

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
