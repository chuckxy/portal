/**
 * LMS Models - Barrel Export
 *
 * This file exports all LMS-related models for easy importing.
 * These models integrate with the existing SMS core entities:
 * - SchoolSite (replaces LMS Institution)
 * - Person (replaces LMS User)
 * - Subject (replaces LMS Course)
 */

// Course Structure
export { default as CourseCategory } from './CourseCategory';
export { default as CourseModule } from './CourseModule';
export { default as CourseModuleJunction } from './CourseModuleJunction';
export { default as Chapter } from './Chapter';
export { default as Lesson } from './Lesson';
export { default as CourseMaterial } from './CourseMaterial';

// Enrollment & Progress
export { default as LMSEnrollment } from './LMSEnrollment';
export { default as UserModuleProgress } from './UserModuleProgress';
export { default as UserLessonProgress } from './UserLessonProgress';
export { default as UserVideoProgress } from './UserVideoProgress';
export { default as UserPDFProgress } from './UserPDFProgress';

// Quizzes & Assessments
export { default as Quiz } from './Quiz';
export { default as QuizQuestion } from './QuizQuestion';
export { default as UserQuizAttempt } from './UserQuizAttempt';

// Assignments
export { default as LMSAssignment } from './LMSAssignment';
export { default as LMSSubmission } from './LMSSubmission';

// Communication
export { default as LMSAnnouncement } from './LMSAnnouncement';
export { default as LMSMessage } from './LMSMessage';
export { default as HelpRequest } from './HelpRequest';

// Notes & Reviews
export { default as LessonNotes } from './LessonNotes';
export { default as CourseReview } from './CourseReview';

// Analytics
export { default as UserPageTime } from './UserPageTime';

// Type exports
export * from './types';
