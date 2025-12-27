# Teacher Dashboard Documentation

## Overview

The Teacher Dashboard is a comprehensive portal designed specifically for teachers/tutors to manage their teaching activities, monitor student performance, and efficiently enter exam scores.

## Features

### 1. Dashboard Overview

-   **Welcome Section**: Personalized greeting with teacher photo and details
-   **Statistics Cards**: Quick view of key metrics
    -   Total subjects taught
    -   Number of classes assigned
    -   Total students across all classes
    -   Pending exam scores count

### 2. Exam Score Management

-   **Published vs Draft Scores**: Visual breakdown of score entry status
-   **Total Scores Entered**: Track your productivity
-   **Average Scores**: Monitor overall class performance
    -   Average Total Score
    -   Average Class Score
    -   Average Exam Score

### 3. Quick Actions

Four main action buttons for common tasks:

#### a. Enter Individual Score

-   Opens a dialog with the individual exam score entry form
-   Suitable for entering scores one student at a time
-   5-step wizard interface for guided data entry

#### b. Enter Class Scores

-   Opens bulk score entry interface
-   Enter scores for entire class at once
-   Features:
    -   CSV template download
    -   Bulk CSV upload
    -   Real-time grade calculation
    -   Frozen columns for easy navigation
    -   Statistics dashboard (average, highest, lowest scores)
    -   Grade distribution chart

#### c. View All Scores

-   Navigate to complete exam scores listing
-   Filter and search functionality
-   Edit and manage existing scores

#### d. View Reports

-   Access comprehensive reports and analytics
-   Performance trends
-   Grade distributions

### 4. Subject Overview

-   Visual display of all subjects assigned to the teacher
-   Shows subject name and code
-   Chip-based UI for easy scanning

### 5. Class Management

-   List of all classes taught
-   Student count per class
-   Quick action button to enter scores for specific class
-   One-click access to class score entry

### 6. Recent Activity

-   Table view of last 10 exam scores entered
-   Shows:
    -   Student name
    -   Subject (name and code)
    -   Total score percentage
    -   Grade (color-coded)
    -   Publication status (Published/Draft)
    -   Entry date
-   Pagination for large datasets

## API Endpoints

### GET /api/teachers/dashboard

Fetches comprehensive dashboard data for a teacher.

**Query Parameters:**

-   `teacherId` (required): The MongoDB ObjectId of the teacher

**Response:**

```json
{
  "success": true,
  "data": {
    "teacher": {
      "_id": "...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "photoLink": "...",
      "jobTitle": "Mathematics Teacher",
      "school": {...},
      "schoolSite": {...},
      "dateJoined": "2023-01-15"
    },
    "subjects": [...],
    "classes": [...],
    "statistics": {
      "totalSubjects": 3,
      "totalClasses": 5,
      "totalStudents": 150,
      "totalScoresEntered": 450,
      "publishedScores": 420,
      "draftScores": 30,
      "pendingScores": 50,
      "averageScores": {
        "avgTotal": 72.5,
        "avgClass": 75.2,
        "avgExam": 70.8
      }
    },
    "recentScores": [...]
  }
}
```

## Components

### TeacherDashboard Component

**Location**: `/components/TeacherDashboard.tsx`

**Props:**

```typescript
interface TeacherDashboardProps {
    teacherId: string; // MongoDB ObjectId of the teacher
}
```

**Usage:**

```tsx
import TeacherDashboard from '@/components/TeacherDashboard';

<TeacherDashboard teacherId={user._id} />;
```

## Page Routes

### /teachers

**Location**: `/app/(main)/teachers/page.tsx`

**Access Control:**

-   Requires authentication
-   Only accessible to users with `personCategory === 'teacher'`
-   Shows error message for non-teacher users
-   Displays loading spinner during authentication check

## Navigation

The Teacher Dashboard is accessible from the main navigation menu:

-   **Menu**: Dashboards → Teacher Dashboard
-   **Icon**: Briefcase icon
-   **Path**: `/teachers`

## Security

### Authentication

-   Uses JWT token-based authentication
-   Token stored in LocalDB
-   All API calls include Bearer token in Authorization header

### Authorization

-   Dashboard only accessible to authenticated teachers
-   API validates teacher ID against authenticated user
-   Only shows data relevant to the specific teacher

## Data Loading

### Initial Load

1. Component mounts
2. Fetches dashboard data from API
3. Displays loading skeleton
4. Renders dashboard with fetched data

### Error Handling

-   Network errors: Shows error message with retry option
-   No data: Shows informative message
-   Invalid teacher: Returns 404 from API

### Refresh Strategy

-   Data refreshes when dialogs are closed
-   Ensures up-to-date information after score entry
-   Can be manually refreshed by user action

## Integration with Exam Score Entry

### Individual Entry

-   Opens `ExamScoreEntryForm` component in dialog
-   Full-screen capable (maximizable)
-   Closes and refreshes dashboard on completion

### Class Entry

-   Opens `ClassExamScoreEntry` component in dialog
-   Can pre-select a class from the class list
-   Supports CSV import/export
-   Real-time validation and calculation

## UI Components Used

### PrimeReact Components

-   Card: Dashboard sections
-   Button: Actions and navigation
-   DataTable: Recent scores list
-   Column: Table columns
-   Chip: Subject tags
-   Tag: Status indicators, grades
-   Skeleton: Loading states
-   Message: Info/error messages
-   Dialog: Modal overlays
-   Dropdown: Form selects
-   ProgressSpinner: Loading indicator

## Responsive Design

### Desktop (lg+)

-   4-column statistics grid
-   Side-by-side subject and class sections
-   Full-width recent scores table

### Tablet (md)

-   2-column statistics grid
-   Stacked subject and class sections
-   Scrollable table

### Mobile (sm)

-   Single column layout
-   Stacked statistics cards
-   Responsive table with horizontal scroll

## Future Enhancements

### Planned Features

1. **Analytics Dashboard**

    - Student performance trends over time
    - Subject-wise performance comparison
    - Grade distribution charts

2. **Notifications**

    - Upcoming exam reminders
    - Pending score entry alerts
    - Student performance alerts

3. **Calendar Integration**

    - Class schedule view
    - Exam timetable
    - Assignment deadlines

4. **Communication Tools**

    - Message students/parents
    - Announcement posting
    - Feedback submission

5. **Resource Management**
    - Lesson plan storage
    - Teaching material library
    - Assignment tracking

## Troubleshooting

### Common Issues

**Dashboard not loading**

-   Check authentication status
-   Verify teacher ID is valid
-   Check network connectivity
-   Review browser console for errors

**Statistics showing zero**

-   Verify subjects are assigned to teacher
-   Check if classes are properly linked
-   Ensure students are enrolled in classes

**Exam entry dialogs not opening**

-   Check if ExamScoreEntryForm component exists
-   Verify ClassExamScoreEntry component exists
-   Review browser console for import errors

**Data not refreshing after score entry**

-   Verify onClose callbacks are properly connected
-   Check if loadDashboardData is being called
-   Review network tab for API call completion

## Best Practices

### For Administrators

1. Assign subjects to teachers during onboarding
2. Ensure teachers are linked to their classes
3. Maintain accurate student enrollment data
4. Monitor pending score entries regularly

### For Teachers

1. Enter scores promptly after exams
2. Review draft scores before publishing
3. Use CSV upload for large classes
4. Verify score accuracy before publishing
5. Monitor average scores for early intervention

## Support

For technical support or feature requests, contact the development team or system administrator.
