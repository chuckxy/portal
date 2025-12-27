# ExamScoreEntryForm - Implementation Guide

## Overview

This guide provides complete implementation details for the ExamScoreEntryForm component, including API routes, component usage, and deployment checklist.

---

## 📁 File Structure

```
portal/
├── components/
│   └── ExamScoreEntryForm.tsx          # Main form component
├── app/
│   └── api/
│       └── exam-scores/
│           ├── route.ts                 # GET (list), POST (create)
│           ├── [id]/
│           │   ├── route.ts            # GET, PUT, DELETE
│           │   ├── publish/
│           │   │   └── route.ts        # PATCH (publish)
│           │   └── unpublish/
│           │       └── route.ts        # PATCH (unpublish)
│           └── check-duplicate/
│               └── route.ts             # GET (check duplicate)
├── models/
│   └── ExamScore.ts                     # Mongoose model (already exists)
└── docs/
    ├── EXAM_SCORE_ENTRY_UX_DESIGN.md   # Full UX specification
    └── EXAM_SCORE_ENTRY_GUIDE.md       # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

Ensure you have the required packages:

```bash
npm install primereact primeicons lodash
npm install --save-dev @types/lodash
```

### 2. Import and Use Component

```tsx
// In your page or parent component
import ExamScoreEntryForm from '@/components/ExamScoreEntryForm';

export default function ExamScorePage() {
    const handleSave = (data) => {
        console.log('Saved:', data);
        // Navigate or show success message
    };

    const handleCancel = () => {
        // Navigate back or close modal
    };

    return <ExamScoreEntryForm onSave={handleSave} onCancel={handleCancel} />;
}
```

### 3. Edit Existing Record

```tsx
// Fetch existing data and pass to component
const [examScore, setExamScore] = useState(null);

useEffect(() => {
    fetch(`/api/exam-scores/${scoreId}`)
        .then((res) => res.json())
        .then((data) => setExamScore(data));
}, [scoreId]);

return <ExamScoreEntryForm existingScore={examScore} onSave={handleSave} onCancel={handleCancel} />;
```

---

## 🔌 API Integration

### Base URL

```
/api/exam-scores
```

### Available Endpoints

#### 1. **List Exam Scores**

```
GET /api/exam-scores
```

**Query Parameters:**

-   `school` (string): Filter by school ID
-   `site` (string): Filter by site ID
-   `class` (string): Filter by class ID
-   `student` (string): Filter by student ID
-   `academicYear` (string): Filter by year (e.g., "2024/2025")
-   `academicTerm` (number): Filter by term (1, 2, or 3)
-   `isPublished` (boolean): Filter by publication status
-   `page` (number): Page number (default: 1)
-   `limit` (number): Results per page (default: 50)

**Example:**

```typescript
fetch('/api/exam-scores?class=abc123&academicYear=2024/2025&academicTerm=2')
    .then((res) => res.json())
    .then((data) => console.log(data.scores, data.pagination));
