/**
 * Activity Logs Export API
 *
 * POST /api/activity-logs/export - Export logs to JSON with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { activityLogger, QueryOptions } from '@/lib/services/activityLogger';
import { extractTokenFromRequest, extractUserContext, logAuditAccess } from '@/lib/middleware/activityLogging';
import { ActionCategory, ActionType, EntityType, OutcomeStatus } from '@/models/ActivityLog';

// Allowed roles for exporting logs
const ALLOWED_ROLES = ['proprietor', 'admin'];

/**
 * POST /api/activity-logs/export
 *
 * Export logs based on provided filters
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();

        // Validate access - try token first, then body
        const token = extractTokenFromRequest(request);
        let userContext: any;

        if (token) {
            if (!ALLOWED_ROLES.includes(token.personCategory)) {
                return NextResponse.json({ success: false, error: 'Insufficient permissions. Only proprietors and admins can export logs.' }, { status: 403 });
            }
            userContext = extractUserContext(request);
        } else {
            // Fallback to body for LocalDB auth
            const schoolId = body.schoolId || body.school;
            if (!schoolId) {
                return NextResponse.json({ success: false, error: 'School context required' }, { status: 400 });
            }
            userContext = { schoolId };
        }

        if (!userContext.schoolId) {
            return NextResponse.json({ success: false, error: 'School context required' }, { status: 400 });
        }

        // Build query options from request body
        const queryOptions: QueryOptions = {
            schoolId: userContext.schoolId as string,
            limit: Math.min(body.limit || 10000, 10000) // Cap at 10000 records
        };

        // Apply filters from body
        if (body.startDate) queryOptions.startDate = new Date(body.startDate);
        if (body.endDate) queryOptions.endDate = new Date(body.endDate);
        if (body.schoolSiteId) queryOptions.schoolSiteId = body.schoolSiteId;
        if (body.userId) queryOptions.userId = body.userId;
        if (body.actionCategory) queryOptions.actionCategory = body.actionCategory as ActionCategory;
        if (body.actionType) queryOptions.actionType = body.actionType as ActionType;
        if (body.entityType) queryOptions.entityType = body.entityType as EntityType;
        if (body.outcome) queryOptions.outcome = body.outcome as OutcomeStatus;
        if (body.search) queryOptions.search = body.search;

        // Export logs
        const exportData = await activityLogger.exportLogs(queryOptions);

        // Don't log export action to prevent infinite recursion
        // await logAuditAccess(request, 'log_export', body);

        // Return as downloadable JSON
        const filename = `activity-logs-export-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'X-Total-Records': exportData.total.toString()
            }
        });
    } catch (error: any) {
        console.error('Error exporting activity logs:', error);
        return NextResponse.json({ success: false, error: 'Failed to export logs', message: error.message }, { status: 500 });
    }
}
