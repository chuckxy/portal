# ExamScoreEntryForm - UX Design Specification

## Executive Summary

A progressive, data-intensive form component for recording, editing, and publishing student exam scores with role-based access control, automatic calculations, and comprehensive validation.

---

## 1. Component Architecture

### Component Name

`ExamScoreEntryForm`

### Design Philosophy

-   **Progressive Disclosure**: Complex data organized into digestible steps
-   **Immediate Feedback**: Real-time validation and auto-calculation
-   **Error Prevention**: Constraints, warnings, and confirmations
-   **Efficiency**: Keyboard navigation, inline editing, and autosave
-   **Accessibility**: WCAG 2.1 AA compliant

### Technology Stack

-   **Framework**: Next.js 13+ with React 18
-   **UI Library**: PrimeReact 10.x
-   **State Management**: React Hooks + Context
-   **Validation**: Yup/Zod schemas
-   **Data Fetching**: REST API with SWR

---

## 2. Layout Structure

### Primary Pattern: Stepper + Inline Editing Table

**Why Stepper?**

-   Reduces cognitive load for 50+ fields
-   Provides clear progress indication
-   Allows validation per section
-   Maintains scroll position between steps

**Layout Hierarchy**

```
┌─────────────────────────────────────────────────────┐
│ Header: Student Name | Class | Term | Status Badge  │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Steps: 1.Context → 2.Scores → 3.Attendance →    │ │
│ │        4.Comments → 5.Review                    │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│                                                       │
│              [ACTIVE STEP CONTENT]                   │
│                                                       │
├─────────────────────────────────────────────────────┤
│ Sticky Footer: [Save Draft] [Previous] [Next/Publish]│
└─────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Breakdown

### **Step 1: Academic Context** (300px height)

#### Layout: 2-Column Form Grid

```
┌────────────────────┬────────────────────┐
│ Student* ▼        │ School (locked)    │
│ [Search input]    │ Marvellous Academy │
├────────────────────┼────────────────────┤
│ Class* ▼          │ School Site (lock) │
│ [JSS 2A]          │ Main Campus        │
├────────────────────┼────────────────────┤
│ Academic Year*    │ Academic Term*     │
│ [2024/2025]       │ ○ 1 ○ 2 ● 3       │
├────────────────────┼────────────────────┤
│ Recorded By (lock)│ Status             │
│ Mr. John Doe      │ 🟡 Draft           │
└────────────────────┴────────────────────┘
```

#### UX Features

**Duplicate Detection**

```
⚠️ Warning: Exam record already exists for:
   John Smith • 2024/2025 • Term 2
   [View Existing] [Create Anyway]
```

**Field Locking**

-   After scores entered: Lock student, class, year, term
-   Show unlock icon with confirmation dialog
-   Reason: "Changing these fields may corrupt data. Are you sure?"

**Auto-fill Behavior**

-   On student select → auto-fill school, site from student record
-   On class select → validate student is enrolled in that class
-   Academic year → dropdown with last 5 years + custom input

#### Validation Rules

-   Required: Student, Class, Academic Year, Term
-   Unique constraint check: student + year + term
-   Student must be active and category = 'student'

---

### **Step 2: Subject Scores Entry** (Core Section)

#### Layout: Editable DataTable with Sticky Header

```
┌──────────────────────────────────────────────────────────────────┐
│ [+ Add Subject] [Import from Template] [Auto-Calculate All]      │
├──────┬────────┬──────────┬──────────┬───────┬──────┬──────┬──────┤
│ Sub- │ Class  │   Exam   │  Total   │ Grade │ Pos. │ Size │ Del  │
│ ject │ Score  │  Score   │  Score   │       │      │      │      │
├──────┼────────┼──────────┼──────────┼───────┼──────┼──────┼──────┤
│Math ▼│   85   │    88    │   86.5   │   A   │  3   │  45  │  🗑  │
├──────┼────────┼──────────┼──────────┼───────┼──────┼──────┼──────┤
│Eng.▼ │   72   │    68    │   70     │   B   │  12  │  45  │  🗑  │
├──────┼────────┼──────────┼──────────┼───────┼──────┼──────┼──────┤
│ + Add new subject row                                             │
└──────────────────────────────────────────────────────────────────┘

