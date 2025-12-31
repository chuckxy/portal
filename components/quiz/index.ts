// ============================================================================
// SECURE QUIZ MODULE - Entry Point
// ============================================================================
// A comprehensive, security-focused quiz interface for Learning Management Systems
// Implements layered security with deterrence, detection, and auditability
// ============================================================================

// Context & State Management
export { SecureQuizProvider, useSecureQuiz, VIOLATION_MESSAGES, type ViolationType, type Violation, type QuizConfig, type QuizQuestion, type QuizAttempt, type SaveStatus, type SecureQuizState } from './SecureQuizContext';

// Main Interface
export { SecureQuizInterface, QuizResults } from './SecureQuizInterface';

// Layout & Security Components
export { SecureQuizLayout, FullscreenPrompt, QuizLockedOverlay } from './SecureQuizLayout';

// Header & Navigation
export { QuizHeader, QuizTimer, ViolationCounter, AutoSaveIndicator, QuestionNavigator } from './QuizHeader';

// Dialogs & Modals
export { ViolationWarningModal, SubmitConfirmDialog, TimeWarningDialog, ExitConfirmDialog } from './ViolationWarningModal';

// Question Type Components
export {
    SingleChoiceRadioButton,
    SingleChoiceDropdown,
    MultipleChoice,
    PictureChoice,
    FillInTheBlanks,
    Matching,
    MatchingText,
    FreeText,
    DisplayQuestions,
    type QuizQuestionData,
    type QuestionOption,
    type QuestionComponentProps,
    type DisplayQuestionsProps
} from './QuestionTypes';
