// Quiz Attempt Review Types and Interfaces

import { PersonCategory } from '@/models/Person';
import { QuestionType, QuestionOption, MatchingPair } from './quiz-types';

// Re-export for convenience
export type { QuestionType, QuestionOption, MatchingPair };

// User Role Types for Access Control
export type ReviewerRole = 'student' | 'teacher' | 'admin';

// Violation Types
export type ViolationType = 'fullscreen_exit' | 'tab_switch' | 'focus_lost' | 'visibility_hidden' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'dev_tools' | 'screenshot_attempt';

// Attempt Status Types
export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'timed_out' | 'violation_terminated';

// Grading Status
export type GradingStatus = 'pending' | 'auto_graded' | 'manually_graded' | 'reviewed';

// Audit Action Types
export type AuditActionType = 'score_override' | 'feedback_added' | 'feedback_edited' | 'status_changed' | 'grade_approved' | 'appeal_submitted' | 'appeal_resolved';

// Person Reference (populated)
export interface PersonRef {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    photoLink?: string;
    role?: string;
}

// Quiz Reference (populated)
export interface QuizRef {
    _id: string;
    title: string;
    description?: string;
    quizType: string;
    totalMarks: number;
    passingMarks: number;
    timeLimit?: number;
    maxAttempts: number;
    showCorrectAnswers: boolean;
    showCorrectAnswersAfter: string;
}

// Subject Reference (populated)
export interface SubjectRef {
    _id: string;
    name: string;
    code: string;
}

// Violation Record
export interface ViolationRecord {
    type: ViolationType;
    timestamp: string;
    details?: string;
}

// Question Answer Detail for Review
export interface QuestionAnswerDetail {
    questionId: string;
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    questionOptions: QuestionOption[];
    matchingPairs?: MatchingPair[];
    imageUrl?: string;
    points: number;
    // Student's response
    studentAnswer: string[];
    answeredAt?: string;
    // Correct answer info (role-restricted)
    correctOptions?: string[];
    correctText?: string;
    explanation?: string;
    // Grading info
    marksAwarded: number;
    isCorrect: boolean | 'partial';
    autoGraded: boolean;
    // Instructor feedback
    instructorFeedback?: string;
    feedbackAddedAt?: string;
    feedbackAddedBy?: PersonRef;
}

// Audit Trail Entry
export interface AuditTrailEntry {
    _id: string;
    action: AuditActionType;
    actionType: AuditActionType; // Alias for action
    performedBy: PersonRef;
    performedAt: string;
    timestamp: string; // Alias for performedAt
    description?: string;
    previousValue?: string | number;
    newValue?: string | number;
    field?: string;
    questionId?: string;
    questionNumber?: number;
    justification?: string;
    ipAddress?: string;
}

// Score Override Request
export interface ScoreOverrideRequest {
    attemptId: string;
    questionId?: string; // If null, applies to total
    newScore: number;
    justification: string;
}

// Feedback Update Request
export interface FeedbackUpdateRequest {
    attemptId: string;
    questionId?: string; // If null, applies to overall feedback
    feedback: string;
}

// Complete Attempt Review Data
export interface AttemptReviewData {
    // Attempt identification
    _id: string;
    attemptNumber: number;
    status: AttemptStatus;
    gradingStatus: GradingStatus;

    // Related entities
    quiz: QuizRef;
    student: PersonRef;
    subject?: SubjectRef;
    course?: string;

    // Timing information
    startedAt: string;
    submittedAt?: string;
    timeAllocated: number; // in seconds
    timeSpent: number; // in seconds
    timeRemaining?: number;

    // Scoring
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
    passingMarks: number;
    passingScore: number; // Alias for passingMarks (percentage)

    // Integrity data
    violations: ViolationRecord[];
    ipAddress?: string;
    userAgent?: string;

    // Grading info
    gradedAt?: string;
    gradedBy?: PersonRef;
    overallFeedback?: string;

    // Questions and answers
    questions: QuestionAnswerDetail[];

    // Audit trail
    auditTrail: AuditTrailEntry[];

    // Metadata
    createdAt: string;
    updatedAt: string;
}

