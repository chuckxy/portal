# AI Agent Instructions for School Portal

## Architecture Overview

This is a **Next.js 13 App Router** education portal merging School Management System (SMS) and Learning Management System (LMS) into one unified platform. Built with TypeScript, MongoDB/Mongoose, PrimeReact UI, and Dexie for client-side storage.

### Key Structural Concepts

- **App Router Layout Groups**: `app/(main)/*` = authenticated pages with sidebar, `app/(full-page)/*` = auth/landing pages
- **Unified Entity Model**: SchoolSite (institution), Person (all users), Subject (courses) form the core
- **Role-Based Access**: Person has `personCategory`: proprietor, headmaster, teacher, finance, student, parent, librarian, admin
- **Multi-Tenancy**: Every entity scoped by `school` and `schoolSite` references

## Database & Models

**Connection**: Use `connectToDatabase()` from `@/lib/db/mongodb`. It caches connections (hot-reload safe) and auto-imports all models.

**Model Registration Pattern**: All models follow:
```typescript
const Model = mongoose.models.Model || mongoose.model('Model', Schema);
export default Model;
```
Models are imported in [mongodb.ts](lib/db/mongodb.ts#L3-L28) to ensure registration before use.

**Critical Models**:
- [Person.ts](models/Person.ts): 932 lines, handles passwords (bcrypt), auto-generates studentId/employeeId, has LMS profile subdocument
- [SchoolSite.ts](models/SchoolSite.ts): Contains `lmsSettings` for LMS features
- [Subject.ts](models/Subject.ts): Extended with LMS course structure (modules, chapters, materials)
- [ActivityLog.ts](models/ActivityLog.ts): Comprehensive audit trail for GDPR compliance

## API Route Patterns

**Standard Structure** (see [auth/login/route.ts](app/api/auth/login/route.ts)):
1. `await connectToDatabase()` first (aliased as `connectDB` in some files)
2. Use NextRequest/NextResponse from 'next/server'
3. JWT auth with `process.env.JWT_SECRET`
4. Return populated entities (exclude passwords with `.select('+password')` only when needed)
5. Always use `.lean()` for read-only queries to get plain JS objects

**Activity Logging Wrapper** (see [ACTIVITY_LOGGING_INTEGRATION.md](docs/ACTIVITY_LOGGING_INTEGRATION.md)):
```typescript
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// Separate handler for wrapped routes
const postHandler = async (request: NextRequest) => {
    await connectDB();
    const body = await request.json();
    // ... logic ...
    return NextResponse.json({ success: true, entity: newEntity });
};

// Wrap and export
export const POST = withActivityLogging(postHandler, {
    category: 'data_management', // ActionCategory enum
    actionType: 'create', // ActionType enum
    entityType: 'person', // EntityType enum - matches ActivityLog
    entityIdExtractor: (req, res) => res?.entity?._id,
    entityNameExtractor: (req, res) => res?.entity?.firstName
});
```

**Common Query Patterns**:
- Filter by school: `{ school: schoolId, schoolSite: siteId }`
- Search: Use `$or` with `$regex` and `$options: 'i'` across multiple fields
- Pagination: Use `.skip()` and `.limit()` with `countDocuments()`
- Population: Chain multiple `.populate()` calls with field selection
- Example: `.populate('school', 'name').populate('schoolSite', 'name')`

## Authentication & Authorization

**Client-Side**: Use `useAuth()` hook from [AuthContext.tsx](context/AuthContext.tsx):
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
// user has: personCategory, school, schoolSite, _id, username
```

**Storage**: [LocalDBService](lib/services/localDBService.ts) wraps Dexie for persistent auth state (`authToken`, `user` stored in IndexedDB).

**Protected Routes**: Wrap pages with `useRequireAuth({ allowedCategories: ['teacher', 'admin'] })` from [hooks/useRequireAuth.ts](hooks/useRequireAuth.ts).

**Server-Side**: Decode JWT from Authorization header (see [activityLogging.ts](lib/middleware/activityLogging.ts#L49-L63)).

## UI/UX Conventions

**Component Library**: PrimeReact 10.2.1 ([primereact.org](https://primereact.org))
- DataTable for grids, Dialog for modals, Toast for notifications
- Layout wrapper at [components/layouts/layout.tsx](components/layouts/layout.tsx)

**Design System**: Follow [UI_DESIGN_SYSTEM.md](docs/UI_DESIGN_SYSTEM.md) and [design-tokens.css](styles/design-tokens.css):
- Primary color: Indigo (`#6366F1`)
- Semantic colors: success/warning/error/info
- 8px spacing grid

**Component Patterns**:
- Props interfaces: `interface ComponentNameProps { ... }`
- Client components: `'use client'` directive for interactivity
- Server components: Default for data fetching

## Financial System

Comprehensive billing system documented in [FINANCIAL_SYSTEM_COMPLETE.md](docs/FINANCIAL_SYSTEM_COMPLETE.md):
- **Models**: FeesConfiguration, FeesPayment, StudentBilling, DailyFeeCollection, Scholarship, Expenditure
- **Key Concept**: StudentBilling is auto-generated from FeesConfiguration per term
- **Balance Brought Forward**: Handled via `balanceBroughtForward` field (see [BALANCE_BROUGHT_FORWARD.md](docs/BALANCE_BROUGHT_FORWARD.md))
- **Reports**: Financial controller dashboard, student debtors, tuition defaulters

## LMS Integration

Subject model extended with course structure (see [LMS_INTEGRATION_ARCHITECTURE.md](docs/LMS_INTEGRATION_ARCHITECTURE.md)):
- **Course Hierarchy**: Subject → CourseModule → Chapter → Lesson → CourseMaterial
- **Materials**: PDF, video, text content with progress tracking
- **Person Extensions**: `lmsProfile` subdocument tracks enrollment/completion
- **Components**: Located in [components/features/lms/](components/features/lms/)

## Developer Workflow

**Development**: `npm run dev` (runs on port 3000, hot-reload enabled)
**Building**: `npm run build` then `npm start`
**Linting**: `npm run lint` (ESLint + Next.js rules)
**Formatting**: `npm run format` (Prettier on app/demo/layout/types directories)

**Path Aliases**: Use `@/` prefix for all imports (maps to project root via tsconfig.json)
- Example: `import Person from '@/models/Person'`
- Example: `import { useAuth } from '@/context/AuthContext'`

**Environment Variables** (create `.env.local`):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**TypeScript**: Strict mode disabled, target ES2017. Use interfaces for component props following `ComponentNameProps` pattern.

## Important Patterns

1. **Auto-ID Generation**: StudentId (`STU00001`) and EmployeeId (`EMP00001`) auto-increment in Person creation
2. **Bulk Operations**: Use sequential processing with error collection (see [persons/bulk-upload/route.ts](app/api/persons/bulk-upload/route.ts))
3. **CSV Templates**: Documented in [PERSON_CSV_TEMPLATE.md](docs/PERSON_CSV_TEMPLATE.md)
4. **Print Reports**: Use [components/print/](components/print/) with react-to-print (see [COLLECTIONS_PRINT_REPORT.md](docs/COLLECTIONS_PRINT_REPORT.md))
5. **Exam Score Entry**: Optimized UX documented in [EXAM_SCORE_ENTRY_GUIDE.md](docs/EXAM_SCORE_ENTRY_GUIDE.md)

## Common Pitfalls

- **Hot Reload DB**: Always use cached connection pattern (models already registered in mongodb.ts)
- **Password Handling**: Use `.select('+password')` only when comparing, never return in responses
- **Population**: Chain `.populate()` for nested refs (school → schoolSite → faculty)
- **Timestamps**: Mongoose adds `createdAt`/`updatedAt` if `timestamps: true` in schema
- **Next.js 13 Params**: In App Router, `params` is now async: `const { id } = await params;`
- **Model Imports**: Import models directly from `@/models/ModelName` or use registered ones via mongoose.models
- **API Response Format**: Maintain consistent structure: `{ success: boolean, message?: string, data: any }`
- **Lean Queries**: Use `.lean()` on queries that don't need Mongoose document methods (returns plain JS objects)

## Documentation

The [docs/](docs/) directory contains 30+ comprehensive guides:
- **Person Management**: [PERSON_MANAGEMENT_GUIDE.md](docs/PERSON_MANAGEMENT_GUIDE.md)
- **Financial**: [FINANCIAL_STANDINGS_REPORT.md](docs/FINANCIAL_STANDINGS_REPORT.md), [FEES_PAYMENT_IMPLEMENTATION.md](docs/FEES_PAYMENT_IMPLEMENTATION.md)
- **LMS**: [ONLINE_BOOKS_ARCHITECTURE.md](docs/ONLINE_BOOKS_ARCHITECTURE.md), [SECURE_QUIZ_ARCHITECTURE.md](docs/SECURE_QUIZ_ARCHITECTURE.md)
- **Activity Logging**: [ACTIVITY_LOGGING_SYSTEM.md](docs/ACTIVITY_LOGGING_SYSTEM.md)

**When implementing new features**: Check docs/ for similar patterns, follow existing API/component structures, add activity logging for audit trails.
