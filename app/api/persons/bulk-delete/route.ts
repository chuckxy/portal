import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import { withActivityLogging } from '@/lib/middleware/activityLogging';

// Import models
let Person: any;
let StudentBilling: any;
let FeesPayment: any;
let ExamScore: any;
let LibraryLending: any;
let Assignment: any;
let Scholarship: any;
let ExamAnswer: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
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

// DELETE /api/persons/bulk-delete - Delete multiple persons
const deleteHandler = async (request: NextRequest) => {
    try {
        await connectDB();

        const body = await request.json();
        const { personIds } = body;

        // Validate input
        if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'personIds array is required and must not be empty'
                },
                { status: 400 }
            );
        }

        // Validate all IDs
        const invalidIds = personIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid person IDs: ${invalidIds.join(', ')}`
                },
                { status: 400 }
            );
        }

        // Fetch persons before deletion for logging purposes
        const personsToDelete = await Person.find({
            _id: { $in: personIds }
        })
            .select('_id firstName lastName username personCategory studentInfo.studentId employeeInfo.customId')
            .lean()
            .exec();

        if (personsToDelete.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No persons found with the provided IDs'
                },
                { status: 404 }
            );
        }

        // PHASE 1: Check for active relationships and gather statistics
        const cleanupStats = {
            personsDeleted: 0,
            studentBillingsDeleted: 0,
            feesPaymentsDeleted: 0,
            examScoresDeleted: 0,
            libraryLendingsUpdated: 0,
            assignmentsUpdated: 0,
            scholarshipsDeleted: 0,
            examAnswersDeleted: 0,
            guardiansUpdated: 0
        };

        // Check for active library lendings (should return all items before deletion)
        const activeLibraryLendings = await LibraryLending.countDocuments({
            borrower: { $in: personIds },
            status: { $in: ['active', 'overdue'] }
        }).exec();

        if (activeLibraryLendings > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Cannot delete: ${activeLibraryLendings} person(s) have unreturned library items. Please return all items first.`,
                    activeLibraryLendings
                },
                { status: 400 }
            );
        }

        // Start a database session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // PHASE 2: Cascade delete and cleanup related data
            
            // 1. Delete Student Billings
            const billingResult = await StudentBilling.deleteMany(
                { student: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.studentBillingsDeleted = billingResult.deletedCount || 0;

            // 2. Delete Fees Payments
            const paymentsResult = await FeesPayment.deleteMany(
                { student: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.feesPaymentsDeleted = paymentsResult.deletedCount || 0;

            // 3. Delete Exam Scores
            const examScoresResult = await ExamScore.deleteMany(
                { student: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.examScoresDeleted = examScoresResult.deletedCount || 0;

            // 4. Delete Exam Answers
            const examAnswersResult = await ExamAnswer.deleteMany(
                { student: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.examAnswersDeleted = examAnswersResult.deletedCount || 0;

            // 5. Delete Scholarships
            const scholarshipsResult = await Scholarship.deleteMany(
                { student: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.scholarshipsDeleted = scholarshipsResult.deletedCount || 0;

            // 6. Update Library Lendings (soft delete - mark as handled)
            const libraryResult = await LibraryLending.updateMany(
                { borrower: { $in: personIds } },
                { 
                    $set: { 
                        notes: 'Borrower account deleted',
                        status: 'returned' 
                    } 
                },
                { session }
            ).exec();
            cleanupStats.libraryLendingsUpdated = libraryResult.modifiedCount || 0;

            // 7. Update Assignments (remove student submissions)
            const assignmentsResult = await Assignment.updateMany(
                { 'submissions.student': { $in: personIds } },
                { 
                    $pull: { submissions: { student: { $in: personIds } } },
                    $inc: { 
                        totalSubmissions: -1,
                        evaluatedSubmissions: 0,
                        pendingEvaluations: 0
                    }
                },
                { session }
            ).exec();
            cleanupStats.assignmentsUpdated = assignmentsResult.modifiedCount || 0;

            // 8. Update guardian references (set to null for orphaned students)
            const guardianResult = await Person.updateMany(
                { 'studentInfo.guardian': { $in: personIds } },
                { 
                    $unset: { 'studentInfo.guardian': 1 },
                    $set: { 'studentInfo.guardianRelationship': null }
                },
                { session }
            ).exec();
            cleanupStats.guardiansUpdated = guardianResult.modifiedCount || 0;

            // PHASE 3: Delete the persons
            const deleteResult = await Person.deleteMany(
                { _id: { $in: personIds } },
                { session }
            ).exec();
            cleanupStats.personsDeleted = deleteResult.deletedCount || 0;

            // PHASE 4: Database optimization - Update indexes and compact collections
            // Note: This runs asynchronously after transaction commits
            setImmediate(async () => {
                try {
                    // Reindex collections for better performance
                    await Promise.all([
                        Person.collection.reIndex(),
                        StudentBilling.collection.reIndex(),
                        FeesPayment.collection.reIndex(),
                        ExamScore.collection.reIndex()
                    ]);
                    console.log('[DB-OPTIMIZATION] Successfully reindexed collections after bulk delete');
                } catch (error) {
                    console.error('[DB-OPTIMIZATION] Error reindexing collections:', error);
                }
            });

            // Commit the transaction
            await session.commitTransaction();

            return NextResponse.json({
                success: true,
                message: `Successfully deleted ${cleanupStats.personsDeleted} person(s) and cleaned up related data`,
                deletedCount: cleanupStats.personsDeleted,
                cleanupStats,
                personsDeleted: personsToDelete.map(p => ({
                    _id: p._id.toString(),
                    name: `${p.firstName} ${p.lastName}`,
                    username: p.username,
                    category: p.personCategory,
                    studentId: p.studentInfo?.studentId,
                    employeeId: p.employeeInfo?.customId
                }))
            });

        } catch (error) {
            // Rollback transaction on error
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error: any) {
        console.error('Error deleting persons:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to delete persons',
                error: error.message
            },
            { status: 500 }
        );
    }
};

export const DELETE = withActivityLogging(deleteHandler, {
    category: 'crud',
    actionType: 'delete',
    entityType: 'person',
    sensitive: true,
    metadataExtractor: async (req, res) => {
        return {
            bulkDelete: true,
            deletedCount: res?.deletedCount,
            deletedPersons: res?.personsDeleted?.map((p: any) => ({
                id: p._id,
                name: p.name,
                username: p.username,
                category: p.category
            }))
        };
    },
    descriptionGenerator: (req, res) => {
        const count = res?.deletedCount || 0;
        return `Bulk deleted ${count} person(s)`;
    }
});