// Role-Based View Configuration
export interface ReviewViewConfig {
    showIntegrityLog: boolean;
    showGradingControls: boolean;
    showAuditTrail: boolean;
    showCorrectAnswers: boolean;
    showOtherStudentData: boolean;
    canEditScores: boolean;
    canAddFeedback: boolean;
    canApproveGrades: boolean;
    canFinalizeGrading: boolean;
}

// Get view config based on role
export const getReviewViewConfig = (role: PersonCategory, isOwnAttempt: boolean = false): ReviewViewConfig => {
    switch (role) {
        case 'student':
            return {
                showIntegrityLog: false,
                showGradingControls: false,
                showAuditTrail: false,
                showCorrectAnswers: isOwnAttempt, // Only if quiz settings allow
                showOtherStudentData: false,
                canEditScores: false,
                canAddFeedback: false,
                canApproveGrades: false,
                canFinalizeGrading: false
            };
        case 'teacher':
            return {
                showIntegrityLog: true,
                showGradingControls: true,
                showAuditTrail: true,
                showCorrectAnswers: true,
                showOtherStudentData: true,
                canEditScores: true,
                canAddFeedback: true,
                canApproveGrades: false,
                canFinalizeGrading: true
            };
        case 'proprietor':
            return {
                showIntegrityLog: true,
                showGradingControls: true,
                showAuditTrail: true,
                showCorrectAnswers: true,
                showOtherStudentData: true,
                canEditScores: true,
                canAddFeedback: true,
                canApproveGrades: true,
                canFinalizeGrading: true
            };
        default:
            return {
                showIntegrityLog: false,
                showGradingControls: false,
                showAuditTrail: false,
                showCorrectAnswers: false,
                showOtherStudentData: false,
                canEditScores: false,
                canAddFeedback: false,
                canApproveGrades: false,
                canFinalizeGrading: false
            };
    }
};

// Violation type labels and severity
export const violationTypeConfig: Record<ViolationType, { label: string; severity: 'low' | 'medium' | 'high'; icon: string; description: string }> = {
    fullscreen_exit: {
        label: 'Fullscreen Exit',
        severity: 'high',
        icon: 'pi pi-window-minimize',
        description: 'Student exited fullscreen mode'
    },
    tab_switch: {
        label: 'Tab Switch',
        severity: 'high',
        icon: 'pi pi-external-link',
        description: 'Browser tab was switched'
    },
    focus_lost: {
        label: 'Focus Lost',
        severity: 'medium',
        icon: 'pi pi-eye-slash',
        description: 'Browser window lost focus'
    },
    visibility_hidden: {
        label: 'Window Hidden',
        severity: 'medium',
        icon: 'pi pi-eye-slash',
        description: 'Browser window was hidden or minimized'
    },
    copy_attempt: {
        label: 'Copy Attempt',
        severity: 'medium',
        icon: 'pi pi-copy',
        description: 'Attempted to copy content'
    },
    paste_attempt: {
        label: 'Paste Attempt',
        severity: 'medium',
        icon: 'pi pi-clipboard',
        description: 'Attempted to paste content'
    },
    right_click: {
        label: 'Right Click',
        severity: 'low',
        icon: 'pi pi-ellipsis-v',
        description: 'Right-click context menu triggered'
    },
    dev_tools: {
        label: 'Developer Tools',
        severity: 'high',
        icon: 'pi pi-code',
        description: 'Developer tools were opened'
    },
    screenshot_attempt: {
        label: 'Screenshot Attempt',
        severity: 'high',
        icon: 'pi pi-camera',
        description: 'Screenshot attempt detected'
    }
};

// Attempt status configuration
export const attemptStatusConfig: Record<AttemptStatus, { label: string; severity: 'info' | 'success' | 'warning' | 'danger'; icon: string }> = {
    in_progress: {
        label: 'In Progress',
        severity: 'info',
        icon: 'pi pi-spin pi-spinner'
    },
    submitted: {
        label: 'Submitted',
        severity: 'success',
        icon: 'pi pi-check-circle'
    },
    auto_submitted: {
        label: 'Auto-Submitted',
        severity: 'warning',
        icon: 'pi pi-clock'
    },
    timed_out: {
        label: 'Timed Out',
        severity: 'warning',
        icon: 'pi pi-stopwatch'
    },
    violation_terminated: {
        label: 'Terminated (Violations)',
        severity: 'danger',
        icon: 'pi pi-exclamation-triangle'
    }
};

