/**
 * API Logging Middleware
 *
 * Wraps API route handlers to automatically capture activity logs.
 * Use this to decorate your API routes for automatic logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { activityLogger, LogContext, LogAction, LogEntity, LogOutcome, parseUserAgent, extractIpAddress, calculateStateDiff, modelToEntityType } from '@/lib/services/activityLogger';
import { ActionCategory, ActionType, EntityType, OutcomeStatus, IClientInfo } from '@/models/ActivityLog';

// -------------------- TYPES --------------------
export interface LoggingOptions {
    /** Action category for this route */
    category: ActionCategory;
    /** Default action type (can be overridden based on method) */
    actionType?: ActionType;
    /** Entity type being operated on */
    entityType: EntityType;
    /** Whether this is a sensitive operation */
    sensitive?: boolean;
    /** Whether this affects GDPR-relevant data */
    gdprRelevant?: boolean;
    /** Custom description generator */
    descriptionGenerator?: (req: NextRequest, response: any) => string;
    /** Extract entity ID from request/response */
    entityIdExtractor?: (req: NextRequest, response: any) => string | undefined | Promise<string | undefined>;
    /** Extract entity name from request/response */
    entityNameExtractor?: (req: NextRequest, response: any) => string | undefined | Promise<string | undefined>;
    /** Skip logging for certain conditions */
    skipCondition?: (req: NextRequest) => boolean;
    /** Extract previous state for updates/deletes */
    previousStateExtractor?: (req: NextRequest) => Promise<Record<string, any> | null>;
}

export interface DecodedToken {
    userId: string;
    username: string;
    personCategory: string;
    school: string;
    schoolSite: string;
}

// -------------------- TOKEN UTILITIES --------------------
/**
 * Extracts and decodes JWT token from request
 */
