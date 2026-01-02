/**
 * Activity Logger Service
 *
 * Server-side logging service for capturing all system activities.
 * Provides utilities for creating, querying, and managing activity logs.
 */

import { Types } from 'mongoose';
import ActivityLog, { IActivityLog, IClientInfo, IEntityReference, IStateSnapshot, ActionCategory, ActionType, OutcomeStatus, EntityType } from '@/models/ActivityLog';
import { connectToDatabase } from '@/lib/db/mongodb';

// -------------------- TYPES --------------------
export interface LogContext {
    userId?: string | Types.ObjectId;
    userName?: string;
    userCategory?: string;
    schoolId: string | Types.ObjectId;
    schoolName?: string;
    schoolSiteId?: string | Types.ObjectId;
    schoolSiteName?: string;
}

export interface LogAction {
    category: ActionCategory;
    type: ActionType;
    description: string;
}

export interface LogEntity {
    type: EntityType;
    id?: string | Types.ObjectId;
    name?: string;
}

export interface LogRequest {
    method?: string;
    path?: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
}

export interface LogOutcome {
    status: OutcomeStatus;
    errorMessage?: string;
    errorStack?: string;
    executionTimeMs?: number;
}

export interface LogOptions {
    context: LogContext;
    action: LogAction;
    entity: LogEntity;
    clientInfo?: IClientInfo;
    request?: LogRequest;
    outcome: LogOutcome;
    previousState?: IStateSnapshot[];
    newState?: IStateSnapshot[];
    metadata?: Record<string, any>;
    sensitiveDataMasked?: boolean;
    gdprRelevant?: boolean;
}

export interface QueryOptions {
    schoolId: string | Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    schoolSiteId?: string | Types.ObjectId;
    userId?: string | Types.ObjectId;
    actionCategory?: ActionCategory;
    actionType?: ActionType;
    entityType?: EntityType;
    outcome?: OutcomeStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
    };
}

// -------------------- SENSITIVE DATA MASKING --------------------
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'authToken', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'creditCard', 'cardNumber', 'cvv', 'ssn', 'nationalId', 'bankAccount', 'accountNumber', 'pin'];

/**
 * Masks sensitive data in objects
 */
export function maskSensitiveData(data: any, depth: number = 0): any {
    if (depth > 10) return data; // Prevent infinite recursion

    if (data === null || data === undefined) return data;

    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map((item) => maskSensitiveData(item, depth + 1));
    }

    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
            masked[key] = '***MASKED***';
        } else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveData(value, depth + 1);
        } else {
            masked[key] = value;
        }
    }

    return masked;
}

/**
 * Truncates large data to prevent excessive log storage
 */
export function truncateData(data: any, maxLength: number = 5000): any {
    if (data === null || data === undefined) return data;

    const str = JSON.stringify(data);
    if (!str || str.length <= maxLength) return data;

    try {
        return JSON.parse(str.substring(0, maxLength) + '..."truncated"');
    } catch {
        return { _truncated: true, _originalLength: str.length };
    }
}

// -------------------- CLIENT INFO PARSER --------------------
/**
 * Parses user agent string to extract device/browser info
 */
