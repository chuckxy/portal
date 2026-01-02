import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Scholarship from '@/models/Scholarship';
import ScholarshipBody from '@/models/ScholarshipBody';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// GET - List scholarships with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const site = searchParams.get('site');
        const student = searchParams.get('student');
        const status = searchParams.get('status');
        const scholarshipType = searchParams.get('scholarshipType');

        // Build query
        const query: any = {};
        if (school) query.school = school;
        if (site) query.site = site;
        if (student) query.student = student;
        if (status) query.status = status;
        if (scholarshipType) query.scholarshipType = scholarshipType;

        const scholarships = await Scholarship.find(query)
            .populate('student', 'firstName lastName studentId')
            .populate('school', 'name')
            .populate('site', 'siteName')
            .populate('scholarshipBodies', 'name contactPerson contactEmail')
            .populate('grants.scholarshipBody', 'name')
            .populate('usage.approvedBy', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .sort({ dateStart: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            scholarships,
            count: scholarships.length
        });
    } catch (error: any) {
        console.error('Error fetching scholarships:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scholarships', details: error.message }, { status: 500 });
    }
}

// POST - Create new scholarship
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();

        // Validation
        if (!body.student) {
            return NextResponse.json({ success: false, error: 'Student is required' }, { status: 400 });
        }
        if (!body.school) {
            return NextResponse.json({ success: false, error: 'School is required' }, { status: 400 });
        }
        if (!body.site) {
            return NextResponse.json({ success: false, error: 'Site is required' }, { status: 400 });
        }
        if (!body.scholarshipBodies || !Array.isArray(body.scholarshipBodies) || body.scholarshipBodies.length === 0) {
            return NextResponse.json({ success: false, error: 'At least one scholarship body is required' }, { status: 400 });
        }
        if (!body.dateStart) {
            return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
        }
        if (!body.createdBy) {
            return NextResponse.json({ success: false, error: 'Created by is required' }, { status: 400 });
        }
        if (!body.grants || body.grants.length === 0) {
            return NextResponse.json({ success: false, error: 'At least one grant is required' }, { status: 400 });
        }

        // Validate that each grant has a scholarshipBody
        for (const grant of body.grants) {
            if (!grant.scholarshipBody) {
                return NextResponse.json({ success: false, error: 'Each grant must have a scholarship body' }, { status: 400 });
            }
            if (!body.scholarshipBodies.includes(grant.scholarshipBody)) {
                return NextResponse.json({ success: false, error: 'Grant scholarship body must be from the scholarship bodies list' }, { status: 400 });
            }
        }

        // Create scholarship
        const scholarship = new Scholarship({
            student: body.student,
            school: body.school,
            site: body.site,
            scholarshipType: body.scholarshipType || 'partial',
            scholarshipBodies: body.scholarshipBodies,
            grants: body.grants,
            dateStart: new Date(body.dateStart),
            dateEnd: body.dateEnd ? new Date(body.dateEnd) : undefined,
            status: body.status || 'active',
            conditions: body.conditions || undefined,
            documents: body.documents || [],
            createdBy: body.createdBy
        });

        await scholarship.save();

        // Populate references before returning
        await scholarship.populate([
            { path: 'student', select: 'firstName lastName studentId' },
            { path: 'school', select: 'name' },
            { path: 'site', select: 'siteName' },
            { path: 'scholarshipBodies', select: 'name contactPerson contactEmail' },
            { path: 'grants.scholarshipBody', select: 'name' },
            { path: 'usage.approvedBy', select: 'firstName lastName' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(
            {
                success: true,
                message: 'Scholarship created successfully',
                scholarship
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating scholarship:', error);
        return NextResponse.json({ success: false, error: 'Failed to create scholarship', details: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'sensitive',
    actionType: 'scholarship_award',
    entityType: 'scholarship',
    entityIdExtractor: (req, res) => res?.scholarship?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const scholarship = res?.scholarship;
        return `${scholarship?.student?.firstName || ''} ${scholarship?.student?.lastName || ''} - ${scholarship?.scholarshipType || ''}`;
    },
    gdprRelevant: true
});
