import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import Person from '@/models/Person';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const { username, password } = await request.json();

        // Validate required fields
        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Find user by username or email

        // @ts-ignore
        const user = await Person.findOne({ $or: [{ username: username.toLowerCase() }, { 'contact.email': username.toLowerCase() }], isActive: true }).select('+password');

        if (!user) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                personCategory: user.personCategory,
                school: user.school,
                schoolSite: user.schoolSite
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Return success response
        return NextResponse.json(
            {
                success: true,
                message: 'Login successful',
                token,
                user: {
                    _id: user._id.toString(),
                    id: user._id.toString(),
                    username: user.username,
                    firstName: user.firstName,
                    middleName: user.middleName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    personCategory: user.personCategory,
                    email: user.contact?.email,
                    phone: user.contact?.mobilePhone,
                    school: user.school.toString(),
                    schoolSite: user.schoolSite.toString(),
                    photoLink: user.photoLink,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Login error:', error);

        return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
    }
}
