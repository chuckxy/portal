import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesPayment from '@/models/FeesPayment';
import Person from '@/models/Person';
import SchoolSite from '@/models/SchoolSite';
import SiteClass from '@/models/SiteClass';
import Scholarship from '@/models/Scholarship';
import { withActivityLogging, logSensitiveAction } from '@/lib/middleware/activityLogging';

// GET /api/fees-payments - List all payments with filters and pagination
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;

        // Pagination
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = page * limit;

        // Sorting
        const sortField = searchParams.get('sortField') || 'datePaid';
        const sortOrderParam = parseInt(searchParams.get('sortOrder') || '-1');
        const sortOrder: 1 | -1 = sortOrderParam >= 0 ? 1 : -1;

        // Filters
        const filters: any = {};

        if (searchParams.get('search')) {
            const search = searchParams.get('search');
            // Search in receipt number or student info
            filters.$or = [{ receiptNumber: { $regex: search, $options: 'i' } }, { paymentReference: { $regex: search, $options: 'i' } }];
        }

        if (searchParams.get('status')) {
            filters.status = searchParams.get('status');
        }

        if (searchParams.get('paymentMethod')) {
            filters.paymentMethod = searchParams.get('paymentMethod');
        }

        if (searchParams.get('siteId')) {
            filters.site = searchParams.get('siteId');
        }

        if (searchParams.get('academicYear')) {
            filters.academicYear = searchParams.get('academicYear');
        }

        if (searchParams.get('academicTerm')) {
            filters.academicTerm = parseInt(searchParams.get('academicTerm') as string);
        }

        if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
            filters.datePaid = {};
            if (searchParams.get('dateFrom')) {
                filters.datePaid.$gte = new Date(searchParams.get('dateFrom') as string);
            }
            if (searchParams.get('dateTo')) {
                filters.datePaid.$lte = new Date(searchParams.get('dateTo') as string);
            }
        }

        if (searchParams.get('minAmount') || searchParams.get('maxAmount')) {
            filters.amountPaid = {};
            if (searchParams.get('minAmount')) {
                filters.amountPaid.$gte = parseFloat(searchParams.get('minAmount') as string);
            }
            if (searchParams.get('maxAmount')) {
                filters.amountPaid.$lte = parseFloat(searchParams.get('maxAmount') as string);
            }
        }

        // Execute query
        const [payments, total] = await Promise.all([
            FeesPayment.find(filters)
                .populate('student', 'firstName lastName studentId')
                .populate('site', 'name')
                .populate('class', 'name')
                .populate('receivedBy', 'firstName lastName')
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            FeesPayment.countDocuments(filters)
        ]);

        return NextResponse.json({
            payments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }
}

