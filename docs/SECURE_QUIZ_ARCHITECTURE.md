# Secure Quiz Interface - Architecture & Documentation

## Overview

The Secure Quiz Interface is a production-ready, security-focused assessment UI designed for college-level Learning Management Systems. It implements a **layered security approach** focusing on deterrence, detection, fairness, and auditability.

> **Important Note:** This system does NOT claim to prevent all cheating. Browser-based security has inherent limitations. The focus is on creating reasonable barriers, detecting suspicious behavior, and maintaining an audit trail.

---

## Component Architecture

```
components/quiz/
├── index.ts                    # Public exports
├── SecureQuizContext.tsx       # State management & business logic
├── SecureQuizInterface.tsx     # Main entry component
├── SecureQuizLayout.tsx        # Security event handlers & layout
├── QuizHeader.tsx              # Header, timer, progress components
├── ViolationWarningModal.tsx   # Dialogs & modals
└── QuestionTypes.tsx           # Question type renderers
```

### Component Hierarchy

```
SecureQuizInterface (Entry Point)
└── SecureQuizProvider (Context)
    └── QuizContent
        └── SecureQuizLayout (Security Layer)
            ├── QuizHeader
            │   ├── QuizTimer
            │   ├── ViolationCounter
            │   └── AutoSaveIndicator
            ├── QuestionNavigator
            ├── QuestionRenderer (switch by type)
            │   ├── SingleChoiceRadioButton
            │   ├── SingleChoiceDropdown
            │   ├── MultipleChoice
            │   ├── PictureChoice
            │   ├── FillInTheBlanks
            │   ├── Matching
            │   ├── MatchingText
            │   └── FreeText
            └── Dialogs
                ├── ViolationWarningModal
                ├── SubmitConfirmDialog
                └── TimeWarningDialog
```

---

## Security Features

### 1. Fullscreen & Viewport Control

| Feature                   | Implementation                  | Limitation                             |
| ------------------------- | ------------------------------- | -------------------------------------- |
| Force fullscreen on start | `document.requestFullscreen()`  | User can bypass with multiple monitors |
| Detect fullscreen exit    | `fullscreenchange` event        | Logs violation, cannot force back      |
| Clear warnings            | Modal with remaining violations | Informative, not preventive            |

### 2. Tab, Focus & Visibility Detection

| Event       | Handler            | Response                          |
| ----------- | ------------------ | --------------------------------- |
| Tab switch  | `visibilitychange` | Increment violation, show warning |
| Window blur | `window.blur`      | Increment violation, show warning |
| Page hidden | `document.hidden`  | Increment violation, show warning |

### 3. Navigation & Interaction Restrictions

| Restriction              | Method                               | Purpose                 |
| ------------------------ | ------------------------------------ | ----------------------- |
| One question per screen  | State-controlled rendering           | Focus, prevents jumping |
| Linear navigation        | `allowBackNavigation` config         | Optional restriction    |
| Disable copy             | `copy` event + `e.preventDefault()`  | Deterrent only          |
| Disable paste            | `paste` event + `e.preventDefault()` | Deterrent only          |
| Disable right-click      | `contextmenu` event                  | Deterrent only          |
| Disable text selection   | CSS `user-select: none`              | Deterrent only          |
| Block keyboard shortcuts | `keydown` handler                    | Blocks common shortcuts |

### 4. Time Enforcement

| Feature         | Implementation                     |
| --------------- | ---------------------------------- |
| Countdown timer | Server-synced, displayed in header |
| Time warnings   | Modal at 1 minute remaining        |
| Auto-submit     | Automatic on timeout if configured |

### 5. Behavior Feedback

| Scenario            | Response                            |
| ------------------- | ----------------------------------- |
| First violation     | Informative warning, show remaining |
| Near max violations | Urgent warning tone                 |
| Max violations      | Auto-submit with explanation        |

---

## State Management

### QuizConfig Interface

```typescript
interface QuizConfig {
    quizId: string;
    title: string;
    description?: string;
    totalQuestions: number;
    totalMarks: number;
    timeLimit: number; // seconds
    passingScore?: number; // percentage
    allowBackNavigation: boolean; // can go to previous questions
    maxViolations: number; // before auto-submit
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showQuestionNumbers: boolean;
    autoSubmitOnTimeout: boolean;
    autoSubmitOnMaxViolations: boolean;
    warningThresholds: number[]; // e.g., [1, 2]
}
```

### Violation Types

