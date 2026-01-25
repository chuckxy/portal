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
let StudentBilling: any;
let FeesPayment: any;
let ExamScore: any;
let LibraryLending: any;
let Assignment: any;
let Scholarship: any;
let ExamAnswer: any;

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
    StudentBilling = mongoose.models.StudentBilling || require('@/models/StudentBilling').default;
    FeesPayment = mongoose.models.FeesPayment || require('@/models/FeesPayment').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
    Assignment = mongoose.models.Assignment || require('@/models/Assignment').default;
    Scholarship = mongoose.models.Scholarship || require('@/models/Scholarship').default;
    ExamAnswer = mongoose.models.ExamAnswer || require('@/models/ExamAnswer').default;
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

        // Track Balance Brought Forward changes for audit purposes
        let balanceBFChanged = false;
        let previousBalanceBF = 0;
        let newBalanceBF = 0;

        if (existingPerson.personCategory === 'student' && body.studentInfo) {
            previousBalanceBF = existingPerson.studentInfo?.balanceBroughtForward || 0;
            newBalanceBF = body.studentInfo?.balanceBroughtForward ?? previousBalanceBF;

            if (previousBalanceBF !== newBalanceBF) {
                balanceBFChanged = true;
                console.log(`[AUDIT] Balance B/F change for student ${id}: ${previousBalanceBF} -> ${newBalanceBF}`);
            }

            // Validate Balance B/F is non-negative
            if (newBalanceBF < 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Balance Brought Forward cannot be negative'
                    },
                    { status: 400 }
                );
            }
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
            person: updatedPerson,
            // Include audit info for Balance B/F changes
            ...(balanceBFChanged && {
                auditInfo: {
                    balanceBroughtForwardChanged: true,
                    previousValue: previousBalanceBF,
                    newValue: newBalanceBF
                }
            })
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
    },
    // Include Balance B/F change details in activity log
    metadataExtractor: (req, res) => {
        if (res?.auditInfo?.balanceBroughtForwardChanged) {
            return {
                balanceBroughtForwardChanged: true,
                previousBalanceBF: res.auditInfo.previousValue,
                newBalanceBF: res.auditInfo.newValue
            };
        }
        return undefined;
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

        // Check for active library lendings
        const activeLibraryLendings = await LibraryLending.countDocuments({
            borrower: id,
            status: { $in: ['active', 'overdue'] }
        }).exec();

        if (activeLibraryLendings > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete: Person has unreturned library items. Please return all items first.',
                    activeLibraryLendings
                },
                { status: 400 }
            );
        }

        // Start transaction for cascading delete
        const session = await mongoose.startSession();
        session.startTransaction();

        const cleanupStats = {
            studentBillingsDeleted: 0,
            feesPaymentsDeleted: 0,
            examScoresDeleted: 0,
            libraryLendingsUpdated: 0,
            assignmentsUpdated: 0,
            scholarshipsDeleted: 0,
            examAnswersDeleted: 0,
            guardiansUpdated: 0
        };

        try {
            // Cascade delete related data
            const billingResult = await StudentBilling.deleteMany({ student: id }, { session }).exec();
            cleanupStats.studentBillingsDeleted = billingResult.deletedCount || 0;

            const paymentsResult = await FeesPayment.deleteMany({ student: id }, { session }).exec();
            cleanupStats.feesPaymentsDeleted = paymentsResult.deletedCount || 0;

            const examScoresResult = await ExamScore.deleteMany({ student: id }, { session }).exec();
            cleanupStats.examScoresDeleted = examScoresResult.deletedCount || 0;

            const examAnswersResult = await ExamAnswer.deleteMany({ student: id }, { session }).exec();
            cleanupStats.examAnswersDeleted = examAnswersResult.deletedCount || 0;

            const scholarshipsResult = await Scholarship.deleteMany({ student: id }, { session }).exec();
            cleanupStats.scholarshipsDeleted = scholarshipsResult.deletedCount || 0;

            const libraryResult = await LibraryLending.updateMany(
                { borrower: id },
                { 
                    $set: { 
                        notes: 'Borrower account deleted',
                        status: 'returned' 
                    } 
                },
                { session }
            ).exec();
            cleanupStats.libraryLendingsUpdated = libraryResult.modifiedCount || 0;

            const assignmentsResult = await Assignment.updateMany(
                { 'submissions.student': id },
                { 
                    $pull: { submissions: { student: id } },
                    $inc: { totalSubmissions: -1 }
                },
                { session }
            ).exec();
            cleanupStats.assignmentsUpdated = assignmentsResult.modifiedCount || 0;

            const guardianResult = await Person.updateMany(
                { 'studentInfo.guardian': id },
                { 
                    $unset: { 'studentInfo.guardian': 1 },
                    $set: { 'studentInfo.guardianRelationship': null }
                },
                { session }
            ).exec();
            cleanupStats.guardiansUpdated = guardianResult.modifiedCount || 0;

            // Delete the person
            await Person.findByIdAndDelete(id, { session }).exec();

            // Commit transaction
            await session.commitTransaction();

            // Async database optimization
            setImmediate(async () => {
                try {
                    await Promise.all([
                        Person.collection.reIndex(),
                        StudentBilling.collection.reIndex(),
                        FeesPayment.collection.reIndex()
                    ]);
                    console.log('[DB-OPTIMIZATION] Successfully reindexed collections after person delete');
                } catch (error) {
                    console.error('[DB-OPTIMIZATION] Error reindexing:', error);
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Person deleted successfully',
                cleanupStats
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
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
