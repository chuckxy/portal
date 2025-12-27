import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import School from '@/models/School';
import SchoolSite from '@/models/SchoolSite';
import Person from '@/models/Person';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const data = await request.json();

        // Validate required fields
        if (!data.schoolName || !data.schoolType || !data.siteName || !data.siteDescription || !data.schoolLevel || !data.firstName || !data.username || !data.password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if username already exists
        // @ts-ignore
        const existingUser = await Person.findOne({ username: data.username.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        // Check if email already exists (if provided)
        if (data.email) {
            // @ts-ignore
            const existingEmail = await Person.findOne({ 'contact.email': data.email.toLowerCase() });
            if (existingEmail) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
            }
        }

        // Create School
        const school = await School.create({
            name: data.schoolName,
            schoolType: data.schoolType,
            dateFounded: data.dateFounded || undefined,
            motto: data.motto || undefined,
            isActive: true
        });

        // Create School Site
        const schoolSite = await SchoolSite.create({
            school: school._id,
            siteName: data.siteName,
            description: data.siteDescription,
            phone: data.sitePhone || undefined,
            email: data.siteEmail || undefined,
            address: {
                street: data.street || undefined,
                town: data.town || undefined,
                constituency: data.constituency || undefined
            },
            schoolLevel: data.schoolLevel,
            tertiaryType: data.schoolLevel === 'tertiary' ? data.tertiaryType || 'n/a' : 'n/a',
            isActive: true,
            academicYears: [],
            houses: [],
            bulletinBoard: []
        });

        // Update school with site reference
        school.sites.push(schoolSite._id);
        await school.save();

        // Create Proprietor Person
        const proprietor = await Person.create({
            firstName: data.firstName,
            middleName: data.middleName || undefined,
            lastName: data.lastName || undefined,
            dateOfBirth: data.dateOfBirth || undefined,
            gender: data.gender || undefined,
            contact: {
                mobilePhone: data.mobilePhone || undefined,
                email: data.email || undefined
            },
            addresses: [],
            personCategory: 'proprietor',
            school: school._id,
            schoolSite: schoolSite._id,
            username: data.username.toLowerCase(),
            password: data.password,
            isActive: true,
            medicalInfo: {
                allergies: [],
                chronicConditions: [],
                medications: [],
                emergencyContact: {}
            },
            officialDocuments: [],
            calendar: []
        });

        return NextResponse.json(
            {
                success: true,
                message: 'School registered successfully',
                data: {
                    schoolId: school._id,
                    schoolSiteId: schoolSite._id,
                    proprietorId: proprietor._id,
                    username: proprietor.username
                }
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('School registration error:', error);

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({ error: `${field} already exists` }, { status: 400 });
        }

        return NextResponse.json({ error: 'An error occurred during registration' }, { status: 500 });
    }
}