// POST /api/fees-payments - Create new payment
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const data = await request.json();

        // Get authenticated user from token
        const authHeader = request.headers.get('authorization');
        let receivedBy = data.receivedBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                // Extract user ID from token (assuming JWT with user info)
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                receivedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        // Validate required fields
        const requiredFields = ['studentId', 'siteId', 'classId', 'academicYear', 'amountPaid', 'currency', 'paymentMethod', 'datePaid'];

        for (const field of requiredFields) {
            if (!data[field]) {
                return NextResponse.json({ error: `${field} is required` }, { status: 400 });
            }
        }

        if (!receivedBy) {
            return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
        }

        // Check for duplicate reference
        if (data.paymentReference) {
            const existing = await FeesPayment.findOne({
                paymentReference: data.paymentReference
            });

            if (existing) {
                return NextResponse.json({ error: 'This payment reference already exists' }, { status: 400 });
            }
        }

        // Check for potential duplicate (same student, amount, date within 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const potentialDuplicate = await FeesPayment.findOne({
            student: data.studentId,
            amountPaid: data.amountPaid,
            datePaid: { $gte: fiveMinutesAgo },
            status: { $ne: 'reversed' }
        });

        if (potentialDuplicate) {
            return NextResponse.json(
                {
                    error: 'Potential duplicate payment detected',
                    duplicate: potentialDuplicate
                },
                { status: 409 }
            );
        }

        // Create payment
        const payment = new FeesPayment({
            student: data.studentId,
            site: data.siteId,
            class: data.classId,
            academicYear: data.academicYear,
            academicTerm: data.academicTerm,
            amountPaid: data.amountPaid,
            currency: data.currency,
            paymentMethod: data.paymentMethod,
            paymentReference: data.paymentReference,
            transactionId: data.transactionId,
            datePaid: new Date(data.datePaid),
            description: data.description,
            notes: data.notes,
            receivedBy: receivedBy,
            status: data.status || 'confirmed'
        });

        await payment.save();

        // If payment method is scholarship, record usage in student's scholarship
        if (data.paymentMethod === 'scholarship') {
            const activeScholarship = await Scholarship.findOne({
                student: data.studentId,
                status: 'active'
            });

            if (activeScholarship) {
                // Add usage entry
                activeScholarship.usage.push({
                    amount: data.amountPaid,
                    reason: `Fee payment - ${data.description || 'Academic fees'}`,
                    referenceNumber: payment.receiptNumber,
                    dateUsed: new Date(data.datePaid),
                    academicYear: data.academicYear,
                    academicTerm: data.academicTerm,
                    approvedBy: receivedBy
                });

                // Recalculate totals
                activeScholarship.calculateBalance();
                await activeScholarship.save();
            } else {
                console.warn(`No active scholarship found for student ${data.studentId}`);
            }
        }

        // Populate for response
        await payment.populate([
            { path: 'student', select: 'firstName lastName studentId' },
            { path: 'site', select: 'name' },
            { path: 'class', select: 'name' },
            { path: 'receivedBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(
            {
                success: true,
                payment,
                receiptNumber: payment.receiptNumber
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating payment:', error);
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'sensitive',
    actionType: 'payment_process',
    entityType: 'fees_payment',
    entityIdExtractor: (req, res) => res?.payment?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const payment = res?.payment;
        return `${payment?.student?.firstName || ''} ${payment?.student?.lastName || ''} - ${payment?.amountPaid || 0} ${payment?.currency || ''}`;
    },
    gdprRelevant: true
});

// DELETE /api/fees-payments - Delete a payment
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('id');

        if (!paymentId) {
            return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
        }

        // Find the payment first to check if it was scholarship
        const payment = await FeesPayment.findById(paymentId);

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // If payment was made via scholarship, remove the usage from scholarship
        if (payment.paymentMethod === 'scholarship') {
            const scholarship = await Scholarship.findOne({
                student: payment.student,
                status: 'active'
            });

            if (scholarship) {
                // Find and remove the usage entry that matches this payment
                const usageIndex = scholarship.usage.findIndex((u: any) => u.referenceNumber === payment.receiptNumber);

                if (usageIndex !== -1) {
                    scholarship.usage.splice(usageIndex, 1);
                    // Recalculate balance
                    scholarship.calculateBalance();
                    await scholarship.save();
                }
            }
        }

        // Delete the payment
        await FeesPayment.findByIdAndDelete(paymentId);

        return NextResponse.json(
            {
                success: true,
                message: 'Payment deleted successfully'
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting payment:', error);
        return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
    }
}

// PUT /api/fees-payments - Update a payment
export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('id');

        if (!paymentId) {
            return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
        }

        const data = await request.json();

        // Find the existing payment
        const existingPayment = await FeesPayment.findById(paymentId);

        if (!existingPayment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Get auth token for tracking who modified
        const authHeader = request.headers.get('authorization');
        let modifiedBy = data.modifiedBy;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                modifiedBy = payload.userId || payload.id || payload._id;
            } catch (err) {
                console.error('Error parsing auth token:', err);
            }
        }

        // Handle scholarship payment changes
        const oldAmount = existingPayment.amountPaid;
        const newAmount = data.amountPaid !== undefined ? data.amountPaid : oldAmount;
        const oldMethod = existingPayment.paymentMethod;
        const newMethod = data.paymentMethod || oldMethod;

        // If it was a scholarship payment, we need to update the scholarship usage
        if (oldMethod === 'scholarship' || newMethod === 'scholarship') {
            const scholarship = await Scholarship.findOne({
                student: existingPayment.student,
                status: 'active'
            });

            if (scholarship) {
                // Find the usage entry by receipt number
                const usageIndex = scholarship.usage.findIndex((u: any) => u.referenceNumber === existingPayment.receiptNumber);

                if (oldMethod === 'scholarship' && newMethod !== 'scholarship') {
                    // Changed from scholarship to another method - remove usage
                    if (usageIndex !== -1) {
                        scholarship.usage.splice(usageIndex, 1);
                    }
                } else if (oldMethod !== 'scholarship' && newMethod === 'scholarship') {
                    // Changed to scholarship - add usage
                    scholarship.usage.push({
                        amount: newAmount,
                        reason: `Fee payment - ${data.description || 'Academic fees'}`,
                        referenceNumber: existingPayment.receiptNumber,
                        dateUsed: data.datePaid ? new Date(data.datePaid) : existingPayment.datePaid,
                        academicYear: data.academicYear || existingPayment.academicYear,
                        academicTerm: data.academicTerm || existingPayment.academicTerm,
                        approvedBy: modifiedBy
                    });
                } else if (oldMethod === 'scholarship' && newMethod === 'scholarship') {
                    // Still scholarship but amount or details changed - update usage
                    if (usageIndex !== -1) {
                        scholarship.usage[usageIndex].amount = newAmount;
                        scholarship.usage[usageIndex].reason = `Fee payment - ${data.description || 'Academic fees'}`;
                        scholarship.usage[usageIndex].dateUsed = data.datePaid ? new Date(data.datePaid) : existingPayment.datePaid;
                        scholarship.usage[usageIndex].academicYear = data.academicYear || existingPayment.academicYear;
                        scholarship.usage[usageIndex].academicTerm = data.academicTerm || existingPayment.academicTerm;
                    }
                }

                scholarship.calculateBalance();
                await scholarship.save();
            }
        }

        // Update the payment
        const updateFields: any = {};
        if (data.amountPaid !== undefined) updateFields.amountPaid = data.amountPaid;
        if (data.paymentMethod !== undefined) updateFields.paymentMethod = data.paymentMethod;
        if (data.paymentReference !== undefined) updateFields.paymentReference = data.paymentReference;
        if (data.transactionId !== undefined) updateFields.transactionId = data.transactionId;
        if (data.datePaid !== undefined) updateFields.datePaid = new Date(data.datePaid);
        if (data.description !== undefined) updateFields.description = data.description;
        if (data.notes !== undefined) updateFields.notes = data.notes;
        if (data.status !== undefined) updateFields.status = data.status;

        // Add modification history
        if (!existingPayment.modifyHistory) {
            existingPayment.modifyHistory = [];
        }

        existingPayment.modifyHistory.push({
            modifiedBy: modifiedBy,
            modifiedAt: new Date(),
            changes: updateFields,
            reason: data.modificationReason || 'Payment updated'
        });

        // Update fields
        Object.assign(existingPayment, updateFields);
        await existingPayment.save();

        // Populate for response
        await existingPayment.populate([
            { path: 'student', select: 'firstName lastName studentId' },
            { path: 'site', select: 'name' },
            { path: 'class', select: 'name' },
            { path: 'receivedBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(
            {
                success: true,
                payment: existingPayment,
                message: 'Payment updated successfully'
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error updating payment:', error);
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }
}
