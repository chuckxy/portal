import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryItem: any;
let SchoolSite: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// POST /api/library-items/[id]/adjust-stock - Adjust inventory stock for a site
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library item ID' }, { status: 400 });
        }

        const body = await request.json();
        const { siteId, adjustmentType, quantity, remarks } = body;

        // Validate required fields
        if (!siteId || !adjustmentType || !quantity || quantity <= 0) {
            return NextResponse.json({ success: false, message: 'Missing or invalid required fields' }, { status: 400 });
        }

        // Validate adjustment type
        const validTypes = ['addition', 'removal', 'damage', 'loss', 'donation'];
        if (!validTypes.includes(adjustmentType)) {
            return NextResponse.json({ success: false, message: 'Invalid adjustment type' }, { status: 400 });
        }

        const libraryItem = await LibraryItem.findById(id);

        if (!libraryItem) {
            return NextResponse.json({ success: false, message: 'Library item not found' }, { status: 404 });
        }

        // Get site to retrieve school information
        const site = await SchoolSite.findById(siteId);
        if (!site) {
            return NextResponse.json({ success: false, message: 'Site not found' }, { status: 404 });
        }

        // Find or create site inventory
        let siteInventory = libraryItem.siteInventory.find((inv: any) => inv.site.toString() === siteId);

        if (!siteInventory) {
            // Create new site inventory
            siteInventory = {
                site: siteId,
                school: site.school, // Get school from site document
                quantity: 0,
                availableQuantity: 0,
                location: body.location,
                shelfNumber: body.shelfNumber,
                dateAdded: new Date(),
                stockAdjustments: []
            };
            libraryItem.siteInventory.push(siteInventory);
            siteInventory = libraryItem.siteInventory[libraryItem.siteInventory.length - 1];
        }

        // Calculate quantity change based on adjustment type
        let quantityChange = 0;
        let availableChange = 0;

        switch (adjustmentType) {
            case 'addition':
            case 'donation':
                quantityChange = quantity;
                availableChange = quantity;
                break;
            case 'removal':
            case 'damage':
            case 'loss':
                quantityChange = -quantity;
                availableChange = -quantity;
                break;
        }

        // Validate that removal doesn't exceed available quantity
        if (quantityChange < 0) {
            const newAvailableQty = siteInventory.availableQuantity + availableChange;
            if (newAvailableQty < 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Cannot remove ${quantity} items. Only ${siteInventory.availableQuantity} available.`
                    },
                    { status: 400 }
                );
            }
        }

        // Update quantities
        siteInventory.quantity += quantityChange;
        siteInventory.availableQuantity += availableChange;

        // Ensure quantities don't go negative
        if (siteInventory.quantity < 0) siteInventory.quantity = 0;
        if (siteInventory.availableQuantity < 0) siteInventory.availableQuantity = 0;

        // Add stock adjustment record
        const stockAdjustment = {
            adjustmentType,
            quantity: Math.abs(quantity),
            remarks,
            adjustedBy: body.adjustedBy || new mongoose.Types.ObjectId(), // Should come from auth context
            date: new Date()
        };

        siteInventory.stockAdjustments.push(stockAdjustment);

        // Save the updated item
        await libraryItem.save();

        // Populate and return with virtuals
        const updatedItem = await LibraryItem.findById(id).populate('siteInventory.site', 'siteName code').populate('siteInventory.school', 'name');

        const itemObj = updatedItem.toObject();
        // Calculate virtuals
        itemObj.totalQuantity = updatedItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        itemObj.totalAvailable = updatedItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.availableQuantity || 0), 0);

        return NextResponse.json({
            success: true,
            message: 'Stock adjusted successfully',
            libraryItem: itemObj
        });
    } catch (error: any) {
        console.error('Error adjusting stock:', error);
        return NextResponse.json({ success: false, message: 'Failed to adjust stock', error: error.message }, { status: 500 });
    }
}
