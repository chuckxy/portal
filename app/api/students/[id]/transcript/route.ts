import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models
let Person: any;
let ExamScore: any;
let SiteClass: any;
let Subject: any;

try {
    Person = mongoose.models.Person || require('@/models/Person').default;
    ExamScore = mongoose.models.ExamScore || require('@/models/ExamScore').default;
    SiteClass = mongoose.models.SiteClass || require('@/models/SiteClass').default;
    Subject = mongoose.models.Subject || require('@/models/Subject').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// Grade to Grade Point mapping
const gradePoints: Record<string, number> = {
    A: 4.0,
    'B+': 3.5,
    B: 3.0,
    'C+': 2.5,
    C: 2.0,
    D: 1.0,
    E: 0.5,
    F: 0.0
};

const getGradeFromScore = (score: number): string => {
    if (score >= 80) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 45) return 'E';
    return 'F';
};

// GET student transcript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await connectDB();

        const { id: studentId } = params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 });
        }

        // Fetch student details
        const student: any = await Person.findById(studentId).populate('studentInfo.currentClass', 'className level').populate('studentInfo.department', 'name').populate('school', 'name').lean().exec();

        if (!student || student.personCategory !== 'student') {
            return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        }

        // Fetch all exam scores for the student
        const examScores: any[] = await ExamScore.find({ student: studentId })
            .populate('class', 'className level')
            .populate({
                path: 'scores.subject',
                select: 'name code'
            })
            .sort({ academicYear: 1, academicTerm: 1 })
            .lean()
            .exec();

        if (!examScores || examScores.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    student: {
                        fullName: student.fullName,
                        studentId: student.studentInfo?.studentId || 'N/A',
                        program: student.studentInfo?.department?.name || 'N/A',
                        major: student.studentInfo?.department?.name || 'N/A',
                        class: student.studentInfo?.currentClass?.className || 'N/A',
                        dateOfAdmission: student.studentInfo?.dateJoined
                    },
                    semesters: [],
                    overallCGPA: 0,
                    totalCredits: 0
                }
            });
        }

        // Process exam scores into semester records
        const semesterMap = new Map<string, any>();
        let totalCreditsTaken = 0;
        let totalWeightedGradePoints = 0;

        examScores.forEach((examScore) => {
            const semesterKey = `${examScore.academicYear}-${examScore.academicTerm}`;

            if (!semesterMap.has(semesterKey)) {
                semesterMap.set(semesterKey, {
                    academicYear: examScore.academicYear,
                    academicTerm: examScore.academicTerm,
                    level: examScore.class?.level || examScore.class?.className || 'N/A',
                    courses: [],
                    cct: 0,
                    ccp: 0,
                    totalWeightedGP: 0
                });
            }

            const semester = semesterMap.get(semesterKey);

            // Process each subject score
            examScore.scores?.forEach((subjectScore: any) => {
                const credit = 3; // Default credit hours (you can adjust based on your system)
                const grade = getGradeFromScore(subjectScore.totalScore);
                const gradePoint = gradePoints[grade] || 0;
                const gpt = credit * gradePoint;

                semester.courses.push({
                    code: subjectScore.subject?.code || 'N/A',
                    courseTitle: subjectScore.subject?.name || 'Unknown Subject',
                    credit: credit,
                    grade: grade,
                    gpt: gpt
                });

                semester.cct += credit;
                semester.totalWeightedGP += gpt;

                // Only count passed courses (D and above)
                if (gradePoint >= 1.0) {
                    semester.ccp += credit;
                }
            });
        });

        // Calculate GPA and CGPA for each semester
        const semesters: any[] = [];
        let cumulativeCreditsTaken = 0;
        let cumulativeWeightedGP = 0;

        Array.from(semesterMap.values())
            .sort((a, b) => {
                if (a.academicYear !== b.academicYear) {
                    return a.academicYear.localeCompare(b.academicYear);
                }
                return a.academicTerm - b.academicTerm;
            })
            .forEach((semester) => {
                const gpa = semester.cct > 0 ? semester.totalWeightedGP / semester.cct : 0;

                cumulativeCreditsTaken += semester.cct;
                cumulativeWeightedGP += semester.totalWeightedGP;

                const cgpa = cumulativeCreditsTaken > 0 ? cumulativeWeightedGP / cumulativeCreditsTaken : 0;

                semesters.push({
                    academicYear: semester.academicYear,
                    academicTerm: semester.academicTerm,
                    level: semester.level,
                    courses: semester.courses,
                    cct: semester.cct,
                    ccp: semester.ccp,
                    gpa: gpa,
                    cgpa: cgpa
                });

                totalCreditsTaken = cumulativeCreditsTaken;
                totalWeightedGradePoints = cumulativeWeightedGP;
            });

        const overallCGPA = totalCreditsTaken > 0 ? totalWeightedGradePoints / totalCreditsTaken : 0;

        // Calculate total credits passed
        const totalCreditsPassed = semesters.reduce((sum, sem) => sum + sem.ccp, 0);

        const transcriptData = {
            student: {
                fullName: student.fullName,
                studentId: student.studentInfo?.studentId || 'N/A',
                program: student.school?.name || 'N/A',
                major: student.studentInfo?.department?.name || 'N/A',
                class: student.studentInfo?.currentClass?.className || 'N/A',
                dateOfAdmission: student.studentInfo?.dateJoined
            },
            semesters: semesters,
            overallCGPA: overallCGPA,
            totalCredits: totalCreditsPassed
        };

        return NextResponse.json({
            success: true,
            data: transcriptData
        });
    } catch (error: any) {
        console.error('Error fetching transcript:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch transcript',
                error: error.message
            },
            { status: 500 }
        );
    }
}
