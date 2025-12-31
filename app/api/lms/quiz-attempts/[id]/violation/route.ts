import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST - Record a violation
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        const { type, details } = body;

        if (!type) {
            return NextResponse.json({ error: 'Violation type is required' }, { status: 400 });
        }

        const attempt = await QuizAttempt.findById(id);
        if (!attempt) {
            return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
        }

        if (attempt.status !== 'in_progress') {
            return NextResponse.json({ error: 'Cannot record violation for completed attempt' }, { status: 400 });
        }

        // Add violation
        attempt.violations.push({
            type,
            timestamp: new Date(),
            details
        });

        await attempt.save();

        return NextResponse.json({
            success: true,
            violationCount: attempt.violations.length,
            recordedAt: new Date()
        });
    } catch (error) {
        console.error('Error recording violation:', error);
        return NextResponse.json({ error: 'Failed to record violation' }, { status: 500 });
    }
}
