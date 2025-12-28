import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesConfiguration from '@/models/FeesConfiguration';

// GET - List fee configurations with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const site = searchParams.get('site');
        const classId = searchParams.get('class');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const isActive = searchParams.get('isActive');

        // Build query
        const query: any = {};
        if (site) query.site = site;
        if (classId) query.class = classId;
        if (academicYear) query.academicYear = academicYear;
        if (academicTerm) query.academicTerm = parseInt(academicTerm);
        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const feeConfigurations = await FeesConfiguration.find(query).populate('site', 'siteName').populate('class', 'className division').populate('createdBy', 'firstName lastName').sort({ academicYear: -1, academicTerm: -1 }).lean();

        return NextResponse.json({
            success: true,
            feeConfigurations,
            count: feeConfigurations.length
        });
    } catch (error: any) {
        console.error('Error fetching fee configurations:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch fee configurations', details: error.message }, { status: 500 });
    }
}

// POST - Create new fee configuration
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validation
        if (!body.site) {
            return NextResponse.json({ success: false, error: 'Site is required' }, { status: 400 });
        }
        if (!body.class) {
            return NextResponse.json({ success: false, error: 'Class is required' }, { status: 400 });
        }
        if (!body.academicYear) {
            return NextResponse.json({ success: false, error: 'Academic year is required' }, { status: 400 });
        }
        if (!body.academicTerm) {
            return NextResponse.json({ success: false, error: 'Academic term is required' }, { status: 400 });
        }
        if (!body.feeItems || body.feeItems.length === 0) {
            return NextResponse.json({ success: false, error: 'At least one fee item is required' }, { status: 400 });
        }
        if (!body.createdBy) {
            return NextResponse.json({ success: false, error: 'Creator is required' }, { status: 400 });
        }

        // Check for duplicate configuration
        const existingConfig = await FeesConfiguration.findOne({
            site: body.site,
            class: body.class,
            academicYear: body.academicYear,
            academicTerm: body.academicTerm
        });

        if (existingConfig) {
            return NextResponse.json({ success: false, error: 'A fee configuration already exists for this class, year, and term' }, { status: 409 });
        }

        // Calculate total amount if not provided
        let totalAmount = body.totalAmount;
        if (!totalAmount && body.feeItems) {
            totalAmount = body.feeItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        }

        // Create fee configuration
        const feeConfiguration = new FeesConfiguration({
            site: body.site,
            class: body.class,
            academicYear: body.academicYear,
            academicTerm: body.academicTerm,
            configName: body.configName || undefined,
            feeItems: body.feeItems,
            totalAmount,
            currency: body.currency || 'GHS',
            paymentDeadline: body.paymentDeadline || undefined,
            installmentAllowed: body.installmentAllowed !== undefined ? body.installmentAllowed : true,
            createdBy: body.createdBy,
            isActive: body.isActive !== undefined ? body.isActive : true
        });

        await feeConfiguration.save();

        // Populate references
        await feeConfiguration.populate([
            { path: 'site', select: 'siteName' },
            { path: 'class', select: 'className division' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(
            {
                success: true,
                feeConfiguration,
                message: 'Fee configuration created successfully'
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating fee configuration:', error);
        return NextResponse.json({ success: false, error: 'Failed to create fee configuration', details: error.message }, { status: 500 });
    }
}
