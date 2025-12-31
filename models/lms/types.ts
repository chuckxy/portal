/**
 * LMS Type Definitions
 *
 * Shared types and enums for LMS models
 */

import mongoose from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export type ModuleStatus = 'draft' | 'published' | 'archived';
export type LessonStatus = 'draft' | 'published' | 'archived';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'dropped' | 'suspended';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type QuizType = 'lesson' | 'chapter' | 'module' | 'course';
export type QuestionType = 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'picture_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text';

export type MaterialType = 'pdf' | 'video' | 'link' | 'image' | 'pdf_link' | 'video_link' | 'image_link' | 'web_page';

export type ItemCondition = 'good' | 'fair' | 'damaged' | 'lost';
export type MessageReadStatus = 'read' | 'unread';
export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * LMS Settings embedded in SchoolSite
 */
export interface ILMSSettings {
    isLmsEnabled: boolean;
    defaultCourseDuration?: number;
    maxEnrollmentsPerCourse?: number;
    allowSelfEnrollment: boolean;
    certificateTemplate?: string;
    defaultQuizPassScore?: number;
    enableDiscussions: boolean;
    enableCertificates: boolean;
}

/**
 * LMS Profile embedded in Person
 */
export interface ILMSProfile {
    isLmsUser: boolean;
    instructorBio?: string;
    instructorRating?: number;
    totalCoursesCreated: number;
    totalCoursesEnrolled: number;
    totalCoursesCompleted: number;
    certifications: ICertification[];
    preferences: ILMSPreferences;
}

export interface ICertification {
    courseId: mongoose.Types.ObjectId;
    certificateId: string;
    issuedDate: Date;
    expiryDate?: Date;
    certificatePath?: string;
}

export interface ILMSPreferences {
    emailNotifications: boolean;
    browserNotifications: boolean;
    preferredLanguage: string;
    autoPlayVideos: boolean;
    showProgressBar: boolean;
}

/**
 * LMS Course settings embedded in Subject
 */
export interface ILMSCourse {
    isLmsCourse: boolean;
    courseBanner?: string;
    startDate?: Date;
    endDate?: Date;
    enrollmentLimit?: number;
    currentEnrollment: number;
    isPublished: boolean;
    publishedAt?: Date;
    totalDuration?: number;
    difficulty: CourseDifficulty;
    prerequisites: mongoose.Types.ObjectId[];
    learningOutcomes: string[];
    createdBy: mongoose.Types.ObjectId;
    lastUpdatedBy?: mongoose.Types.ObjectId;
}

/**
 * Chapter tracking for module progress
 */
export interface IChapterTracking {
    chapterId: mongoose.Types.ObjectId;
    status: ProgressStatus;
    startedAt?: Date;
    completedAt?: Date;
    lessonsCompleted: number;
    totalLessons: number;
}

/**
 * Lesson tracking for chapter progress
 */
export interface ILessonTracking {
    lessonId: mongoose.Types.ObjectId;
    status: ProgressStatus;
    startedAt?: Date;
    completedAt?: Date;
    timeSpent: number; // seconds
    lastAccessedAt?: Date;
}

/**
 * Video watch tracking
 */
export interface IVideoWatch {
    materialId?: mongoose.Types.ObjectId; // Optional - primary lesson content may not have material ID
    contentUrl?: string; // URL when materialId is not available
    watchedDuration: number; // seconds
    totalDuration: number;
    completedAt?: Date;
    watchPercentage: number;
}

/**
 * PDF read tracking
 */
export interface IPDFRead {
    materialId?: mongoose.Types.ObjectId; // Optional - primary lesson content may not have material ID
    contentUrl?: string; // URL when materialId is not available
    pagesRead: number;
    totalPages: number;
    completedAt?: Date;
    readPercentage: number;
}

/**
 * Quiz question option
 */
export interface IQuestionOption {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect?: boolean; // Hidden from students
}

/**
 * Matching pair for matching questions
 */
export interface IMatchingPair {
    id: string;
    left: string;
    right: string;
}

/**
 * User answer in quiz attempt
 */
export interface IUserAnswer {
    questionId: mongoose.Types.ObjectId;
    selectedOptions?: string[];
    textAnswer?: string;
    matchingAnswers?: Record<string, string>;
    isCorrect?: boolean;
    pointsEarned: number;
}

/**
 * Assignment submission file
 */
export interface ISubmissionFile {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
}

/**
 * Announcement reply
 */
export interface IAnnouncementReply {
    personId: mongoose.Types.ObjectId;
    content: string;
    repliedAt: Date;
    isEdited: boolean;
    editedAt?: Date;
}

/**
 * Page activity tracking
 */
export interface IPageActivity {
    pagePath: string;
    pageTitle?: string;
    timeSpent: number; // seconds
    visits: number;
    lastVisit: Date;
}
