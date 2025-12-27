import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'multiple_choice' | 'essay' | 'true_false' | 'short_answer' | 'fill_blank';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Interface for QuestionMeta subdocument
export interface IQuestionMeta {
    text: string;
    images: string[];
    marks: number;
}

// Interface for Option subdocument
export interface IOption {
    option: string;
    isCorrect: boolean;
}

// Interface for ExamQuestion document
export interface IExamQuestion {
    questionType: QuestionType;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    subject: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    questionNumber?: number;
    classes: string[];
    difficulty: DifficultyLevel;
    topic?: string;
    questionMeta: IQuestionMeta;
    options: IOption[];
    rubric?: string;
    keywords: string[];
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const ExamQuestionSchema = new Schema<IExamQuestion>(
    {
        questionType: {
            type: String,
            enum: ['multiple_choice', 'essay', 'true_false', 'short_answer', 'fill_blank'],
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
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
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

        questionNumber: {
            type: Number,
            min: 1
        },

        classes: [
            {
                type: String,
                trim: true
            }
        ],

        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
        },

        topic: {
            type: String,
            trim: true
        },

        questionMeta: {
            text: {
                type: String,
                required: true
            },
            images: [
                {
                    type: String,
                    trim: true
                }
            ],
            marks: {
                type: Number,
                required: true,
                min: 0
            }
        },

        // For multiple choice and true/false
        options: [
            {
                option: {
                    type: String,
                    required: true
                },
                isCorrect: {
                    type: Boolean,
                    default: false
                }
            }
        ],

        // For essay and short answer
        rubric: {
            type: String,
            trim: true
        },

        keywords: [
            {
                type: String,
                trim: true
            }
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
ExamQuestionSchema.index({ school: 1, site: 1, subject: 1, academicYear: 1, academicTerm: 1 });
ExamQuestionSchema.index({ subject: 1, questionType: 1, difficulty: 1 });
ExamQuestionSchema.index({ createdBy: 1 });

// Validation: multiple choice must have options
ExamQuestionSchema.pre('save', function () {
    if ((this.questionType === 'multiple_choice' || this.questionType === 'true_false') && (!this.options || this.options.length === 0)) {
        return new Error('Multiple choice and true/false questions must have options');
    }
});

const ExamQuestion: Model<IExamQuestion> = mongoose.models.ExamQuestion || mongoose.model<IExamQuestion>('ExamQuestion', ExamQuestionSchema);

export default ExamQuestion;
