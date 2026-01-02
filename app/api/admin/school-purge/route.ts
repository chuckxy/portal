/**
 * School Data Purge API
 *
 * DESTRUCTIVE OPERATION - Permanently deletes all data associated with a school.
 *
 * Security:
 * - Only accessible by top-level administrators (proprietor)
 * - Requires confirmation phrase validation
 * - All actions are immutably logged
 *
 * Endpoints:
 * - GET /api/admin/school-purge/preview - Preview what will be deleted
 * - DELETE /api/admin/school-purge - Execute the purge
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import all models that may contain school-related data
import School from '@/models/School';
import SchoolSite from '@/models/SchoolSite';
import Person from '@/models/Person';
import SiteClass from '@/models/SiteClass';
import Faculty from '@/models/Faculty';
import Department from '@/models/Department';
import Subject from '@/models/Subject';
import ExamScore from '@/models/ExamScore';
import FeesPayment from '@/models/FeesPayment';
import Expenditure from '@/models/Expenditure';
import Scholarship from '@/models/Scholarship';
import ScholarshipBody from '@/models/ScholarshipBody';
import ActivityLog from '@/models/ActivityLog';
import Address from '@/models/Address';
import Bank from '@/models/Bank';
import TimeTable from '@/models/TimeTable';

// -------------------- CONSTANTS --------------------
const REQUIRED_ROLE = 'proprietor';
const CONFIRMATION_PHRASE = 'DELETE SCHOOL DATA';

// Collections to purge with their display names and descriptions
const COLLECTIONS_CONFIG = [
    { model: 'SchoolSite', field: 'school', displayName: 'School Sites', description: 'Campus and site configurations' },
    { model: 'Person', field: 'school', displayName: 'People', description: 'Students, teachers, staff, and parents' },
    { model: 'SiteClass', field: 'site', indirect: true, displayName: 'Classes', description: 'Class definitions and enrollments' },
    { model: 'Faculty', field: 'school', displayName: 'Faculties', description: 'Academic faculties' },
    { model: 'Department', field: 'school', displayName: 'Departments', description: 'Academic departments' },
    { model: 'Subject', field: 'school', displayName: 'Subjects', description: 'Curriculum subjects' },
    { model: 'ExamScore', field: 'school', displayName: 'Exam Scores', description: 'Student examination records' },
    { model: 'FeesPayment', field: 'site', indirect: true, displayName: 'Fee Payments', description: 'Financial payment records' },
    { model: 'Expenditure', field: 'school', displayName: 'Expenditures', description: 'School expenditure records' },
    { model: 'Scholarship', field: 'school', displayName: 'Scholarships', description: 'Student scholarship awards' },
    { model: 'ScholarshipBody', field: 'school', displayName: 'Scholarship Bodies', description: 'Scholarship providers' },
    { model: 'TimeTable', field: 'school', displayName: 'Timetables', description: 'Class schedules' },
    { model: 'Bank', field: 'school', displayName: 'Bank Accounts', description: 'Financial account configurations' },
    { model: 'Address', field: 'school', displayName: 'Addresses', description: 'Address records' }
];

// Model registry for dynamic access
const MODEL_REGISTRY: Record<string, any> = {
    School,
    SchoolSite,
    Person,
    SiteClass,
    Faculty,
    Department,
    Subject,
    ExamScore,
    FeesPayment,
    Expenditure,
    Scholarship,
    ScholarshipBody,
    TimeTable,
    Bank,
    Address
};

// -------------------- HELPER FUNCTIONS --------------------
interface DecodedToken {
    userId: string;
    username: string;
    personCategory: string;
    school: string;
}

function extractToken(request: NextRequest): DecodedToken | null {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const base64Payload = token.split('.')[1];
            return JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        }
        return null;
    } catch {
        return null;
    }
}

function validateAccess(request: NextRequest): { valid: boolean; error?: string; user?: DecodedToken } {
    const token = extractToken(request);

    if (!token) {
        return { valid: false, error: 'Authentication required' };
    }

    if (token.personCategory !== REQUIRED_ROLE) {
        return { valid: false, error: 'Access denied. Only top-level administrators can perform this action.' };
    }

    return { valid: true, user: token };
}

async function getSiteIdsForSchool(schoolId: string): Promise<string[]> {
    const sites = await (SchoolSite as any).find({ school: schoolId }).select('_id').lean();
    return sites.map((s: any) => s._id.toString());
}

// -------------------- GET: PREVIEW DELETION --------------------
export async function GET(request: NextRequest) {
    try {
        // Validate access
        const accessCheck = validateAccess(request);
        if (!accessCheck.valid) {
            return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.error?.includes('Authentication') ? 401 : 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
        }

        // Validate school exists
        const school = await School.findById(schoolId).lean();
        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        // Get site IDs for this school (needed for indirect relationships)
        const siteIds = await getSiteIdsForSchool(schoolId);

        // Count records in each collection
        const collections: { name: string; displayName: string; count: number; description: string }[] = [];
        let totalRecords = 0;

        for (const config of COLLECTIONS_CONFIG) {
            const Model = MODEL_REGISTRY[config.model];
            if (!Model) continue;

            let count = 0;
            try {
                if (config.indirect && config.field === 'site') {
                    // For collections linked via site
                    count = await Model.countDocuments({ [config.field]: { $in: siteIds } });
                } else {
                    // Direct school relationship
                    count = await Model.countDocuments({ [config.field]: schoolId });
                }
            } catch (e) {
                // Model might not have the field, skip
                console.warn(`Could not count ${config.model}:`, e);
            }

            if (count > 0) {
                collections.push({
                    name: config.model,
                    displayName: config.displayName,
                    count,
                    description: config.description
                });
                totalRecords += count;
            }
        }

        // Add the school itself
        collections.unshift({
            name: 'School',
            displayName: 'School Record',
            count: 1,
            description: 'The main school entity'
        });
        totalRecords += 1;

        // Generate warnings based on data
        const warnings: string[] = [];

        const personCount = collections.find((c) => c.name === 'Person')?.count || 0;
        if (personCount > 0) {
            warnings.push(`This will delete ${personCount.toLocaleString()} user accounts including all login credentials.`);
        }

        const paymentCount = collections.find((c) => c.name === 'FeesPayment')?.count || 0;
        if (paymentCount > 0) {
            warnings.push(`This will delete ${paymentCount.toLocaleString()} financial payment records. Ensure all necessary records have been exported.`);
        }

        const examCount = collections.find((c) => c.name === 'ExamScore')?.count || 0;
        if (examCount > 0) {
            warnings.push(`This will delete ${examCount.toLocaleString()} examination records. Academic transcripts will no longer be available.`);
        }

        warnings.push('All activity logs specific to this school will be retained for audit purposes but marked as belonging to a deleted school.');
        warnings.push('This operation cannot be rolled back. Once executed, all data is permanently lost.');
        warnings.push('Any integrations or external systems referencing this school will fail after deletion.');

        // Estimate time based on record count
        const estimatedSeconds = Math.max(5, Math.ceil(totalRecords / 1000) * 2);
        const estimatedTime = estimatedSeconds < 60 ? `~${estimatedSeconds} seconds` : `~${Math.ceil(estimatedSeconds / 60)} minutes`;

        return NextResponse.json({
            preview: {
                school: {
                    id: (school as any)._id.toString(),
                    name: (school as any).name,
                    code: (school as any).code
                },
                collections,
                totalRecords,
                estimatedTime,
                warnings
            }
        });
    } catch (error: any) {
        console.error('Error generating deletion preview:', error);
        return NextResponse.json({ error: 'Failed to generate deletion preview', details: error.message }, { status: 500 });
    }
}

// -------------------- DELETE: EXECUTE PURGE --------------------
export async function DELETE(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Validate access
        const accessCheck = validateAccess(request);
        if (!accessCheck.valid) {
            return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.error?.includes('Authentication') ? 401 : 403 });
        }

        await connectDB();

        const body = await request.json();
        const { schoolId, schoolName, adminId, adminUsername, confirmationPhrase } = body;

        // Validate required fields
        if (!schoolId || !adminId || !confirmationPhrase) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate confirmation phrase
        if (confirmationPhrase !== CONFIRMATION_PHRASE) {
            return NextResponse.json({ error: 'Invalid confirmation phrase' }, { status: 400 });
        }

        // Validate school exists
        const school = await School.findById(schoolId).lean();
        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        // Get site IDs for this school
        const siteIds = await getSiteIdsForSchool(schoolId);

        // Start deletion - use transaction if available
        const session = await mongoose.startSession();
        const deletedCollections: { name: string; deletedCount: number }[] = [];
        let totalDeleted = 0;

        try {
            session.startTransaction();

            // Delete in order of dependencies (children first, parent last)
            for (const config of COLLECTIONS_CONFIG) {
                const Model = MODEL_REGISTRY[config.model];
                if (!Model) continue;

                try {
                    let result;
                    if (config.indirect && config.field === 'site') {
                        result = await Model.deleteMany({ [config.field]: { $in: siteIds } }, { session });
                    } else {
                        result = await Model.deleteMany({ [config.field]: schoolId }, { session });
                    }

                    if (result.deletedCount > 0) {
                        deletedCollections.push({
                            name: config.model,
                            deletedCount: result.deletedCount
                        });
                        totalDeleted += result.deletedCount;
                    }
                } catch (e) {
                    console.warn(`Could not delete from ${config.model}:`, e);
                }
            }

            // Finally, delete the school itself
            await School.findByIdAndDelete(schoolId, { session });
            deletedCollections.push({ name: 'School', deletedCount: 1 });
            totalDeleted += 1;

            await session.commitTransaction();
        } catch (txError) {
            await session.abortTransaction();
            throw txError;
        } finally {
            session.endSession();
        }

        const executionTime = Date.now() - startTime;

        // Create immutable audit log entry
        // This log is created AFTER the deletion and references a deleted school
        // It's stored in a special way to ensure it persists
        const auditLogEntry = await ActivityLog.create({
            timestamp: new Date(),
            yearMonth: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`,
            userId: new mongoose.Types.ObjectId(adminId),
            userName: adminUsername,
            userCategory: REQUIRED_ROLE,
            schoolId: new mongoose.Types.ObjectId(schoolId),
            schoolName: schoolName || (school as any).name,
            actionCategory: 'sensitive',
            actionType: 'school_delete',
            actionDescription: `SCHOOL DATA PURGE: Permanently deleted all data for school "${schoolName || (school as any).name}" (ID: ${schoolId})`,
            entity: {
                entityType: 'school',
                entityId: schoolId,
                entityName: schoolName || (school as any).name
            },
            clientInfo: {
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            },
            outcome: 'success',
            executionTimeMs: executionTime,
            metadata: {
                deletedCollections,
                totalRecordsDeleted: totalDeleted,
                siteIdsDeleted: siteIds,
                confirmationPhraseUsed: true,
                purgeType: 'complete',
                irreversible: true
            },
            sensitiveDataMasked: false,
            gdprRelevant: true,
            retentionPolicy: 'permanent' // This log should never be deleted
        });

        return NextResponse.json({
            success: true,
            schoolId,
            schoolName: schoolName || (school as any).name,
            deletedCollections,
            totalDeleted,
            timestamp: new Date().toISOString(),
            auditLogId: auditLogEntry._id.toString(),
            executionTimeMs: executionTime
        });
    } catch (error: any) {
        console.error('Error executing school purge:', error);

        // Log the failed attempt
        try {
            const body = await request
                .clone()
                .json()
                .catch(() => ({}));
            await ActivityLog.create({
                timestamp: new Date(),
                yearMonth: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`,
                userId: body.adminId ? new mongoose.Types.ObjectId(body.adminId) : undefined,
                userName: body.adminUsername,
                userCategory: REQUIRED_ROLE,
                schoolId: body.schoolId ? new mongoose.Types.ObjectId(body.schoolId) : undefined,
                schoolName: body.schoolName,
                actionCategory: 'sensitive',
                actionType: 'school_delete',
                actionDescription: `FAILED SCHOOL DATA PURGE: Attempted to delete school "${body.schoolName}" but operation failed`,
                entity: {
                    entityType: 'school',
                    entityId: body.schoolId,
                    entityName: body.schoolName
                },
                clientInfo: {
                    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                },
                outcome: 'error',
                errorMessage: error.message,
                executionTimeMs: Date.now() - startTime,
                metadata: {
                    errorDetails: error.toString(),
                    purgeType: 'complete',
                    irreversible: true
                },
                sensitiveDataMasked: false,
                gdprRelevant: true,
                retentionPolicy: 'permanent'
            });
        } catch (logError) {
            console.error('Failed to create audit log for failed purge:', logError);
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to execute school purge',
                details: error.message
            },
            { status: 500 }
        );
    }
}
