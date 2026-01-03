import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import SiteClass from '@/models/SiteClass';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// GET all classes
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site');
        const departmentId = searchParams.get('department');

        let query: any = { isActive: true };

        if (siteId) query.site = siteId;
        if (departmentId) query.department = departmentId;

        const classes = await SiteClass.find(query)
            .populate('department', 'name')
            .populate('site', 'siteName')
            .populate('formMaster.teacher', 'firstName lastName')
            .populate('prefect', 'firstName lastName')
            .sort({ sequence: 1, division: 1 })
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            classes,
            count: classes.length
        });
    } catch (error: any) {
        console.error('Error fetching classes:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch classes', error: error.message }, { status: 500 });
    }
}

// POST create a new class
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();
        const { site, department, division, sequence, className, prefect, classLimit, formMaster, subjects, isActive } = body;

        // Validate required fields
        if (!site || !division || !sequence) {
            return NextResponse.json({ success: false, message: 'Site, division, and sequence are required' }, { status: 400 });
        }

        if (sequence < 1) {
            return NextResponse.json({ success: false, message: 'Sequence must be greater than 0' }, { status: 400 });
        }

        // Check if class already exists with same site, sequence, and division
        const existingClass = await SiteClass.findOne({
            department,
            site,
            sequence,
            division: division.toUpperCase()
        });

        if (existingClass) {
            return NextResponse.json({ success: false, message: 'A class with this site, level, and division already exists' }, { status: 409 });
        }

        // Create new class
        const newClass = await SiteClass.create({
            site,
            department: department || undefined,
            division: division.toUpperCase(),
            sequence,
            className: className || `Form ${sequence}${division.toUpperCase()}`,
            prefect: prefect || undefined,
            classLimit: classLimit || 0,
            formMaster: formMaster || undefined,
            subjects: subjects || [],
            students: [],
            isActive: isActive !== undefined ? isActive : true
        });

        const populatedClass = await SiteClass.findById(newClass._id).populate('department', 'name').populate('site', 'siteName').populate('formMaster.teacher', 'firstName lastName').populate('prefect', 'firstName lastName').lean().exec();

        return NextResponse.json(
            {
                success: true,
                message: 'Class created successfully',
                class: populatedClass
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating class:', error);
        return NextResponse.json({ success: false, message: 'Failed to create class', error: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'crud',
    actionType: 'create',
    entityType: 'class',
    entityIdExtractor: (req, res) => res?.class?._id?.toString(),
    entityNameExtractor: (req, res) => res?.class?.className
});