export function parseUserAgent(userAgent: string): Partial<IClientInfo> {
    if (!userAgent) return {};

    const info: Partial<IClientInfo> = { userAgent };

    // Device type detection
    if (/mobile/i.test(userAgent)) {
        info.deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
        info.deviceType = 'tablet';
    } else {
        info.deviceType = 'desktop';
    }

    // Browser detection
    if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
        info.browser = 'Chrome';
        const match = userAgent.match(/chrome\/(\d+(\.\d+)?)/i);
        if (match) info.browserVersion = match[1];
    } else if (/firefox/i.test(userAgent)) {
        info.browser = 'Firefox';
        const match = userAgent.match(/firefox\/(\d+(\.\d+)?)/i);
        if (match) info.browserVersion = match[1];
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
        info.browser = 'Safari';
        const match = userAgent.match(/version\/(\d+(\.\d+)?)/i);
        if (match) info.browserVersion = match[1];
    } else if (/edge|edg/i.test(userAgent)) {
        info.browser = 'Edge';
        const match = userAgent.match(/edg?\/(\d+(\.\d+)?)/i);
        if (match) info.browserVersion = match[1];
    }

    // OS detection
    if (/windows/i.test(userAgent)) {
        info.os = 'Windows';
        if (/windows nt 10/i.test(userAgent)) info.osVersion = '10';
        else if (/windows nt 11/i.test(userAgent)) info.osVersion = '11';
    } else if (/mac os x/i.test(userAgent)) {
        info.os = 'macOS';
        const match = userAgent.match(/mac os x (\d+[._]\d+)/i);
        if (match) info.osVersion = match[1].replace('_', '.');
    } else if (/linux/i.test(userAgent)) {
        info.os = 'Linux';
    } else if (/android/i.test(userAgent)) {
        info.os = 'Android';
        const match = userAgent.match(/android (\d+(\.\d+)?)/i);
        if (match) info.osVersion = match[1];
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        info.os = 'iOS';
        const match = userAgent.match(/os (\d+[._]\d+)/i);
        if (match) info.osVersion = match[1].replace('_', '.');
    }

    return info;
}

/**
 * Extracts IP address from request headers
 */
export function extractIpAddress(headers: Headers | Record<string, string | string[] | undefined>): string {
    // Check various headers for IP
    const headersList = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'cf-connecting-ip', 'true-client-ip'];

    for (const header of headersList) {
        let value: string | string[] | undefined | null;

        if (headers instanceof Headers) {
            value = headers.get(header);
        } else {
            value = headers[header];
        }

        if (value) {
            // x-forwarded-for can contain multiple IPs
            const ip = Array.isArray(value) ? value[0] : value.split(',')[0];
            return ip.trim();
        }
    }

    return 'unknown';
}

// -------------------- ACTIVITY LOGGER CLASS --------------------
class ActivityLoggerService {
    private static instance: ActivityLoggerService;

    private constructor() {}

    public static getInstance(): ActivityLoggerService {
        if (!ActivityLoggerService.instance) {
            ActivityLoggerService.instance = new ActivityLoggerService();
        }
        return ActivityLoggerService.instance;
    }

    /**
     * Creates a new activity log entry
     */
    async log(options: LogOptions): Promise<void> {
        try {
            await connectToDatabase();

            const timestamp = new Date();
            const yearMonth = `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}`;

            // Mask sensitive data in request body
            const maskedRequestBody = options.request?.body ? maskSensitiveData(options.request.body) : undefined;

            // Mask sensitive data in states
            const maskedPreviousState = options.previousState?.map((s) => ({
                ...s,
                previousValue: maskSensitiveData(s.previousValue),
                newValue: maskSensitiveData(s.newValue)
            }));

            const maskedNewState = options.newState?.map((s) => ({
                ...s,
                previousValue: maskSensitiveData(s.previousValue),
                newValue: maskSensitiveData(s.newValue)
            }));

            const logEntry: Partial<IActivityLog> = {
                timestamp,
                yearMonth,

                // User context
                userId: options.context.userId ? new Types.ObjectId(options.context.userId.toString()) : undefined,
                userName: options.context.userName,
                userCategory: options.context.userCategory,

                // School context
                schoolId: new Types.ObjectId(options.context.schoolId.toString()),
                schoolName: options.context.schoolName,
                schoolSiteId: options.context.schoolSiteId ? new Types.ObjectId(options.context.schoolSiteId.toString()) : undefined,
                schoolSiteName: options.context.schoolSiteName,

                // Action
                actionCategory: options.action.category,
                actionType: options.action.type,
                actionDescription: options.action.description,

                // Entity
                entity: {
                    entityType: options.entity.type,
                    entityId: options.entity.id?.toString(),
                    entityName: options.entity.name
                },

                // Request
                requestMethod: options.request?.method,
                requestPath: options.request?.path,
                requestQuery: truncateData(options.request?.query),
                requestBody: truncateData(maskedRequestBody),

                // Client info
                clientInfo: options.clientInfo || {},

                // Outcome
                outcome: options.outcome.status,
                errorMessage: options.outcome.errorMessage,
                errorStack: options.outcome.errorStack,
                executionTimeMs: options.outcome.executionTimeMs,

                // State changes
                previousState: maskedPreviousState,
                newState: maskedNewState,

                // Metadata
                metadata: truncateData(options.metadata),

                // Compliance
                sensitiveDataMasked: options.sensitiveDataMasked ?? true,
                gdprRelevant: options.gdprRelevant ?? false,
                retentionPolicy: '3-years'
            };

            await ActivityLog.create(logEntry);
        } catch (error) {
            // Don't throw - logging failures shouldn't break the application
            console.error('ActivityLogger: Failed to create log entry:', error);
        }
    }

