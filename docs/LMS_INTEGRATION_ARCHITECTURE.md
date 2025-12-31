# LMS Integration Architecture - Technical Specification

## Executive Summary

This document outlines the comprehensive integration strategy for merging the Learning Management System (LMS) into the existing School Management System (SMS). The integration unifies three core entities (Institution→SchoolSite, User→Person, Course→Subject) while preserving all LMS functionality and SMS data integrity.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED SCHOOL PORTAL                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         UNIFIED CORE LAYER                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐   │   │
│  │  │   School    │───▶│  SchoolSite │◀───│   Person    │───▶│  Subject   │   │   │
│  │  │  (Parent)   │    │ (Institution)│    │   (User)    │    │  (Course)  │   │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘    └────────────┘   │   │
│  │         │                  │                  │                  │          │   │
│  │         │    LMS Extensions Added            │                  │          │   │
│  │         ▼                  ▼                  ▼                  ▼          │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                                 │
│  ┌─────────────────────────────────┴─────────────────────────────────────────────┐ │
│  │                              LMS MODULE LAYER                                  │ │
│  │                                                                                │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐ │ │
│  │  │   Course Structure   │  │  Enrollment & Progress │  │  Assessment Layer  │ │ │
│  │  │  ┌────────────────┐  │  │  ┌──────────────────┐ │  │  ┌───────────────┐ │ │ │
│  │  │  │  CourseModule  │  │  │  │    Enrollment    │ │  │  │     Quiz      │ │ │ │
│  │  │  └───────┬────────┘  │  │  └──────────────────┘ │  │  └───────────────┘ │ │ │
│  │  │  ┌───────▼────────┐  │  │  ┌──────────────────┐ │  │  ┌───────────────┐ │ │ │
│  │  │  │    Chapter     │  │  │  │   UserModule     │ │  │  │ QuizQuestion  │ │ │ │
│  │  │  └───────┬────────┘  │  │  └──────────────────┘ │  │  └───────────────┘ │ │ │
│  │  │  ┌───────▼────────┐  │  │  ┌──────────────────┐ │  │  ┌───────────────┐ │ │ │
│  │  │  │    Lesson      │  │  │  │UserModuleLesson  │ │  │  │UserQuizAttempt│ │ │ │
│  │  │  └───────┬────────┘  │  │  └──────────────────┘ │  │  └───────────────┘ │ │ │
│  │  │  ┌───────▼────────┐  │  │  ┌──────────────────┐ │  │  ┌───────────────┐ │ │ │
│  │  │  │CourseMaterial  │  │  │  │VideoProgress     │ │  │  │  Assignment   │ │ │ │
│  │  │  └────────────────┘  │  │  │PDFProgress       │ │  │  │  Submission   │ │ │ │
│  │  └──────────────────────┘  └──────────────────────┘  └─────────────────────┘ │ │
│  │                                                                                │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐ │ │
│  │  │   Communication      │  │   Notes & Reviews    │  │   Analytics         │ │ │
│  │  │  ┌────────────────┐  │  │  ┌──────────────────┐ │  │  ┌───────────────┐ │ │ │
│  │  │  │  Announcement  │  │  │  │   LessonNotes    │ │  │  │ UserPageTime  │ │ │ │
│  │  │  │  LMSMessage    │  │  │  │   CourseReview   │ │  │  └───────────────┘ │ │ │
│  │  │  │  HelpRequest   │  │  │  └──────────────────┘ │  │                     │ │ │
│  │  │  └────────────────┘  │  └──────────────────────┘  └─────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                     EXISTING SMS MODULE LAYER                                │   │
│  │   Financial  │  Library  │  Exam Scores  │  Timetable  │  Fees  │ ...       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entity Mapping Strategy

### 2.1 Institution → SchoolSite Mapping

