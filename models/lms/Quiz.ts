import mongoose, { Schema, Document, Model } from 'mongoose';
import { QuizType } from './types';

/**
 * Quiz Schema
 * Assessments at various levels (Lesson, Chapter, Module, Course)
 *
 * Integration Note: Maps to LMS Quiz
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - Chapter
 *   - Lesson
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface IQuiz extends Document {
    title: string;
    description?: string;
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    addedBy: mongoose.Types.ObjectId;
    quizType: QuizType;
    startDate?: Date;
    endDate?: Date;
    totalMarks: number;
    passingMarks: number;
    timeLimit?: number; // minutes
    maxAttempts: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showCorrectAnswers: boolean;
    showCorrectAnswersAfter: 'immediately' | 'after_submission' | 'after_deadline' | 'never';
    isPublished: boolean;
    publishedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    questionCount?: number;
    attemptCount?: number;
}

const QuizSchema = new Schema<IQuiz>(
    {
        title: {
            type: String,
            required: true,
            maxlength: 512,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
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
        chapterId: {
            type: Schema.Types.ObjectId,
            ref: 'Chapter',
            required: true,
            index: true
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Lesson',
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
        quizType: {
            type: String,
            enum: ['lesson', 'chapter', 'module', 'course'],
            required: true,
            index: true
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        totalMarks: {
            type: Number,
            required: true,
            min: 0
        },
        passingMarks: {
            type: Number,
            required: true,
            min: 0
        },
        timeLimit: {
            type: Number,
            min: 0
        },
        maxAttempts: {
            type: Number,
            default: 1,
            min: 1
        },
        shuffleQuestions: {
            type: Boolean,
            default: false
        },
        shuffleOptions: {
            type: Boolean,
            default: false
        },
        showCorrectAnswers: {
            type: Boolean,
            default: true
        },
        showCorrectAnswersAfter: {
            type: String,
            enum: ['immediately', 'after_submission', 'after_deadline', 'never'],
            default: 'after_submission'
        },
        isPublished: {
            type: Boolean,
            default: false,
            index: true
        },
        publishedAt: {
            type: Date
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
QuizSchema.index({ subjectId: 1, quizType: 1 });
QuizSchema.index({ lessonId: 1, quizType: 1 });
QuizSchema.index({ schoolSiteId: 1, isPublished: 1, isActive: 1 });

// Virtual for question count
QuizSchema.virtual('questionCount', {
    ref: 'QuizQuestion',
    localField: '_id',
    foreignField: 'quizId',
    count: true
});

// Virtual for attempt count
QuizSchema.virtual('attemptCount', {
    ref: 'UserQuizAttempt',
    localField: '_id',
    foreignField: 'quizId',
    count: true
});

// Backward compatibility virtuals (LMS aliases)
QuizSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

QuizSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

QuizSchema.virtual('addedByUser').get(function () {
    return this.addedBy;
});

QuizSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

// LMS used PascalCase quiz types
QuizSchema.virtual('legacyQuizType').get(function () {
    const typeMap: Record<string, string> = {
        lesson: 'Lesson',
        chapter: 'Chapter',
        module: 'Module',
        course: 'Course'
    };
    return typeMap[this.quizType] || this.quizType;
});

const Quiz: Model<IQuiz> = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);

export default Quiz;
