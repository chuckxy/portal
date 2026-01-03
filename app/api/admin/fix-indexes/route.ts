import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

/**
 * POST /api/admin/fix-indexes
 * Fixes database indexes for all collections
 *
 * This endpoint:
 * 1. Drops conflicting old indexes
 * 2. Syncs indexes with current schemas
 */
export async function POST() {
    try {
        await connectDB();

        const db = mongoose.connection.db;
        if (!db) {
            return NextResponse.json({ success: false, message: 'Database connection not established' }, { status: 500 });
        }

        const results: any = {
            siteclasses: { status: 'pending', details: [] }
        };

        // Fix SiteClass indexes
        try {
            const collection = db.collection('siteclasses');
            const indexes = await collection.indexes();

            // Drop old academicYear index if it exists
            const oldIndex = indexes.find((idx: any) => idx.name === 'site_1_sequence_1_division_1_academicYear_1');

            if (oldIndex) {
                await collection.dropIndex('site_1_sequence_1_division_1_academicYear_1');
                results.siteclasses.details.push('Dropped old academicYear index');
            }

            // Ensure correct unique index exists
            const correctIndex = indexes.find((idx: any) => idx.name === 'department_1_site_1_sequence_1_division_1');

            if (!correctIndex) {
                await collection.createIndex({ department: 1, site: 1, sequence: 1, division: 1 }, { unique: true });
                results.siteclasses.details.push('Created correct unique index');
            } else {
                results.siteclasses.details.push('Correct index already exists');
            }

            results.siteclasses.status = 'success';
        } catch (error: any) {
            results.siteclasses.status = 'failed';
            results.siteclasses.error = error.message;
        }

        // Check overall success
        const allSuccess = Object.values(results).every((r: any) => r.status === 'success');

        return NextResponse.json(
            {
                success: allSuccess,
                message: allSuccess ? 'All indexes fixed successfully' : 'Some indexes failed to fix',
                results
            },
            { status: allSuccess ? 200 : 500 }
        );
    } catch (error: any) {
        console.error('Error fixing indexes:', error);
        return NextResponse.json({ success: false, message: 'Failed to fix indexes', error: error.message }, { status: 500 });
    }
}