| LMS Field (Institution) | SMS Field (SchoolSite) | Strategy               |
| ----------------------- | ---------------------- | ---------------------- |
| `institutionName`       | `siteName`             | Direct map             |
| `phoneNumber`           | `phone`                | Direct map             |
| `address`               | `address.street`       | Map to nested object   |
| `createdAt`             | `createdAt`            | Preserved (timestamps) |
| `updatedAt`             | `updatedAt`            | Preserved (timestamps) |

**Extensions to SchoolSite:**

```typescript
// LMS-specific fields added to SchoolSite
lmsSettings: {
    isLmsEnabled: boolean;
    defaultCourseDuration: number; // days
    maxEnrollmentsPerCourse: number;
    allowSelfEnrollment: boolean;
    certificateTemplate?: string;
}
```

### 2.2 User → Person Mapping

| LMS Field (User)     | SMS Field (Person)                                   | Strategy                                    |
| -------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `username`           | `username`                                           | Direct map                                  |
| `passwordHash`       | `password`                                           | Direct (both bcrypt hashed)                 |
| `firstName`          | `firstName`                                          | Direct map                                  |
| `lastName`           | `lastName`                                           | Direct map                                  |
| `email`              | `contact.email`                                      | Map to nested field                         |
| `phoneNumber`        | `contact.mobilePhone`                                | Map to nested field                         |
| `role`               | `personCategory`                                     | Normalization required (see below)          |
| `dateOfBirth`        | `dateOfBirth`                                        | Direct map                                  |
| `registrationDate`   | `studentInfo.dateJoined` / `employeeInfo.dateJoined` | Contextual map                              |
| `lastLoginDate`      | `lastLogin`                                          | Direct map                                  |
| `profilePicturePath` | `photoLink`                                          | Direct map                                  |
| `status`             | `isActive`                                           | Transform: 'Active'→true, 'Inactive'→false  |
| `address`            | Via `addresses[]`                                    | Create new address reference                |
| `institutionId`      | `schoolSite`                                         | Reference to unified SchoolSite             |
| `gender`             | `gender`                                             | Transform: 'Male'→'male', 'Female'→'female' |

**Role Normalization:**

| LMS Role        | SMS PersonCategory | Notes                     |
| --------------- | ------------------ | ------------------------- |
| `Administrator` | `admin`            | Full LMS admin access     |
| `Instructor`    | `teacher`          | Can create/manage courses |
| `Student`       | `student`          | Standard student access   |

**Extensions to Person (LMS-specific):**

```typescript
// Added to Person schema
lmsProfile: {
    isLmsUser: boolean;
    instructorBio?: string;
    instructorRating?: number;
    totalCoursesCreated?: number;
    totalCoursesEnrolled?: number;
    certifications: [{
        courseId: ObjectId;
        certificateId: string;
        issuedDate: Date;
        expiryDate?: Date;
    }];
    preferences: {
        emailNotifications: boolean;
        browserNotifications: boolean;
        preferredLanguage: string;
    };
}
```

### 2.3 Course → Subject Mapping

| LMS Field (Course)  |   SMS Field (Subject) | Strategy                                   |
| ------------------- | --------------------: | ------------------------------------------ |
| `courseName`        |                `name` | Direct map                                 |
| `courseDescription` |         `description` | Direct map                                 |
| `categoryId`        |          `department` | Map to department or create CourseCategory |
| `startDate`         |             New field | Add to Subject                             |
| `endDate`           |             New field | Add to Subject                             |
| `status`            |            `isActive` | Transform                                  |
| `institutionId`     |                `site` | Reference to SchoolSite                    |
| `addedByUserId`     | New field `createdBy` | Add to Subject                             |
| `courseBannerPath`  |             New field | Add to Subject                             |

**Extensions to Subject (LMS Course functionality):**

```typescript
// Added to Subject schema for LMS course capabilities
lmsCourse: {
    isLmsCourse: boolean;
    courseBanner?: string;
    startDate?: Date;
    endDate?: Date;
    enrollmentLimit?: number;
    currentEnrollment: number;
    isPublished: boolean;
    publishedAt?: Date;
    totalDuration?: number; // minutes
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: ObjectId[]; // Other subjects
    learningOutcomes: string[];
    createdBy: ObjectId;
    lastUpdatedBy?: ObjectId;
}
```