Expandable Row (click to reveal):
┌──────────────────────────────────────────────────────────────────┐
│ Remarks: [Excellent performance, shows great understanding]       │
│ Teacher Comment: [Keep up the good work. Focus on geometry]      │
└──────────────────────────────────────────────────────────────────┘
```

#### Calculation Logic

**Total Score Calculation**

```typescript
// Configurable weighting (40% class, 60% exam is common)
totalScore = classScore * 0.4 + examScore * 0.6;
```

**Grade Assignment**

```typescript
function getGrade(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
}
```

**Auto-Calculate All Button**

-   Recalculates all total scores and grades
-   Updates overall average
-   Shows progress indicator for large datasets

#### UX Enhancements

**Inline Editing**

-   Click cell to edit (input type="number")
-   Tab/Enter to move to next cell
-   Auto-save on blur (debounced 1s)

**Score Validation**

```
Class Score: 105
❌ Score must be between 0-100
```

**Keyboard Navigation**

-   Tab: Next field
-   Shift+Tab: Previous field
-   Enter: Next row
-   Ctrl+Enter: Add new row
-   Escape: Cancel edit

**Subject Dropdown**

-   Only shows subjects assigned to selected class
-   Prevents duplicate subject entry
-   Shows subject code in parentheses

**Bulk Import**

-   "Import from Template" button
-   Downloads class roster with subject columns
-   Upload filled CSV to populate scores

**Subject Row Menu** (3-dot icon)

-   ✏️ Edit remarks/comments
-   📋 Copy scores
-   🗑️ Delete subject

#### Validation Rules

-   At least 1 subject required before proceeding
-   All scores 0-100
-   Total score auto-calculated (no manual entry)
-   Grade auto-assigned (no manual override)

---

### **Step 3: Attendance & Behavior** (400px height)

#### Layout: Card Grid

```
┌─────────────────────────────────────────────────────┐
│              📅 ATTENDANCE RECORD                    │
├───────────────────┬───────────────────┬──────────────┤
│ Days Present      │ Days Absent       │ Days Late    │
│ [  180  ]         │ [   5   ]         │ [   2   ]    │
│ 📊 95% attendance │                   │              │
└───────────────────┴───────────────────┴──────────────┘

┌─────────────────────────────────────────────────────┐
│              🎯 CONDUCT & INTEREST                   │
├───────────────────────────────────────────────────────┤
│ Conduct Rating*                                      │
│ ● Excellent  ○ Very Good  ○ Good                    │
│ ○ Satisfactory  ○ Needs Improvement                 │
├───────────────────────────────────────────────────────┤
│ Interest in Learning*                                │
│ ○ Excellent  ● Very Good  ○ Good                    │
│ ○ Satisfactory  ○ Needs Improvement                 │
└───────────────────────────────────────────────────────┘
```

#### UX Features

**Attendance Calculation**

-   Auto-calculate percentage: (present / (present + absent + late)) × 100
-   Show warning if attendance < 75%
-   Validate: present + absent + late = total school days

**Conduct Rating**

-   Visual emoji indicators
-   Tooltip explanations:
    -   Excellent: "Exemplary behavior"
    -   Very Good: "Consistently follows rules"
    -   Good: "Generally well-behaved"
    -   Satisfactory: "Meets expectations"
    -   Needs Improvement: "Requires attention"

**SelectButton Component** (PrimeReact)

-   Single choice, visually clear
-   Mobile-friendly touch targets (44px min)

---

### **Step 4: Comments & Promotion** (500px height)

#### Layout: Stacked Sections

```
┌─────────────────────────────────────────────────────┐
│              💬 COMMENTS                             │
├─────────────────────────────────────────────────────┤
│ Form Master Comment*                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ John has shown remarkable improvement this      │ │
│ │ term. His dedication to Mathematics is...       │ │
│ │                                    0/500 chars  │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Headmaster Comment                                  │
│ 🔒 Headmaster/Admin only                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Enabled only for authorized roles]             │ │
│ │                                    0/500 chars  │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              📈 PROMOTION                            │
├─────────────────────────────────────────────────────┤
│ Promoted to Next Class?                             │
│ ⬜ No    ☑️ Yes                                      │
├─────────────────────────────────────────────────────┤
│ Promoted To*                                        │
│ [SS 1A  ▼]                                          │
├─────────────────────────────────────────────────────┤
│ Next Term Begins                                    │
│ 📅 [01/09/2025]                                     │
└─────────────────────────────────────────────────────┘
```

#### UX Features

**Character Counter**

-   Live count with color coding:
    -   0-400: Gray
    -   401-480: Amber (warning)
    -   481-500: Red (limit approaching)

**Role-Based Access**

```typescript
// Headmaster comment visibility
{
    user.role === 'headmaster' || user.role === 'admin' ? <InputTextarea enabled /> : <InputTextarea disabled placeholder="Restricted to Headmaster" />;
}
```

**Conditional Fields**

-   "Promoted To" only visible when promoted = true
-   Auto-suggest next sequential class
-   Validate promoted class > current class

**Smart Defaults**

-   Next term date: Auto-suggest based on academic calendar
-   Promoted To: Current class + 1 level

---

### **Step 5: Review & Publish** (Full height scrollable)

#### Layout: Summary Dashboard

```
┌─────────────────────────────────────────────────────┐
│              📊 SCORE SUMMARY                        │
├──────────────────┬──────────────────┬───────────────┤
│ Overall Average  │ Total Marks      │ Position      │
│    78.5%        │   1,570 / 2,000  │   5 / 45      │
│    Grade B      │                  │   Top 11%     │
└──────────────────┴──────────────────┴───────────────┘

