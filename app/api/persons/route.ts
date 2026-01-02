import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// Import all necessary models
let Person: any;
let School: any;
let SchoolSite: any;
let Faculty: any;
let Department: any;
let SiteClass: any;
let Subject: any;
let Address: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    School = mongoose.models.School || require('@/models/School').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    Faculty = mongoose.models.Faculty || require('@/models/Faculty').default;
    Department = mongoose.models.Department || require('@/models/Department').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
    Address = mongoose.models.Address || require('@/models/Address').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/persons - Fetch all persons with filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const school = searchParams.get('school');
        const site = searchParams.get('site');
        const category = searchParams.get('category');
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search');

        const filter: any = {};

        if (school) filter.school = school;
        if (site) filter.schoolSite = site;
        if (category) filter.personCategory = category;
        if (isActive !== null && isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Search across multiple fields
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { 'contact.email': { $regex: search, $options: 'i' } },
                { 'studentInfo.studentId': { $regex: search, $options: 'i' } },
                { 'employeeInfo.customId': { $regex: search, $options: 'i' } }
            ];
        }

        const persons = await Person.find(filter)
            .populate('school', 'name')
            .populate('schoolSite', 'name')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .populate('studentInfo.currentClass', 'className')
            .populate('studentInfo.guardian', 'firstName lastName')
            .populate('employeeInfo.teachingDepartment', 'name')
            .populate('employeeInfo.faculty', 'name')
            .populate('currentAddress', 'addressLine1 city')
            .select('-password') // Exclude password from response
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            count: persons.length,
            persons
        });
    } catch (error: any) {
        console.error('Error fetching persons:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch persons', error: error.message }, { status: 500 });
    }
}

// POST /api/persons - Create a new person
const postHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();

        // Validate required fields
        if (!body.firstName) {
            return NextResponse.json({ success: false, message: 'First name is required' }, { status: 400 });
        }

        if (!body.username) {
            return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
        }

        if (!body.password || body.password.length < 6) {
            return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
        }

        if (!body.personCategory) {
            return NextResponse.json({ success: false, message: 'Person category is required' }, { status: 400 });
        }

        if (!body.school || !body.schoolSite) {
            return NextResponse.json({ success: false, message: 'School and school site are required' }, { status: 400 });
        }

        // Check if username already exists
        const existingPerson = await Person.findOne({ username: body.username.toLowerCase() }).lean().exec();
        if (existingPerson) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
        }

        // Check if email already exists (if provided)
        if (body.contact?.email) {
            const existingEmail = await Person.findOne({ 'contact.email': body.contact.email.toLowerCase() }).lean().exec();
            if (existingEmail) {
                return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(body.password, salt);

        // Generate studentId or employeeId if not provided
        if (body.personCategory === 'student' && body.studentInfo && !body.studentInfo.studentId) {
            const lastStudent = await Person.findOne({
                personCategory: 'student',
                school: body.school
            })
                .sort({ 'studentInfo.studentId': -1 })
                .select('studentInfo.studentId')
                .lean()
                .exec();

            let nextNumber = 1;
            if (lastStudent?.studentInfo?.studentId) {
                const match = lastStudent.studentInfo.studentId.match(/\d+$/);
                if (match) {
                    nextNumber = parseInt(match[0]) + 1;
                }
            }
            body.studentInfo.studentId = `STU${String(nextNumber).padStart(5, '0')}`;
        }

        if (body.personCategory !== 'student' && body.personCategory !== 'parent' && body.employeeInfo && !body.employeeInfo.customId) {
            const lastEmployee = await Person.findOne({
                personCategory: { $nin: ['student', 'parent'] },
                school: body.school
            })
                .sort({ 'employeeInfo.customId': -1 })
                .select('employeeInfo.customId')
                .lean()
                .exec();

            let nextNumber = 1;
            if (lastEmployee?.employeeInfo?.customId) {
                const match = lastEmployee.employeeInfo.customId.match(/\d+$/);
                if (match) {
                    nextNumber = parseInt(match[0]) + 1;
                }
            }
            body.employeeInfo.customId = `EMP${String(nextNumber).padStart(5, '0')}`;
        }

        // Prepare person data
        const personData = {
            ...body,
            username: body.username.toLowerCase(),
            password: hashedPassword
        };

        const newPerson = new Person(personData);
        await newPerson.save();

        // Fetch the created person with populated fields (excluding password)
        const populatedPerson = await Person.findById(newPerson._id)
            .populate('school', 'name')
            .populate('schoolSite', 'name')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .populate('studentInfo.currentClass', 'className')
            .populate('employeeInfo.teachingDepartment', 'name')
            .select('-password')
            .lean()
            .exec();

        return NextResponse.json(
            {
                success: true,
                message: 'Person created successfully',
                person: populatedPerson
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating person:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 409 });
        }

        return NextResponse.json({ success: false, message: 'Failed to create person', error: error.message }, { status: 500 });
    }
};

export const POST = withActivityLogging(postHandler, {
    category: 'crud',
    actionType: 'create',
    entityType: 'person',
    entityIdExtractor: (req, res) => res?.person?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const person = res?.person;
        return person ? `${person.firstName} ${person.lastName}` : undefined;
    }
});