```typescript
type ViolationType =
    | 'fullscreen_exit' // Exited fullscreen mode
    | 'tab_switch' // Switched browser tabs
    | 'focus_lost' // Browser window lost focus
    | 'visibility_hidden' // Page was hidden/minimized
    | 'copy_attempt' // Tried to copy content
    | 'paste_attempt' // Tried to paste content
    | 'right_click' // Opened context menu
    | 'dev_tools' // Opened developer tools
    | 'screenshot_attempt'; // PrintScreen detected
```

---

## Usage Example

### Basic Implementation

```tsx
import { SecureQuizInterface } from '@/components/quiz';

const QuizPage = () => {
    const handleComplete = (result) => {
        console.log('Score:', result.score);
        console.log('Violations:', result.violations);
        // Redirect to results page
    };

    return <SecureQuizInterface quizId="quiz_123" userId="user_456" onComplete={handleComplete} onExit={() => router.push('/dashboard')} />;
};
```

### API Endpoints Required

The interface expects these API endpoints:

| Endpoint                               | Method | Purpose                  |
| -------------------------------------- | ------ | ------------------------ |
| `/api/lms/quizzes/:id`                 | GET    | Fetch quiz configuration |
| `/api/lms/quizzes/:id/questions`       | GET    | Fetch quiz questions     |
| `/api/lms/quiz-attempts`               | POST   | Create/resume attempt    |
| `/api/lms/quiz-attempts/:id/progress`  | PUT    | Save progress            |
| `/api/lms/quiz-attempts/:id/submit`    | POST   | Submit quiz              |
| `/api/lms/quiz-attempts/:id/violation` | POST   | Record violation         |

---

## UX Copy & Messaging

### Violation Messages

| Type            | Title                      | Message                                                                                                              |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Fullscreen Exit | "Fullscreen Mode Required" | "You have exited fullscreen mode. Please return to fullscreen to continue your quiz. This action has been recorded." |
| Tab Switch      | "Tab Switch Detected"      | "Switching tabs during the quiz is not allowed. Please remain on this page to complete your assessment."             |
| Focus Lost      | "Window Focus Lost"        | "You have navigated away from the quiz window. Please return focus to continue."                                     |
| Copy Attempt    | "Copy Attempt Detected"    | "Copying content is disabled during this assessment for academic integrity purposes."                                |

### Warning Progression

1. **First Warning:** Calm, informative

    > "You have X warnings remaining before automatic submission."

2. **Second-to-Last Warning:** More urgent

    > "Warning: This is your final warning. One more violation will auto-submit your quiz."

3. **Final (Auto-Submit):**
    > "Maximum violations reached. Your quiz is being submitted automatically."

---

## Accessibility Considerations

| Feature             | Implementation                      |
| ------------------- | ----------------------------------- |
| Keyboard navigation | Full Tab/Enter support              |
| Focus indicators    | Visible focus rings                 |
| Color contrast      | WCAG AA compliant                   |
| Screen reader       | ARIA labels on interactive elements |
| Reduced motion      | Respects `prefers-reduced-motion`   |

---

## Mobile Considerations

| Issue               | Handling                                    |
| ------------------- | ------------------------------------------- |
| No fullscreen API   | Skip fullscreen requirement, log limitation |
| Touch events        | Standard tap handling                       |
| Screen size         | Responsive layout with stacked navigation   |
| Orientation changes | Detect and warn if needed                   |

---

## Known Limitations

1. **Cannot Prevent Screenshots:** PrintScreen can be detected but not blocked
2. **Multiple Monitors:** Cannot detect content on other screens
3. **Phone/Camera:** Cannot detect external recording devices
4. **Browser Extensions:** Some extensions can bypass restrictions
5. **Virtual Machines:** Cannot detect VM environments reliably

---

## Best Practices for Instructors

1. **Use in Conjunction With:**

    - Proctoring software for high-stakes exams
    - Randomized question pools
    - Time limits appropriate to question count

2. **Review Violations:**

    - Not all violations indicate cheating
    - Consider context (accidental clicks, notifications)
    - Use as one data point among many

3. **Communicate Expectations:**
    - Clear instructions before quiz
    - Explain what triggers violations
    - Fair warning about consequences

---

## Future Enhancements

-   [ ] WebRTC-based webcam proctoring
-   [ ] AI-powered behavior analysis
-   [ ] Lockdown browser integration
-   [ ] Question-level timing analytics
-   [ ] Plagiarism detection for free-text responses