---

## 3. Role & Permission Harmonization

### 3.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  proprietor ─────┬──────────────────────────────────────┐   │
│                  │                                       │   │
│  admin ─────────┬┴─────────────────────────────────────┐│   │
│                 │                                       ││   │
│  headmaster ───┬┴──────────────────────────────────┐   ││   │
│                │                                    │   ││   │
│  teacher ─────┬┴───────────────────────────────┐   │   ││   │
│  (Instructor) │                                 │   │   ││   │
│               │  ┌─────────────────────────────┐│   │   ││   │
│               │  │ LMS Instructor Permissions  ││   │   ││   │
│               │  │ - Create/Edit own courses   ││   │   ││   │
│               │  │ - Manage course modules     ││   │   ││   │
│               │  │ - Grade assignments         ││   │   ││   │
│               │  │ - View enrolled students    ││   │   ││   │
│               │  │ - Create quizzes            ││   │   ││   │
│               │  │ - Respond to help requests  ││   │   ││   │
│               │  └─────────────────────────────┘│   │   ││   │
│               │                                 │   │   ││   │
│  finance ────┬┴────────────────────────────────┴┐  │   ││   │
│              │                                   │  │   ││   │
│  librarian ─┬┴──────────────────────────────────┴──┤   ││   │
│             │                                       │   ││   │
│  student ──┬┴────────────────────────────────────┐ │   ││   │
│            │  ┌─────────────────────────────────┐│ │   ││   │
│            │  │ LMS Student Permissions         ││ │   ││   │
│            │  │ - Enroll in courses             ││ │   ││   │
│            │  │ - View course materials         ││ │   ││   │
│            │  │ - Take quizzes                  ││ │   ││   │
│            │  │ - Submit assignments            ││ │   ││   │
│            │  │ - Track own progress            ││ │   ││   │
│            │  │ - Request help                  ││ │   ││   │
│            │  │ - Write reviews                 ││ │   ││   │
│            │  └─────────────────────────────────┘│ │   ││   │
│            │                                     │ │   ││   │
│  parent ───┴─────────────────────────────────────┴─┴───┴┴───│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Permission Matrix

| Permission        | proprietor | admin | headmaster | teacher | finance | librarian | student | parent |
| ----------------- | ---------- | ----- | ---------- | ------- | ------- | --------- | ------- | ------ |
| Create Course     | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| Edit Any Course   | ✓          | ✓     | ✓          | -       | -       | -         | -       | -      |
| Edit Own Course   | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| Delete Course     | ✓          | ✓     | -          | -       | -       | -         | -       | -      |
| Enroll Students   | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| Self-Enroll       | -          | -     | -          | -       | -       | -         | ✓       | -      |
| View All Progress | ✓          | ✓     | ✓          | -       | -       | -         | -       | -      |
| View Own Progress | ✓          | ✓     | ✓          | ✓       | ✓       | ✓         | ✓       | ✓\*    |
| Grade Assignments | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| Create Quiz       | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| Take Quiz         | -          | -     | -          | -       | -       | -         | ✓       | -      |
| Send Announcement | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |
| View Analytics    | ✓          | ✓     | ✓          | ✓       | -       | -         | -       | -      |

\*Parent can view their children's progress

---

## 4. Enrollment & Academic Mapping

### 4.1 Enrollment Integration

The LMS `Enrollment` maps to the SMS academic structure:

```
SMS Structure:
Person → studentInfo → classHistory[] → subjects[]
                    └→ currentClass → SiteClass → subjects[]

LMS Structure:
User → Enrollment → Course → Modules → Chapters → Lessons

UNIFIED Structure:
Person ─┬─→ studentInfo.classHistory (SMS academic tracking)
        │
        └─→ LMSEnrollment ─→ Subject (with lmsCourse enabled)
                          └→ Modules → Chapters → Lessons
```

