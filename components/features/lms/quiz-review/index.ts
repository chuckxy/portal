/**
 * Quiz Review Components
 *
 * A comprehensive component library for reviewing student quiz attempts.
 * Supports transparency, fair grading, academic integrity review, and
 * instructor decision-making with full audit trail.
 *
 * @module quiz-review
 */

// Main orchestrating component
export { default as QuizAttemptReview } from './QuizAttemptReview';

// Panel components
export { default as AttemptSummaryPanel } from './AttemptSummaryPanel';
export { default as IntegrityLogPanel } from './IntegrityLogPanel';
export { default as QuestionReviewPanel } from './QuestionReviewPanel';
export { default as GradingControls } from './GradingControls';
export { default as AuditTrailPanel } from './AuditTrailPanel';

// Re-export types for convenience
export type {
    // Core types
    ReviewerRole,
    ViolationType,
    AttemptStatus,
    GradingStatus,
    AuditActionType,
    QuestionType,
    QuestionOption,
    MatchingPair,

    // Data types
    AttemptReviewData,
    QuestionAnswerDetail,
    ViolationRecord,
    AuditTrailEntry,
    PersonRef,
    QuizRef,
    SubjectRef,

    // View configuration
    ReviewViewConfig,

    // Pending changes
    PendingChanges,

    // Component props
    QuizAttemptReviewProps,
    AttemptSummaryPanelProps,
    IntegrityLogPanelProps,
    QuestionReviewPanelProps,
    GradingControlsProps,
    AuditTrailPanelProps
} from '@/lib/services/lms/quiz-review-types';

// Re-export configuration objects
export { violationTypeConfig, attemptStatusConfig, gradingStatusConfig, auditActionConfig, questionTypeDisplayConfig, getReviewViewConfig } from '@/lib/services/lms/quiz-review-types';