    /**
     * Query logs with filters and pagination
     */
    async query(options: QueryOptions): Promise<PaginatedResult<IActivityLog>> {
        await connectToDatabase();

        const page = options.page || 1;
        const limit = Math.min(options.limit || 50, 500); // Max 500 per page
        const skip = (page - 1) * limit;

        // Build query filter
        const filter: any = {
            schoolId: new Types.ObjectId(options.schoolId.toString())
        };

        if (options.startDate || options.endDate) {
            filter.timestamp = {};
            if (options.startDate) filter.timestamp.$gte = options.startDate;
            if (options.endDate) filter.timestamp.$lte = options.endDate;
        }

        if (options.schoolSiteId) {
            filter.schoolSiteId = new Types.ObjectId(options.schoolSiteId.toString());
        }

        if (options.userId) {
            filter.userId = new Types.ObjectId(options.userId.toString());
        }

        if (options.actionCategory) {
            filter.actionCategory = options.actionCategory;
        }

        if (options.actionType) {
            filter.actionType = options.actionType;
        }

        if (options.entityType) {
            filter['entity.entityType'] = options.entityType;
        }

        if (options.outcome) {
            filter.outcome = options.outcome;
        }

        if (options.search) {
            filter.$text = { $search: options.search };
        }

        // Build sort
        const sortField = options.sortField || 'timestamp';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
        const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

        // Execute query
        const [data, total] = await Promise.all([ActivityLog.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(), ActivityLog.countDocuments(filter)]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: data as IActivityLog[],
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasMore: page < totalPages
            }
        };
    }

    /**
     * Get aggregated statistics for logs
     */
    async getStatistics(
        schoolId: string | Types.ObjectId,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        totalLogs: number;
        byActionCategory: Record<ActionCategory, number>;
        byOutcome: Record<OutcomeStatus, number>;
        byEntityType: Record<string, number>;
        topUsers: { userId: string; userName: string; count: number }[];
        recentErrors: IActivityLog[];
    }> {
        await connectToDatabase();

        const matchStage: any = {
            schoolId: new Types.ObjectId(schoolId.toString())
        };

        if (startDate || endDate) {
            matchStage.timestamp = {};
            if (startDate) matchStage.timestamp.$gte = startDate;
            if (endDate) matchStage.timestamp.$lte = endDate;
        }

        const [totalLogs, categoryStats, outcomeStats, entityStats, topUsers, recentErrors] = await Promise.all([
            ActivityLog.countDocuments(matchStage),

            ActivityLog.aggregate([{ $match: matchStage }, { $group: { _id: '$actionCategory', count: { $sum: 1 } } }]),

            ActivityLog.aggregate([{ $match: matchStage }, { $group: { _id: '$outcome', count: { $sum: 1 } } }]),

            ActivityLog.aggregate([{ $match: matchStage }, { $group: { _id: '$entity.entityType', count: { $sum: 1 } } }]),

            ActivityLog.aggregate([
                { $match: { ...matchStage, userId: { $exists: true } } },
                {
                    $group: {
                        _id: '$userId',
                        userName: { $first: '$userName' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            ActivityLog.find({ ...matchStage, outcome: { $in: ['error', 'failure'] } })
                .sort({ timestamp: -1 })
                .limit(10)
                .lean()
        ]);

        // Transform aggregation results
        const byActionCategory: Record<string, number> = {};
        categoryStats.forEach((s: any) => {
            byActionCategory[s._id] = s.count;
        });

        const byOutcome: Record<string, number> = {};
        outcomeStats.forEach((s: any) => {
            byOutcome[s._id] = s.count;
        });

        const byEntityType: Record<string, number> = {};
        entityStats.forEach((s: any) => {
            byEntityType[s._id] = s.count;
        });

        return {
            totalLogs,
            byActionCategory: byActionCategory as Record<ActionCategory, number>,
            byOutcome: byOutcome as Record<OutcomeStatus, number>,
            byEntityType,
            topUsers: topUsers.map((u: any) => ({
                userId: u._id?.toString() || 'unknown',
                userName: u.userName || 'Unknown User',
                count: u.count
            })),
            recentErrors: recentErrors as IActivityLog[]
        };
    }

    /**
     * Export logs to JSON format
     */
    async exportLogs(options: QueryOptions): Promise<{ logs: IActivityLog[]; exportedAt: Date; total: number }> {
        // Use large limit for export but cap it
        const exportOptions = { ...options, limit: 10000 };
        const result = await this.query(exportOptions);

        return {
            logs: result.data,
            exportedAt: new Date(),
            total: result.pagination.total
        };
    }
}

// -------------------- SINGLETON EXPORT --------------------
export const activityLogger = ActivityLoggerService.getInstance();

// -------------------- HELPER FUNCTIONS --------------------
/**
 * Calculate state differences between two objects
 */
export function calculateStateDiff(oldState: Record<string, any> | null | undefined, newState: Record<string, any> | null | undefined): IStateSnapshot[] {
    const changes: IStateSnapshot[] = [];

    if (!oldState && !newState) return changes;

    const allKeys = new Set([...Object.keys(oldState || {}), ...Object.keys(newState || {})]);

    for (const key of allKeys) {
        const oldVal = oldState?.[key];
        const newVal = newState?.[key];

        // Skip if both are the same (simple comparison)
        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

        changes.push({
            fieldName: key,
            previousValue: oldVal,
            newValue: newVal
        });
    }

    return changes;
}

/**
 * Map model name to EntityType
 */
export function modelToEntityType(modelName: string): EntityType {
    const mapping: Record<string, EntityType> = {
        Person: 'person',
        School: 'school',
        SchoolSite: 'school_site',
        Faculty: 'faculty',
        Department: 'department',
        SiteClass: 'class',
        Subject: 'subject',
        ExamScore: 'exam_score',
        FeesConfiguration: 'fees_configuration',
        FeesPayment: 'fees_payment',
        Scholarship: 'scholarship',
        ScholarshipBody: 'scholarship_body',
        LibraryItem: 'library_item',
        LibraryLending: 'library_lending',
        LibraryUser: 'library_user',
        TimeTable: 'timetable',
        Expenditure: 'expenditure',
        LMSCourse: 'lms_course',
        LMSModule: 'lms_module',
        LMSLesson: 'lms_lesson',
        LMSQuiz: 'lms_quiz',
        LMSEnrollment: 'lms_enrollment',
        LMSAnnouncement: 'lms_announcement',
        Address: 'address',
        Bank: 'bank',
        Assignment: 'assignment',
        DailyFeeCollection: 'daily_fee_collection',
        ActivityLog: 'activity_log'
    };

    return mapping[modelName] || 'unknown';
}

export default activityLogger;
