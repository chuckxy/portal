import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Import Person model
let Person: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
} catch (error) {
    console.error('Error loading Person model:', error);
}

// POST - Change password
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id } = params;
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Current password and new password are required'
                },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'New password must be at least 6 characters long'
                },
                { status: 400 }
            );
        }

        // Find the person
        const person = await Person.findById(id);

        if (!person) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Person not found'
                },
                { status: 404 }
            );
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, person.password);

        if (!isPasswordValid) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Current password is incorrect'
                },
                { status: 401 }
            );
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        person.password = hashedPassword;
        await person.save();

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error: any) {
        console.error('Error changing password:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to change password',
                error: error.message
            },
            { status: 500 }
        );
    }
}