export function extractTokenFromRequest(request: NextRequest): DecodedToken | null {
    try {
        // Check Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
        }

        // Check cookie
        const tokenCookie = request.cookies.get('authToken');
        if (tokenCookie?.value) {
            return jwt.verify(tokenCookie.value, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Extracts user context from request for logging
 */
export function extractUserContext(request: NextRequest): Partial<LogContext> {
    const token = extractTokenFromRequest(request);

    if (token) {
        return {
            userId: token.userId,
            userName: token.username,
            userCategory: token.personCategory,
            schoolId: token.school,
            schoolSiteId: token.schoolSite
        };
    }

    // Try to get from query params (for some GET requests)
    const url = new URL(request.url);
    const schoolId = url.searchParams.get('school');

    return {
        schoolId: schoolId || undefined
    };
}

/**
 * Extracts client information from request headers
 */
export function extractClientInfo(request: NextRequest): IClientInfo {
    const userAgent = request.headers.get('user-agent') || '';
    const parsedUA = parseUserAgent(userAgent);

    return {
        ...parsedUA,
        ipAddress: extractIpAddress(request.headers),
        timezone: request.headers.get('x-timezone') || undefined,
        language: request.headers.get('accept-language')?.split(',')[0] || undefined
    };
}

/**
 * Maps HTTP method to action type
 * Note: GET/HEAD methods return 'read' but are skipped by the logging wrapper
 */
export function methodToActionType(method: string): ActionType {
    const mapping: Record<string, ActionType> = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete'
    };
    return mapping[method.toUpperCase()] || 'api_call';
}

// -------------------- LOGGING WRAPPER --------------------
type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps an API route handler with automatic activity logging
 * NOTE: Only logs for create, update, and delete operations (not reads/selects)
 */
export function withActivityLogging(handler: RouteHandler, options: LoggingOptions): RouteHandler {
    return async (request: NextRequest, context?: any) => {
        const startTime = Date.now();

        // Skip logging for GET/HEAD requests (reads/selects)
        if (['GET', 'HEAD'].includes(request.method)) {
            return handler(request, context);
        }

        // Skip logging for activity-logs API routes (prevent infinite recursion)
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/activity-logs')) {
            return handler(request, context);
        }

        // Check skip condition
        if (options.skipCondition?.(request)) {
            return handler(request, context);
        }

        // Extract user context
        const userContext = extractUserContext(request);

        // Extract request body once for reuse
        let requestBody: any = null;
        if (!['GET', 'HEAD'].includes(request.method)) {
            try {
                requestBody = await request.clone().json();
            } catch {
                // Body parsing failed
            }
        }

        // If no school context, try to extract from body
        if (!userContext.schoolId && requestBody) {
            if (requestBody.school) {
                userContext.schoolId = requestBody.school;
            } else if (requestBody.schoolId) {
                userContext.schoolId = requestBody.schoolId;
            } else if (requestBody.site) {
                userContext.schoolId = requestBody.site;
            } else if (requestBody.siteId) {
                userContext.schoolId = requestBody.siteId;
            }
        }

        // If still no school context, skip logging (but continue with request)
        if (!userContext.schoolId) {
            console.warn('[Activity Logging] Skipping log - no school context found');
            return handler(request, context);
        }

        // Extract client info
        const clientInfo = extractClientInfo(request);

        // Get request details

        const requestInfo = {
            method: request.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams.entries()),
            body: requestBody // Use already parsed body
        };

        // Get previous state for updates/deletes
        let previousState: Record<string, any> | null = null;
        if (options.previousStateExtractor && ['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            try {
                previousState = await options.previousStateExtractor(request);
            } catch {
                // Could not get previous state
            }
        }

        // Execute the handler
        let response: NextResponse;
        let responseData: any;
        let outcome: LogOutcome;

        try {
            response = await handler(request, context);

            // Try to parse response body
            try {
                responseData = await response.clone().json();
            } catch {
                responseData = null;
            }

            // Determine outcome based on status code
            const status = response.status;
            if (status >= 200 && status < 300) {
                outcome = { status: 'success' };
            } else if (status >= 400 && status < 500) {
                outcome = {
                    status: 'failure',
                    errorMessage: responseData?.message || responseData?.error || `Client error: ${status}`
                };
            } else {
                outcome = {
                    status: 'error',
                    errorMessage: responseData?.message || responseData?.error || `Server error: ${status}`
                };
            }
        } catch (error: any) {
            // Handler threw an error
            outcome = {
                status: 'error',
                errorMessage: error.message,
                errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };

            // Re-throw to let Next.js handle error response
            throw error;
        } finally {
            // Calculate execution time
            const executionTimeMs = Date.now() - startTime;
            outcome.executionTimeMs = executionTimeMs;

            // Generate description
            const actionType = options.actionType || methodToActionType(request.method);
            const description = options.descriptionGenerator ? options.descriptionGenerator(request, responseData) : `${actionType.replace('_', ' ')} ${options.entityType.replace('_', ' ')}`;

            // Extract entity info - handle both Promise params (Next.js 13+) and direct params
            let contextParams = context?.params;
            if (contextParams && typeof contextParams.then === 'function') {
                try {
                    contextParams = await contextParams;
                } catch {
                    contextParams = undefined;
                }
            }
            const entityId = (await Promise.resolve(options.entityIdExtractor?.(request, responseData))) || contextParams?.id || responseData?._id || responseData?.data?._id;
            const entityName = (await Promise.resolve(options.entityNameExtractor?.(request, responseData))) || responseData?.name || responseData?.data?.name;

            // Calculate state diff for updates
            const stateDiff = previousState && responseData?.data ? calculateStateDiff(previousState, responseData.data) : undefined;

            // Log the activity
            await activityLogger.log({
                context: userContext as LogContext,
                action: {
                    category: options.category,
                    type: actionType,
                    description
                },
                entity: {
                    type: options.entityType,
                    id: entityId,
                    name: entityName
                },
                clientInfo,
                request: requestInfo,
                outcome,
                previousState: stateDiff,
                sensitiveDataMasked: true,
                gdprRelevant: options.gdprRelevant
            });
        }

        return response!;
    };
}

// -------------------- QUICK LOGGING HELPERS --------------------
/**
 * Logs authentication events (login, logout, failed login)
 */