┌─────────────────────────────────────────────────────┐
│              📚 SUBJECT BREAKDOWN                    │
├───────────────────┬──────────┬──────────┬───────────┤
│ Subject           │ Total    │ Grade    │ Position  │
├───────────────────┼──────────┼──────────┼───────────┤
│ Mathematics       │   86.5   │    A     │   3/45    │
│ English           │   70.0   │    B     │  12/45    │
│ Science           │   82.0   │    A     │   7/45    │
│ ...               │          │          │           │
└───────────────────┴──────────┴──────────┴───────────┘

┌─────────────────────────────────────────────────────┐
│              📅 ATTENDANCE & CONDUCT                 │
├─────────────────────────────────────────────────────┤
│ Present: 180 days • Absent: 5 days • Late: 2 days  │
│ Attendance Rate: 95% ✅                             │
│ Conduct: Excellent • Interest: Very Good           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              📈 PROMOTION STATUS                     │
├─────────────────────────────────────────────────────┤
│ ✅ Promoted to SS 1A                                │
│ Next Term Begins: 01/09/2025                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              ⚠️ VALIDATION CHECKLIST                │
├─────────────────────────────────────────────────────┤
│ ✅ All required fields completed                    │
│ ✅ At least one subject score entered               │
│ ✅ Overall average > 0                              │
│ ✅ Form Master comment provided                     │
│ ⚠️ Attendance below 75% threshold                   │
└─────────────────────────────────────────────────────┘
```

#### Action Buttons

**Button States**

```
Unpublished Draft:
[💾 Save Draft] [🔙 Previous] [📤 Publish Results]

Published Record:
[✏️ Edit] [🔙 Back] [📥 Unpublish] [🖨️ Print Report]
```

**Publish Confirmation Dialog**

```
┌─────────────────────────────────────────────────────┐
│              ⚠️ Confirm Publication                  │
├─────────────────────────────────────────────────────┤
│ You are about to publish exam results for:          │
│                                                      │
│ Student: John Smith                                 │
│ Class: JSS 2A                                       │
│ Term: Second Term 2024/2025                         │
│                                                      │
│ ⚠️ Published results will be visible to:            │
│ • Student                                           │
│ • Parents/Guardians                                 │
│ • School Administrators                             │
│                                                      │
│ Once published, editing requires unpublishing.      │
│                                                      │
│ [ Cancel ]                        [ Yes, Publish ] │
└─────────────────────────────────────────────────────┘
```

---

## 4. Validation & Business Rules

### Pre-Flight Validation (Before Publishing)

```typescript
interface ValidationResult {
    canPublish: boolean;
    errors: string[];
    warnings: string[];
}