```

**Response:**

```json
{
    "scores": [...],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 120,
        "totalPages": 3
    }
}
```

---

#### 2. **Create Exam Score**

```
POST /api/exam-scores
```

**Request Body:**

```json
{
    "student": "student_id",
    "class": "class_id",
    "academicYear": "2024/2025",
    "academicTerm": 2,
    "scores": [
        {
            "subject": "subject_id",
            "classScore": 85,
            "examScore": 88,
            "totalScore": 86.5,
            "grade": "A"
        }
    ],
    "attendance": {
        "present": 180,
        "absent": 5,
        "late": 2
    },
    "conduct": "excellent",
    "interest": "very_good",
    "formMasterComment": "Excellent performance...",
    "recordedBy": "teacher_id"
}
```

**Validation:**

-   Student, class, academicYear, academicTerm are required
-   Checks for duplicate (student + year + term)
-   Auto-calculates overallAverage and totalMarks

**Response:** Created exam score object with populated references

---

#### 3. **Get Single Exam Score**

```
GET /api/exam-scores/:id
```

**Response:** Full exam score with all populated references

---

#### 4. **Update Exam Score**

```
PUT /api/exam-scores/:id
```

**Request Body:** Same as POST, partial updates allowed

**Notes:**

-   Cannot edit published records (must unpublish first)
-   Adds entry to modificationHistory
-   Auto-recalculates overallAverage and totalMarks

---

#### 5. **Delete Exam Score**

```
DELETE /api/exam-scores/:id
```

**Notes:**

-   Admin only
-   Cannot delete published records (must unpublish first)

---

#### 6. **Publish Exam Score**

```
PATCH /api/exam-scores/:id/publish
```

**Validation Checks:**

-   All required fields present
-   At least one subject score
-   Overall average > 0
-   Form Master comment provided

**Response:** Published exam score with `isPublished: true` and `publishedAt` timestamp

---

#### 7. **Unpublish Exam Score**

```
PATCH /api/exam-scores/:id/unpublish
```

**Request Body:**

```json
{
    "modifiedBy": "user_id",
    "reason": "Correction needed"
}
```

**Notes:**

-   Headmaster/Admin only
-   Adds reason to modification history

---

#### 8. **Check Duplicate**

```
GET /api/exam-scores/check-duplicate?student=X&year=Y&term=Z
```

**Response:**

```json
{
    "exists": true,
    "recordId": "existing_record_id",
    "message": "Exam record already exists..."
}
```

---

## 🎨 Component Props

### ExamScoreEntryForm Props

```typescript
interface ExamScoreEntryFormProps {
    existingScore?: ExamScoreData; // For edit mode
    onSave?: (data: ExamScoreData) => void; // Callback after save
    onCancel?: () => void; // Callback to cancel/close
}
```

### ExamScoreData Interface

```typescript
interface ExamScoreData {
    _id?: string;
    student: any; // Person object or ID
    school: any;
    site: any;
    class: any;
    academicYear: string;
    academicTerm: number; // 1, 2, or 3
    scores: SubjectScore[];
    overallPosition?: number;
    overallAverage: number;
    totalMarks: number;
    attendance: {
        present: number;
        absent: number;
        late: number;
    };
    conduct: string; // 'excellent' | 'very_good' | etc.
    interest: string;
    formMasterComment: string;
    headmasterComment: string;
    nextTermBegins?: Date;
    promoted: boolean;
    promotedTo?: any;
    recordedBy: any;
    modificationHistory: any[];
    isPublished: boolean;
    publishedAt?: Date;
}
```

---

## 🔐 Role-Based Access Control

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

### Implementation

```typescript
// In your component
const { user } = useAuth();

const canEditHeadmasterComment = ['headmaster', 'admin'].includes(user?.personCategory);
const canPublish = ['teacher', 'headmaster', 'admin'].includes(user?.personCategory);
const canUnpublish = ['headmaster', 'admin'].includes(user?.personCategory);
```

---

## 🧪 Testing Checklist

### Unit Tests

-   [ ] Grade calculation (`getGrade()`)
-   [ ] Total score calculation (40% class + 60% exam)
-   [ ] Overall average calculation
-   [ ] Attendance percentage calculation
-   [ ] Validation functions

### Integration Tests

-   [ ] Create new exam score
-   [ ] Edit draft exam score
-   [ ] Publish exam score (with validation)
-   [ ] Unpublish exam score
-   [ ] Duplicate detection
-   [ ] Auto-save functionality

### User Acceptance Tests

-   [ ] Teacher can create and edit scores for their classes
-   [ ] Form Master can publish results for their class
-   [ ] Headmaster can add comments and unpublish
-   [ ] Admin can delete unpublished records
-   [ ] Students cannot access creation form
-   [ ] Published records are locked from editing

### Accessibility Tests

-   [ ] Keyboard navigation works (Tab, Enter, Escape)
-   [ ] Screen reader announces errors
-   [ ] ARIA labels present on all inputs
-   [ ] Color contrast meets WCAG AA
-   [ ] Focus visible on all interactive elements

### Performance Tests

-   [ ] Form loads in < 2 seconds
-   [ ] Auto-save doesn't block UI
-   [ ] Large subject lists (50+) render smoothly
-   [ ] Table scrolling is smooth (60fps)

---

## 🎯 Usage Examples

### Example 1: Create New Exam Score

```tsx
import ExamScoreEntryForm from '@/components/ExamScoreEntryForm';

