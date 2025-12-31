import mongoose, { Schema, Document, Model } from 'mongoose';

export type ExamType = 'class_test' | 'mid_term' | 'end_of_term' | 'mock' | 'final';
export type ExamAnswerStatus = 'in_progress' | 'submitted' | 'marked';

// Interface for Answer subdocument
export interface IAnswer {
    questionId?: mongoose.Types.ObjectId;
    questionNumber: number;
    selectedOption?: number;
    essayAnswer?: string;
    shortAnswer?: string;
    marks: number;
    maxMarks: number;
    isMarked: boolean;
    markedBy?: mongoose.Types.ObjectId;
    markedAt?: Date;
    feedback?: string;
}

// Interface for ExamAnswer document
export interface IExamAnswer {
    student: mongoose.Types.ObjectId;
    subject: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    class?: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    examType: ExamType;
    answers: IAnswer[];
    bookmarks: number[];
    totalMarks: number;
    maxTotalMarks: number;
    percentage: number;
    startedAt: Date;
    submittedAt?: Date;
    timeSpent: number;
    status: ExamAnswerStatus;
    createdAt: Date;
    updatedAt: Date;
    calculateTotalMarks(): number;
}

// @ts-ignore
const ExamAnswerSchema = new Schema<IExamAnswer>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
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
        class: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            index: true
        },
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

        examType: {
            type: String,
            enum: ['class_test', 'mid_term', 'end_of_term', 'mock', 'final'],
            default: 'class_test'
        },

        answers: [
            {
                questionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'ExamQuestion'
                },
                questionNumber: {
                    type: Number,
                    required: true
                },
                selectedOption: {
                    type: Number
                },
                essayAnswer: {
                    type: String,
                    trim: true
                },
                shortAnswer: {
                    type: String,
                    trim: true
                },
                marks: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                maxMarks: {
                    type: Number,
                    default: 0
                },
                isMarked: {
                    type: Boolean,
                    default: false
                },
                markedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                markedAt: Date,
                feedback: String
            }
        ],

        bookmarks: [
            {
                type: Number
            }
        ],

        totalMarks: {
            type: Number,
            default: 0
        },

        maxTotalMarks: {
            type: Number,
            default: 0
        },

        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        startedAt: {
            type: Date,
            default: Date.now
        },

        submittedAt: {
            type: Date
        },

        timeSpent: {
            type: Number, // in minutes
            default: 0
        },

        status: {
            type: String,
            enum: ['in_progress', 'submitted', 'marked'],
            default: 'in_progress',
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
ExamAnswerSchema.index({ student: 1, subject: 1, academicYear: 1, academicTerm: 1 });
ExamAnswerSchema.index({ school: 1, site: 1, academicYear: 1, academicTerm: 1 });
ExamAnswerSchema.index({ class: 1, subject: 1 });
// Note: status index is defined inline with index: true

// Ensure one exam per student per subject per term
ExamAnswerSchema.index({ student: 1, subject: 1, academicYear: 1, academicTerm: 1, examType: 1 }, { unique: true });

// Method to calculate total marks
ExamAnswerSchema.methods.calculateTotalMarks = function (this: IExamAnswer): number {
    this.totalMarks = this.answers.reduce((sum, answer) => sum + (answer.marks || 0), 0);
    this.maxTotalMarks = this.answers.reduce((sum, answer) => sum + (answer.maxMarks || 0), 0);
    this.percentage = this.maxTotalMarks > 0 ? (this.totalMarks / this.maxTotalMarks) * 100 : 0;
    return this.totalMarks;
};

const ExamAnswer: Model<IExamAnswer> = mongoose.models.ExamAnswer || mongoose.model<IExamAnswer>('ExamAnswer', ExamAnswerSchema);

export default ExamAnswer;
