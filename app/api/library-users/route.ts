import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryUser: any;
let Person: any;
let SchoolSite: any;

try {
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/library-users - Fetch all library users with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const site = searchParams.get('site');
        const status = searchParams.get('status');
        const membershipType = searchParams.get('membershipType');
        const search = searchParams.get('search');

        const filter: any = {};

        if (site) filter.site = site;
        if (status) filter.status = status;
        if (membershipType) filter.membershipType = membershipType;

        // Search by library card number or user name
        if (search) {
            const users = await Person.find({
                $or: [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }]
            }).select('_id');

            filter.$or = [{ libraryCardNumber: { $regex: search, $options: 'i' } }, { user: { $in: users.map((u: any) => u._id) } }];
        }

        const libraryUsers = await LibraryUser.find(filter).populate('user', 'firstName lastName email contact personCategory').populate('site', 'siteName code').sort({ createdAt: -1 }).lean();

        return NextResponse.json(libraryUsers);
    } catch (error: any) {
        console.error('Error fetching library users:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch library users', error: error.message }, { status: 500 });
    }
}

// POST /api/library-users - Create a new library user
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validate required fields
        if (!body.user || !body.site) {
            return NextResponse.json({ success: false, message: 'Missing required fields: user, site' }, { status: 400 });
        }

        // Check if user exists
        const userExists = await Person.findById(body.user);
        if (!userExists) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Check if site exists
        const siteExists = await SchoolSite.findById(body.site);
        if (!siteExists) {
            return NextResponse.json({ success: false, message: 'Site not found' }, { status: 404 });
        }

        // Check if library user already exists for this user and site
        const existingLibraryUser = await LibraryUser.findOne({
            user: body.user,
            site: body.site
        });

        if (existingLibraryUser) {
            return NextResponse.json({ success: false, message: 'Library user already exists for this user and site' }, { status: 400 });
        }

        // Create new library user
        const libraryUser = new LibraryUser({
            user: body.user,
            site: body.site,
            status: body.status || 'active',
            membershipType: body.membershipType || 'student',
            borrowingLimit: body.borrowingLimit || 3,
            borrowingPeriodDays: body.borrowingPeriodDays || 14,
            notes: body.notes,
            expiryDate: body.expiryDate,
            currentBorrowings: [],
            borrowingHistory: [],
            totalBorrowings: 0,
            activeBorrowingsCount: 0,
            overdueFines: 0
        });

        await libraryUser.save();

        // Populate before returning
        const populatedLibraryUser = await LibraryUser.findById(libraryUser._id).populate('user', 'firstName lastName email contact').populate('site', 'siteName code').lean();

        return NextResponse.json({ success: true, libraryUser: populatedLibraryUser }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to create library user', error: error.message }, { status: 500 });
    }
}