function validateExamScore(data: ExamScoreData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CRITICAL ERRORS (Block publishing)
    if (!data.student) errors.push('Student is required');
    if (!data.class) errors.push('Class is required');
    if (!data.academicYear) errors.push('Academic year is required');
    if (!data.academicTerm) errors.push('Academic term is required');
    if (data.scores.length === 0) errors.push('At least one subject score required');
    if (data.overallAverage === 0) errors.push('Overall average cannot be zero');
    if (!data.formMasterComment) errors.push('Form Master comment is required');

    // Score validation
    data.scores.forEach((score, index) => {
        if (score.classScore < 0 || score.classScore > 100) errors.push(`Subject ${index + 1}: Class score must be 0-100`);
        if (score.examScore < 0 || score.examScore > 100) errors.push(`Subject ${index + 1}: Exam score must be 0-100`);
    });

    // WARNINGS (Allow publishing with confirmation)
    if (data.attendance.present + data.attendance.absent + data.attendance.late === 0) warnings.push('Attendance not recorded');

    const attendanceRate = data.attendance.present / (data.attendance.present + data.attendance.absent + data.attendance.late);
    if (attendanceRate < 0.75) warnings.push('Attendance below 75% - student may need intervention');

    if (data.overallAverage < 40) warnings.push('Overall average below passing grade (40%)');

    if (!data.headmasterComment) warnings.push('Headmaster comment not provided');

    return {
        canPublish: errors.length === 0,
        errors,
        warnings
    };
}
```

### Field-Level Validation

**Real-time Validation (as user types)**

-   Score inputs: 0-100 range, numeric only
-   Character limits: Instant visual feedback
-   Duplicate subject check: Show error on duplicate selection

**On-Blur Validation**

-   Auto-calculate totals
-   Grade assignment
-   Save draft (debounced)

---

## 5. Publishing Workflow

### State Machine

```
┌─────────┐  Create/Edit   ┌─────────┐   Publish    ┌───────────┐
│   New   │ ─────────────> │  Draft  │ ───────────> │ Published │
└─────────┘                 └─────────┘              └───────────┘
                                 ↑                         │
                                 │      Unpublish          │
                                 └─────────────────────────┘
                                      (Admin only)
```

### Publish Action

```typescript
async function publishExamScore(scoreId: string) {
    // 1. Validate
    const validation = validateExamScore(scoreData);
    if (!validation.canPublish) {
        showErrors(validation.errors);
        return;
    }

    // 2. Show warnings if any
    if (validation.warnings.length > 0) {
        const proceed = await confirmDialog({
            message: validation.warnings.join('\n'),
            header: 'Publish with Warnings?',
            acceptLabel: 'Yes, Publish',
            rejectLabel: 'Review'
        });
        if (!proceed) return;
    }

    // 3. Final confirmation
    const confirmed = await confirmDialog({
        message: 'Publish results for ' + studentName + '?',
        header: 'Confirm Publication'
    });
    if (!confirmed) return;

    // 4. Publish
    await api.patch(`/api/exam-scores/${scoreId}`, {
        isPublished: true,
        publishedAt: new Date()
    });

    // 5. Add to modification history
    await api.post(`/api/exam-scores/${scoreId}/history`, {
        action: 'published',
        modifiedBy: currentUser._id
    });

    showSuccess('Results published successfully');
}
```

### Unpublish Action (Admin Only)

```typescript
async function unpublishExamScore(scoreId: string) {
    // Check permissions
    if (!['admin', 'headmaster'].includes(user.role)) {
        showError('Unauthorized action');
        return;
    }

    // Confirmation with reason
    const { confirmed, reason } = await confirmDialogWithInput({
        message: 'Enter reason for unpublishing:',
        header: 'Unpublish Exam Results',
        inputRequired: true
    });

    if (!confirmed) return;

    await api.patch(`/api/exam-scores/${scoreId}`, {
        isPublished: false,
        publishedAt: null
    });

    // Log to modification history
    await api.post(`/api/exam-scores/${scoreId}/history`, {
        action: 'unpublished',
        modifiedBy: currentUser._id,
        reason: reason
    });

    showSuccess('Results unpublished');
}
```

---

## 6. Modification History & Audit Trail

### Timeline Display (Bottom of Review Step)

```
┌─────────────────────────────────────────────────────┐
│              📜 MODIFICATION HISTORY                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ● 2025-01-15 10:30 AM - Published                   │
│   by Mr. John Doe (Form Master)                     │
│                                                      │
│ ● 2025-01-15 09:45 AM - Updated                     │
│   by Mr. John Doe                                   │
│   Changes: Added Headmaster comment                 │
│                                                      │
│ ● 2025-01-14 03:20 PM - Created                     │
│   by Mr. John Doe                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Change Tracking

