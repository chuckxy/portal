/**
 * Activity Logs Statistics API
 *
 * GET /api/activity-logs/statistics - Get aggregated log statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { activityLogger } from '@/lib/services/activityLogger';
import { extractTokenFromRequest, extractUserContext } from '@/lib/middleware/activityLogging';

// Allowed roles for viewing logs
const ALLOWED_ROLES = ['proprietor', 'admin', 'headmaster'];

/**
 * GET /api/activity-logs/statistics
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Validate access - try token first, then query params
        const token = extractTokenFromRequest(request);
        let userContext: any;

        if (token) {
            if (!ALLOWED_ROLES.includes(token.personCategory)) {
                return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
            }
            userContext = extractUserContext(request);
        } else {
            // Fallback to query params for LocalDB auth
            const schoolId = searchParams.get('school') || searchParams.get('schoolId');
            if (!schoolId) {
                return NextResponse.json({ success: false, error: 'School context required' }, { status: 400 });
            }
            userContext = { schoolId };
        }

        if (!userContext.schoolId) {
            return NextResponse.json({ success: false, error: 'School context required' }, { status: 400 });
        }

        await connectToDatabase();

        // Date range for statistics
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const statistics = await activityLogger.getStatistics(userContext.schoolId as string, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);

        return NextResponse.json({
            success: true,
            statistics
        });
    } catch (error: any) {
        console.error('Error fetching log statistics:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch statistics', message: error.message }, { status: 500 });
    }
}