### 4.2 Academic Context Mapping

| LMS Concept     | SMS Equivalent       | Integration Strategy                       |
| --------------- | -------------------- | ------------------------------------------ |
| Enrollment      | Subject Registration | LMSEnrollment references Subject           |
| Course Progress | Exam Scores          | Parallel tracking, can feed into ExamScore |
| Module          | Subject Topic Group  | Module maps to Subject.topics range        |
| Chapter         | Subject Unit         | Chapter is a detailed breakdown            |
| Lesson          | Teaching Session     | Granular content delivery                  |
| Quiz            | Assessment           | Separate but can integrate with ExamScore  |

### 4.3 Academic Year/Term Binding

```typescript
// LMSEnrollment includes academic context
{
    personId: ObjectId,          // References Person (Student)
    subjectId: ObjectId,         // References Subject (Course)
    schoolSiteId: ObjectId,      // Multi-tenant isolation
    academicYear: string,        // e.g., "2024/2025"
    academicTerm: number,        // 1, 2, or 3
    enrollmentDate: Date,
    completionDate?: Date,
    status: 'enrolled' | 'completed' | 'dropped' | 'suspended',
    // ... additional fields
}
```

---

## 5. Data Migration Strategy

### 5.1 Migration Phases

```
Phase 1: Schema Preparation (Week 1-2)
├── Add LMS extensions to existing schemas
├── Create new LMS-specific schemas
├── Add virtual fields and aliases for backward compatibility
└── Deploy schema changes (non-breaking)

Phase 2: Core Entity Migration (Week 3-4)
├── Import LMS Institutions → SchoolSite (with lmsSettings)
├── Import LMS Users → Person (with lmsProfile)
├── Import LMS Courses → Subject (with lmsCourse)
└── Generate ID mapping tables

Phase 3: Dependent Entity Migration (Week 5-6)
├── Import Modules (referencing unified Subject)
├── Import Chapters, Lessons, Materials
├── Import Enrollments (referencing unified Person/Subject)
├── Import Progress data (UserModule, UserModuleLesson, etc.)
└── Import Quizzes, Assignments, Submissions

Phase 4: Communication & Analytics (Week 7)
├── Import Announcements
├── Import Messages (to new LMSMessage schema)
├── Import Help Requests
├── Import Notes, Reviews
└── Import Analytics data

Phase 5: Validation & Cutover (Week 8)
├── Data integrity verification
├── API endpoint testing
├── User acceptance testing
├── Gradual traffic migration
└── Legacy system decommission
```

### 5.2 ID Mapping Strategy

```typescript
// Migration mapping collection
const MigrationMappingSchema = new Schema({
    entityType: {
        type: String,
        enum: ['institution', 'user', 'course', 'module', 'chapter', 'lesson', 'enrollment', 'quiz', 'assignment', 'message', 'other'],
        required: true,
        index: true
    },
    legacyId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    newId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    legacyCollection: String,
    newCollection: String,
    migratedAt: {
        type: Date,
        default: Date.now
    },
    migrationBatch: String,
    metadata: Schema.Types.Mixed
});

MigrationMappingSchema.index({ entityType: 1, legacyId: 1 }, { unique: true });
```

### 5.3 Rollback Safety

```typescript
// All migrated documents include rollback metadata
{
    _migration: {
        version: '1.0.0',
        migratedAt: Date,
        legacyId: ObjectId,
        legacyCollection: String,
        checksum: String
    }
}
```

---

## 6. Schema Governance & Best Practices

### 6.1 Naming Conventions

