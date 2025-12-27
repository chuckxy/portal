import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models dynamically to avoid TypeScript issues
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

// GET teacher dashboard data
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');

        if (!teacherId) {
            return NextResponse.json({ success: false, message: 'Teacher ID is required' }, { status: 400 });
        }

        // Fetch teacher details
        const teacher: any = await Person.findById(teacherId).populate('school', 'name').populate('schoolSite', 'name').lean().exec();

        if (!teacher || teacher.personCategory !== 'teacher') {
            return NextResponse.json({ success: false, message: 'Teacher not found' }, { status: 404 });
        }

        // Get teacher's subjects from employeeInfo
        const teacherSubjectIds = teacher.employeeInfo?.subjects || [];

        // Populate teacher subjects
        const teacherSubjects = await Subject.find({
            _id: { $in: teacherSubjectIds }
        })
            .select('name code')
            .lean();

        // Get classes where this teacher teaches (classes that have these subjects)
        const classes: any[] = await SiteClass.find({
            schoolSite: teacher.schoolSite,
            isActive: true,
            subjects: { $in: teacherSubjectIds }
        })
            .populate('subjects', 'name code')
            .lean();

        // Get total students in these classes
        const classIds = classes.map((c) => c._id);
        const studentsInClasses = await Person.countDocuments({
            personCategory: 'student',
            isActive: true,
            $or: [{ 'studentInfo.currentClass': { $in: classIds } }, { 'studentInfo.defaultClass': { $in: classIds } }]
        });

        // Get recent exam scores entered by this teacher
        const recentScores: any[] = await ExamScore.find({
            recordedBy: teacherId
        })
            .populate('student', 'firstName middleName lastName')
            .populate('class', 'className')
            .populate('scores.subject', 'name code')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Get exam score statistics
        const totalScoresEntered = await ExamScore.countDocuments({
            recordedBy: teacherId
        });

        const publishedScores = await ExamScore.countDocuments({
            recordedBy: teacherId,
            isPublished: true
        });

        const draftScores = await ExamScore.countDocuments({
            recordedBy: teacherId,
            isPublished: false
        });

        // Get pending exam scores (classes/subjects that need scores)
        const currentAcademicTerm = 1;
        const currentAcademicYear = new Date().getFullYear() + '/' + (new Date().getFullYear() + 1);

        // Get all students in teacher's classes
        const studentsNeedingScores = await Person.find({
            personCategory: 'student',
            isActive: true,
            $or: [{ 'studentInfo.currentClass': { $in: classIds } }, { 'studentInfo.defaultClass': { $in: classIds } }]
        })
            .select('_id firstName middleName lastName studentInfo')
            .exec();

        // Count how many students don't have scores yet for this term
        let pendingScoresCount = 0;
        for (const student of studentsNeedingScores) {
            for (const subjectId of teacherSubjectIds) {
                const hasScore = await ExamScore.exists({
                    student: student._id,
                    'scores.subject': subjectId,
                    academicTerm: currentAcademicTerm,
                    academicYear: currentAcademicYear
                });
                if (!hasScore) {
                    pendingScoresCount++;
                }
            }
        }

        // Calculate average scores from the scores array
        const scoreStats = await ExamScore.aggregate([
            {
                $match: {
                    recordedBy: new mongoose.Types.ObjectId(teacherId),
                    isPublished: true
                }
            },
            { $unwind: '$scores' },
            {
                $group: {
                    _id: null,
                    avgTotal: { $avg: '$scores.totalScore' },
                    avgClass: { $avg: '$scores.classScore' },
                    avgExam: { $avg: '$scores.examScore' }
                }
            }
        ]);

        const dashboardData = {
            teacher: {
                _id: teacher._id,
                fullName: `${teacher.firstName} ${teacher.middleName || ''} ${teacher.lastName}`.trim(),
                email: teacher.contact?.email,
                phone: teacher.contact?.mobilePhone,
                photoLink: teacher.photoLink,
                jobTitle: teacher.employeeInfo?.jobTitle,
                school: teacher.school,
                schoolSite: teacher.schoolSite,
                dateJoined: teacher.employeeInfo?.dateJoined
            },
            subjects: teacherSubjects,
            classes: classes.map((c) => ({
                _id: c._id,
                name: c.className || c.name,
                division: c.division,
                sequence: c.sequence,
                academicYear: c.academicYear,
                studentCount: c.students?.length || 0,
                subjects: c.subjects
            })),
            statistics: {
                totalSubjects: teacherSubjects.length,
                totalClasses: classes.length,
                totalStudents: studentsInClasses,
                totalScoresEntered,
                publishedScores,
                draftScores,
                pendingScores: pendingScoresCount,
                averageScores: scoreStats[0] || {
                    avgTotal: 0,
                    avgClass: 0,
                    avgExam: 0
                }
            },
            recentScores: recentScores.map((score) => {
                // Get the first subject score for display
                const firstScore = score.scores && score.scores[0];
                return {
                    _id: score._id,
                    student: score.student,
                    subject: firstScore?.subject || null,
                    class: score.class,
                    totalScore: firstScore?.totalScore || 0,
                    grade: firstScore?.grade || 'N/A',
                    isPublished: score.isPublished,
                    createdAt: score.createdAt
                };
            })
        };

        return NextResponse.json({
            success: true,
            data: dashboardData
        });
    } catch (error: any) {
        console.error('Error fetching teacher dashboard:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch dashboard data', error: error.message }, { status: 500 });
    }
}