Store modification history on every update:

```typescript
{
  modifiedBy: ObjectId,
  modifiedAt: Date,
  changes: {
    field: 'scores',
    before: { /* old values */ },
    after: { /* new values */ }
  }
}
```

---

## 7. Role-Based Access Control

### Permission Matrix

| Action              | Teacher          | Form Master    | Headmaster | Admin |
| ------------------- | ---------------- | -------------- | ---------- | ----- |
| Create Draft        | ✅ (own classes) | ✅ (own class) | ✅         | ✅    |
| Edit Draft          | ✅ (own)         | ✅ (own class) | ✅         | ✅    |
| Enter Scores        | ✅               | ✅             | ✅         | ✅    |
| Form Master Comment | ❌               | ✅             | ✅         | ✅    |
| Headmaster Comment  | ❌               | ❌             | ✅         | ✅    |
| Publish             | ❌               | ✅             | ✅         | ✅    |
| Unpublish           | ❌               | ❌             | ✅         | ✅    |
| Delete              | ❌               | ❌             | ❌         | ✅    |
| View Published      | ✅               | ✅             | ✅         | ✅    |

### Implementation

```typescript
// Field-level permissions
const canEditHeadmasterComment = ['headmaster', 'admin'].includes(user.role);
const canPublish = ['form_master', 'headmaster', 'admin'].includes(user.role);
const canUnpublish = ['headmaster', 'admin'].includes(user.role);

// Class filtering
const allowedClasses =
    user.role === 'teacher'
        ? user.assignedClasses // Only classes they teach
        : user.role === 'form_master'
        ? [user.formMasterClass] // Only their form class
        : null; // Headmaster/Admin see all
```

---

## 8. UX & Accessibility

### Keyboard Navigation

**Global Shortcuts**

-   `Ctrl + S`: Save draft
-   `Ctrl + →`: Next step
-   `Ctrl + ←`: Previous step
-   `Ctrl + Enter`: Submit/Publish (from Review step)
-   `Escape`: Close dialogs

**Table Navigation**

-   `Tab`: Next cell
-   `Shift + Tab`: Previous cell
-   `Enter`: Next row
-   `Ctrl + Enter`: Add new row
-   `Delete`: Clear cell value

### Screen Reader Support

**ARIA Labels**

```tsx
<input
  aria-label="Class Score for Mathematics"
  aria-describedby="math-class-score-hint"
  aria-invalid={errors.classScore ? 'true' : 'false'}
/>
<span id="math-class-score-hint" className="sr-only">
  Enter score between 0 and 100
</span>
```

**Live Regions**

```tsx
<div aria-live="polite" aria-atomic="true">
    {message && <span>{message}</span>}
</div>
```

### Color Contrast

**Grade Colors** (WCAG AA compliant)