export default function NewExamScorePage() {
    const router = useRouter();

    const handleSave = (data) => {
        toast.success('Exam score created successfully');
        router.push('/exam-scores');
    };

    return (
        <div className="p-4">
            <ExamScoreEntryForm onSave={handleSave} onCancel={() => router.back()} />
        </div>
    );
}
```

---

### Example 2: Edit Existing Score

```tsx
import { useEffect, useState } from 'react';
import ExamScoreEntryForm from '@/components/ExamScoreEntryForm';

export default function EditExamScorePage({ params }) {
    const [examScore, setExamScore] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/exam-scores/${params.id}`)
            .then((res) => res.json())
            .then((data) => {
                setExamScore(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    if (loading) return <div>Loading...</div>;

    return <ExamScoreEntryForm existingScore={examScore} onSave={(data) => console.log('Updated:', data)} onCancel={() => router.back()} />;
}
```

---

### Example 3: In Modal Dialog

```tsx
import { Dialog } from 'primereact/dialog';
import ExamScoreEntryForm from '@/components/ExamScoreEntryForm';

export default function ExamScoreModal({ visible, onHide, scoreId }) {
    const [examScore, setExamScore] = useState(null);

    useEffect(() => {
        if (scoreId) {
            fetch(`/api/exam-scores/${scoreId}`)
                .then((res) => res.json())
                .then(setExamScore);
        }
    }, [scoreId]);

    return (
        <Dialog visible={visible} onHide={onHide} header="Exam Score Entry" maximizable style={{ width: '90vw' }}>
            <ExamScoreEntryForm
                existingScore={examScore}
                onSave={() => {
                    toast.success('Saved');
                    onHide();
                }}
                onCancel={onHide}
            />
        </Dialog>
    );
}
```

---

### Example 4: Bulk Entry for Class

```tsx
// Create a wrapper component for entering scores for all students in a class
export default function ClassExamEntry({ classId }) {
    const [students, setStudents] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetch(`/api/students?class=${classId}`)
            .then((res) => res.json())
            .then(setStudents);
    }, [classId]);

    const handleNext = (data) => {
        console.log('Saved for student:', students[currentIndex]);
        if (currentIndex < students.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            toast.success('All students completed!');
        }
    };

    return (
        <div>
            <div className="mb-3">
                <ProgressBar value={(currentIndex / students.length) * 100} />
                <p>
                    Student {currentIndex + 1} of {students.length}
                </p>
            </div>
            <ExamScoreEntryForm
                key={students[currentIndex]?._id}
                existingScore={{
                    student: students[currentIndex],
                    class: classId
                    // ... prefill other data
                }}
                onSave={handleNext}
            />
        </div>
    );
}
```

---

## 🛠️ Customization

### Change Grading Scale

Edit the `getGrade()` function in `ExamScoreEntryForm.tsx`:

```typescript
const getGrade = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
};
```

### Change Score Calculation Formula

Modify `calculateTotalScore()`:

```typescript
// Current: 40% class + 60% exam
const calculateTotalScore = (classScore: number, examScore: number): number => {
    return classScore * 0.4 + examScore * 0.6;
};

// Alternative: 50-50 split
const calculateTotalScore = (classScore: number, examScore: number): number => {
    return (classScore + examScore) / 2;
};

// Alternative: Exam only
const calculateTotalScore = (classScore: number, examScore: number): number => {
    return examScore;
};
```

### Add Custom Validation Rules

In the `validateStep()` function:

```typescript
case 1: // Subject Scores
    // Add custom rule: Minimum 5 subjects required
    if (formData.scores.length < 5) {
        stepErrors.push({
            field: 'scores',
            message: 'Minimum 5 subjects required',
            step: 1
        });
    }
    break;
```

### Change Step Order

Modify the `steps` array:

```typescript
const steps = [{ label: 'Select Student' }, { label: 'Enter Scores' }, { label: 'Comments' }, { label: 'Review' }];
```

---

## 🐛 Troubleshooting

### Issue: Autosave not working

**Solution:** Check network tab for failed API calls. Ensure the record has an `_id` (autosave only works for existing records).

```typescript
// Debug autosave
useEffect(() => {
    console.log('Autosave triggered for:', formData._id);
    if (formData._id && !formData.isPublished) {
        debouncedSave(formData);
    }
}, [formData, debouncedSave]);
```

---

### Issue: Duplicate warning shows for same record in edit mode

**Solution:** The duplicate check should exclude the current record:

```typescript
// In check-duplicate API
if (data.exists && (!existingScore || data.recordId !== existingScore._id)) {
    setDuplicateWarning(...);
}
```

---

### Issue: Published records can be edited

**Solution:** Add check in PUT endpoint:

```typescript
if (existingScore.isPublished && body.isPublished !== false) {
    return NextResponse.json({ error: 'Cannot edit published records' }, { status: 403 });
}
```

---

### Issue: Headmaster comment editable by teachers

**Solution:** Disable field based on role:

```typescript
<InputTextarea disabled={!canEditHeadmasterComment} value={formData.headmasterComment} />
```

---

## 📊 Performance Optimization

### 1. **Lazy Loading Steps**

```typescript
import { lazy, Suspense } from 'react';

const Step2SubjectScores = lazy(() => import('./steps/SubjectScores'));
const Step5Review = lazy(() => import('./steps/Review'));

// In render:
<Suspense fallback={<ProgressSpinner />}>{activeStep === 1 && <Step2SubjectScores />}</Suspense>;
```

### 2. **Memoize Expensive Calculations**

```typescript
import { useMemo } from 'react';

const overallAverage = useMemo(() => {
    return calculateOverallAverage();
}, [formData.scores]);
```

### 3. **Virtual Scrolling for Large Tables**

```tsx
<DataTable value={formData.scores} virtualScrollerOptions={{ itemSize: 50 }} scrollable scrollHeight="400px">
    {/* columns */}
</DataTable>
```

---

## 🚢 Deployment Checklist

-   [ ] Environment variables configured
-   [ ] Database indexes created (see ExamScore model)
-   [ ] API rate limiting configured
-   [ ] Error tracking enabled (Sentry, etc.)
-   [ ] Backup strategy for exam data
-   [ ] User permissions tested in production
-   [ ] Mobile responsiveness verified
-   [ ] Print stylesheet added for report cards
-   [ ] Analytics tracking configured
-   [ ] Documentation shared with users

---

## 📚 Related Documentation

-   **UX Design Spec**: `/docs/EXAM_SCORE_ENTRY_UX_DESIGN.md`
-   **ExamScore Model**: `/models/ExamScore.ts`
-   **Person Management**: `/docs/PERSON_MANAGEMENT.md`
-   **Subject Management**: `/docs/SUBJECT_MANAGEMENT.md` (if exists)

---

## 🆘 Support

For issues or questions:

1. Check this guide and UX design spec
2. Review API endpoint responses in browser dev tools
3. Check console for validation errors
4. Verify user permissions in AuthContext

---

## 📝 Changelog

### Version 1.0.0 (Initial Release)

-   5-step stepper form
-   CRUD operations for exam scores
-   Role-based access control
-   Publish/unpublish workflow
-   Auto-save functionality
-   Duplicate detection
-   Comprehensive validation
-   Modification history tracking

---

**Last Updated:** December 26, 2025  
**Author:** Senior UI/UX Designer & Frontend Systems Architect
