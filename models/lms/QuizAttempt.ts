import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * QuizAttempt Schema
 * Records a student's attempt at taking a quiz
 */

export interface IQuizAnswer {
    questionId: mongoose.Types.ObjectId;
    selectedOptions: string[];
    answeredAt: Date;
}

export interface IViolation {
    type: 'fullscreen_exit' | 'tab_switch' | 'focus_lost' | 'visibility_hidden' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'dev_tools' | 'screenshot_attempt';
    timestamp: Date;
    details?: string;
}

export interface IQuizAttempt extends Document {
    quizId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    attemptNumber: number;
    status: 'in_progress' | 'submitted' | 'auto_submitted' | 'timed_out' | 'violation_terminated';
    startedAt: Date;
    submittedAt?: Date;
    answers: Map<string, string[]>;
    violations: IViolation[];
    currentQuestionIndex: number;
    timeRemaining: number;
    questionOrder?: string[]; // For shuffled questions
    score?: number;
    totalMarks?: number;
    percentage?: number;
    passed?: boolean;
    gradedAt?: Date;
    gradedBy?: mongoose.Types.ObjectId;
    feedback?: string;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const ViolationSchema = new Schema<IViolation>(
    {
        type: {
            type: String,
            required: true,
            enum: ['fullscreen_exit', 'tab_switch', 'focus_lost', 'visibility_hidden', 'copy_attempt', 'paste_attempt', 'right_click', 'dev_tools', 'screenshot_attempt']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: {
            type: String
        }
    },
    { _id: false }
);

// @ts-ignore
const QuizAttemptSchema = new Schema<IQuizAttempt>(
    {
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        attemptNumber: {
            type: Number,
            required: true,
            default: 1
        },
        status: {
            type: String,
            required: true,
            enum: ['in_progress', 'submitted', 'auto_submitted', 'timed_out', 'violation_terminated'],
            default: 'in_progress',
            index: true
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        submittedAt: {
            type: Date
        },
        answers: {
            type: Map,
            of: [String],
            default: new Map()
        },
        violations: {
            type: [ViolationSchema],
            default: []
        },
        currentQuestionIndex: {
            type: Number,
            default: 0
        },
        timeRemaining: {
            type: Number,
            required: true
        },
        questionOrder: {
            type: [String]
        },
        score: {
            type: Number
        },
        totalMarks: {
            type: Number
        },
        percentage: {
            type: Number
        },
        passed: {
            type: Boolean
        },
        gradedAt: {
            type: Date
        },
        gradedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        feedback: {
            type: String
        },
        ipAddress: {
            type: String
        },
        userAgent: {
            type: String
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

// Compound indexes
QuizAttemptSchema.index({ quizId: 1, userId: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ quizId: 1, status: 1 });
QuizAttemptSchema.index({ userId: 1, status: 1 });

// Prevent model recompilation in development
const QuizAttempt: Model<IQuizAttempt> = mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);

export default QuizAttempt;
