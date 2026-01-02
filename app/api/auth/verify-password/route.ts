/**
 * Password Verification API
 *
 * Endpoint to re-verify a user's password for sensitive operations.
 * Used when the user needs to confirm their identity before performing
 * destructive or highly privileged actions.
 *
 * POST /api/auth/verify-password
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Person from '@/models/Person';

// -------------------- HELPER FUNCTIONS --------------------
interface DecodedToken {
    userId: string;
    username: string;
    personCategory: string;
    school: string;
}

function extractToken(request: NextRequest): DecodedToken | null {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const base64Payload = token.split('.')[1];
            return JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        }
        return null;
    } catch {
        return null;
    }
}

// -------------------- POST: VERIFY PASSWORD --------------------
export async function POST(request: NextRequest) {
    try {
        // Extract current user from token
        const token = extractToken(request);
        if (!token) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { password, userId } = body;

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        // Use userId from body if provided, otherwise use token's userId
        // This allows verification for a specific user (useful for admin operations)
        const targetUserId = userId || token.userId;

        // Find the user with password field
        const user = await (Person as any).findById(targetUserId).select('+password');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Additional security check: non-proprietors can only verify their own password
        if (token.personCategory !== 'proprietor' && targetUserId !== token.userId) {
            return NextResponse.json({ error: 'Access denied. You can only verify your own password.' }, { status: 403 });
        }

        // Verify the password
        const isValid = await user.comparePassword(password);

        if (!isValid) {
            return NextResponse.json({ valid: false, error: 'Invalid password' }, { status: 401 });
        }

        return NextResponse.json({
            valid: true,
            userId: user._id.toString(),
            username: user.username
        });
    } catch (error: any) {
        console.error('Error verifying password:', error);
        return NextResponse.json({ error: 'Failed to verify password', details: error.message }, { status: 500 });
    }
}
