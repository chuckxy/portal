/**
 * Migration Script: Fix SiteClass Indexes
 *
 * This script:
 * 1. Drops old/conflicting indexes from the siteclasses collection
 * 2. Creates the correct unique index: { department, site, sequence, division }
 *
 * Run this with: npx ts-node scripts/migrations/fix-siteclass-indexes.ts
 */

import mongoose from 'mongoose';
import * as readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sms';

async function fixSiteClassIndexes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        const collection = db.collection('siteclasses');

        // Get existing indexes
        console.log('📋 Current indexes:');
        const indexes = await collection.indexes();
        indexes.forEach((index: any) => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        console.log('');

        // Check for old academicYear index
        const academicYearIndex = indexes.find((idx: any) => idx.name === 'site_1_sequence_1_division_1_academicYear_1');

        if (academicYearIndex) {
            console.log('🗑️  Dropping old academicYear index...');
            await collection.dropIndex('site_1_sequence_1_division_1_academicYear_1');
            console.log('✅ Old index dropped\n');
        } else {
            console.log('ℹ️  Old academicYear index not found (already removed)\n');
        }

        // Check for the correct unique index
        const correctIndex = indexes.find((idx: any) => idx.name === 'department_1_site_1_sequence_1_division_1');

        if (!correctIndex) {
            console.log('🔨 Creating correct unique index: { department, site, sequence, division }...');
            await collection.createIndex({ department: 1, site: 1, sequence: 1, division: 1 }, { unique: true, name: 'department_1_site_1_sequence_1_division_1' });
            console.log('✅ Correct index created\n');
        } else {
            console.log('ℹ️  Correct index already exists\n');
        }

        // Display final indexes
        console.log('📋 Final indexes:');
        const finalIndexes = await collection.indexes();
        finalIndexes.forEach((index: any) => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        console.log('');

        console.log('✅ Migration completed successfully!');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Confirmation prompt
async function confirmMigration(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('⚠️  This will modify database indexes. Continue? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

// Main execution
(async () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   SiteClass Index Migration Script        ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const confirmed = await confirmMigration();

    if (!confirmed) {
        console.log('❌ Migration cancelled by user');
        process.exit(0);
    }

    try {
        await fixSiteClassIndexes();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
})();
