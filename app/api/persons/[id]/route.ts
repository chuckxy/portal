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
let Bank: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    School = mongoose.models.School || require('@/models/School').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
    Faculty = mongoose.models.Faculty || require('@/models/Faculty').default;
    Department = mongoose.models.Department || require('@/models/Department').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
    Address = mongoose.models.Address || require('@/models/Address').default;
    Bank = mongoose.models.Bank || require('@/models/Bank').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/persons/[id] - Fetch a single person
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid person ID' }, { status: 400 });
        }

        const person = await Person.findById(id)
            .populate('school', 'name')
            .populate('schoolSite', 'name')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .populate('studentInfo.currentClass', 'className')
            .populate('studentInfo.guardian', 'firstName lastName contact')
            .populate('studentInfo.subjects', 'name code')
            .populate('employeeInfo.teachingDepartment', 'name')
            .populate('employeeInfo.faculty', 'name')
            .populate('employeeInfo.subjects', 'name code')
            .populate('employeeInfo.bankInfo.bank', 'name')
            .populate('currentAddress', 'addressLine1 city country')
            .populate('addresses.addressId', 'addressLine1 city')
            .select('-password')
            .lean()
            .exec();

        if (!person) {
            return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            person
        });
    } catch (error: any) {
        console.error('Error fetching person:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch person', error: error.message }, { status: 500 });
    }
}

// PUT /api/persons/[id] - Update a person
const putHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid person ID' }, { status: 400 });
        }

        const body = await request.json();

        // Find existing person
        const existingPerson = await Person.findById(id).lean().exec();
        if (!existingPerson) {
            return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });
        }

        // Check if username is being changed and if it already exists
        if (body.username && body.username.toLowerCase() !== existingPerson.username) {
            const duplicateUsername = await Person.findOne({
                username: body.username.toLowerCase(),
                _id: { $ne: id }
            })
                .lean()
                .exec();

            if (duplicateUsername) {
                return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
            }
        }

        // Check if email is being changed and if it already exists
        if (body.contact?.email && body.contact.email !== existingPerson.contact?.email) {
            const duplicateEmail = await Person.findOne({
                'contact.email': body.contact.email.toLowerCase(),
                _id: { $ne: id }
            })
                .lean()
                .exec();

            if (duplicateEmail) {
                return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
            }
        }

        // If password is being updated, hash it
        if (body.password && body.password.length >= 6) {
            const salt = await bcrypt.genSalt(10);
            body.password = await bcrypt.hash(body.password, salt);
        } else {
            // Don't update password if not provided or too short
            delete body.password;
        }

        // Prepare update data
        const updateData = {
            ...body,
            username: body.username ? body.username.toLowerCase() : existingPerson.username
        };

        // Update person
        const updatedPerson = await Person.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .populate('school', 'name')
            .populate('schoolSite', 'name')
            .populate('studentInfo.faculty', 'name')
            .populate('studentInfo.department', 'name')
            .populate('studentInfo.currentClass', 'className')
            .populate('employeeInfo.teachingDepartment', 'name')
            .select('-password')
            .lean()
            .exec();

        return NextResponse.json({
            success: true,
            message: 'Person updated successfully',
            person: updatedPerson
        });
    } catch (error: any) {
        console.error('Error updating person:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 409 });
        }

        return NextResponse.json({ success: false, message: 'Failed to update person', error: error.message }, { status: 500 });
    }
};

export const PUT = withActivityLogging(putHandler, {
    category: 'crud',
    actionType: 'update',
    entityType: 'person',
    entityIdExtractor: (req, res) => res?.person?._id?.toString(),
    entityNameExtractor: (req, res) => {
        const person = res?.person;
        return person ? `${person.firstName} ${person.lastName}` : undefined;
    }
});

// PATCH /api/persons/[id] - Partially update a person (for profile updates)
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid person ID' }, { status: 400 });
        }

        const body = await request.json();

        // Find existing person
        const existingPerson = await Person.findById(id).lean().exec();
        if (!existingPerson) {
            return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });
        }

        // Check if email is being changed and if it already exists
        if (body.contact?.email && body.contact.email !== existingPerson.contact?.email) {
            const duplicateEmail = await Person.findOne({
                'contact.email': body.contact.email.toLowerCase(),
                _id: { $ne: id }
            })
                .lean()
                .exec();

            if (duplicateEmail) {
                return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
            }
        }

        // Don't allow password updates through PATCH (use change-password endpoint)
        delete body.password;
        delete body.username; // Don't allow username changes through profile update

        // Update person with partial data
        const updatedPerson = await Person.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate('school', 'name').populate('schoolSite', 'name').select('-password').lean().exec();

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedPerson
        });
    } catch (error: any) {
        console.error('Error updating profile:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 409 });
        }

        return NextResponse.json({ success: false, message: 'Failed to update profile', error: error.message }, { status: 500 });
    }
}

// DELETE /api/persons/[id] - Delete a person
const deleteHandler = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid person ID' }, { status: 400 });
        }

        const person = await Person.findById(id).lean().exec();
        if (!person) {
            return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });
        }

        // Check if person is referenced in other collections
        // For students: check if they have fees, exam records, etc.
        // For teachers: check if they are assigned to classes, subjects, etc.
        // This is a soft check - you can make it more comprehensive based on your needs

        await Person.findByIdAndDelete(id).exec();

        return NextResponse.json({
            success: true,
            message: 'Person deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting person:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete person', error: error.message }, { status: 500 });
    }
};

export const DELETE = withActivityLogging(deleteHandler, {
    category: 'crud',
    actionType: 'delete',
    entityType: 'person',
    entityIdExtractor: async (req) => {
        const { params } = req as any;
        const { id } = await params;
        return id;
    }
});