-   A: Green (#22c55e) with dark text
-   B: Blue (#3b82f6) with white text
-   C: Amber (#f59e0b) with dark text
-   D: Orange (#f97316) with white text
-   E: Red (#ef4444) with white text
-   F: Dark Red (#991b1b) with white text

### Loading States

**Skeleton Loaders**

```
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ Loading...     │
│ ▓▓▓▓░░░░░░░░░░░░░░░░                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░                │
└──────────────────────────────────────┘
```

**Progress Indicators**

-   Step transitions: 200ms fade
-   Save operation: Toast notification with spinner
-   Bulk calculations: Progress bar

---

## 9. Error Handling

### Error Display Patterns

**Inline Field Errors**

```tsx
<div className="field">
    <label htmlFor="classScore">Class Score*</label>
    <InputNumber id="classScore" className={errors.classScore ? 'p-invalid' : ''} value={classScore} onChange={(e) => setClassScore(e.value)} />
    {errors.classScore && <small className="p-error">{errors.classScore}</small>}
</div>
```

**Toast Notifications**

```typescript
// Success
toast.current.show({
    severity: 'success',
    summary: 'Success',
    detail: 'Exam scores saved successfully',
    life: 3000
});

// Error
toast.current.show({
    severity: 'error',
    summary: 'Validation Error',
    detail: 'Please fix the errors before publishing',
    life: 5000,
    sticky: true
});

// Warning
toast.current.show({
    severity: 'warn',
    summary: 'Warning',
    detail: 'Attendance below 75%',
    life: 4000
});
```

**Error Summary Panel** (Top of form when errors exist)

```
┌─────────────────────────────────────────────────────┐
│ ❌ 3 ERRORS MUST BE FIXED                           │
├─────────────────────────────────────────────────────┤
│ • Class Score for Mathematics exceeds 100           │
│ • Form Master comment is required                   │
│ • Overall average cannot be zero                    │
│                                                      │
│ [Go to First Error]                                 │
└─────────────────────────────────────────────────────┘
```

---

## 10. Performance Optimizations

### Data Management

**Optimistic Updates**

```typescript
// Update UI immediately, rollback on error
const handleScoreChange = async (subjectId, field, value) => {
    // Update local state immediately
    updateLocalScore(subjectId, field, value);

    try {
        // Debounced API call
        await debouncedSave(scoreData);
    } catch (error) {
        // Rollback on error
        revertLocalScore(subjectId, field);
        showError('Failed to save. Please retry.');
    }
};
```

**Debounced Autosave**

```typescript
const debouncedSave = useMemo(
    () =>
        debounce(async (data) => {
            await api.patch(`/api/exam-scores/${scoreId}`, data);
        }, 1000),
    [scoreId]
);
```

**Virtual Scrolling** (for large subject lists)

```tsx
<DataTable value={scores} virtualScrollerOptions={{ itemSize: 50 }} scrollable scrollHeight="400px">
    {/* columns */}
</DataTable>
```

### Bundle Size

**Code Splitting**

```typescript
// Lazy load heavy components
const ReviewStep = lazy(() => import('./steps/ReviewStep'));
const SubjectScoresTable = lazy(() => import('./SubjectScoresTable'));
```

**Tree Shaking**

-   Import only needed PrimeReact components
-   Use lodash-es for selective imports

---

## 11. Responsive Design

### Breakpoints

```scss
// Desktop-first approach
$breakpoint-tablet: 1024px;
$breakpoint-mobile: 768px;
$breakpoint-small: 480px;

// Step 2 (Scores Table) on mobile
@media (max-width: $breakpoint-tablet) {
    .scores-table {
        // Switch to card view
        display: block;

        .subject-row {
            border: 1px solid var(--surface-border);
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
    }
}
```

### Mobile Adaptations

**Subject Scores on Mobile**

```
┌──────────────────────────────────┐
│ Mathematics                      │
│ -------------------------------- │
│ Class Score:    85               │
│ Exam Score:     88               │
│ Total:          86.5             │
│ Grade:          A                │
│ Position:       3 / 45           │
│                                  │
│ [View Details] [Delete]          │
└──────────────────────────────────┘
```

**Stepper on Mobile**

-   Vertical stepper instead of horizontal
-   Collapsible completed steps
-   Sticky "Continue" button at bottom

---

## 12. Text-Based Wireframes

### Overall Component Flow

```
START
  ↓
[Does record exist?]
  ├─ Yes → [Load existing record] → [Edit Mode]
  └─ No → [New record form] → [Create Mode]
  ↓
[Step 1: Academic Context]
  ↓
[Duplicate check]
  ├─ Duplicate found → [Warning dialog] → [User chooses: View/Create Anyway]
  └─ No duplicate → Continue
  ↓
[Step 2: Subject Scores Entry]
  ↓ (Add rows, enter scores, auto-calculate)
  ↓
[Step 3: Attendance & Behavior]
  ↓ (Enter attendance, select conduct ratings)
  ↓
[Step 4: Comments & Promotion]
  ↓ (Write comments, set promotion status)
  ↓
[Step 5: Review & Publish]
  ↓
[Validation check]
  ├─ Has errors → [Show errors] → [Go back to fix]
  └─ No errors → [Enable Publish button]
  ↓
[User clicks Publish]
  ↓
[Confirmation dialog]
  ├─ Cancel → Stay on review
  └─ Confirm → [Publish to database]
  ↓
[Success notification]
  ↓
[Redirect to published view or stay in form]
  ↓
END
```

---

## 13. Implementation Checklist

### Phase 1: Foundation (Week 1)

-   [ ] Set up component structure
-   [ ] Implement stepper navigation
-   [ ] Create Step 1 (Academic Context)
-   [ ] Implement duplicate detection
-   [ ] Set up form validation schema

### Phase 2: Core Functionality (Week 2)

-   [ ] Build Subject Scores DataTable (Step 2)
-   [ ] Implement inline editing
-   [ ] Auto-calculation logic
-   [ ] Add/remove subject rows
-   [ ] Keyboard navigation

### Phase 3: Additional Steps (Week 3)

-   [ ] Step 3: Attendance & Behavior
-   [ ] Step 4: Comments & Promotion
-   [ ] Step 5: Review & Summary
-   [ ] Role-based field restrictions

### Phase 4: Publishing & Polish (Week 4)

-   [ ] Publish/unpublish workflow
-   [ ] Confirmation dialogs
-   [ ] Modification history timeline
-   [ ] Error handling & validation UI
-   [ ] Loading states & animations

### Phase 5: Testing & Optimization (Week 5)

-   [ ] Accessibility audit (WCAG AA)
-   [ ] Keyboard navigation testing
-   [ ] Mobile responsive testing
-   [ ] Performance optimization
-   [ ] User acceptance testing

---

## 14. API Endpoints Required

```typescript
// Exam Scores
POST   /api/exam-scores              // Create new record
GET    /api/exam-scores/:id          // Get single record
PUT    /api/exam-scores/:id          // Update record
DELETE /api/exam-scores/:id          // Delete record (admin only)
PATCH  /api/exam-scores/:id/publish  // Publish record
PATCH  /api/exam-scores/:id/unpublish // Unpublish record

// Check for duplicates
GET    /api/exam-scores/check-duplicate?student=X&year=Y&term=Z

// Bulk operations
POST   /api/exam-scores/bulk-import  // Import multiple scores from CSV

// Supporting data
GET    /api/students?class=X         // Get students by class
GET    /api/subjects?class=X         // Get subjects for class
GET    /api/classes                  // Get all classes
```

---

## 15. Success Metrics

### User Experience

-   **Task Completion Rate**: > 95% of users successfully publish scores
-   **Time to Complete**: Average < 5 minutes per student
-   **Error Rate**: < 5% validation errors on submit
-   **User Satisfaction**: > 4.5/5 rating

### Technical Performance

-   **Page Load Time**: < 2 seconds
-   **Auto-save Latency**: < 500ms
-   **Table Rendering**: 60fps for 50+ subjects
-   **Mobile Performance**: Lighthouse score > 90

### Accessibility

-   **WCAG Compliance**: Level AA
-   **Keyboard Navigation**: 100% accessible without mouse
-   **Screen Reader**: Compatible with JAWS/NVDA

---

## Conclusion

This design provides a comprehensive, production-ready blueprint for the ExamScoreEntryForm component. The stepper pattern balances complexity with usability, while role-based controls ensure data integrity. Automatic calculations reduce manual errors, and the robust validation system prevents incomplete data from being published.

**Key Strengths:**

1. **Progressive disclosure** reduces cognitive load
2. **Immediate feedback** catches errors early
3. **Role-based access** enforces school hierarchy
4. **Audit trail** provides accountability
5. **Responsive design** works across devices
6. **Accessibility** ensures inclusive access

**Next Steps:**

1. Review and approve design
2. Begin Phase 1 implementation
3. Conduct user testing with teachers
4. Iterate based on feedback
