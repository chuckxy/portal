import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import FeesConfiguration from '@/models/FeesConfiguration';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET - Get single fee configuration by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const feeConfiguration = await FeesConfiguration.findById(id).populate('site', 'siteName').populate('class', 'className division').populate('createdBy', 'firstName lastName');

        if (!feeConfiguration) {
            return NextResponse.json({ success: false, error: 'Fee configuration not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            feeConfiguration
        });
    } catch (error: any) {
        console.error('Error fetching fee configuration:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch fee configuration', details: error.message }, { status: 500 });
    }
}

// PUT - Update fee configuration
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        // Find existing configuration
        const existingConfig = await FeesConfiguration.findById(id);
        if (!existingConfig) {
            return NextResponse.json({ success: false, error: 'Fee configuration not found' }, { status: 404 });
        }

        // Check for duplicate if key fields are being changed
        if (body.site || body.class || body.academicYear || body.academicTerm) {
            const siteId = body.site || existingConfig.site;
            const classId = body.class || existingConfig.class;
            const year = body.academicYear || existingConfig.academicYear;
            const term = body.academicTerm || existingConfig.academicTerm;

            const duplicate = await FeesConfiguration.findOne({
                _id: { $ne: id },
                site: siteId,
                class: classId,
                academicYear: year,
                academicTerm: term
            });

            if (duplicate) {
                return NextResponse.json({ success: false, error: 'A fee configuration already exists for this class, year, and term' }, { status: 409 });
            }
        }

        // Update fields
        if (body.site) existingConfig.site = body.site;
        if (body.class) existingConfig.class = body.class;
        if (body.academicYear) existingConfig.academicYear = body.academicYear;
        if (body.academicTerm) existingConfig.academicTerm = body.academicTerm;
        if (body.configName !== undefined) existingConfig.configName = body.configName || undefined;
        if (body.feeItems) existingConfig.feeItems = body.feeItems;
        if (body.currency) existingConfig.currency = body.currency;
        if (body.paymentDeadline !== undefined) existingConfig.paymentDeadline = body.paymentDeadline || undefined;
        if (body.installmentAllowed !== undefined) existingConfig.installmentAllowed = body.installmentAllowed;
        if (body.isActive !== undefined) existingConfig.isActive = body.isActive;

        // Recalculate total amount
        if (body.feeItems) {
            existingConfig.totalAmount = body.feeItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        } else if (body.totalAmount !== undefined) {
            existingConfig.totalAmount = body.totalAmount;
        }

        await existingConfig.save();

        // Populate references
        await existingConfig.populate([
            { path: 'site', select: 'siteName' },
            { path: 'class', select: 'className division' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json({
            success: true,
            feeConfiguration: existingConfig,
            message: 'Fee configuration updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating fee configuration:', error);
        return NextResponse.json({ success: false, error: 'Failed to update fee configuration', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete fee configuration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const feeConfiguration = await FeesConfiguration.findByIdAndDelete(id);

        if (!feeConfiguration) {
            return NextResponse.json({ success: false, error: 'Fee configuration not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Fee configuration deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting fee configuration:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete fee configuration', details: error.message }, { status: 500 });
    }
}
