import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Import all necessary models
let Person: any;
let School: any;
let SchoolSite: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    School = mongoose.models.School || require('@/models/School').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

interface BulkUploadResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; username?: string; error: string }>;
    created: any[];
}

// POST /api/persons/bulk-upload - Upload multiple persons from CSV/Excel data
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { persons, school, schoolSite, personCategory, defaultClass, defaultFaculty, defaultDepartment } = body;

        if (!Array.isArray(persons) || persons.length === 0) {
            return NextResponse.json({ success: false, message: 'No persons data provided' }, { status: 400 });
        }

        if (!school || !schoolSite) {
            return NextResponse.json({ success: false, message: 'School and school site are required' }, { status: 400 });
        }

        if (!personCategory) {
            return NextResponse.json({ success: false, message: 'Person category is required' }, { status: 400 });
        }

        // For students, validate required configuration
        if (personCategory === 'student') {
            if (!defaultClass || !defaultFaculty || !defaultDepartment) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Class, Faculty, and Department are required for student uploads'
                    },
                    { status: 400 }
                );
            }
        }

        const result: BulkUploadResult = {
            success: 0,
            failed: 0,
            errors: [],
            created: []
        };

        // Get last student and employee IDs for auto-generation
        const lastStudent = await Person.findOne({
            personCategory: 'student',
            school
        })
            .sort({ 'studentInfo.studentId': -1 })
            .select('studentInfo.studentId')
            .lean()
            .exec();

        const lastEmployee = await Person.findOne({
            personCategory: { $nin: ['student', 'parent'] },
            school
        })
            .sort({ 'employeeInfo.customId': -1 })
            .select('employeeInfo.customId')
            .lean()
            .exec();

        let studentCounter = 1;
        let employeeCounter = 1;

        if (lastStudent?.studentInfo?.studentId) {
            const match = lastStudent.studentInfo.studentId.match(/\d+$/);
            if (match) {
                studentCounter = parseInt(match[0]) + 1;
            }
        }

        if (lastEmployee?.employeeInfo?.customId) {
            const match = lastEmployee.employeeInfo.customId.match(/\d+$/);
            if (match) {
                employeeCounter = parseInt(match[0]) + 1;
            }
        }

        // Process each person
        for (let i = 0; i < persons.length; i++) {
            const personData = persons[i];
            const rowNumber = i + 1;

            try {
                // Validate required fields
                if (!personData.firstName) {
                    result.failed++;
                    result.errors.push({ row: rowNumber, error: 'First name is required' });
                    continue;
                }

                if (!personData.username) {
                    result.failed++;
                    result.errors.push({ row: rowNumber, username: personData.firstName, error: 'Username is required' });
                    continue;
                }

                if (!personData.password || personData.password.length < 6) {
                    result.failed++;
                    result.errors.push({ row: rowNumber, username: personData.username, error: 'Password must be at least 6 characters' });
                    continue;
                }

                // Use the personCategory from configuration or from the individual record
                const category = personData.personCategory || personCategory;
                if (!category) {
                    result.failed++;
                    result.errors.push({ row: rowNumber, username: personData.username, error: 'Person category is required' });
                    continue;
                }

                // Apply personCategory from configuration
                personData.personCategory = category;

                // Check for existing username
                const existingUsername = await Person.findOne({
                    username: personData.username.toLowerCase()
                })
                    .lean()
                    .exec();

                if (existingUsername) {
                    result.failed++;
                    result.errors.push({ row: rowNumber, username: personData.username, error: 'Username already exists' });
                    continue;
                }

                // Check for existing email
                if (personData.contact?.email) {
                    const existingEmail = await Person.findOne({
                        'contact.email': personData.contact.email.toLowerCase()
                    })
                        .lean()
                        .exec();

                    if (existingEmail) {
                        result.failed++;
                        result.errors.push({ row: rowNumber, username: personData.username, error: 'Email already exists' });
                        continue;
                    }
                }

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(personData.password, salt);

                // Auto-generate IDs and apply default values
                if (personData.personCategory === 'student') {
                    if (!personData.studentInfo) {
                        personData.studentInfo = {};
                    }
                    if (!personData.studentInfo.studentId) {
                        personData.studentInfo.studentId = `STU${String(studentCounter).padStart(5, '0')}`;
                        studentCounter++;
                    }
                    // Apply default class, faculty, and department if not provided
                    if (!personData.studentInfo.currentClass && defaultClass) {
                        personData.studentInfo.currentClass = defaultClass;
                    }
                    if (!personData.studentInfo.faculty && defaultFaculty) {
                        personData.studentInfo.faculty = defaultFaculty;
                    }
                    if (!personData.studentInfo.department && defaultDepartment) {
                        personData.studentInfo.department = defaultDepartment;
                    }
                } else if (personData.personCategory !== 'parent') {
                    if (!personData.employeeInfo) {
                        personData.employeeInfo = {};
                    }
                    if (!personData.employeeInfo.customId) {
                        personData.employeeInfo.customId = `EMP${String(employeeCounter).padStart(5, '0')}`;
                        employeeCounter++;
                    }
                }

                // Create person
                const newPerson = new Person({
                    ...personData,
                    username: personData.username.toLowerCase(),
                    password: hashedPassword,
                    school,
                    schoolSite,
                    isActive: personData.isActive !== undefined ? personData.isActive : true
                });

                await newPerson.save();

                result.success++;
                result.created.push({
                    username: newPerson.username,
                    name: `${newPerson.firstName} ${newPerson.lastName || ''}`,
                    category: newPerson.personCategory
                });
            } catch (error: any) {
                result.failed++;
                result.errors.push({
                    row: rowNumber,
                    username: personData.username,
                    error: error.message || 'Unknown error'
                });
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: `Bulk upload completed: ${result.success} successful, ${result.failed} failed`,
                result
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error in bulk upload:', error);
        return NextResponse.json({ success: false, message: 'Failed to process bulk upload', error: error.message }, { status: 500 });
    }
}
