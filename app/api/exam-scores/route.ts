import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ExamScore from '@/models/ExamScore';
import Person from '@/models/Person';
import School from '@/models/School';
import SchoolSite from '@/models/SchoolSite';
import SiteClass from '@/models/SiteClass';
import Subject from '@/models/Subject';

// GET - List exam scores with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const site = searchParams.get('site');
        const classId = searchParams.get('class');
        const student = searchParams.get('student');
        const academicYear = searchParams.get('academicYear');
        const academicTerm = searchParams.get('academicTerm');
        const isPublished = searchParams.get('isPublished');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query
        const query: any = {};
        if (school) query.school = school;
        if (site) query.site = site;
        if (classId) query.class = classId;
        if (student) query.student = student;
        if (academicYear) query.academicYear = academicYear;
        if (academicTerm) query.academicTerm = parseInt(academicTerm);
        if (isPublished !== null && isPublished !== undefined) {
            query.isPublished = isPublished === 'true';
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const [scores, total] = await Promise.all([
            ExamScore.find(query)
                .populate('student', 'firstName lastName studentInfo')
                .populate('school', 'name')
                .populate('site', 'name')
                .populate('class', 'className')
                .populate('scores.subject', 'name code')
                .populate('recordedBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ExamScore.countDocuments(query)
        ]);

        return NextResponse.json({
            scores,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching exam scores:', error);
        return NextResponse.json({ error: 'Failed to fetch exam scores', details: error.message }, { status: 500 });
    }
}

// POST - Create new exam score
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validation
        if (!body.student) {
            return NextResponse.json({ error: 'Student is required' }, { status: 400 });
        }
        if (!body.class) {
            return NextResponse.json({ error: 'Class is required' }, { status: 400 });
        }
        if (!body.academicYear) {
            return NextResponse.json({ error: 'Academic year is required' }, { status: 400 });
        }
        if (!body.academicTerm) {
            return NextResponse.json({ error: 'Academic term is required' }, { status: 400 });
        }

        // Check for duplicate
        const existingScore = await ExamScore.findOne({
            student: body.student,
            academicYear: body.academicYear,
            academicTerm: body.academicTerm
        });

        if (existingScore) {
            return NextResponse.json({ error: 'Exam score record already exists for this student, year, and term' }, { status: 409 });
        }

        // Calculate overall average and total marks
        if (body.scores && body.scores.length > 0) {
            const totalScore = body.scores.reduce((sum: number, score: any) => sum + (score.totalScore || 0), 0);
            body.overallAverage = totalScore / body.scores.length;
            body.totalMarks = totalScore;
        }

        // Create exam score
        const examScore = new ExamScore(body);
        await examScore.save();

        // Populate references
        await examScore.populate([
            { path: 'student', select: 'firstName lastName studentInfo' },
            { path: 'school', select: 'name' },
            { path: 'site', select: 'name' },
            { path: 'class', select: 'className' },
            { path: 'scores.subject', select: 'name code' },
            { path: 'promotedTo', select: 'className' },
            { path: 'recordedBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(examScore, { status: 201 });
    } catch (error: any) {
        console.error('Error creating exam score:', error);
        return NextResponse.json({ error: 'Failed to create exam score', details: error.message }, { status: 500 });
    }
}
