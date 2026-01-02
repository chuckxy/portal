import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Expenditure from '@/models/Expenditure';
import Person from '@/models/Person';
import SchoolSite from '@/models/SchoolSite';
import School from '@/models/School';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// GET /api/expenditures - List all expenditures with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;

        // Filters
        const filters: any = {};

        if (searchParams.get('site')) {
            filters.site = searchParams.get('site');
        }

        if (searchParams.get('school')) {
            filters.school = searchParams.get('school');
        }

        if (searchParams.get('category')) {
            filters.category = searchParams.get('category');
        }

        if (searchParams.get('status')) {
            filters.status = searchParams.get('status');
        }

        if (searchParams.get('academicYear')) {
            filters.academicYear = searchParams.get('academicYear');
        }

        if (searchParams.get('academicTerm')) {
            filters.academicTerm = parseInt(searchParams.get('academicTerm') as string);
        }

        if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
            filters.expenditureDate = {};
            if (searchParams.get('dateFrom')) {
                filters.expenditureDate.$gte = new Date(searchParams.get('dateFrom') as string);
            }
            if (searchParams.get('dateTo')) {
                filters.expenditureDate.$lte = new Date(searchParams.get('dateTo') as string);
            }
        }

        // Amount range filter
        if (searchParams.get('minAmount') || searchParams.get('maxAmount')) {
            filters.amount = {};
            if (searchParams.get('minAmount')) {
                filters.amount.$gte = parseFloat(searchParams.get('minAmount') as string);
            }
            if (searchParams.get('maxAmount')) {
                filters.amount.$lte = parseFloat(searchParams.get('maxAmount') as string);
            }
        }

        // Vendor filter
        if (searchParams.get('vendor')) {
            filters.vendor = { $regex: searchParams.get('vendor'), $options: 'i' };
        }

        // Execute query
        const expenditures = await Expenditure.find(filters)
            .populate('school', 'name')
            .populate('site', 'description school')
            .populate('requestedBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email')
            .populate('paidBy', 'firstName lastName email')
            .sort({ expenditureDate: -1, createdAt: -1 })
            .lean();

        // Calculate virtual fields
        const expendituresWithVirtuals = expenditures.map((expenditure: any) => {
            // Category display
            const categoryMap: Record<string, string> = {
                salaries_wages: 'Salaries & Wages',
                utilities: 'Utilities',
                supplies: 'Supplies',
                maintenance: 'Maintenance & Repairs',
                transportation: 'Transportation',
                food_canteen: 'Food & Canteen',
                equipment: 'Equipment',
                infrastructure: 'Infrastructure',
                insurance: 'Insurance',
                taxes_fees: 'Taxes & Fees',
                marketing: 'Marketing & Recruitment',
                professional_services: 'Professional Services',
                staff_development: 'Staff Development',
                student_activities: 'Student Activities',
                library: 'Library & Resources',
                technology: 'Technology & IT',
                other: 'Other'
            };

            // Status display
            const statusMap: Record<string, string> = {
                pending: 'Pending Approval',
                approved: 'Approved',
                paid: 'Paid',
                rejected: 'Rejected',
                cancelled: 'Cancelled'
            };

            return {
                ...expenditure,
                categoryDisplay: categoryMap[expenditure.category] || expenditure.category,
                statusDisplay: statusMap[expenditure.status] || expenditure.status,
                paymentPending: expenditure.status === 'approved' && !expenditure.paymentDate
            };
        });

        return NextResponse.json({
            expenditures: expendituresWithVirtuals,
            total: expenditures.length
        });
    } catch (error) {
        console.error('Error fetching expenditures:', error);
        return NextResponse.json({ error: 'Failed to fetch expenditures' }, { status: 500 });
    }
}

