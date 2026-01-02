import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Activity Log Model
 *
 * Captures all system activities for audit, compliance, and security purposes.
 * Designed for immutability (append-only) and school-based partitioning.
 */

// -------------------- TYPES --------------------
export type ActionCategory = 'authentication' | 'crud' | 'permission' | 'sensitive' | 'system' | 'audit';

export type ActionType =
    // Authentication
    | 'login'
    | 'logout'
    | 'login_failed'
    | 'password_change'
    | 'password_reset'
    | 'session_expired'
    // CRUD Operations
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'bulk_create'
    | 'bulk_update'
    | 'bulk_delete'
    // Permission & Role
    | 'role_change'
    | 'permission_grant'
    | 'permission_revoke'
    | 'access_denied'
    // Sensitive Actions
    | 'school_delete'
    | 'data_export'
    | 'data_import'
    | 'config_change'
    | 'fee_config_change'
    | 'payment_process'
    | 'payment_reversal'
    | 'scholarship_award'
    // System
    | 'system_error'
    | 'api_call'
    | 'report_generate'
    // Audit
    | 'log_access'
    | 'log_export';

export type OutcomeStatus = 'success' | 'failure' | 'error' | 'pending';

export type EntityType =
    | 'person'
    | 'school'
    | 'school_site'
    | 'faculty'
    | 'department'
    | 'class'
    | 'subject'
    | 'exam_score'
    | 'fees_configuration'
    | 'fees_payment'
    | 'scholarship'
    | 'scholarship_body'
    | 'library_item'
    | 'library_lending'
    | 'library_user'
    | 'timetable'
    | 'expenditure'
    | 'lms_course'
    | 'lms_module'
    | 'lms_lesson'
    | 'lms_quiz'
    | 'lms_enrollment'
    | 'lms_announcement'
    | 'address'
    | 'bank'
    | 'assignment'
    | 'daily_fee_collection'
    | 'activity_log'
    | 'system'
    | 'unknown';

// Client Information Interface
export interface IClientInfo {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile' | 'unknown';
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
}

// Entity Reference Interface
export interface IEntityReference {
    entityType: EntityType;
    entityId?: Types.ObjectId | string;
    entityName?: string;
}

// State Snapshot Interface (for tracking changes)
export interface IStateSnapshot {
    fieldName: string;
    previousValue?: any;
    newValue?: any;
}

// Main Activity Log Interface
export interface IActivityLog {
    // Timestamp (always UTC)
    timestamp: Date;

    // User Information
    userId?: Types.ObjectId;
    userName?: string;
    userCategory?: string;

    // School Context
    schoolId: Types.ObjectId;
    schoolName?: string;
    schoolSiteId?: Types.ObjectId;
    schoolSiteName?: string;

    // Action Details
    actionCategory: ActionCategory;
    actionType: ActionType;
    actionDescription: string;

    // Entity Affected
    entity: IEntityReference;

    // State Changes (for updates/deletes)
    previousState?: IStateSnapshot[];
    newState?: IStateSnapshot[];

    // Request Details
    requestMethod?: string;
    requestPath?: string;
    requestQuery?: Record<string, any>;
    requestBody?: Record<string, any>;

    // Client Information
    clientInfo: IClientInfo;

    // Outcome
    outcome: OutcomeStatus;
    errorMessage?: string;
    errorStack?: string;

    // Performance
    executionTimeMs?: number;

    // Metadata
    metadata?: Record<string, any>;

    // Compliance & Privacy
    sensitiveDataMasked: boolean;
    gdprRelevant: boolean;
    retentionPolicy?: string;

    // Index hints for partitioning
    yearMonth: string; // Format: YYYY-MM for partition/archival
}

export type ActivityLogDocument = Document & IActivityLog;

// -------------------- SCHEMA --------------------
const ClientInfoSchema = new Schema<IClientInfo>(
    {
        ipAddress: { type: String, trim: true },
        userAgent: { type: String, trim: true },
        deviceType: {
            type: String,
            enum: ['desktop', 'tablet', 'mobile', 'unknown'],
            default: 'unknown'
        },
        browser: { type: String, trim: true },
        browserVersion: { type: String, trim: true },
        os: { type: String, trim: true },
        osVersion: { type: String, trim: true },
        screenResolution: { type: String, trim: true },
        timezone: { type: String, trim: true },
        language: { type: String, trim: true }
    },
    { _id: false }
);

const EntityReferenceSchema = new Schema<IEntityReference>(
    {
        entityType: {
            type: String,
            enum: [
                'person',
                'school',
                'school_site',
                'faculty',
                'department',
                'class',
                'subject',
                'exam_score',
                'fees_configuration',
                'fees_payment',
                'scholarship',
                'scholarship_body',
                'library_item',
                'library_lending',
                'library_user',
                'timetable',
                'expenditure',
                'lms_course',
                'lms_module',
                'lms_lesson',
                'lms_quiz',
                'lms_enrollment',
                'lms_announcement',
                'address',
                'bank',
                'assignment',
                'daily_fee_collection',
                'activity_log',
                'system',
                'unknown'
            ],
            required: true
        },
        entityId: { type: Schema.Types.Mixed },
        entityName: { type: String, trim: true }
    },
    { _id: false }
);

