# Activity Logging System

A comprehensive, school-aware logging system for capturing and auditing all activities across the school management application.

## Overview

The Activity Logging System provides:

-   **Complete audit trail** for create, update, and delete operations, authentication events, and sensitive actions
-   **School-based partitioning** for multi-tenant isolation
-   **Immutable logs** ensuring data integrity for compliance
-   **Admin UI** for viewing, filtering, and exporting logs
-   **GDPR-compliant** with sensitive data masking

> **Note:** Read/select operations (GET requests) are intentionally NOT logged to reduce log volume and focus on data-changing operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Routes (Next.js)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Activity Logging Middleware                │   │
│  │  • Extracts user context from JWT                   │   │
│  │  • Captures request/response details                │   │
│  │  • Parses client info (IP, device, browser)        │   │
│  │  • Masks sensitive data                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Activity Logger Service                     │
│  • Creates log entries                                       │
│  • Queries with filters and pagination                      │
│  • Generates statistics                                      │
│  • Exports data                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                MongoDB (ActivityLog Collection)              │
│  • Indexed by school, timestamp, action type                │
│  • Partitioned by yearMonth for archival                    │
│  • Immutable (update/delete prevented)                      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ActivityLog Model (`/models/ActivityLog.ts`)

The Mongoose schema for storing activity logs with:

-   **Timestamp** (UTC)
-   **User Information** (ID, name, category)
-   **School Context** (school ID, site ID)
-   **Action Details** (category, type, description)
-   **Entity Reference** (type, ID, name)
-   **State Changes** (previous/new values for updates)
-   **Client Information** (IP, device, browser, OS)
-   **Outcome** (success, failure, error)
-   **Compliance Fields** (GDPR relevant, retention policy)

### 2. Activity Logger Service (`/lib/services/activityLogger.ts`)

Singleton service providing:

```typescript
// Log an activity
await activityLogger.log({
    context: { userId, schoolId, ... },
    action: { category: 'crud', type: 'create', description: '...' },
    entity: { type: 'person', id: '...', name: '...' },
    outcome: { status: 'success' }
});

// Query logs
const result = await activityLogger.query({
    schoolId: '...',
    startDate: new Date(),
    actionType: 'create',
    page: 1,
    limit: 50
});

// Get statistics
const stats = await activityLogger.getStatistics(schoolId, startDate, endDate);
```

### 3. Logging Middleware (`/lib/middleware/activityLogging.ts`)

Wraps API routes for automatic logging:

```typescript
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// Wrap your route handler
export const POST = withActivityLogging(
    async (request) => {
        // Your handler logic
        return NextResponse.json({ success: true });
    },
    {
        category: 'crud',
        entityType: 'person',
        sensitive: false
    }
);
```

Helper functions for specific events:

```typescript
// Authentication events
await logAuthEvent('login', request, userId, userName, userCategory, schoolId, schoolSiteId);
await logAuthEvent('login_failed', request, undefined, username, undefined, undefined, undefined, 'failure', 'User not found');

// Sensitive actions
await logSensitiveAction(request, 'school_delete', 'Deleted school', 'school', id);

// Permission changes
await logPermissionChange(request, 'role_change', userId, userName, 'teacher', 'admin');

// Audit access (logs access to the logging system itself)
await logAuditAccess(request, 'log_access', { filters });
```

### 4. API Routes

#### GET `/api/activity-logs`

Query logs with filters:

```
GET /api/activity-logs?page=1&limit=50&startDate=2025-01-01&actionType=create
```

Parameters:

-   `page` - Page number (default: 1)
-   `limit` - Records per page (default: 50, max: 500)
-   `startDate` / `endDate` - Date range (ISO format)
-   `schoolSiteId` - Filter by site
-   `userId` - Filter by user
-   `actionCategory` - Filter by category
-   `actionType` - Filter by action type
-   `entityType` - Filter by entity
-   `outcome` - Filter by outcome
-   `search` - Text search
-   `sortField` / `sortOrder` - Sorting

#### GET `/api/activity-logs/statistics`

Get aggregated statistics:

```
GET /api/activity-logs/statistics?startDate=2025-01-01
```

Returns:

-   Total logs count
-   Breakdown by action category
-   Breakdown by outcome
-   Breakdown by entity type
-   Top active users
-   Recent errors

#### POST `/api/activity-logs/export`

Export logs to JSON:

```json
POST /api/activity-logs/export
{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "actionCategory": "authentication"
}
```

### 5. Admin UI (`/app/(main)/activity-logs`)

Mobile-first, responsive interface featuring:

-   **Filters Panel** - Date range, category, type, outcome, entity, search
-   **Data Table** - Paginated, sortable, responsive
-   **Statistics Dashboard** - Charts and metrics
-   **Log Details Dialog** - Full log information
-   **Export Function** - Download filtered logs as JSON

## Action Categories & Types

### Authentication

-   `login` - Successful login
-   `logout` - User logout
-   `login_failed` - Failed login attempt
-   `password_change` - Password changed
-   `password_reset` - Password reset
-   `session_expired` - Session expiration

