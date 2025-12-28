import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import DailyFeeCollection from '@/models/DailyFeeCollection';
import Person from '@/models/Person';
import SchoolSite from '@/models/SchoolSite';
import School from '@/models/School';

// GET /api/daily-fee-collections - List all collections with filters
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

        if (searchParams.get('academicYear')) {
            filters.academicYear = searchParams.get('academicYear');
        }

        if (searchParams.get('academicTerm')) {
            filters.academicTerm = parseInt(searchParams.get('academicTerm') as string);
        }

        if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
            filters.collectionDate = {};
            if (searchParams.get('dateFrom')) {
                filters.collectionDate.$gte = new Date(searchParams.get('dateFrom') as string);
            }
            if (searchParams.get('dateTo')) {
                filters.collectionDate.$lte = new Date(searchParams.get('dateTo') as string);
            }
        }

        // Execute query
        const collections = await DailyFeeCollection.find(filters).populate('school', 'name').populate('site', 'description school').populate('recordedBy', 'firstName lastName').sort({ collectionDate: -1 }).lean();

        // Calculate virtual fields
        const collectionsWithVirtuals = collections.map((collection: any) => ({
            ...collection,
            totalDailyCollection: collection.canteenFeeAmount + collection.busFeeAmount,
            attendancePercentage: collection.totalStudents > 0 ? (collection.totalStudentsPresent / collection.totalStudents) * 100 : 0
        }));

        return NextResponse.json({
            collections: collectionsWithVirtuals,
            total: collections.length
        });
    } catch (error) {
        console.error('Error fetching daily fee collections:', error);
        return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }
}

// POST /api/daily-fee-collections - Create new collection
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Extract auth token to get user
        const authHeader = request.headers.get('Authorization');
        let recordedBy = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Decode token to get user ID - simplified version
            // In production, properly verify JWT
            try {
                const base64Payload = token.split('.')[1];
                const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
                recordedBy = payload.userId || payload.id || payload.sub;
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // Validate required fields
        if (!body.school || !body.site) {
            return NextResponse.json({ error: 'School and site are required' }, { status: 400 });
        }

        if (!body.collectionDate) {
            return NextResponse.json({ error: 'Collection date is required' }, { status: 400 });
        }

        if (body.totalStudentsPresent > body.totalStudents) {
            return NextResponse.json({ error: 'Students present cannot exceed total students' }, { status: 400 });
        }

        // Check for duplicate entry (same site and date)
        const existing = await DailyFeeCollection.findOne({
            site: body.site,
            collectionDate: {
                $gte: new Date(new Date(body.collectionDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(body.collectionDate).setHours(23, 59, 59, 999))
            }
        });

        if (existing) {
            return NextResponse.json(
                {
                    error: 'A collection record already exists for this site on this date. Please edit the existing record or choose a different date.'
                },
                { status: 400 }
            );
        }

        // Create collection data
        const collectionData = {
            school: body.school,
            site: body.site,
            academicYear: body.academicYear || '2024/2025',
            academicTerm: body.academicTerm || 1,
            collectionDate: new Date(body.collectionDate),
            canteenFeeAmount: body.canteenFeeAmount || 0,
            busFeeAmount: body.busFeeAmount || 0,
            totalStudents: body.totalStudents || 0,
            totalStudentsPresent: body.totalStudentsPresent || 0,
            totalAbsent: (body.totalStudents || 0) - (body.totalStudentsPresent || 0),
            currency: body.currency || 'GHS',
            notes: body.notes,
            recordedBy: recordedBy
        };

        const collection = await DailyFeeCollection.create(collectionData);

        // Populate references for response
        await collection.populate('school', 'name');
        await collection.populate('site', 'description');
        await collection.populate('recordedBy', 'firstName lastName');

        return NextResponse.json(
            {
                message: 'Collection recorded successfully',
                collection
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating daily fee collection:', error);
        if (error.code === 11000) {
            return NextResponse.json({ error: 'A collection already exists for this site on this date' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
    }
}

// PUT /api/daily-fee-collections - Update existing collection
export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
        }

        const body = await request.json();

        // Validate
        if (body.totalStudentsPresent > body.totalStudents) {
            return NextResponse.json({ error: 'Students present cannot exceed total students' }, { status: 400 });
        }

        // Find existing collection
        const collection = await DailyFeeCollection.findById(id);

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        // Check for duplicate if date or site changed
        if (body.collectionDate || body.site) {
            const checkDate = body.collectionDate ? new Date(body.collectionDate) : collection.collectionDate;
            const checkSite = body.site || collection.site;

            const duplicate = await DailyFeeCollection.findOne({
                _id: { $ne: id },
                site: checkSite,
                collectionDate: {
                    $gte: new Date(checkDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(checkDate.setHours(23, 59, 59, 999))
                }
            });

            if (duplicate) {
                return NextResponse.json({ error: 'A collection already exists for this site on this date' }, { status: 400 });
            }
        }

        // Update fields
        if (body.school !== undefined) collection.school = body.school;
        if (body.site !== undefined) collection.site = body.site;
        if (body.academicYear !== undefined) collection.academicYear = body.academicYear;
        if (body.academicTerm !== undefined) collection.academicTerm = body.academicTerm;
        if (body.collectionDate !== undefined) collection.collectionDate = new Date(body.collectionDate);
        if (body.canteenFeeAmount !== undefined) collection.canteenFeeAmount = body.canteenFeeAmount;
        if (body.busFeeAmount !== undefined) collection.busFeeAmount = body.busFeeAmount;
        if (body.totalStudents !== undefined) collection.totalStudents = body.totalStudents;
        if (body.totalStudentsPresent !== undefined) collection.totalStudentsPresent = body.totalStudentsPresent;
        if (body.currency !== undefined) collection.currency = body.currency;
        if (body.notes !== undefined) collection.notes = body.notes;

        await collection.save();

        // Populate references for response
        await collection.populate('school', 'name');
        await collection.populate('site', 'description');
        await collection.populate('recordedBy', 'firstName lastName');

        return NextResponse.json({
            message: 'Collection updated successfully',
            collection
        });
    } catch (error) {
        console.error('Error updating daily fee collection:', error);
        return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
    }
}

// DELETE /api/daily-fee-collections - Delete collection
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
        }

        const collection = await DailyFeeCollection.findByIdAndDelete(id);

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Collection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting daily fee collection:', error);
        return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
    }
}
