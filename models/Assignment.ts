import mongoose, { Schema, Document, Model } from 'mongoose';

export type AssignmentStatus = 'draft' | 'published' | 'closed';

// Interface for Attachment subdocument
export interface IAttachment {
    filename?: string;
    path?: string;
    fileType?: string;
    size?: number;
    uploadedAt: Date;
}

// Interface for Submission subdocument
export interface ISubmission {
    student: mongoose.Types.ObjectId;
    class?: mongoose.Types.ObjectId;
    submittedAt: Date;
    attachments: IAttachment[];
    textAnswers?: string;
    isEvaluated: boolean;
    marks: number;
    feedback?: string;
    evaluatedBy?: mongoose.Types.ObjectId;
    evaluatedAt?: Date;
    isLate: boolean;
}

// Interface for Assignment document
export interface IAssignment extends Document {
    subject: mongoose.Types.ObjectId;
    teacher: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    classes: mongoose.Types.ObjectId[];
    academicYear: string;
    academicTerm: number;
    title: string;
    instructions?: string;
    textQuestions?: string;
    attachments: IAttachment[];
    totalMarks: number;
    assignmentDate: Date;
    submissionDate: Date;
    allowLateSubmission: boolean;
    submissions: ISubmission[];
    status: AssignmentStatus;
    isActive: boolean;
    totalSubmissions: number;
    evaluatedSubmissions: number;
    pendingEvaluations: number;
    createdAt: Date;
    updatedAt: Date;
    isOverdue(): boolean;
}

const AssignmentSchema = new Schema<IAssignment>(
    {
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        teacher: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
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
            required: true,
            index: true
        },
        classes: [
            {
                type: Schema.Types.ObjectId,
                ref: 'SiteClass'
            }
        ],

        academicYear: {
            type: String,
            required: true,
            index: true
        },

        academicTerm: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        instructions: {
            type: String,
            trim: true
        },

        textQuestions: {
            type: String,
            trim: true
        },

        attachments: [
            {
                filename: String,
                path: String,
                fileType: String,
                size: Number,
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        totalMarks: {
            type: Number,
            default: 0,
            min: 0
        },

        assignmentDate: {
            type: Date,
            default: Date.now,
            index: true
        },

        submissionDate: {
            type: Date,
            required: true,
            index: true
        },

        allowLateSubmission: {
            type: Boolean,
            default: false
        },

        submissions: [
            {
                student: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person',
                    required: true
                },
                class: {
                    type: Schema.Types.ObjectId,
                    ref: 'SiteClass'
                },
                submittedAt: {
                    type: Date,
                    default: Date.now
                },
                attachments: [
                    {
                        filename: String,
                        path: String,
                        fileType: String,
                        size: Number
                    }
                ],
                textAnswers: {
                    type: String,
                    trim: true
                },
                isEvaluated: {
                    type: Boolean,
                    default: false
                },
                marks: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                feedback: {
                    type: String,
                    trim: true
                },
                evaluatedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                evaluatedAt: Date,
                isLate: {
                    type: Boolean,
                    default: false
                }
            }
        ],

        status: {
            type: String,
            enum: ['draft', 'published', 'closed'],
            default: 'draft',
            index: true
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

// Indexes - single-field indexes defined with index: true in schema
AssignmentSchema.index({ subject: 1, teacher: 1, academicYear: 1, academicTerm: 1 });
AssignmentSchema.index({ school: 1, site: 1, academicYear: 1, academicTerm: 1 });
AssignmentSchema.index({ 'submissions.student': 1 });

// Virtual for total submissions
AssignmentSchema.virtual('totalSubmissions').get(function (this: IAssignment) {
    return this.submissions ? this.submissions.length : 0;
});

// Virtual for evaluated submissions
AssignmentSchema.virtual('evaluatedSubmissions').get(function (this: IAssignment) {
    return this.submissions ? this.submissions.filter((sub) => sub.isEvaluated).length : 0;
});

// Virtual for pending submissions
AssignmentSchema.virtual('pendingEvaluations').get(function (this: IAssignment) {
    return this.submissions ? this.submissions.filter((sub) => !sub.isEvaluated).length : 0;
});

// Method to check if assignment is overdue
AssignmentSchema.methods.isOverdue = function (this: IAssignment): boolean {
    return new Date() > this.submissionDate;
};

// Pre-save to mark late submissions
AssignmentSchema.pre('save', function () {
    if (this.submissions && this.submissions.length > 0) {
        this.submissions.forEach((submission) => {
            if (submission.submittedAt > this.submissionDate) {
                submission.isLate = true;
            }
        });
    }
});

const Assignment: Model<IAssignment> = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default Assignment;
