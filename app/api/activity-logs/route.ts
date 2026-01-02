/**
 * Activity Logs API Routes
 *
 * GET /api/activity-logs - Query activity logs with filters
 * POST /api/activity-logs/export - Export logs to JSON
 * GET /api/activity-logs/statistics - Get log statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { activityLogger, QueryOptions } from '@/lib/services/activityLogger';
import { extractTokenFromRequest, extractUserContext, logAuditAccess } from '@/lib/middleware/activityLogging';
import { ActionCategory, ActionType, EntityType, OutcomeStatus } from '@/models/ActivityLog';

// Allowed roles for viewing logs
const ALLOWED_ROLES = ['proprietor', 'admin', 'headmaster'];

/**
 * Validates that user has permission to access logs
 */
function validateAccess(request: NextRequest): {
    valid: boolean;
    error?: string;
    userContext?: any;
} {
    const { searchParams } = new URL(request.url);

    // Try to get context from token first
    const token = extractTokenFromRequest(request);

    if (token) {
        if (!ALLOWED_ROLES.includes(token.personCategory)) {
            return {
                valid: false,
                error: 'Insufficient permissions. Only administrators can access activity logs.'
            };
        }

        const userContext = extractUserContext(request);
        if (!userContext.schoolId) {
            return { valid: false, error: 'School context required' };
        }

        return { valid: true, userContext };
    }

    // Fallback: Get context from query params (for LocalDB-based auth)
    const schoolId = searchParams.get('school') || searchParams.get('schoolId');
    const userCategory = searchParams.get('userCategory');

    if (!schoolId) {
        return { valid: false, error: 'School context required' };
    }

    // Note: In production, you should validate the user session server-side
    // For now, we trust the frontend's LocalDB authentication

    return {
        valid: true,
        userContext: {
            schoolId,
            userCategory
        }
    };
}

/**
 * GET /api/activity-logs
 *
 * Query activity logs with filters and pagination
 */
export async function GET(request: NextRequest) {
    try {
        // Validate access
        const accessCheck = validateAccess(request);
        if (!accessCheck.valid) {
            return NextResponse.json({ success: false, error: accessCheck.error }, { status: accessCheck.error?.includes('Authentication') ? 401 : 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const schoolId = accessCheck.userContext?.schoolId || searchParams.get('school') || searchParams.get('schoolId');

        const queryOptions: QueryOptions = {
            schoolId: schoolId as string,
            page: parseInt(searchParams.get('page') || '1', 10),
            limit: parseInt(searchParams.get('limit') || '50', 10),
            sortField: searchParams.get('sortField') || 'timestamp',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
        };

        // Date range filter
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate) queryOptions.startDate = new Date(startDate);
        if (endDate) queryOptions.endDate = new Date(endDate);

        // Optional filters
        const schoolSiteId = searchParams.get('schoolSiteId');
        const userId = searchParams.get('userId');
        const actionCategory = searchParams.get('actionCategory') as ActionCategory;
        const actionType = searchParams.get('actionType') as ActionType;
        const entityType = searchParams.get('entityType') as EntityType;
        const outcome = searchParams.get('outcome') as OutcomeStatus;
        const search = searchParams.get('search');

        if (schoolSiteId) queryOptions.schoolSiteId = schoolSiteId;
        if (userId) queryOptions.userId = userId;
        if (actionCategory) queryOptions.actionCategory = actionCategory;
        if (actionType) queryOptions.actionType = actionType;
        if (entityType) queryOptions.entityType = entityType;
        if (outcome) queryOptions.outcome = outcome;
        if (search) queryOptions.search = search;

        // Execute query
        const result = await activityLogger.query(queryOptions);

        // Don't log audit access to prevent infinite recursion
        // await logAuditAccess(request, 'log_access', {
        //     startDate,
        //     endDate,
        //     schoolSiteId,
        //     userId,
        //     actionCategory,
        //     actionType,
        //     entityType,
        //     outcome,
        //     search
        // });

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch activity logs', message: error.message }, { status: 500 });
    }
}
