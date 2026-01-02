# Activity Logging Integration Guide

This guide shows how to integrate activity logging into your API routes.

## Routes Already Integrated

The following routes have been integrated with activity logging:

### Create Operations (POST)

-   ✅ `/api/persons` - Person creation
-   ✅ `/api/classes` - Class creation
-   ✅ `/api/departments` - Department creation
-   ✅ `/api/exam-scores` - Exam score entry
-   ✅ `/api/scholarships` - Scholarship creation
-   ✅ `/api/fees-payments` - Fee payment processing

### Update Operations (PUT/PATCH)

-   ✅ `/api/persons/[id]` - Person updates and deletes

## Integration Pattern

### For POST Handlers

```typescript
// 1. Add import at top of file
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// 2. Change from export async function to const handler
const postHandler = async (request: NextRequest) => {
    // ... your existing code ...

    return NextResponse.json(
        {
            success: true,
            message: 'Entity created',
            entity: newEntity // Make sure to return the created entity
        },
        { status: 201 }
    );
};

// 3. Export wrapped handler
export const POST = withActivityLogging(postHandler, {
    actionType: 'create', // create, update, delete, etc.
    entityType: 'entity_name', // person, class, department, etc.
    getEntityInfo: (req, res) => {
        const entity = res?.entity; // Access from response body
        return {
            entityId: entity?._id?.toString(),
            entityName: entity?.name || entity?.firstName // Human-readable name
        };
    },
    gdprRelevant: true // Optional: mark if contains personal data
});
```

### For PUT Handlers

```typescript
const putHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    // ... your update logic ...

    return NextResponse.json({
        success: true,
        entity: updatedEntity
    });
};

export const PUT = withActivityLogging(putHandler, {
    actionType: 'update',
    entityType: 'entity_name',
    getEntityInfo: (req, res) => {
        const entity = res?.entity;
        return {
            entityId: entity?._id?.toString(),
            entityName: entity?.name
        };
    }
});
```

### For DELETE Handlers

```typescript
const deleteHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;

    // ... your delete logic ...

    return NextResponse.json({
        success: true,
        message: 'Deleted successfully'
    });
};

export const DELETE = withActivityLogging(deleteHandler, {
    actionType: 'delete',
    entityType: 'entity_name',
    getEntityInfo: async (req) => {
        const { params } = req as any;
        const { id } = await params;
        return {
            entityId: id
        };
    }
});
```

## Entity Type Reference

Use these values for the `entityType` parameter:

-   `person` - People (students, teachers, etc.)
-   `school` - Schools
-   `school_site` - School sites
-   `faculty` - Faculties
-   `department` - Departments
-   `class` - Classes
-   `subject` - Subjects
-   `exam_score` - Exam scores
-   `fees_configuration` - Fee configurations
-   `fees_payment` - Fee payments
-   `scholarship` - Scholarships
-   `scholarship_body` - Scholarship bodies
-   `library_item` - Library items
-   `library_lending` - Library lending
-   `library_user` - Library users
-   `timetable` - Timetables
-   `expenditure` - Expenditures
-   `lms_course` - LMS courses
-   `lms_module` - LMS modules
-   `lms_lesson` - LMS lessons
-   `lms_quiz` - LMS quizzes
-   `lms_enrollment` - LMS enrollments
-   `lms_announcement` - LMS announcements

## Action Type Reference

Use these values for the `actionType` parameter:

### CRUD Operations

-   `create` - Creating new records
-   `update` - Updating existing records
-   `delete` - Deleting records
-   `bulk_create` - Bulk creation
-   `bulk_update` - Bulk updates
-   `bulk_delete` - Bulk deletion

### Sensitive Actions

-   `payment_process` - Processing payments
-   `payment_reversal` - Reversing payments
-   `scholarship_award` - Awarding scholarships
-   `data_export` - Exporting data
-   `data_import` - Importing data
-   `config_change` - Configuration changes
-   `fee_config_change` - Fee configuration changes

### Permission Actions

-   `role_change` - Role changes
-   `permission_grant` - Granting permissions
-   `permission_revoke` - Revoking permissions

## Routes That Need Integration

The following routes should be integrated following the pattern above:

### High Priority (Financial & Sensitive)

-   [ ] `/api/expenditures` (POST, PUT, DELETE)
-   [ ] `/api/fee-configurations` (POST, PUT, DELETE)
-   [ ] `/api/fee-determinants` (POST, PUT, DELETE)
-   [ ] `/api/fees-payments` (DELETE) - Already has POST
-   [ ] `/api/scholarships/[id]` (PUT, DELETE)

### Medium Priority (Academic)

-   [ ] `/api/classes/[id]` (PUT, DELETE)
-   [ ] `/api/departments/[id]` (PUT, DELETE)
-   [ ] `/api/exam-scores/[id]` (PUT, DELETE)
-   [ ] `/api/subjects` (POST, PUT, DELETE)
-   [ ] `/api/timetables` (POST, PUT, DELETE)

### Lower Priority (Library)

-   [ ] `/api/library-items` (POST, PUT, DELETE)
-   [ ] `/api/library-lending` (POST, PUT, DELETE)
-   [ ] `/api/library-users` (POST, PUT, DELETE)

### LMS Routes

-   [ ] `/api/lms/**` - All LMS CRUD operations

## Testing

After integrating a route:

1. Test the operation (create/update/delete)
2. Navigate to Activity Logs page
3. Verify:
    - Log appears with correct action type
    - Entity information is captured
    - User and school context is correct
    - Description is meaningful
    - No errors in browser console

## Notes

-   GET/HEAD requests are automatically skipped (no read logging)
-   Logs are immutable - they cannot be edited or deleted
-   Sensitive data (passwords, tokens) is automatically masked
-   All timestamps are stored in UTC
-   GDPR-relevant logs are marked for compliance
