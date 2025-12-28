import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryItem: any;
let SchoolSite: any;
let School: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    School = mongoose.models.School || require('@/models/School').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/library-items - Fetch all library items with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const site = searchParams.get('site');
        const itemType = searchParams.get('itemType');
        const category = searchParams.get('category');
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search');

        const filter: any = {};

        if (itemType) filter.itemType = itemType;
        if (category) filter.category = { $regex: category, $options: 'i' };
        if (isActive !== null && isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Filter by site if provided
        if (site) {
            filter['siteInventory.site'] = site;
        }

        // Full-text search
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subtitle: { $regex: search, $options: 'i' } },
                { isbn: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'authors.firstName': { $regex: search, $options: 'i' } },
                { 'authors.lastName': { $regex: search, $options: 'i' } },
                { subjects: { $regex: search, $options: 'i' } }
            ];
        }

        const libraryItems = await LibraryItem.find(filter).populate('siteInventory.site', 'siteName code').populate('siteInventory.school', 'name').sort({ createdAt: -1 });

        // Convert to plain objects with virtuals
        const itemsWithVirtuals = libraryItems.map((item) => {
            const obj = item.toObject();
            // Calculate virtuals manually
            obj.totalQuantity = item.siteInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
            obj.totalAvailable = item.siteInventory.reduce((sum: number, inv: any) => sum + (inv.availableQuantity || 0), 0);
            return obj;
        });

        return NextResponse.json(itemsWithVirtuals);
    } catch (error: any) {
        console.error('Error fetching library items:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch library items', error: error.message }, { status: 500 });
    }
}

// POST /api/library-items - Create a new library item
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validate required fields
        if (!body.title || !body.itemType) {
            return NextResponse.json({ success: false, message: 'Missing required fields: title, itemType' }, { status: 400 });
        }

        // Check if ISBN already exists (if provided)
        if (body.isbn) {
            const existingItem = await LibraryItem.findOne({ isbn: body.isbn });
            if (existingItem) {
                return NextResponse.json({ success: false, message: 'An item with this ISBN already exists' }, { status: 400 });
            }
        }

        // Create new library item
        const libraryItem = new LibraryItem({
            title: body.title,
            subtitle: body.subtitle,
            itemType: body.itemType,
            authors: body.authors || [],
            category: body.category,
            isbn: body.isbn,
            lccn: body.lccn,
            publisher: body.publisher,
            publicationDate: body.publicationDate,
            edition: body.edition,
            language: body.language || 'English',
            pages: body.pages,
            classification: body.classification || {},
            description: body.description,
            subjects: body.subjects || [],
            coverImagePath: body.coverImagePath,
            eBookLink: body.eBookLink,
            provider: body.provider || 'Local User Add',
            siteInventory: body.siteInventory || [],
            reviews: [],
            averageRating: 0,
            totalReviews: 0,
            isActive: body.isActive !== undefined ? body.isActive : true
        });

        await libraryItem.save();

        const populatedItem = await LibraryItem.findById(libraryItem._id).populate('siteInventory.site', 'siteName code').populate('siteInventory.school', 'name').lean();

        return NextResponse.json({ success: true, libraryItem: populatedItem }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating library item:', error);
        return NextResponse.json({ success: false, message: 'Failed to create library item', error: error.message }, { status: 500 });
    }
}