// POST /api/expenditures - Create new expenditure
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();

        // Extract auth token to get user
        const authHeader = request.headers.get('Authorization');
        let requestedBy = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Decode token to get user ID
            try {
                const base64Payload = token.split('.')[1];
                const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
                requestedBy = payload.userId || payload.id || payload.sub;
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // Validate required fields
        if (!body.school || !body.site) {
            return NextResponse.json({ error: 'School and site are required' }, { status: 400 });
        }

        if (!body.expenditureDate) {
            return NextResponse.json({ error: 'Expenditure date is required' }, { status: 400 });
        }

        if (!body.category) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 });
        }

        if (!body.amount || body.amount <= 0) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        if (!body.description || !body.description.trim()) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        // Create expenditure data
        const expenditureData = {
            ...body,
            requestedBy,
            status: body.status || 'pending'
        };

        const expenditure = new Expenditure(expenditureData);
        await expenditure.save();

        // Populate references for response
        await expenditure.populate([
            { path: 'school', select: 'name' },
            { path: 'site', select: 'description school' },
            { path: 'requestedBy', select: 'firstName lastName email' }
        ]);

        return NextResponse.json({
            message: 'Expenditure created successfully',
            expenditure
        });
    } catch (error: any) {
        console.error('Error creating expenditure:', error);

        // Handle duplicate error
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Duplicate expenditure detected' }, { status: 400 });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors)
                .map((err: any) => err.message)
                .join(', ');
            return NextResponse.json({ error: messages }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to create expenditure' }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'sensitive',
    actionType: 'create',
    entityType: 'expenditure',
    entityIdExtractor: (req, res) => res?.expenditure?._id?.toString(),
    entityNameExtractor: (req, res) => `${res?.expenditure?.category || ''} - ${res?.expenditure?.amount || 0}`,
    gdprRelevant: false
});

// PUT /api/expenditures - Update existing expenditure
const putHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Expenditure ID is required' }, { status: 400 });
        }

        const body = await request.json();

        // Extract auth token to get user
        const authHeader = request.headers.get('Authorization');
        let userId = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const base64Payload = token.split('.')[1];
                const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
                userId = payload.userId || payload.id || payload.sub;
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // Get existing expenditure
        const existingExpenditure = await Expenditure.findById(id);

        if (!existingExpenditure) {
            return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 });
        }

        // Build update data
        const updateData: any = { ...body };

        // Handle status changes with workflow tracking
        if (body.status && body.status !== existingExpenditure.status) {
            if (body.status === 'approved') {
                updateData.approvedBy = userId;
                updateData.approvalDate = body.approvalDate || new Date();
            } else if (body.status === 'paid') {
                updateData.paidBy = userId;
                updateData.paymentDate = body.paymentDate || new Date();
            }
        }

        // Validate amount if provided
        if (body.amount !== undefined && body.amount <= 0) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        // Update expenditure
        const expenditure = await Expenditure.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        }).populate([
            { path: 'school', select: 'name' },
            { path: 'site', select: 'description school' },
            { path: 'requestedBy', select: 'firstName lastName email' },
            { path: 'approvedBy', select: 'firstName lastName email' },
            { path: 'paidBy', select: 'firstName lastName email' }
        ]);

        if (!expenditure) {
            return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Expenditure updated successfully',
            expenditure
        });
    } catch (error: any) {
        console.error('Error updating expenditure:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors)
                .map((err: any) => err.message)
                .join(', ');
            return NextResponse.json({ error: messages }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to update expenditure' }, { status: 500 });
    }
};

export const PUT = withActivityLogging(putHandler, {
    category: 'sensitive',
    actionType: 'update',
    entityType: 'expenditure',
    entityIdExtractor: (req, res) => res?.expenditure?._id?.toString(),
    entityNameExtractor: (req, res) => `${res?.expenditure?.category || ''} - ${res?.expenditure?.amount || 0}`,
    gdprRelevant: false
});

// DELETE /api/expenditures - Delete expenditure
const deleteHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Expenditure ID is required' }, { status: 400 });
        }

        // Check if expenditure exists
        const expenditure = await Expenditure.findById(id);

        if (!expenditure) {
            return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 });
        }

        // Prevent deletion of paid expenditures
        if (expenditure.status === 'paid') {
            return NextResponse.json({ error: 'Cannot delete paid expenditures' }, { status: 400 });
        }

        await Expenditure.findByIdAndDelete(id);

        return NextResponse.json({
            message: 'Expenditure deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting expenditure:', error);
        return NextResponse.json({ error: 'Failed to delete expenditure' }, { status: 500 });
    }
};

export const DELETE = withActivityLogging(deleteHandler, {
    category: 'sensitive',
    actionType: 'delete',
    entityType: 'expenditure',
    entityIdExtractor: (req) => {
        const url = new URL(req.url);
        return url.searchParams.get('id') || undefined;
    },
    gdprRelevant: false
});
