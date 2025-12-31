import mongoose, { Schema, Document, Model } from 'mongoose';
import { QuestionType, IQuestionOption, IMatchingPair } from './types';

/**
 * Quiz Question Schema
 * Individual questions within a quiz
 *
 * Integration Note: Maps to LMS QuizQuestion
 * References:
 *   - Quiz
 *   - SchoolSite (unified from Institution)
 */

export interface IQuizQuestion extends Document {
    quizId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    questionOptions: IQuestionOption[];
    matchingPairs?: IMatchingPair[];
    correctOptions: string[];
    correctText?: string; // For free text questions
    points: number;
    isRequired: boolean;
    explanation?: string;
    imageUrl?: string;
    audioUrl?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
    {
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
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
        questionNumber: {
            type: Number,
            required: true
        },
        questionText: {
            type: String,
            required: true,
            maxlength: 2048,
            trim: true
        },
        questionType: {
            type: String,
            enum: ['single_choice_radio', 'single_choice_dropdown', 'multiple_choice', 'picture_choice', 'fill_blanks', 'matching', 'matching_text', 'free_text'],
            required: true,
            index: true
        },
        questionOptions: [
            {
                id: {
                    type: String,
                    required: true
                },
                text: {
                    type: String,
                    required: true,
                    trim: true
                },
                imageUrl: {
                    type: String,
                    trim: true
                },
                isCorrect: {
                    type: Boolean,
                    default: false,
                    select: false // Hidden from student queries by default
                }
            }
        ],
        matchingPairs: [
            {
                id: {
                    type: String,
                    required: true
                },
                left: {
                    type: String,
                    required: true,
                    trim: true
                },
                right: {
                    type: String,
                    required: true,
                    trim: true
                }
            }
        ],
        correctOptions: [
            {
                type: String,
                required: true
            }
        ],
        correctText: {
            type: String,
            trim: true
        },
        points: {
            type: Number,
            required: true,
            min: 0
        },
        isRequired: {
            type: Boolean,
            default: true
        },
        explanation: {
            type: String,
            trim: true
        },
        imageUrl: {
            type: String,
            trim: true
        },
        audioUrl: {
            type: String,
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
QuizQuestionSchema.index({ quizId: 1, questionNumber: 1 });
QuizQuestionSchema.index({ quizId: 1, sortOrder: 1 });
// Note: schoolSiteId index is defined inline with index: true

// Backward compatibility virtuals (LMS aliases)
QuizQuestionSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

// LMS used camelCase question types
QuizQuestionSchema.virtual('legacyQuestionType').get(function () {
    const typeMap: Record<string, string> = {
        single_choice_radio: 'singleChoiceRadioButton',
        single_choice_dropdown: 'singleChoiceDropDown',
        multiple_choice: 'multipleChoice',
        picture_choice: 'pictureChoice',
        fill_blanks: 'blanksFill',
        matching: 'matching',
        matching_text: 'matchingText',
        free_text: 'freeText'
    };
    return typeMap[this.questionType] || this.questionType;
});

const QuizQuestion: Model<IQuizQuestion> = mongoose.models.QuizQuestion || mongoose.model<IQuizQuestion>('QuizQuestion', QuizQuestionSchema);

export default QuizQuestion;