| Category    | Convention               | Example                                |
| ----------- | ------------------------ | -------------------------------------- |
| Collections | PascalCase, singular     | `CourseModule`, `LMSEnrollment`        |
| Fields      | camelCase                | `academicYear`, `enrollmentDate`       |
| Indexes     | descriptive suffix       | `person_site_category_idx`             |
| Enums       | snake_case or UPPER_CASE | `'in_progress'`, `'COMPLETED'`         |
| Virtuals    | camelCase, noun          | `fullName`, `progressPercentage`       |
| Methods     | camelCase, verb          | `calculateProgress()`, `isCompleted()` |

### 6.2 Multi-Tenant Isolation

**Every LMS collection MUST include:**

```typescript
{
    schoolSiteId: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolSite',
        required: true,
        index: true
    }
}
```

**Query Pattern:**

```typescript
// All queries must be scoped to the user's school site
const modules = await CourseModule.find({
    schoolSiteId: currentUser.schoolSite,
    subjectId: courseId
});
```

### 6.3 Index Strategy

| Pattern         | When to Use              | Example                                       |
| --------------- | ------------------------ | --------------------------------------------- |
| Single Field    | High-cardinality lookups | `{ personId: 1 }`                             |
| Compound        | Multi-field queries      | `{ schoolSiteId: 1, status: 1 }`              |
| Compound + Sort | Query + Sort patterns    | `{ personId: 1, createdAt: -1 }`              |
| Sparse          | Optional unique fields   | `{ code: 1 }, { sparse: true, unique: true }` |
| TTL             | Auto-expiring data       | Session tokens, temp data                     |

---

## 7. Risk Analysis & Mitigation

| Risk                       | Likelihood | Impact   | Mitigation                                    |
| -------------------------- | ---------- | -------- | --------------------------------------------- |
| Data loss during migration | Low        | Critical | Backup before each phase, checksum validation |
| ID conflicts               | Medium     | High     | Use mapping table, never reuse legacy IDs     |
| Performance degradation    | Medium     | Medium   | Index optimization, query analysis, caching   |
| Broken integrations        | Medium     | High     | Comprehensive API testing, gradual rollout    |
| Role confusion             | Medium     | Medium   | Clear documentation, permission testing       |
| Academic data mismatch     | Low        | High     | Explicit academicYear/Term on all enrollments |

---

## 8. API Backward Compatibility

For existing LMS consumers, provide compatibility layer:

```typescript
// Alias endpoints (deprecated, forward to new)
router.get('/api/lms/institutions/:id', async (req, res) => {
    // Redirect to unified endpoint
    const schoolSite = await SchoolSite.findById(req.params.id);
    res.json(transformToLegacyInstitution(schoolSite));
});

// Virtual fields on schemas for legacy access
PersonSchema.virtual('institutionId').get(function () {
    return this.schoolSite; // Alias for LMS compatibility
});

SubjectSchema.virtual('courseId').get(function () {
    return this._id; // Self-reference alias
});
```

---

## 9. File Structure

```
models/
├── lms/
│   ├── index.ts                    # Barrel export
│   ├── CourseModule.ts             # Module schema
│   ├── CourseModuleJunction.ts     # Course-Module mapping
│   ├── Chapter.ts                  # Chapter schema
│   ├── Lesson.ts                   # Lesson schema
│   ├── CourseMaterial.ts           # Learning materials
│   ├── CourseCategory.ts           # Course categorization
│   ├── LMSEnrollment.ts            # Enrollment tracking
│   ├── UserModuleProgress.ts       # Module progress
│   ├── UserLessonProgress.ts       # Lesson progress
│   ├── UserVideoProgress.ts        # Video watch tracking
│   ├── UserPDFProgress.ts          # PDF read tracking
│   ├── Quiz.ts                     # Quiz schema
│   ├── QuizQuestion.ts             # Quiz questions
│   ├── UserQuizAttempt.ts          # Quiz attempts
│   ├── LMSAssignment.ts            # Assignments
│   ├── LMSSubmission.ts            # Submissions
│   ├── LMSAnnouncement.ts          # Announcements
│   ├── LMSMessage.ts               # Direct messages
│   ├── HelpRequest.ts              # Help requests
│   ├── LessonNotes.ts              # Student notes
│   ├── CourseReview.ts             # Course reviews
│   └── UserPageTime.ts             # Analytics
└── (existing SMS models remain unchanged)
```

