import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import mongoose from 'mongoose';

/**
 * GET /api/student-billing/summary
 * Get comprehensive billing summary and statistics
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;

        // Required filters
        const schoolSiteId = searchParams.get('siteId');
        if (!schoolSiteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        // Optional filters
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const classId = searchParams.get('classId');

        // Build match criteria
        const matchCriteria: any = {
            schoolSite: new mongoose.Types.ObjectId(schoolSiteId)
        };

        if (academicYear) {
            matchCriteria.academicYear = academicYear;
        }
        if (academicTerm) {
            matchCriteria.academicTerm = parseInt(academicTerm);
        }
        if (classId) {
            matchCriteria.class = new mongoose.Types.ObjectId(classId);
        }

        // Aggregate summary statistics
        const summary = await StudentBilling.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    totalBilled: { $sum: '$totalBilled' },
                    totalTermFees: { $sum: '$termOrSemesterBill' },
                    totalArrears: { $sum: '$balanceBroughtForward' },
                    totalAdditionalCharges: { $sum: '$addedChargesTotal' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: { $max: ['$currentBalance', 0] } },
                    totalOverpaid: { $sum: { $abs: { $min: ['$currentBalance', 0] } } },
                    owingCount: { $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] } },
                    clearCount: { $sum: { $cond: [{ $eq: ['$currentBalance', 0] }, 1, 0] } },
                    overpaidCount: { $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, 1, 0] } },
                    pendingCount: { $sum: { $cond: [{ $eq: ['$billingStatus', 'pending'] }, 1, 0] } },
                    avgBalance: { $avg: '$currentBalance' },
                    maxBalance: { $max: '$currentBalance' },
                    minBalance: { $min: '$currentBalance' }
                }
            }
        ]);

        // Get breakdown by billing status
        const statusBreakdown = await StudentBilling.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: '$billingStatus',
                    count: { $sum: 1 },
                    totalBalance: { $sum: '$currentBalance' },
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get breakdown by class
        const classBreakdown = await StudentBilling.aggregate([
            { $match: matchCriteria },
            {
                $lookup: {
                    from: 'siteclasses',
                    localField: 'class',
                    foreignField: '_id',
                    as: 'classInfo'
                }
            },
            { $unwind: '$classInfo' },
            {
                $group: {
                    _id: '$class',
                    className: { $first: '$classInfo.className' },
                    studentCount: { $sum: 1 },
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: { $max: ['$currentBalance', 0] } },
                    owingCount: { $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] } },
                    clearCount: { $sum: { $cond: [{ $eq: ['$currentBalance', 0] }, 1, 0] } }
                }
            },
            { $sort: { className: 1 } }
        ]);

        // Get top debtors
        const topDebtors = await StudentBilling.find({
            ...matchCriteria,
            currentBalance: { $gt: 0 }
        })
            .sort({ currentBalance: -1 })
            .limit(10)
            .populate('student', 'firstName lastName studentInfo.studentId')
            .populate('class', 'className')
            .select('student class currentBalance totalBilled totalPaid academicYear academicTerm')
            .lean();

        // Get collection rate by academic term (for current year)
        const collectionTrend = await StudentBilling.aggregate([
            {
                $match: {
                    schoolSite: new mongoose.Types.ObjectId(schoolSiteId),
                    ...(academicYear && { academicYear })
                }
            },
            {
                $group: {
                    _id: { year: '$academicYear', term: '$academicTerm' },
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    studentCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: { $concat: ['$_id.year', ' - Term ', { $toString: '$_id.term' }] },
                    academicYear: '$_id.year',
                    academicTerm: '$_id.term',
                    totalBilled: 1,
                    totalPaid: 1,
                    studentCount: 1,
                    collectionRate: {
                        $cond: [{ $eq: ['$totalBilled', 0] }, 0, { $multiply: [{ $divide: ['$totalPaid', '$totalBilled'] }, 100] }]
                    }
                }
            },
            { $sort: { academicYear: -1, academicTerm: -1 } }
        ]);

        // Get charge categories breakdown
        const chargeCategories = await StudentBilling.aggregate([
            { $match: matchCriteria },
            { $unwind: { path: '$additionalCharges', preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: '$additionalCharges.category',
                    totalAmount: { $sum: '$additionalCharges.amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const result = summary[0] || {
            totalStudents: 0,
            totalBilled: 0,
            totalTermFees: 0,
            totalArrears: 0,
            totalAdditionalCharges: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            totalOverpaid: 0,
            owingCount: 0,
            clearCount: 0,
            overpaidCount: 0,
            pendingCount: 0,
            avgBalance: 0,
            maxBalance: 0,
            minBalance: 0
        };

        // Calculate collection rate
        result.collectionRate = result.totalBilled > 0 ? ((result.totalPaid / result.totalBilled) * 100).toFixed(2) : 0;

        // Calculate net balance
        result.netBalance = result.totalOutstanding - result.totalOverpaid;

        return NextResponse.json({
            summary: result,
            statusBreakdown,
            classBreakdown,
            topDebtors,
            collectionTrend,
            chargeCategories,
            filters: {
                schoolSiteId,
                academicYear,
                academicTerm,
                classId
            }
        });
    } catch (error: any) {
        console.error('Error fetching billing summary:', error);
        return NextResponse.json({ error: 'Failed to fetch billing summary', details: error.message }, { status: 500 });
    }
}
