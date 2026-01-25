import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import {
    performDatabaseOptimization,
    reindexAllCollections,
    analyzeDatabaseFragmentation,
    getCollectionStats
} from '@/lib/utils/dbOptimization';
import { extractTokenFromRequest } from '@/lib/middleware/activityLogging';

// GET /api/admin/db-optimization - Get database statistics and health
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Verify admin authorization
        const token = extractTokenFromRequest(request);
        if (!token || !['admin', 'proprietor'].includes(token.personCategory)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unauthorized: Admin access required'
                },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'stats') {
            // Get stats for specific collection or all
            const collection = searchParams.get('collection');
            
            if (collection) {
                const stats = await getCollectionStats(collection);
                return NextResponse.json({ success: true, stats });
            } else {
                // Get stats for key collections
                const collections = ['Person', 'StudentBilling', 'FeesPayment', 'ExamScore'];
                const statsPromises = collections.map(c => getCollectionStats(c));
                const allStats = await Promise.all(statsPromises);
                
                return NextResponse.json({
                    success: true,
                    stats: allStats
                });
            }
        } else if (action === 'analyze') {
            // Analyze database fragmentation
            const analysis = await analyzeDatabaseFragmentation();
            
            return NextResponse.json({
                success: true,
                analysis
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid action. Use ?action=stats or ?action=analyze'
                },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('Error in database optimization GET:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to retrieve database information',
                error: error.message
            },
            { status: 500 }
        );
    }
}

// POST /api/admin/db-optimization - Perform database optimization
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // Verify admin authorization
        const token = extractTokenFromRequest(request);
        if (!token || !['admin', 'proprietor'].includes(token.personCategory)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unauthorized: Admin access required'
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { operation } = body;

        let result;

        switch (operation) {
            case 'reindex':
                // Reindex all collections
                result = await reindexAllCollections();
                break;

            case 'full-optimization':
                // Comprehensive optimization
                result = await performDatabaseOptimization();
                break;

            default:
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Invalid operation. Use "reindex" or "full-optimization"'
                    },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: result.overallSuccess,
            message: result.overallSuccess
                ? 'Database optimization completed successfully'
                : 'Database optimization completed with some errors',
            report: result
        });
    } catch (error: any) {
        console.error('Error in database optimization POST:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to perform database optimization',
                error: error.message
            },
            { status: 500 }
        );
    }
}
