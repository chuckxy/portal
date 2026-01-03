import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import Person from '@/models/Person';

interface ClassHistoryEntry {
    academicYear: string;
    academicTerm: number;
    class: string;
    dateFrom: Date;
    dateTo?: Date;
}

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { studentId, currentClass, defaultAcademicYear, defaultAcademicTerm, addToClassHistory = false, updateClassHistory = false } = body;

        if (!studentId) {
            return NextResponse.json({ message: 'Student ID is required' }, { status: 400 });
        }

        // Find the student
        const student = await (Person as any).findById(studentId).populate('studentInfo.currentClass', 'className');

        if (!student) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        if (student.personCategory !== 'student') {
            return NextResponse.json({ message: 'Person is not a student' }, { status: 400 });
        }

        const now = new Date();
        const previousClass = student.studentInfo?.currentClass;
        const previousYear = student.studentInfo?.defaultAcademicYear;
        const previousTerm = student.studentInfo?.defaultAcademicTerm;

        // Prepare update object
        const updateData: Record<string, any> = {
            updatedAt: now
        };

        // Prepare class history updates
        let classHistoryUpdates: {
            closePrevious?: {
                filter: Record<string, any>;
                update: Record<string, any>;
                arrayFilters: Record<string, any>[];
            };
            addNew?: {
                filter: Record<string, any>;
                update: Record<string, any>;
            };
        } = {};

        // Handle class promotion (changes class, year, and term)
        if (addToClassHistory && currentClass) {
            // Update current class info
            updateData['studentInfo.currentClass'] = currentClass;

            if (defaultAcademicYear) {
                updateData['studentInfo.defaultAcademicYear'] = defaultAcademicYear;
            }

            if (defaultAcademicTerm) {
                updateData['studentInfo.defaultAcademicTerm'] = defaultAcademicTerm;
            }

            // Add new class history entry
            const newHistoryEntry: ClassHistoryEntry = {
                academicYear: defaultAcademicYear || previousYear,
                academicTerm: defaultAcademicTerm || previousTerm,
                class: currentClass,
                dateFrom: now
            };

            classHistoryUpdates = {
                closePrevious: {
                    filter: { _id: studentId },
                    update: { $set: { 'studentInfo.classHistory.$[elem].dateTo': now } },
                    arrayFilters: [{ 'elem.dateTo': { $exists: false } }]
                },
                addNew: {
                    filter: { _id: studentId },
                    update: { $push: { 'studentInfo.classHistory': newHistoryEntry } }
                }
            };
        }

        // Handle term update only (changes term, keeps class and year)
        if (updateClassHistory && defaultAcademicTerm && !currentClass) {
            updateData['studentInfo.defaultAcademicTerm'] = defaultAcademicTerm;

            // For term updates, add a new entry to track term changes
            const classId = student.studentInfo?.currentClass?._id || student.studentInfo?.currentClass;
            const newHistoryEntry: ClassHistoryEntry = {
                academicYear: student.studentInfo?.defaultAcademicYear || '',
                academicTerm: defaultAcademicTerm,
                class: classId,
                dateFrom: now
            };

            classHistoryUpdates = {
                closePrevious: {
                    filter: { _id: studentId },
                    update: { $set: { 'studentInfo.classHistory.$[elem].dateTo': now } },
                    arrayFilters: [{ 'elem.dateTo': { $exists: false } }]
                },
                addNew: {
                    filter: { _id: studentId },
                    update: { $push: { 'studentInfo.classHistory': newHistoryEntry } }
                }
            };
        }

        // Execute the main update
        await (Person as any).findByIdAndUpdate(studentId, updateData, { new: true });

        // Execute class history updates if any
        if (classHistoryUpdates.closePrevious) {
            await (Person as any).updateOne(classHistoryUpdates.closePrevious.filter, classHistoryUpdates.closePrevious.update, { arrayFilters: classHistoryUpdates.closePrevious.arrayFilters });
        }

        if (classHistoryUpdates.addNew) {
            await (Person as any).updateOne(classHistoryUpdates.addNew.filter, classHistoryUpdates.addNew.update);
        }

        // Fetch updated student
        const updatedStudent = await (Person as any).findById(studentId).populate('studentInfo.currentClass', 'className').select('firstName lastName studentInfo');

        // Log the operation (console log for now)
        console.log('Academic update completed:', {
            studentId: student.studentInfo?.studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            operationType: addToClassHistory ? 'class_promotion' : 'term_update',
            previousState: {
                class: previousClass?.className || previousClass,
                academicYear: previousYear,
                academicTerm: previousTerm
            },
            newState: {
                class: currentClass || previousClass?._id || previousClass,
                academicYear: defaultAcademicYear || previousYear,
                academicTerm: defaultAcademicTerm || previousTerm
            }
        });

        return NextResponse.json({
            message: addToClassHistory ? 'Student promoted successfully' : 'Student term updated successfully',
            student: updatedStudent
        });
    } catch (error) {
        console.error('Bulk academic update error:', error);
        return NextResponse.json({ message: 'Failed to update student academic records', error: String(error) }, { status: 500 });
    }
}