---

## 10. Implementation Status

### ✅ Completed Components

#### Core Schema Extensions

| Schema         | Extension Added           | Location                |
| -------------- | ------------------------- | ----------------------- |
| **SchoolSite** | `lmsSettings` subdocument | `/models/SchoolSite.ts` |
| **Person**     | `lmsProfile` subdocument  | `/models/Person.ts`     |
| **Subject**    | `lmsCourse` subdocument   | `/models/Subject.ts`    |

#### LMS Model Files (22 files)

All LMS schemas created in `/models/lms/`:

| Category                  | Schema Files                                                                                                       | Status |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| **Core**                  | `types.ts`, `index.ts`                                                                                             | ✅     |
| **Course Structure**      | `CourseCategory.ts`, `CourseModule.ts`, `CourseModuleJunction.ts`, `Chapter.ts`, `Lesson.ts`, `CourseMaterial.ts`  | ✅     |
| **Enrollment & Progress** | `LMSEnrollment.ts`, `UserModuleProgress.ts`, `UserLessonProgress.ts`, `UserVideoProgress.ts`, `UserPDFProgress.ts` | ✅     |
| **Assessment**            | `Quiz.ts`, `QuizQuestion.ts`, `UserQuizAttempt.ts`, `LMSAssignment.ts`, `LMSSubmission.ts`                         | ✅     |
| **Communication**         | `LMSAnnouncement.ts`, `LMSMessage.ts`, `HelpRequest.ts`                                                            | ✅     |
| **Notes & Reviews**       | `LessonNotes.ts`, `CourseReview.ts`                                                                                | ✅     |
| **Analytics**             | `UserPageTime.ts`                                                                                                  | ✅     |

#### Migration Utilities

| File                 | Purpose                                       | Location                      |
| -------------------- | --------------------------------------------- | ----------------------------- |
| `migration-utils.ts` | Entity mapping, reference updates, validation | `/lib/lms/migration-utils.ts` |
| `run-migration.ts`   | CLI migration script                          | `/lib/lms/run-migration.ts`   |
| `index.ts`           | Library exports                               | `/lib/lms/index.ts`           |

### Key Design Decisions Implemented

1. **Backward Compatibility Virtuals**: All LMS schemas include virtual fields (`userId`, `courseId`, `institutionId`) that map to the new unified field names (`personId`, `subjectId`, `schoolSiteId`).

2. **Multi-Tenant Isolation**: All LMS collections include `schoolSiteId` for tenant isolation.

3. **Status Transformations**: Migration utilities include mappings for legacy status values (e.g., 'Awaiting' → 'not_started').

4. **Legacy ID Backup**: Migration can optionally backup original LMS IDs in `_legacy_*` fields for rollback support.

### Running the Migration

```bash
# Dry run (no changes)
npx ts-node lib/lms/run-migration.ts --dry-run

# Full migration
npx ts-node lib/lms/run-migration.ts

# With options
npx ts-node lib/lms/run-migration.ts --batch-size=500 --collections=lmsenrollments,usermoduleprogresses
```

---

## 11. Next Steps

1. **Review this architecture document** with stakeholders
2. ~~**Approve schema extensions** to Person, Subject, SchoolSite~~ ✅
3. ~~**Create LMS model files**~~ ✅ (see `/models/lms/`)
4. ~~**Implement migration scripts**~~ ✅ (see `/lib/lms/`)
5. **Build compatibility API layer** for legacy LMS clients
6. **Execute phased migration** per timeline above
7. **Monitor and optimize** post-migration
8. **Create LMS API routes** in `/app/api/lms/`
9. **Build LMS UI components** for course management, progress tracking

---

_Document Version: 1.1.0_  
_Last Updated: Implementation Completed_