const StateSnapshotSchema = new Schema<IStateSnapshot>(
    {
        fieldName: { type: String, required: true, trim: true },
        previousValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed }
    },
    { _id: false }
);

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        // Timestamp
        timestamp: {
            type: Date,
            required: true,
            default: () => new Date(),
            index: true
        },

        // User Information
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            index: true
        },
        userName: { type: String, trim: true },
        userCategory: { type: String, trim: true },

        // School Context (required for partitioning)
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        schoolName: { type: String, trim: true },
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            index: true
        },
        schoolSiteName: { type: String, trim: true },

        // Action Details
        actionCategory: {
            type: String,
            enum: ['authentication', 'crud', 'permission', 'sensitive', 'system', 'audit'],
            required: true,
            index: true
        },
        actionType: {
            type: String,
            enum: [
                'login',
                'logout',
                'login_failed',
                'password_change',
                'password_reset',
                'session_expired',
                'create',
                'read',
                'update',
                'delete',
                'bulk_create',
                'bulk_update',
                'bulk_delete',
                'role_change',
                'permission_grant',
                'permission_revoke',
                'access_denied',
                'school_delete',
                'data_export',
                'data_import',
                'config_change',
                'fee_config_change',
                'payment_process',
                'payment_reversal',
                'scholarship_award',
                'system_error',
                'api_call',
                'report_generate',
                'log_access',
                'log_export'
            ],
            required: true,
            index: true
        },
        actionDescription: { type: String, required: true, trim: true },

        // Entity Affected
        entity: {
            type: EntityReferenceSchema,
            required: true
        },

        // State Changes
        previousState: [StateSnapshotSchema],
        newState: [StateSnapshotSchema],

        // Request Details
        requestMethod: { type: String, trim: true },
        requestPath: { type: String, trim: true },
        requestQuery: { type: Schema.Types.Mixed },
        requestBody: { type: Schema.Types.Mixed },

        // Client Information
        clientInfo: {
            type: ClientInfoSchema,
            default: {}
        },

        // Outcome
        outcome: {
            type: String,
            enum: ['success', 'failure', 'error', 'pending'],
            required: true,
            index: true
        },
        errorMessage: { type: String, trim: true },
        errorStack: { type: String, trim: true },

        // Performance
        executionTimeMs: { type: Number },

        // Metadata
        metadata: { type: Schema.Types.Mixed },

        // Compliance & Privacy
        sensitiveDataMasked: { type: Boolean, default: true },
        gdprRelevant: { type: Boolean, default: false },
        retentionPolicy: { type: String, default: '3-years' },

        // Partition Index
        yearMonth: {
            type: String,
            required: true,
            index: true
        }
    },
    {
        timestamps: false, // We manage timestamp manually
        collection: 'activity_logs',
        // Prevent updates to ensure immutability
        strict: true
    }
);

// -------------------- INDEXES --------------------
// Compound indexes for common queries
ActivityLogSchema.index({ schoolId: 1, timestamp: -1 });
ActivityLogSchema.index({ schoolId: 1, actionType: 1, timestamp: -1 });
ActivityLogSchema.index({ schoolId: 1, userId: 1, timestamp: -1 });
ActivityLogSchema.index({ schoolId: 1, outcome: 1, timestamp: -1 });
ActivityLogSchema.index({ schoolId: 1, 'entity.entityType': 1, timestamp: -1 });
ActivityLogSchema.index({ schoolId: 1, schoolSiteId: 1, timestamp: -1 });
ActivityLogSchema.index({ yearMonth: 1, schoolId: 1 }); // For archival queries

// Text index for search
ActivityLogSchema.index({
    actionDescription: 'text',
    userName: 'text',
    'entity.entityName': 'text'
});

// -------------------- PRE-SAVE HOOKS --------------------
ActivityLogSchema.pre('save', function (this: ActivityLogDocument) {
    // Set yearMonth for partitioning
    if (!this.yearMonth && this.timestamp) {
        const date = this.timestamp;
        this.yearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
});

// -------------------- PREVENT UPDATES/DELETES --------------------
// Logs should be immutable - prevent modifications
ActivityLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Activity logs are immutable and cannot be updated');
});

ActivityLogSchema.pre('updateOne', function () {
    throw new Error('Activity logs are immutable and cannot be updated');
});

ActivityLogSchema.pre('updateMany', function () {
    throw new Error('Activity logs are immutable and cannot be updated');
});

// Note: Delete prevention should be handled at application/role level
// to allow for GDPR compliance (right to erasure) when needed

// -------------------- STATIC METHODS --------------------
ActivityLogSchema.statics.findBySchool = function (
    schoolId: Types.ObjectId | string,
    options: {
        startDate?: Date;
        endDate?: Date;
        actionType?: ActionType;
        userId?: Types.ObjectId | string;
        outcome?: OutcomeStatus;
        entityType?: EntityType;
        limit?: number;
        skip?: number;
        sort?: Record<string, 1 | -1>;
    } = {}
) {
    const query: any = { schoolId };

    if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = options.startDate;
        if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    if (options.actionType) query.actionType = options.actionType;
    if (options.userId) query.userId = options.userId;
    if (options.outcome) query.outcome = options.outcome;
    if (options.entityType) query['entity.entityType'] = options.entityType;

    return this.find(query)
        .sort(options.sort || { timestamp: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};

// -------------------- MODEL EXPORT --------------------
const ActivityLog: Model<ActivityLogDocument> = mongoose.models.ActivityLog || mongoose.model<ActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
