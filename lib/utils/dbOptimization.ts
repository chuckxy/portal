/**
 * Database Optimization Utilities
 * 
 * Provides functions for database maintenance, optimization, and cleanup
 * operations to ensure optimal performance after bulk operations.
 */

import mongoose from 'mongoose';

export interface OptimizationResult {
    success: boolean;
    operation: string;
    duration: number;
    details?: any;
    error?: string;
}

export interface OptimizationReport {
    timestamp: Date;
    totalDuration: number;
    operations: OptimizationResult[];
    overallSuccess: boolean;
}

/**
 * Reindex a specific collection for optimized query performance
 */
export async function reindexCollection(collectionName: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
        const model = mongoose.models[collectionName];
        
        if (!model) {
            return {
                success: false,
                operation: `reindex_${collectionName}`,
                duration: Date.now() - startTime,
                error: `Model ${collectionName} not found`
            };
        }

        await (model.collection as any).reIndex();
        
        return {
            success: true,
            operation: `reindex_${collectionName}`,
            duration: Date.now() - startTime,
            details: { collection: collectionName }
        };
    } catch (error: any) {
        return {
            success: false,
            operation: `reindex_${collectionName}`,
            duration: Date.now() - startTime,
            error: error.message
        };
    }
}

/**
 * Reindex all core collections for comprehensive optimization
 */
export async function reindexAllCollections(): Promise<OptimizationReport> {
    const startTime = Date.now();
    const operations: OptimizationResult[] = [];
    
    const collectionsToReindex = [
        'Person',
        'StudentBilling',
        'FeesPayment',
        'ExamScore',
        'LibraryLending',
        'Assignment',
        'Scholarship',
        'ExamAnswer',
        'Subject',
        'SiteClass',
        'Department',
        'Faculty'
    ];

    for (const collectionName of collectionsToReindex) {
        const result = await reindexCollection(collectionName);
        operations.push(result);
    }

    const overallSuccess = operations.every(op => op.success);
    
    return {
        timestamp: new Date(),
        totalDuration: Date.now() - startTime,
        operations,
        overallSuccess
    };
}

/**
 * Clean up orphaned references in the database
 */
export async function cleanupOrphanedReferences(): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
        const cleanupOperations = [];
        
        // Clean up orphaned guardian references
        const Person = mongoose.models.Person;
        if (Person) {
            const guardianCleanup = await Person.updateMany(
                {
                    'studentInfo.guardian': { 
                        $exists: true,
                        $ne: null
                    }
                },
                {
                    $set: {
                        'studentInfo.guardian': null,
                        'studentInfo.guardianRelationship': null
                    }
                }
            ).exec();
            
            cleanupOperations.push({
                collection: 'Person',
                operation: 'guardian_cleanup',
                modified: guardianCleanup.modifiedCount
            });
        }

        return {
            success: true,
            operation: 'cleanup_orphaned_references',
            duration: Date.now() - startTime,
            details: { cleanupOperations }
        };
    } catch (error: any) {
        return {
            success: false,
            operation: 'cleanup_orphaned_references',
            duration: Date.now() - startTime,
            error: error.message
        };
    }
}

/**
 * Get collection statistics for monitoring
 */
export async function getCollectionStats(collectionName: string): Promise<any> {
    try {
        const model = mongoose.models[collectionName];
        
        if (!model) {
            throw new Error(`Model ${collectionName} not found`);
        }

        const stats = await (model.collection as any).stats();
        const indexInfo = await model.collection.indexInformation();
        
        return {
            collection: collectionName,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            indexes: Object.keys(indexInfo).length,
            indexDetails: indexInfo
        };
    } catch (error: any) {
        return {
            collection: collectionName,
            error: error.message
        };
    }
}

/**
 * Comprehensive database health check and optimization
 */
export async function performDatabaseOptimization(): Promise<OptimizationReport> {
    const startTime = Date.now();
    const operations: OptimizationResult[] = [];

    // Step 1: Clean up orphaned references
    const cleanupResult = await cleanupOrphanedReferences();
    operations.push(cleanupResult);

    // Step 2: Reindex all collections
    const reindexReport = await reindexAllCollections();
    operations.push(...reindexReport.operations);

    const overallSuccess = operations.every(op => op.success);
    
    return {
        timestamp: new Date(),
        totalDuration: Date.now() - startTime,
        operations,
        overallSuccess
    };
}

/**
 * Calculate database fragmentation and suggest compaction
 */
export async function analyzeDatabaseFragmentation(): Promise<{
    needsOptimization: boolean;
    collections: Array<{
        name: string;
        fragmentation: number;
        recommendation: string;
    }>;
}> {
    const collections = [
        'Person',
        'StudentBilling',
        'FeesPayment',
        'ExamScore'
    ];

    const analysis = [];
    
    for (const collectionName of collections) {
        try {
            const stats = await getCollectionStats(collectionName);
            
            if (stats.error) continue;
            
            // Simple fragmentation heuristic: if storage size > 1.5 * data size, consider fragmented
            const fragmentation = stats.storageSize / (stats.size || 1);
            const needsCompaction = fragmentation > 1.5;
            
            analysis.push({
                name: collectionName,
                fragmentation: Math.round(fragmentation * 100) / 100,
                recommendation: needsCompaction 
                    ? 'Consider running compaction or reindexing'
                    : 'Performance is optimal'
            });
        } catch (error) {
            console.error(`Error analyzing ${collectionName}:`, error);
        }
    }

    const needsOptimization = analysis.some(a => a.fragmentation > 1.5);
    
    return {
        needsOptimization,
        collections: analysis
    };
}