export async function logAuthEvent(
    type: 'login' | 'logout' | 'login_failed',
    request: NextRequest,
    userId?: string,
    userName?: string,
    userCategory?: string,
    schoolId?: string,
    schoolSiteId?: string,
    outcome: OutcomeStatus = 'success',
    errorMessage?: string
): Promise<void> {
    const clientInfo = extractClientInfo(request);

    // For auth events, we need at least a school context
    // Use a system school ID if not available
    const effectiveSchoolId = schoolId || process.env.SYSTEM_SCHOOL_ID || '000000000000000000000000';

    await activityLogger.log({
        context: {
            userId,
            userName,
            userCategory,
            schoolId: effectiveSchoolId,
            schoolSiteId
        },
        action: {
            category: 'authentication',
            type,
            description: type === 'login' ? `User ${userName || 'unknown'} logged in successfully` : type === 'logout' ? `User ${userName || 'unknown'} logged out` : `Failed login attempt for ${userName || 'unknown'}`
        },
        entity: {
            type: 'person',
            id: userId,
            name: userName
        },
        clientInfo,
        request: {
            method: 'POST',
            path: type === 'logout' ? '/api/auth/logout' : '/api/auth/login'
        },
        outcome: {
            status: outcome,
            errorMessage
        },
        gdprRelevant: true
    });
}

/**
 * Logs sensitive/destructive operations
 */
export async function logSensitiveAction(request: NextRequest, actionType: ActionType, description: string, entityType: EntityType, entityId?: string, entityName?: string, metadata?: Record<string, any>): Promise<void> {
    const userContext = extractUserContext(request);
    const clientInfo = extractClientInfo(request);

    if (!userContext.schoolId) return;

    await activityLogger.log({
        context: userContext as LogContext,
        action: {
            category: 'sensitive',
            type: actionType,
            description
        },
        entity: {
            type: entityType,
            id: entityId,
            name: entityName
        },
        clientInfo,
        request: {
            method: request.method,
            path: new URL(request.url).pathname
        },
        outcome: { status: 'success' },
        metadata,
        gdprRelevant: true
    });
}

/**
 * Logs permission/role changes
 */
export async function logPermissionChange(
    request: NextRequest,
    actionType: 'role_change' | 'permission_grant' | 'permission_revoke',
    targetUserId: string,
    targetUserName: string,
    previousRole?: string,
    newRole?: string,
    metadata?: Record<string, any>
): Promise<void> {
    const userContext = extractUserContext(request);
    const clientInfo = extractClientInfo(request);

    if (!userContext.schoolId) return;

    const description =
        actionType === 'role_change'
            ? `Changed role for ${targetUserName} from ${previousRole || 'none'} to ${newRole || 'none'}`
            : actionType === 'permission_grant'
            ? `Granted permissions to ${targetUserName}`
            : `Revoked permissions from ${targetUserName}`;

    await activityLogger.log({
        context: userContext as LogContext,
        action: {
            category: 'permission',
            type: actionType,
            description
        },
        entity: {
            type: 'person',
            id: targetUserId,
            name: targetUserName
        },
        clientInfo,
        request: {
            method: request.method,
            path: new URL(request.url).pathname
        },
        outcome: { status: 'success' },
        previousState: previousRole ? [{ fieldName: 'role', previousValue: previousRole, newValue: newRole }] : undefined,
        metadata,
        gdprRelevant: true
    });
}

/**
 * Logs access to the activity log system itself (audit trail for auditing)
 */
export async function logAuditAccess(request: NextRequest, actionType: 'log_access' | 'log_export', filters?: Record<string, any>): Promise<void> {
    const userContext = extractUserContext(request);
    const clientInfo = extractClientInfo(request);

    if (!userContext.schoolId) return;

    const description = actionType === 'log_access' ? `Accessed activity logs with filters: ${JSON.stringify(filters || {})}` : `Exported activity logs with filters: ${JSON.stringify(filters || {})}`;

    await activityLogger.log({
        context: userContext as LogContext,
        action: {
            category: 'audit',
            type: actionType,
            description
        },
        entity: {
            type: 'activity_log'
        },
        clientInfo,
        request: {
            method: request.method,
            path: new URL(request.url).pathname,
            query: filters
        },
        outcome: { status: 'success' },
        metadata: { filters }
    });
}

export default withActivityLogging;
