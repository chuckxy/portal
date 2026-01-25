import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import StudentBilling from '@/models/StudentBilling';
import Person from '@/models/Person';
import SiteClass from '@/models/SiteClass';
import SchoolSite from '@/models/SchoolSite';
import FeesConfiguration from '@/models/FeesConfiguration';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

/**
 * GET /api/student-billing
 * Retrieve billing records with comprehensive filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;

        // Pagination
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = page * limit;

        // Sorting
        const sortField = searchParams.get('sortField') || 'academicYear';
        const sortOrderParam = parseInt(searchParams.get('sortOrder') || '-1');
        const sortOrder: 1 | -1 = sortOrderParam >= 0 ? 1 : -1;

        // Build filters
        const filters: any = {};

        // Student filter (by ID or search)
        if (searchParams.get('studentId')) {
            filters.student = searchParams.get('studentId');
        }

        if (searchParams.get('search')) {
            const search = searchParams.get('search');
            // Will need to find students first and then filter
            const students = await Person.find({
                $or: [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { 'studentInfo.studentId': { $regex: search, $options: 'i' } }],
                personCategory: 'student'
            } as any)
                .select('_id')
                .lean();

            const studentIds = students.map((s) => s._id);
            if (studentIds.length > 0) {
                filters.student = { $in: studentIds };
            } else {
                // No matching students, return empty result
                return NextResponse.json({
                    billings: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                });
            }
        }

        // Site filter
        if (searchParams.get('siteId')) {
            filters.schoolSite = searchParams.get('siteId');
        }

        // Class filter
        if (searchParams.get('classId')) {
            filters.class = searchParams.get('classId');
        }

        // Academic year filter
        if (searchParams.get('academicYear')) {
            filters.academicYear = searchParams.get('academicYear');
        }

        // Academic term filter
        if (searchParams.get('academicTerm')) {
            filters.academicTerm = parseInt(searchParams.get('academicTerm') as string);
        }

        // Billing status filter
        if (searchParams.get('billingStatus')) {
            filters.billingStatus = searchParams.get('billingStatus');
        }

        // Current billing only
        if (searchParams.get('currentOnly') === 'true') {
            filters.isCurrent = true;
        }

        // Owing students only (for defaulters)
        if (searchParams.get('owingOnly') === 'true') {
            filters.billingStatus = 'owing';
            filters.currentBalance = { $gt: 0 };
        }

        // Minimum balance filter
        if (searchParams.get('minBalance')) {
            filters.currentBalance = {
                ...filters.currentBalance,
                $gte: parseFloat(searchParams.get('minBalance') as string)
            };
        }

        // Maximum balance filter
        if (searchParams.get('maxBalance')) {
            filters.currentBalance = {
                ...filters.currentBalance,
                $lte: parseFloat(searchParams.get('maxBalance') as string)
            };
        }

        // Execute query
        const [billings, total] = await Promise.all([
            StudentBilling.find(filters)
                .populate({
                    path: 'student',
                    select: 'firstName lastName studentInfo.studentId profileImage'
                })
                .populate('schoolSite', 'siteName description')
                .populate('class', 'className division sequence')
                .populate('createdBy', 'firstName lastName')
                .populate('lastModifiedBy', 'firstName lastName')
                .sort({ [sortField]: sortOrder, academicTerm: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            StudentBilling.countDocuments(filters)
        ]);

        // Calculate summary statistics
        const summary = await StudentBilling.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$totalBilled' },
                    totalPaid: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: { $max: ['$currentBalance', 0] } },
                    totalOverpaid: { $sum: { $abs: { $min: ['$currentBalance', 0] } } },
                    owingCount: { $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] } },
                    clearCount: { $sum: { $cond: [{ $eq: ['$currentBalance', 0] }, 1, 0] } },
                    overpaidCount: { $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, 1, 0] } }
                }
            }
        ]);

        return NextResponse.json({
            billings,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            summary: summary[0] || {
                totalBilled: 0,
                totalPaid: 0,
                totalOutstanding: 0,
                totalOverpaid: 0,
                owingCount: 0,
                clearCount: 0,
                overpaidCount: 0
            }
        });
    } catch (error: any) {
        console.error('Error fetching billing records:', error);
        return NextResponse.json({ error: 'Failed to fetch billing records', details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/student-billing
 * Create new billing record(s)
 */
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const data = await request.json();

        // Extract user from auth header
        const authHeader = request.headers.get('authorization');
        let createdBy = data.createdBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                createdBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        if (!createdBy) {
            return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
        }

        // Validate required fields
        const requiredFields = ['studentId', 'schoolSiteId', 'academicYear', 'classId'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return NextResponse.json({ error: `${field} is required` }, { status: 400 });
            }
        }

        // Check if billing record already exists for this period
        const existingBilling = await StudentBilling.findOne({
            student: data.studentId,
            schoolSite: data.schoolSiteId,
            academicYear: data.academicYear,
            ...(data.academicTerm && { academicTerm: data.academicTerm }),
            ...(data.academicSemester && { academicSemester: data.academicSemester })
        });

        if (existingBilling) {
            return NextResponse.json({ error: 'A billing record already exists for this student and academic period' }, { status: 409 });
        }

        // Get fee configuration if provided or find matching one
        let termOrSemesterBill = data.termOrSemesterBill || 0;
        let feeBreakdown = data.feeBreakdown || [];
        let feeConfigurationId = data.feeConfigurationId;
        let paymentDueDate = data.paymentDueDate;

        if (data.feeConfigurationId) {
            const feeConfig = await FeesConfiguration.findById(data.feeConfigurationId).lean();
            if (feeConfig) {
                termOrSemesterBill = feeConfig.totalAmount;
                feeBreakdown = feeConfig.feeItems.map((item: any) => ({
                    determinant: item.determinant,
                    description: item.description,
                    amount: item.amount
                }));
                paymentDueDate = paymentDueDate || feeConfig.paymentDeadline;
            }
        } else {
            // Try to find matching fee configuration
            const feeConfig = await FeesConfiguration.findOne({
                site: data.schoolSiteId,
                class: data.classId,
                academicYear: data.academicYear,
                academicTerm: data.academicTerm,
                isActive: true
            }).lean();

            if (feeConfig) {
                termOrSemesterBill = feeConfig.totalAmount;
                feeBreakdown = feeConfig.feeItems.map((item: any) => ({
                    determinant: item.determinant,
                    description: item.description,
                    amount: item.amount
                }));
                feeConfigurationId = feeConfig._id;
                paymentDueDate = paymentDueDate || feeConfig.paymentDeadline;
            }
        }

        // Get balance brought forward
        let balanceBroughtForward = data.balanceBroughtForward || 0;

        // If carrying forward from previous period
        if (data.carryForwardFromId) {
            const previousBilling = await StudentBilling.findById(data.carryForwardFromId);
            if (previousBilling && previousBilling.currentBalance > 0) {
                balanceBroughtForward = previousBilling.currentBalance;
            }
        } else if (!data.balanceBroughtForward) {
            // Check for previous period balance
            const previousBilling = await StudentBilling.findOne({
                student: data.studentId,
                schoolSite: data.schoolSiteId,
                isCurrent: true
            }).sort({ academicYear: -1, academicTerm: -1 });

            if (previousBilling && previousBilling.currentBalance > 0) {
                balanceBroughtForward = previousBilling.currentBalance;
            }
        }

        // Get school from site
        // @ts-ignore
        const site = await SchoolSite.findById(data.schoolSiteId).lean();
        if (!site) {
            return NextResponse.json({ error: 'School site not found' }, { status: 404 });
        }

        // Mark previous billing as not current
        if (data.carryForwardFromId) {
            await StudentBilling.findByIdAndUpdate(data.carryForwardFromId, { isCurrent: false });
        }

        // Create billing record
        const billing = new StudentBilling({
            student: data.studentId,
            school: (site as any).school,
            schoolSite: data.schoolSiteId,
            academicYear: data.academicYear,
            academicPeriodType: data.academicPeriodType || 'term',
            academicTerm: data.academicTerm,
            academicSemester: data.academicSemester,
            class: data.classId,
            balanceBroughtForward,
            termOrSemesterBill,
            feeBreakdown,
            feeConfigurationId,
            paymentDueDate,
            currency: data.currency || 'GHS',
            createdBy,
            carriedForwardFrom: data.carryForwardFromId,
            auditTrail: [
                {
                    action: 'created',
                    performedBy: createdBy,
                    performedAt: new Date(),
                    details: `Billing record created for ${data.academicYear} ${data.academicTerm ? `Term ${data.academicTerm}` : `Semester ${data.academicSemester}`}`
                }
            ]
        });

        const savedBilling = await billing.save();

        // Update previous billing's carriedForwardTo
        if (data.carryForwardFromId) {
            await StudentBilling.findByIdAndUpdate(data.carryForwardFromId, {
                carriedForwardTo: savedBilling._id
            });
        }

        // Populate and return
        const populatedBilling = await StudentBilling.findById(savedBilling._id).populate('student', 'firstName lastName studentInfo.studentId').populate('schoolSite', 'siteName description').populate('class', 'className').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Billing record created successfully',
                billing: populatedBilling
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating billing record:', error);

        if (error.code === 11000) {
            return NextResponse.json({ error: 'A billing record already exists for this period' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create billing record', details: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'crud',
    actionType: 'create',
    entityType: 'billing',
    entityIdExtractor: (req, res) => res?.billing?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const billing = res?.billing;
        if (billing?.student) {
            return `${billing.student.firstName} ${billing.student.lastName} - ${billing.academicYear}`;
        }
        return undefined;
    }
});
