// Quiz Management Types and Interfaces
import { ICourseModule } from '@/models/lms/CourseModule';
import { IChapter } from '@/models/lms/Chapter';
import { ILesson } from '@/models/lms/Lesson';

// Core Types
export type QuizType = 'lesson' | 'chapter' | 'module' | 'course';
export type QuestionType = 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'picture_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text';
export type ShowAnswersAfter = 'immediately' | 'after_submission' | 'after_deadline' | 'never';

// Related Entity Interfaces
export interface Subject {
    _id: string;
    name: string;
    code: string;
}

export interface Person {
    _id: string;
    firstName: string;
    lastName: string;
    photoLink?: string;
}

// Question Option Interface
export interface QuestionOption {
    id: string;
    optionLabel: string; // A, B, C, D...
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
    optionPoints: number;
    matchingValue?: string; // For matching questions
}

// Matching Pair Interface
export interface MatchingPair {
    id: string;
    left: string;
    right: string;
}

// Quiz Question Interface
export interface QuizQuestion {
    _id?: string;
    quizId: string;
    schoolSiteId: string;
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    questionOptions: QuestionOption[];
    matchingPairs: MatchingPair[];
    correctOptions: string[];
    correctText?: string;
    points: number;
    isRequired: boolean;
    explanation?: string;
    imageUrl?: string;
    audioUrl?: string;
    sortOrder: number;
    isActive: boolean;
}

// Quiz Interface
export interface Quiz {
    _id?: string;
    title: string;
    description?: string;
    subjectId: string | Subject;
    moduleId: string | ICourseModule;
    chapterId: string | IChapter;
    lessonId: string | ILesson;
    schoolSiteId: string;
    addedBy: string | Person;
    quizType: QuizType;
    startDate?: string;
    endDate?: string;
    totalMarks: number;
    passingMarks: number;
    timeLimit?: number;
    maxAttempts: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showCorrectAnswers: boolean;
    showCorrectAnswersAfter: ShowAnswersAfter;
    isPublished: boolean;
    publishedAt?: string;
    isActive: boolean;
    questionCount?: number;
    attemptCount?: number;
    createdAt?: string;
}

// Dropdown Option Interface
export interface DropdownOption {
    label: string;
    value: string;
}

// Enhanced Quiz Type Option
export interface QuizTypeOptionEnhanced {
    label: string;
    value: QuizType;
    icon: string;
    description: string;
    color: string;
}

// Enhanced Show Answers Option
export interface ShowAnswersOptionEnhanced {
    label: string;
    value: ShowAnswersAfter;
    icon: string;
    description: string;
}

// Question Type Option
export interface QuestionTypeOption {
    label: string;
    value: QuestionType;
    icon: string;
    description: string;
    hasOptions: boolean;
    hasCorrectOption: boolean;
    hasMatching: boolean;
}

// Parse Result Interface
export interface ParseResult {
    questions: QuizQuestion[];
    errors: string[];
}

// Component Props Interface
export interface LMSQuizManagementProps {
    subjectId?: string;
    lessonId?: string;
    embedded?: boolean;
}