### CRUD Operations (Create, Update, Delete only - reads not logged)

-   `create` - Record created
-   `update` - Record modified
-   `delete` - Record deleted
-   `bulk_create` / `bulk_update` / `bulk_delete` - Bulk operations

### Permissions

-   `role_change` - User role changed
-   `permission_grant` - Permission granted
-   `permission_revoke` - Permission revoked
-   `access_denied` - Unauthorized access attempt

### Sensitive Actions

-   `school_delete` - School deletion
-   `data_export` / `data_import` - Data transfer
-   `config_change` - System configuration change
-   `fee_config_change` - Fee configuration change
-   `payment_process` / `payment_reversal` - Payment actions
-   `scholarship_award` - Scholarship awarded

### System

-   `system_error` - System error occurred
-   `api_call` - General API call
-   `report_generate` - Report generated

### Audit

-   `log_access` - Activity logs accessed
-   `log_export` - Activity logs exported

## Security & Access Control

-   **Authentication Required** - All log endpoints require valid JWT
-   **Role-Based Access** - Only `proprietor`, `admin`, and `headmaster` can access logs
-   **School Isolation** - Users can only see logs for their school
-   **Sensitive Data Masking** - Passwords, tokens, and PII are automatically masked
-   **Audit Trail** - Access to the logging system is itself logged

## Data Retention & Archival

Logs include a `yearMonth` field (e.g., "2025-01") for:

-   Efficient partitioning queries
-   Archival to cold storage
-   Retention policy enforcement

Default retention: 3 years (configurable per log entry)

## Usage Examples

### Adding Logging to a New API Route

```typescript
// /app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withActivityLogging, extractUserContext } from '@/lib/middleware/activityLogging';

async function handlePost(request: NextRequest) {
    const body = await request.json();
    // Create student logic...
    return NextResponse.json({ success: true, data: student });
}

// Option 1: Use the wrapper
export const POST = withActivityLogging(handlePost, {
    category: 'crud',
    entityType: 'person',
    descriptionGenerator: (req, res) => `Created student: ${res?.data?.fullName}`
});

// Option 2: Manual logging
import { activityLogger } from '@/lib/services/activityLogger';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const userContext = extractUserContext(request);

    try {
        const body = await request.json();
        const student = await createStudent(body);

        await activityLogger.log({
            context: userContext,
            action: {
                category: 'crud',
                type: 'create',
                description: `Created student: ${student.fullName}`
            },
            entity: {
                type: 'person',
                id: student._id,
                name: student.fullName
            },
            outcome: {
                status: 'success',
                executionTimeMs: Date.now() - startTime
            }
        });

        return NextResponse.json({ success: true, data: student });
    } catch (error) {
        await activityLogger.log({
            context: userContext,
            action: {
                category: 'crud',
                type: 'create',
                description: 'Failed to create student'
            },
            entity: { type: 'person' },
            outcome: {
                status: 'error',
                errorMessage: error.message
            }
        });
        throw error;
    }
}
```

### Logging Sensitive Operations

```typescript
import { logSensitiveAction } from '@/lib/middleware/activityLogging';

export async function DELETE(request: NextRequest, { params }) {
    // Before deletion
    const school = await School.findById(params.id);

    // Perform deletion
    await School.findByIdAndDelete(params.id);

    // Log the sensitive action
    await logSensitiveAction(request, 'school_delete', `Deleted school: ${school.name}`, 'school', params.id, school.name, { previousData: school.toObject() });

    return NextResponse.json({ success: true });
}
```

## Index Optimization

The ActivityLog collection has the following indexes:

```javascript
// Primary queries
{ schoolId: 1, timestamp: -1 }
{ schoolId: 1, actionType: 1, timestamp: -1 }
{ schoolId: 1, userId: 1, timestamp: -1 }
{ schoolId: 1, outcome: 1, timestamp: -1 }
{ schoolId: 1, 'entity.entityType': 1, timestamp: -1 }
{ schoolId: 1, schoolSiteId: 1, timestamp: -1 }

// Archival
{ yearMonth: 1, schoolId: 1 }

// Text search
{ actionDescription: 'text', userName: 'text', 'entity.entityName': 'text' }
```

## Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret

# Optional (for system-level logging when school context unavailable)
SYSTEM_SCHOOL_ID=000000000000000000000000
```

## Dependencies

The logging system requires:

-   `date-fns` - Date formatting and manipulation

Install if not present:

```bash
npm install date-fns
```

## File Structure

```
/models
  └── ActivityLog.ts         # Mongoose model

/lib
  ├── services
  │   └── activityLogger.ts  # Logging service
  └── middleware
      └── activityLogging.ts # API middleware & helpers

/app
  ├── api
  │   └── activity-logs
  │       ├── route.ts       # GET logs
  │       ├── statistics
  │       │   └── route.ts   # GET statistics
  │       └── export
  │           └── route.ts   # POST export
  └── (main)
      └── activity-logs
          └── page.tsx       # Admin UI page

/components
  └── ActivityLogManagement.tsx  # Admin UI component

/docs
  └── ACTIVITY_LOGGING_SYSTEM.md # This documentation
```