// Question type display config
export const questionTypeDisplayConfig: Record<QuestionType, { label: string; icon: string }> = {
    single_choice_radio: { label: 'Single Choice', icon: 'pi pi-circle' },
    single_choice_dropdown: { label: 'Dropdown', icon: 'pi pi-chevron-circle-down' },
    multiple_choice: { label: 'Multiple Choice', icon: 'pi pi-check-square' },
    picture_choice: { label: 'Picture Choice', icon: 'pi pi-image' },
    fill_blanks: { label: 'Fill in Blanks', icon: 'pi pi-pencil' },
    matching: { label: 'Matching', icon: 'pi pi-arrow-right-arrow-left' },
    matching_text: { label: 'Matching (Text)', icon: 'pi pi-link' },
    free_text: { label: 'Essay/Free Text', icon: 'pi pi-align-left' }
};

// Grading status configuration
export const gradingStatusConfig: Record<GradingStatus, { label: string; severity: 'info' | 'success' | 'warning' | 'danger'; icon: string }> = {
    pending: {
        label: 'Pending',
        severity: 'warning',
        icon: 'pi pi-clock'
    },
    auto_graded: {
        label: 'Auto-Graded',
        severity: 'info',
        icon: 'pi pi-bolt'
    },
    manually_graded: {
        label: 'Manually Graded',
        severity: 'success',
        icon: 'pi pi-pencil'
    },
    reviewed: {
        label: 'Reviewed',
        severity: 'success',
        icon: 'pi pi-check-circle'
    }
};

// Audit action configuration
export const auditActionConfig: Record<AuditActionType, { label: string; severity: 'info' | 'success' | 'warning' | 'danger'; icon: string }> = {
    score_override: {
        label: 'Score Override',
        severity: 'warning',
        icon: 'pi pi-calculator'
    },
    feedback_added: {
        label: 'Feedback Added',
        severity: 'info',
        icon: 'pi pi-comment'
    },
    feedback_edited: {
        label: 'Feedback Edited',
        severity: 'info',
        icon: 'pi pi-pencil'
    },
    status_changed: {
        label: 'Status Changed',
        severity: 'info',
        icon: 'pi pi-refresh'
    },
    grade_approved: {
        label: 'Grade Approved',
        severity: 'success',
        icon: 'pi pi-check'
    },
    appeal_submitted: {
        label: 'Appeal Submitted',
        severity: 'warning',
        icon: 'pi pi-flag'
    },
    appeal_resolved: {
        label: 'Appeal Resolved',
        severity: 'success',
        icon: 'pi pi-check-square'
    }
};

// Pending changes tracking
export interface PendingChanges {
    scores?: Record<string, number>;
    feedback?: Record<string, string>;
}

// Component Props Interfaces
export interface QuizAttemptReviewProps {
    attemptId: string;
    role: PersonCategory;
    currentUserId: string;
    onClose?: () => void;
    onGradeUpdated?: (attemptId: string) => void;
}

export interface AttemptSummaryPanelProps {
    data: AttemptReviewData;
    viewConfig: ReviewViewConfig;
}

export interface IntegrityLogPanelProps {
    violations: ViolationRecord[];
    ipAddress?: string;
    userAgent?: string;
    attemptStatus: AttemptStatus;
}

export interface QuestionReviewPanelProps {
    questions: QuestionAnswerDetail[];
    viewConfig: ReviewViewConfig;
    onScoreOverride?: (questionId: string, newScore: number, justification: string) => void;
    onFeedbackUpdate?: (questionId: string, feedback: string) => void;
    expandedQuestionId?: string;
    onExpandQuestion?: (questionId: string | null) => void;
}

export interface GradingControlsProps {
    attemptData: AttemptReviewData;
    pendingChanges: PendingChanges;
    viewConfig: ReviewViewConfig;
    onScoreChange?: (questionId: string, newScore: number) => void;
    onBulkGrade?: (questionIds: string[], action: string) => void;
    onRecalculate?: () => void;
    onFinalizeGrading?: (notes: string) => void;
    onStatusChange?: (status: AttemptStatus) => void;
    isSaving?: boolean;
}

export interface AuditTrailPanelProps {
    auditEntries: AuditTrailEntry[];
    viewConfig: ReviewViewConfig;
}