// Batch update endpoint for processing multiple students at once
export async function PUT(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { students, operationType, targetClass, targetAcademicYear, targetAcademicTerm } = body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ message: 'Students array is required' }, { status: 400 });
        }

        if (!operationType || !['class_promotion', 'term_update'].includes(operationType)) {
            return NextResponse.json({ message: 'Valid operation type is required (class_promotion or term_update)' }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            details: [] as Array<{
                studentId: string;
                status: 'success' | 'failed';
                message: string;
            }>
        };

        const now = new Date();

        for (const studentId of students) {
            try {
                const student = await (Person as any).findById(studentId);

                if (!student) {
                    results.failed++;
                    results.details.push({
                        studentId,
                        status: 'failed',
                        message: 'Student not found'
                    });
                    continue;
                }

                const updateData: Record<string, any> = { updatedAt: now };
                const newHistoryEntry: ClassHistoryEntry = {
                    academicYear: targetAcademicYear || student.studentInfo?.defaultAcademicYear,
                    academicTerm: targetAcademicTerm || student.studentInfo?.defaultAcademicTerm,
                    class: targetClass || student.studentInfo?.currentClass,
                    dateFrom: now
                };

                if (operationType === 'class_promotion') {
                    updateData['studentInfo.currentClass'] = targetClass;
                    updateData['studentInfo.defaultAcademicYear'] = targetAcademicYear;
                    updateData['studentInfo.defaultAcademicTerm'] = targetAcademicTerm;
                } else {
                    updateData['studentInfo.defaultAcademicTerm'] = targetAcademicTerm;
                }

                // Close previous history entry
                await (Person as any).updateOne({ _id: studentId }, { $set: { 'studentInfo.classHistory.$[elem].dateTo': now } }, { arrayFilters: [{ 'elem.dateTo': { $exists: false } }] });

                // Add new history entry and update student
                await (Person as any).findByIdAndUpdate(
                    studentId,
                    {
                        ...updateData,
                        $push: { 'studentInfo.classHistory': newHistoryEntry }
                    },
                    { new: true }
                );

                results.success++;
                results.details.push({
                    studentId,
                    status: 'success',
                    message: operationType === 'class_promotion' ? 'Promoted successfully' : 'Term updated successfully'
                });
            } catch (err) {
                results.failed++;
                results.details.push({
                    studentId,
                    status: 'failed',
                    message: String(err)
                });
            }
        }

        // Log batch operation
        console.log('Batch academic update completed:', {
            operationType,
            targetClass,
            targetAcademicYear,
            targetAcademicTerm,
            totalProcessed: students.length,
            successCount: results.success,
            failedCount: results.failed
        });

        return NextResponse.json({
            message: `Batch update completed. ${results.success} successful, ${results.failed} failed.`,
            results
        });
    } catch (error) {
        console.error('Batch academic update error:', error);
        return NextResponse.json({ message: 'Failed to process batch update', error: String(error) }, { status: 500 });
    }
}
