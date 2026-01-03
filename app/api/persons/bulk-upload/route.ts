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
        const { persons, school, schoolSite, personCategory, defaultClass, defaultFaculty, defaultDepartment, defaultAcademicYear, defaultAcademicTerm } = body;

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

        // Get total count of all persons in the collection for this school
        // Start counter from total count to avoid duplicates
        const totalPersonCount = await Person.countDocuments().exec();

        // Start both student and employee counters at total count + 1
        let studentCounter = totalPersonCount + 1;
        let employeeCounter = totalPersonCount + 1;

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
                    // Apply default academic year and term
                    if (!personData.studentInfo.defaultAcademicYear && defaultAcademicYear) {
                        personData.studentInfo.defaultAcademicYear = defaultAcademicYear;
                    }
                    if (!personData.studentInfo.defaultAcademicTerm && defaultAcademicTerm) {
                        personData.studentInfo.defaultAcademicTerm = defaultAcademicTerm;
                    }
                    // Set balanceBroughtForward to 0 if not provided (ensure it's always defined for students)
                    if (personData.studentInfo.balanceBroughtForward === undefined || personData.studentInfo.balanceBroughtForward === null) {
                        personData.studentInfo.balanceBroughtForward = 0;
                    }
                    // Ensure balanceBroughtForward is non-negative
                    if (personData.studentInfo.balanceBroughtForward < 0) {
                        personData.studentInfo.balanceBroughtForward = 0;
                    }

                    // Initialize classHistory for students with currentClass
                    if (!personData.studentInfo.classHistory) {
                        personData.studentInfo.classHistory = [];
                    }

                    // If student has a current class, add it to class history
                    if (personData.studentInfo.currentClass) {
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth();
                        const currentYear = currentDate.getFullYear();

                        // Determine current academic year (Sept-Aug cycle)
                        const academicYear = personData.studentInfo.defaultAcademicYear || (currentMonth >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`);

                        // Determine current term (rough estimate: Jan-Apr=1, May-Aug=2, Sept-Dec=3)
                        const academicTerm = personData.studentInfo.defaultAcademicTerm || (currentMonth <= 3 ? 1 : currentMonth <= 7 ? 2 : 3);

                        personData.studentInfo.classHistory.push({
                            class: personData.studentInfo.currentClass,
                            academicYear: academicYear,
                            academicTerm: academicTerm,
                            dateFrom: personData.studentInfo.dateJoined || currentDate,
                            attendance: []
                        });
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
