'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { Badge } from 'primereact/badge';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Editor } from 'primereact/editor';
import { Skeleton } from 'primereact/skeleton';
import { ScrollPanel } from 'primereact/scrollpanel';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Menu } from 'primereact/menu';
import { Sidebar } from 'primereact/sidebar';
import { Image } from 'primereact/image';
import { useAuth } from '@/context/AuthContext';
import VideoPlayer, { VideoProgressState } from './VideoPlayer';
import { PdfViewerProps } from './PdfViewer';
import { DisplayQuestions, QuizQuestionData } from './quiz/QuestionTypes';

// Dynamic import for PdfViewer component to avoid SSR issues with react-pdf
const PdfViewer = dynamic<PdfViewerProps>(() => import('./PdfViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex flex-column align-items-center justify-content-center py-8">
            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            <p className="text-white mt-3">Loading PDF viewer...</p>
        </div>
    )
});

// ============================================================================
// TYPES
// ============================================================================

interface Subject {
    _id: string;
    name: string;
    code: string;
    description?: string;
    lmsCourse?: {
        courseBanner?: string;
        difficulty?: string;
        learningOutcomes?: string[];
    };
}

interface CourseModule {
    _id: string;
    moduleName: string;
    moduleDescription?: string;
    hierarchyOrder: number;
    status: string;
    estimatedDuration?: number;
}

interface Chapter {
    _id: string;
    chapterName: string;
    chapterDescription?: string;
    hierarchyOrder: number;
    moduleId: string | { _id: string; moduleName?: string }; // Can be populated or just ID
}

interface Lesson {
    _id: string;
    lessonTitle: string;
    lessonDescription?: string;
    lessonDuration?: number;
    contentType?: string; // Primary content type: video, pdf, audio, html, image, etc.
    contentUrl?: string; // Primary content URL for the lesson
    contentHtml?: string; // HTML content for html type lessons
    hierarchyOrder: number;
    chapterId: string | { _id: string; chapterName?: string }; // Can be populated
    moduleId: string | { _id: string; moduleName?: string }; // Can be populated
    isFreePreview?: boolean;
    thumbnailPath?: string;
    allowDownload?: boolean;
}

interface Material {
    _id: string;
    materialTitle: string;
    materialDescription?: string;
    materialType: string;
    materialURL: string;
    fileSize?: number;
    duration?: number;
    pageCount?: number;
    isDownloadable?: boolean;
}

interface Enrollment {
    _id: string;
    subjectId: string;
    personId: string;
    progressPercentage: number;
    lastAccessedAt?: string;
    totalTimeSpent: number;
    status: string;
}

interface LessonProgress {
    lessonId: string;
    isCompleted: boolean;
    progressPercent: number;
    lastPosition?: number;
    timeSpent: number;
}

interface Note {
    _id?: string;
    title: string;
    content: string;
    lessonId: string;
    createdAt?: string;
}

// Quiz Types
interface QuizQuestion {
    _id: string;
    questionNumber: number;
    questionText: string;
    questionType: 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text' | 'picture_choice';
    questionOptions: { id: string; text: string; imageUrl?: string; isCorrect?: boolean }[];
    correctOptions: string[];
    points: number;
    quizId: string;
    imageUrl?: string;
}

interface QuizAttempt {
    lessonId: string;
    quizId: string;
    userId: string;
    answers: { questionId: string; questionNumber: number; selectedOptions: string[] }[];
    score?: number;
    submittedAt?: string;
    isCompleted: boolean;
}

interface QuizMeta {
    quizId: string;
    title: string;
    totalMarks: number;
    totalQuestions: number;
    timeLimit?: number;
}

interface CourseState {
    course: Subject | null;
    modules: CourseModule[];
    chapters: Chapter[];
    lessons: Lesson[];
    materials: Material[];
    enrollment: Enrollment | null;
    currentModule: CourseModule | null;
    currentChapter: Chapter | null;
    currentLesson: Lesson | null;
    lessonProgress: Map<string, LessonProgress>;
    notes: Note[];
    isLoading: boolean;
    activeView: 'overview' | 'learning' | 'materials' | 'quiz' | 'notes';
    // Quiz state
    hasLessonQuiz: boolean;
    quizMeta: QuizMeta | null;
    quizQuestions: QuizQuestion[];
    quizAttemptInProgress: boolean;
    currentQuizAnswers: Map<string, string[]>;
    quizScore: number | null;
    showQuizScoreDialog: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const StudentLearningPortal: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const toastRef = useRef<Toast>(null);
    const reactPlayerRef = useRef<any>(null);
    const menuRef = useRef<Menu>(null);

    const courseId = searchParams.get('courseId') || searchParams.get('subjectId');

    // State
    const [state, setState] = useState<CourseState>({
        course: null,
        modules: [],
        chapters: [],
        lessons: [],
        materials: [],
        enrollment: null,
        currentModule: null,
        currentChapter: null,
        currentLesson: null,
        lessonProgress: new Map(),
        notes: [],
        isLoading: true,
        activeView: 'overview',
        // Quiz state initialization
        hasLessonQuiz: false,
        quizMeta: null,
        quizQuestions: [],
        quizAttemptInProgress: false,
        currentQuizAnswers: new Map(),
        quizScore: null,
        showQuizScoreDialog: false
    });

    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [noteDialogVisible, setNoteDialogVisible] = useState(false);
    const [newNote, setNewNote] = useState<Note>({ title: '', content: '', lessonId: '' });
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [sessionStartTime] = useState(Date.now());
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    // Session Time Tracking State
    const [lessonStartTime, setLessonStartTime] = useState(Date.now());
    const [lastSavedTime, setLastSavedTime] = useState(Date.now());
    const sessionSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Video Progress State - for resuming playback
    const [videoStartPosition, setVideoStartPosition] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoProgressLoaded, setVideoProgressLoaded] = useState(false);
    const videoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // PDF Viewer State - worker is set up at module level, so ready immediately
    const [pdfDialogVisible, setPdfDialogVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfPageNumber, setPdfPageNumber] = useState(1);
    const [pdfTotalPages, setPdfTotalPages] = useState(0);
    const [pdfPageInput, setPdfPageInput] = useState(1);
    const [pdfMaterialId, setPdfMaterialId] = useState<string | null>(null);

    // Image Viewer State
    const [imageDialogVisible, setImageDialogVisible] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageTitle, setImageTitle] = useState('');

    // Web Page Dialog State
    const [webDialogVisible, setWebDialogVisible] = useState(false);
    const [webUrl, setWebUrl] = useState('');

    // Video Dialog State (for materials)
    const [videoDialogVisible, setVideoDialogVisible] = useState(false);
    const [videoDialogUrl, setVideoDialogUrl] = useState('');
    const [videoDialogTitle, setVideoDialogTitle] = useState('');

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    // Helper to extract ID from potentially populated reference fields
    const extractId = (ref: string | { _id: string } | null | undefined): string => {
        if (!ref) return '';
        if (typeof ref === 'string') return ref;
        if (typeof ref === 'object' && ref._id) return String(ref._id);
        return String(ref);
    };

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    const updateState = useCallback((updates: Partial<CourseState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    useEffect(() => {
        if (courseId && user?.schoolSite) {
            initializeCourse();
        }
    }, [courseId, user]);

    const initializeCourse = async () => {
        try {
            updateState({ isLoading: true });

            // Fetch course details
            const [courseRes, modulesRes, enrollmentRes] = await Promise.all([fetch(`/api/subjects/${courseId}`), fetch(`/api/lms/course-modules?subjectId=${courseId}`), fetch(`/api/lms/enrollments?subjectId=${courseId}&personId=${user?.id}`)]);

            const courseData = courseRes.ok ? await courseRes.json() : null;
            const modulesData = modulesRes.ok ? await modulesRes.json() : { modules: [] };
            const enrollmentData = enrollmentRes.ok ? await enrollmentRes.json() : { enrollments: [] };

            const course = courseData?.subject || null;
            const modules = modulesData.modules || [];
            const enrollment = enrollmentData.enrollments?.[0] || null;

            // Fetch chapters for all modules
            let allChapters: Chapter[] = [];
            let allLessons: Lesson[] = [];

            if (modules.length > 0) {
                const chaptersPromises = modules.map((m: CourseModule) => fetch(`/api/lms/chapters?moduleId=${m._id}`).then((r) => r.json()));
                const chaptersResults = await Promise.all(chaptersPromises);
                allChapters = chaptersResults.flatMap((r) => r.chapters || []);

                // Fetch lessons for all chapters
                if (allChapters.length > 0) {
                    const lessonsPromises = allChapters.map((c: Chapter) => fetch(`/api/lms/lessons?chapterId=${c._id}`).then((r) => r.json()));
                    const lessonsResults = await Promise.all(lessonsPromises);
                    allLessons = lessonsResults.flatMap((r) => r.lessons || []);
                }
            }

            // Set first module and chapter as current if available
            const firstModule = modules[0] || null;
            const firstChapter = allChapters.find((c) => extractId(c.moduleId) === String(firstModule?._id)) || null;
            const firstLesson = allLessons.find((l) => extractId(l.chapterId) === String(firstChapter?._id)) || null;

            // Debug logging
            console.log('Loaded course data:', {
                modulesCount: modules.length,
                chaptersCount: allChapters.length,
                lessonsCount: allLessons.length,
                firstModule: firstModule?.moduleName,
                firstModuleId: firstModule?._id,
                chapters: allChapters.map((c: any) => ({
                    id: c._id,
                    name: c.chapterName,
                    moduleId: c.moduleId,
                    moduleIdType: typeof c.moduleId
                })),
                firstChapter: firstChapter?.chapterName,
                firstLesson: firstLesson?.lessonTitle,
                lessonContentType: firstLesson?.contentType,
                lessonContentUrl: firstLesson?.contentUrl
            });

            // Expand first module and chapter by default
            if (firstModule) {
                setExpandedModules(new Set([firstModule._id]));
            }
            if (firstChapter) {
                setExpandedChapters(new Set([firstChapter._id]));
            }

            updateState({
                course,
                modules,
                chapters: allChapters,
                lessons: allLessons,
                enrollment,
                currentModule: firstModule,
                currentChapter: firstChapter,
                currentLesson: firstLesson,
                isLoading: false,
                activeView: 'overview'
            });

            // Fetch materials and quiz for the first lesson if available
            if (firstLesson) {
                fetchLessonMaterials(firstLesson._id);
                fetchLessonQuiz(firstLesson._id);
            }

            document.title = course?.name ? `${course.name} - Learning Portal` : 'Learning Portal';
        } catch (error) {
            console.error('Error initializing course:', error);
            showToast('error', 'Error', 'Failed to load course');
            updateState({ isLoading: false });
        }
    };

    const fetchLessonMaterials = async (lessonId: string) => {
        try {
            console.log('Fetching materials for lesson:', lessonId);
            const response = await fetch(`/api/lms/course-materials?lessonId=${lessonId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Materials loaded:', data.materials?.length || 0, 'items');
                updateState({ materials: data.materials || [] });
            } else {
                console.error('Failed to fetch materials:', response.status);
                updateState({ materials: [] });
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
            updateState({ materials: [] });
        }
    };

    // ========================================================================
    // QUIZ FUNCTIONS
    // ========================================================================

    const checkLessonQuizAvailability = async (lessonId: string) => {
        try {
            // First, fetch the quiz for this lesson
            const response = await fetch(`/api/lms/quizzes?lessonId=${lessonId}`);
            console.log('Quiz API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Quiz API response data:', data);

                // The API returns 'quizzes' array
                const quizzes = data.quizzes || [];
                const quiz = data.quiz || quizzes[0];

                console.log('Found quiz:', quiz?._id, 'Total quizzes:', quizzes.length);

                if (quiz && quiz._id) {
                    // Now fetch the questions for this quiz
                    const questionsResponse = await fetch(`/api/lms/quiz-questions?quizId=${quiz._id}`);
                    console.log('Questions API response status:', questionsResponse.status);

                    if (questionsResponse.ok) {
                        const questionsData = await questionsResponse.json();
                        console.log('Quiz Questions API response:', questionsData);

                        const questions = questionsData.questions || [];
                        console.log('Questions count:', questions.length);

                        if (questions.length > 0) {
                            const quizMeta: QuizMeta = {
                                quizId: quiz._id,
                                title: quiz.title || 'Lesson Quiz',
                                totalMarks: quiz.totalMarks || questions.reduce((acc: number, q: QuizQuestion) => acc + (q.points || 0), 0),
                                totalQuestions: questions.length,
                                timeLimit: quiz.timeLimit
                            };
                            console.log('Quiz meta created:', quizMeta);
                            return { hasQuiz: true, quizMeta, questions };
                        } else {
                            console.log('Quiz found but no questions');
                        }
                    } else {
                        console.log('Failed to fetch questions');
                    }
                } else {
                    console.log('No quiz found for lesson');
                }
            } else {
                console.log('Quiz API call failed');
            }
            return { hasQuiz: false, quizMeta: null, questions: [] };
        } catch (error) {
            console.error('Error checking quiz availability:', error);
            return { hasQuiz: false, quizMeta: null, questions: [] };
        }
    };

    const fetchLessonQuiz = async (lessonId: string) => {
        console.log('Fetching quiz for lesson:', lessonId);

        // Reset quiz state when fetching for new lesson
        updateState({
            hasLessonQuiz: false,
            quizMeta: null,
            quizQuestions: [],
            quizAttemptInProgress: false,
            currentQuizAnswers: new Map(),
            quizScore: null
        });

        const quizData = await checkLessonQuizAvailability(lessonId);
        console.log('Quiz data result:', { hasQuiz: quizData.hasQuiz, questionCount: quizData.questions.length });

        updateState({
            hasLessonQuiz: quizData.hasQuiz,
            quizMeta: quizData.quizMeta,
            quizQuestions: quizData.questions
        });
    };

    const startQuizAttempt = () => {
        if (!state.hasLessonQuiz || state.quizQuestions.length === 0) {
            showToast('warn', 'No Quiz', 'There is no quiz available for this lesson.');
            return;
        }

        if (state.quizAttemptInProgress) {
            showToast('warn', 'Quiz In Progress', 'You already have a quiz in progress. Please complete or submit it.');
            return;
        }

        confirmDialog({
            message: 'Are you ready to start the quiz? Ensure you are fully prepared before beginning.',
            header: 'Start Quiz',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Start Quiz',
            rejectLabel: 'Not Yet',
            accept: () => {
                updateState({
                    quizAttemptInProgress: true,
                    currentQuizAnswers: new Map(),
                    quizScore: null
                });
                showToast('info', 'Quiz Started', 'Good luck! Answer all questions and click Submit when done.');
            }
        });
    };

    const handleQuizAnswerChange = (questionId: string, selectedOptions: string[]) => {
        const newAnswers = new Map(state.currentQuizAnswers);
        newAnswers.set(questionId, selectedOptions);
        updateState({ currentQuizAnswers: newAnswers });
    };

    const calculateQuizScore = (): number => {
        let totalScore = 0;

        state.quizQuestions.forEach((question) => {
            const userAnswers = state.currentQuizAnswers.get(question._id) || [];
            const correctOptions = question.correctOptions || [];
            // correctOptions is an array of option IDs that are correct
            // questionOptions has { id, text, isCorrect } - we use isCorrect or correctOptions

            switch (question.questionType) {
                case 'single_choice_radio':
                case 'single_choice_dropdown':
                    // Check if user's answer matches any correct option
                    const userAnswer = userAnswers[0];
                    const isCorrectSingle = correctOptions.includes(userAnswer) || question.questionOptions.find((opt) => opt.id === userAnswer)?.isCorrect;
                    if (isCorrectSingle) {
                        totalScore += question.points || 1;
                    }
                    break;
                case 'multiple_choice':
                    // For multiple choice, check how many correct answers were selected
                    const correctSet = new Set(correctOptions.length > 0 ? correctOptions : question.questionOptions.filter((opt) => opt.isCorrect).map((opt) => opt.id));
                    userAnswers.forEach((answer) => {
                        if (correctSet.has(answer)) {
                            // Award partial points for each correct answer
                            totalScore += (question.points || correctSet.size) / correctSet.size;
                        }
                    });
                    break;
                case 'fill_blanks':
                case 'matching':
                case 'matching_text':
                    // For these types, check exact matches
                    userAnswers.forEach((answer, index) => {
                        if (answer === correctOptions[index]) {
                            totalScore += (question.points || 1) / (correctOptions.length || 1);
                        }
                    });
                    break;
                default:
                    break;
            }
        });

        return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
    };

    const submitQuiz = async () => {
        if (!state.quizAttemptInProgress) {
            showToast('warn', 'No Quiz', 'There is no quiz in progress to submit.');
            return;
        }

        // Check if all questions are answered
        const unansweredCount = state.quizQuestions.filter((q) => {
            const answers = state.currentQuizAnswers.get(q._id);
            return !answers || answers.length === 0;
        }).length;

        if (unansweredCount > 0) {
            confirmDialog({
                message: `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`,
                header: 'Incomplete Quiz',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Submit Anyway',
                rejectLabel: 'Continue Quiz',
                accept: () => processQuizSubmission()
            });
        } else {
            confirmDialog({
                message: 'Are you sure you want to submit your quiz? You cannot change your answers after submission.',
                header: 'Submit Quiz',
                icon: 'pi pi-check-circle',
                acceptLabel: 'Yes, Submit',
                rejectLabel: 'Review Answers',
                accept: () => processQuizSubmission()
            });
        }
    };

    const processQuizSubmission = async () => {
        try {
            const score = calculateQuizScore();

            // Save quiz attempt to server
            if (state.currentLesson && state.quizMeta && user) {
                const attemptData = {
                    lessonId: state.currentLesson._id,
                    quizId: state.quizMeta.quizId,
                    userId: user.id,
                    answers: Array.from(state.currentQuizAnswers.entries()).map(([questionId, selectedOptions]) => ({
                        questionId,
                        selectedOptions
                    })),
                    score,
                    submittedAt: new Date().toISOString()
                };

                try {
                    await fetch('/api/lms/quiz-attempts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(attemptData)
                    });
                } catch (saveError) {
                    console.error('Error saving quiz attempt:', saveError);
                }
            }

            updateState({
                quizAttemptInProgress: false,
                quizScore: score,
                showQuizScoreDialog: true
            });

            showToast('success', 'Quiz Submitted', 'Your quiz has been submitted successfully!');
        } catch (error) {
            console.error('Error submitting quiz:', error);
            showToast('error', 'Error', 'Failed to submit quiz. Please try again.');
        }
    };

    const resetQuizState = () => {
        updateState({
            quizAttemptInProgress: false,
            currentQuizAnswers: new Map(),
            quizScore: null,
            showQuizScoreDialog: false
        });
    };

    // ========================================================================
    // NAVIGATION
    // ========================================================================

    const selectModule = (module: CourseModule) => {
        const moduleChapters = state.chapters.filter((c) => extractId(c.moduleId) === String(module._id));
        const firstChapter = moduleChapters[0] || null;
        const firstLesson = firstChapter ? state.lessons.find((l) => extractId(l.chapterId) === String(firstChapter._id)) || null : null;

        // Toggle module expansion
        setExpandedModules((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(module._id)) {
                newSet.delete(module._id);
            } else {
                newSet.add(module._id);
            }
            return newSet;
        });

        updateState({
            currentModule: module,
            currentChapter: firstChapter,
            currentLesson: firstLesson,
            activeView: 'learning'
        });

        if (firstLesson) {
            fetchLessonMaterials(firstLesson._id);
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId);
            } else {
                newSet.add(moduleId);
            }
            return newSet;
        });
    };

    const toggleChapter = (chapterId: string) => {
        setExpandedChapters((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(chapterId)) {
                newSet.delete(chapterId);
            } else {
                newSet.add(chapterId);
            }
            return newSet;
        });
    };

    const selectChapter = (chapter: Chapter) => {
        const chapterLessons = state.lessons.filter((l) => extractId(l.chapterId) === String(chapter._id));
        const firstLesson = chapterLessons[0] || null;

        // Expand the chapter
        setExpandedChapters((prev) => {
            const newSet = new Set(prev);
            newSet.add(chapter._id);
            return newSet;
        });

        updateState({
            currentChapter: chapter,
            currentLesson: firstLesson
        });

        if (firstLesson) {
            fetchLessonMaterials(firstLesson._id);
            fetchLessonQuiz(firstLesson._id);
        }
    };

    const selectLesson = (lesson: Lesson) => {
        // Reset quiz state when switching lessons
        resetQuizState();

        updateState({ currentLesson: lesson });
        fetchLessonMaterials(lesson._id);
        fetchLessonQuiz(lesson._id);
        setActiveTabIndex(0);
    };

    const navigateLesson = (direction: 'prev' | 'next') => {
        if (!state.currentLesson || !state.currentChapter) return;

        const chapterLessons = state.lessons.filter((l) => extractId(l.chapterId) === String(state.currentChapter!._id)).sort((a, b) => a.hierarchyOrder - b.hierarchyOrder);

        const currentIndex = chapterLessons.findIndex((l) => String(l._id) === String(state.currentLesson!._id));

        if (direction === 'next' && currentIndex < chapterLessons.length - 1) {
            selectLesson(chapterLessons[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            selectLesson(chapterLessons[currentIndex - 1]);
        } else if (direction === 'next') {
            // Move to next chapter
            const moduleChapters = state.chapters.filter((c) => extractId(c.moduleId) === String(state.currentModule?._id)).sort((a, b) => a.hierarchyOrder - b.hierarchyOrder);
            const chapterIndex = moduleChapters.findIndex((c) => String(c._id) === String(state.currentChapter!._id));

            if (chapterIndex < moduleChapters.length - 1) {
                selectChapter(moduleChapters[chapterIndex + 1]);
            }
        }
    };

    // ========================================================================
    // PROGRESS TRACKING
    // ========================================================================

    const markLessonComplete = async () => {
        if (!state.currentLesson || !state.enrollment) return;

        try {
            // Save session progress with completion status
            await saveSessionProgress(true);

            // Update local progress
            const newProgress = new Map(state.lessonProgress);
            newProgress.set(state.currentLesson._id, {
                lessonId: state.currentLesson._id,
                isCompleted: true,
                progressPercent: 100,
                timeSpent: Math.floor((Date.now() - lessonStartTime) / 1000)
            });

            updateState({ lessonProgress: newProgress });

            // Calculate overall progress
            const completedCount = Array.from(newProgress.values()).filter((p) => p.isCompleted).length;
            const totalLessons = state.lessons.length;
            const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            // Update enrollment progress
            await fetch(`/api/lms/enrollments/${state.enrollment._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    progressPercentage,
                    lastAccessedAt: new Date().toISOString()
                })
            });

            showToast('success', 'Progress Saved', 'Lesson marked as complete');

            // Auto-navigate to next lesson
            navigateLesson('next');
        } catch (error) {
            console.error('Error saving progress:', error);
            showToast('error', 'Error', 'Failed to save progress');
        }
    };

    // ========================================================================
    // NOTES
    // ========================================================================

    const openNoteDialog = () => {
        setNewNote({
            title: '',
            content: '',
            lessonId: state.currentLesson?._id || ''
        });
        setNoteDialogVisible(true);
    };

    const saveNote = async () => {
        if (!newNote.title || !newNote.content) {
            showToast('warn', 'Validation', 'Please fill in title and content');
            return;
        }

        try {
            // For now, save locally
            const savedNote: Note = {
                ...newNote,
                _id: Date.now().toString(),
                createdAt: new Date().toISOString()
            };

            updateState({ notes: [...state.notes, savedNote] });
            setNoteDialogVisible(false);
            showToast('success', 'Success', 'Note saved successfully');
        } catch (error) {
            showToast('error', 'Error', 'Failed to save note');
        }
    };

    // ========================================================================
    // CONTENT PROGRESS TRACKING (Video & PDF)
    // ========================================================================

    // Fetch saved progress for current lesson when it changes
    const fetchLessonProgress = async (lessonId: string) => {
        if (!user?.id) return;

        try {
            const response = await fetch(`/api/lms/content-progress?lessonId=${lessonId}&personId=${user.id}&type=all`);
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched lesson progress:', data);

                // Set video progress if available
                if (data.videoProgress?.watchedVideos?.length > 0) {
                    // Find the most recently watched video or the first one
                    const lastVideo = data.videoProgress.watchedVideos[data.videoProgress.watchedVideos.length - 1];
                    if (lastVideo?.watchedDuration > 0) {
                        setVideoStartPosition(lastVideo.watchedDuration);
                        setVideoCurrentTime(lastVideo.watchedDuration);
                        setVideoDuration(lastVideo.totalDuration || 0);
                        console.log('Restoring video position to:', lastVideo.watchedDuration, 'seconds');
                    }
                }

                // Set PDF progress if available
                if (data.pdfProgress?.readPDFs?.length > 0) {
                    const lastPDF = data.pdfProgress.readPDFs[data.pdfProgress.readPDFs.length - 1];
                    if (lastPDF?.currentPageNumber > 0) {
                        setPdfPageNumber(lastPDF.currentPageNumber);
                        setPdfPageInput(lastPDF.currentPageNumber);
                        setPdfTotalPages(lastPDF.totalPages || 0);
                        console.log('Restoring PDF page to:', lastPDF.currentPageNumber);
                    }
                }

                setVideoProgressLoaded(true);
            }
        } catch (error) {
            console.error('Error fetching lesson progress:', error);
            setVideoProgressLoaded(true); // Still mark as loaded to prevent blocking
        }
    };

    // Save video progress to server
    const saveVideoProgress = async (currentTime: number, duration: number) => {
        if (!state.currentLesson || !user?.id || duration === 0) return;

        try {
            const watchPercentage = Math.round((currentTime / duration) * 100);

            await fetch('/api/lms/content-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId: state.currentLesson._id,
                    personId: user.id,
                    schoolSiteId: user.schoolSite,
                    type: 'video',
                    progress: {
                        watchedDuration: currentTime,
                        totalDuration: duration,
                        watchPercentage,
                        contentUrl: state.currentLesson.contentUrl, // Use contentUrl for identification
                        videoFileName: state.currentLesson.contentUrl
                    }
                })
            });

            console.log('Video progress saved:', { currentTime, duration, watchPercentage });
        } catch (error) {
            console.error('Error saving video progress:', error);
        }
    };

    // Save PDF progress to server
    const savePdfProgress = async (pageNumber: number, totalPages: number, materialId?: string) => {
        if (!state.currentLesson || !user?.id) return;

        try {
            const readPercentage = totalPages > 0 ? Math.round((pageNumber / totalPages) * 100) : 0;

            await fetch('/api/lms/content-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId: state.currentLesson._id,
                    personId: user.id,
                    schoolSiteId: user.schoolSite,
                    type: 'pdf',
                    materialId,
                    progress: {
                        currentPageNumber: pageNumber,
                        totalPages: totalPages || 1, // Ensure at least 1 page
                        pagesRead: pageNumber,
                        readPercentage,
                        contentUrl: pdfUrl, // Use contentUrl for identification
                        pdfFileName: pdfUrl
                    }
                })
            });

            console.log('PDF progress saved:', { pageNumber, totalPages, readPercentage });
        } catch (error) {
            console.error('Error saving PDF progress:', error);
        }
    };

    // Save session time to the server
    const saveSessionProgress = async (isCompleting = false) => {
        if (!state.currentLesson || !user?.id) return;

        const now = Date.now();
        const timeSpentSinceLastSave = Math.floor((now - lastSavedTime) / 1000); // Convert to seconds

        // Only save if at least 5 seconds have passed (avoid excessive saves)
        if (timeSpentSinceLastSave < 5 && !isCompleting) return;

        try {
            const response = await fetch('/api/lms/session-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId: state.currentLesson._id,
                    personId: user.id,
                    schoolSiteId: user.schoolSite,
                    subjectId: state.course?._id,
                    moduleId: state.currentModule?._id,
                    chapterId: state.currentChapter?._id,
                    timeSpent: timeSpentSinceLastSave,
                    status: isCompleting ? 'completed' : 'in-progress',
                    bookmarkPosition: Math.floor(videoCurrentTime) // Video position in seconds
                })
            });

            if (response.ok) {
                setLastSavedTime(now);
                console.log('Session progress saved:', { timeSpentSinceLastSave, isCompleting });
            }
        } catch (error) {
            console.error('Error saving session progress:', error);
        }
    };

    // Handle video progress update from player
    const handleVideoProgressUpdate = (progress: VideoProgressState) => {
        setVideoProgress(progress.played * 100);
        setVideoCurrentTime(progress.playedSeconds);
        setVideoDuration(progress.loadedSeconds / progress.loaded || 0);
    };

    // Handle video ready - seek to saved position
    const handleVideoReady = () => {
        if (videoStartPosition > 0 && reactPlayerRef.current) {
            console.log('Video ready, seeking to:', videoStartPosition);
            // Use seekTo method if available
            try {
                if (reactPlayerRef.current.seekTo) {
                    reactPlayerRef.current.seekTo(videoStartPosition, 'seconds');
                } else if (reactPlayerRef.current.currentTime !== undefined) {
                    reactPlayerRef.current.currentTime = videoStartPosition;
                }
            } catch (e) {
                console.log('Could not seek video:', e);
            }
        }
    };

    // Handle video pause - save progress
    const handleVideoPause = () => {
        setVideoPlaying(false);
        // Save progress on pause
        if (videoCurrentTime > 0 && videoDuration > 0) {
            saveVideoProgress(videoCurrentTime, videoDuration);
        }
    };

    // Handle video end - save progress as complete
    const handleVideoEnded = () => {
        setVideoPlaying(false);
        if (videoDuration > 0) {
            saveVideoProgress(videoDuration, videoDuration);
        }
    };

    // Handle PDF page change - save progress
    const handlePdfPageChange = (newPage: number, total: number) => {
        setPdfPageNumber(newPage);
        setPdfPageInput(newPage);
        // Save progress when page changes
        savePdfProgress(newPage, total, pdfMaterialId || undefined);
    };

    // Handle PDF dialog close - save final progress
    const handlePdfDialogClose = () => {
        // Save current page before closing
        if (pdfTotalPages > 0) {
            savePdfProgress(pdfPageNumber, pdfTotalPages, pdfMaterialId || undefined);
        }
        setPdfDialogVisible(false);
        setPdfMaterialId(null);
    };

    // Set up auto-save interval for video progress
    useEffect(() => {
        if (videoPlaying && videoCurrentTime > 0 && videoDuration > 0) {
            // Save every 30 seconds while playing
            videoSaveIntervalRef.current = setInterval(() => {
                saveVideoProgress(videoCurrentTime, videoDuration);
            }, 30000);
        }

        return () => {
            if (videoSaveIntervalRef.current) {
                clearInterval(videoSaveIntervalRef.current);
            }
        };
    }, [videoPlaying, videoCurrentTime, videoDuration]);

    // Fetch progress when lesson changes
    useEffect(() => {
        if (state.currentLesson?._id) {
            // Reset progress states
            setVideoStartPosition(0);
            setVideoCurrentTime(0);
            setVideoDuration(0);
            setVideoProgressLoaded(false);
            setPdfPageNumber(1);
            setPdfPageInput(1);

            // Fetch saved progress for this lesson
            fetchLessonProgress(state.currentLesson._id);
        }
    }, [state.currentLesson?._id]);

    // Cleanup on unmount - save final progress
    useEffect(() => {
        return () => {
            // Save video progress on unmount
            if (videoCurrentTime > 0 && videoDuration > 0) {
                saveVideoProgress(videoCurrentTime, videoDuration);
            }
        };
    }, []);

    // Session time tracking - periodic save and page unload handling
    useEffect(() => {
        // Save session progress every 60 seconds
        sessionSaveIntervalRef.current = setInterval(() => {
            if (state.currentLesson) {
                saveSessionProgress(false);
            }
        }, 60000);

        // Handle page visibility change (tab switch, minimize)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && state.currentLesson) {
                saveSessionProgress(false);
            }
        };

        // Handle page unload (close tab, navigate away)
        const handleBeforeUnload = () => {
            if (state.currentLesson) {
                // Use sendBeacon for reliable delivery during page unload
                const data = JSON.stringify({
                    lessonId: state.currentLesson._id,
                    personId: user?.id,
                    schoolSiteId: user?.schoolSite,
                    subjectId: state.course?._id,
                    moduleId: state.currentModule?._id,
                    chapterId: state.currentChapter?._id,
                    timeSpent: Math.floor((Date.now() - lastSavedTime) / 1000),
                    status: 'in-progress',
                    bookmarkPosition: Math.floor(videoCurrentTime) // Video position in seconds
                });
                navigator.sendBeacon('/api/lms/session-progress', data);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (sessionSaveIntervalRef.current) {
                clearInterval(sessionSaveIntervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Final save on cleanup
            saveSessionProgress(false);
        };
    }, [state.currentLesson, user?.id, lastSavedTime, activeTabIndex, videoCurrentTime, pdfPageNumber]);

    // Reset lesson timer when switching lessons
    useEffect(() => {
        if (state.currentLesson?._id) {
            // Save progress for previous lesson before switching
            saveSessionProgress(false);
            // Reset timers for new lesson
            setLessonStartTime(Date.now());
            setLastSavedTime(Date.now());
        }
    }, [state.currentLesson?._id]);

    // ========================================================================
    // UTILITIES
    // ========================================================================

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return '--';
        if (minutes < 60) return `${minutes} min`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const getCompletedLessonsCount = () => {
        return Array.from(state.lessonProgress.values()).filter((p) => p.isCompleted).length;
    };

    const getModuleProgress = (moduleId: string) => {
        const moduleLessons = state.lessons.filter((l) => extractId(l.moduleId) === String(moduleId));
        if (moduleLessons.length === 0) return 0;
        const completed = moduleLessons.filter((l) => state.lessonProgress.get(l._id)?.isCompleted).length;
        return Math.round((completed / moduleLessons.length) * 100);
    };

    const getChapterLessons = (chapterId: string) => {
        return state.lessons.filter((l) => extractId(l.chapterId) === String(chapterId)).sort((a, b) => a.hierarchyOrder - b.hierarchyOrder);
    };

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================

    const renderLoader = () => (
        <div className="surface-ground min-h-screen p-4">
            <div className="grid">
                <div className="col-12 lg:col-3">
                    <Skeleton height="400px" className="mb-3" />
                </div>
                <div className="col-12 lg:col-9">
                    <Skeleton height="60px" className="mb-3" />
                    <Skeleton height="400px" />
                </div>
            </div>
        </div>
    );

    const renderCourseHeader = () => (
        <div className="surface-card border-round-xl shadow-2 p-4 mb-4">
            <div className="flex flex-column lg:flex-row gap-4">
                {/* Course Banner */}
                <div className="flex-shrink-0">
                    <div className="border-round-lg bg-primary-100 flex align-items-center justify-content-center" style={{ width: '200px', height: '120px' }}>
                        {state.course?.lmsCourse?.courseBanner ? (
                            <img src={state.course.lmsCourse.courseBanner} alt={state.course.name} className="w-full h-full border-round-lg" style={{ objectFit: 'cover' }} />
                        ) : (
                            <i className="pi pi-book text-6xl text-primary"></i>
                        )}
                    </div>
                </div>

                {/* Course Info */}
                <div className="flex-grow-1">
                    <div className="flex align-items-start justify-content-between mb-2">
                        <div>
                            <Tag value={state.course?.code || 'Course'} severity="info" className="mb-2" />
                            <h1 className="text-2xl lg:text-3xl font-bold text-900 m-0 mb-2">{state.course?.name || 'Loading...'}</h1>
                        </div>
                        <Button icon="pi pi-arrow-left" label="Back to Courses" className="p-button-text" onClick={() => router.push('/lms/my-courses')} />
                    </div>

                    <p className="text-600 line-height-3 mb-3" style={{ maxWidth: '600px' }}>
                        {state.course?.description || 'No description available'}
                    </p>

                    {/* Progress Bar */}
                    <div className="flex align-items-center gap-3">
                        <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
                            <div className="flex justify-content-between mb-1">
                                <span className="text-sm text-600">Progress</span>
                                <span className="text-sm font-semibold text-primary">{state.enrollment?.progressPercentage || 0}%</span>
                            </div>
                            <ProgressBar value={state.enrollment?.progressPercentage || 0} showValue={false} style={{ height: '8px' }} className="border-round" />
                        </div>
                        <div className="flex gap-4 text-sm">
                            <span className="text-600">
                                <i className="pi pi-book mr-1"></i>
                                {state.modules.length} Modules
                            </span>
                            <span className="text-600">
                                <i className="pi pi-play mr-1"></i>
                                {state.lessons.length} Lessons
                            </span>
                            <span className="text-600">
                                <i className="pi pi-check-circle mr-1"></i>
                                {getCompletedLessonsCount()} Completed
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCourseSidebar = () => {
        // Helper function to get content type icon
        const getContentTypeIcon = (contentType?: string) => {
            switch (contentType) {
                case 'video':
                    return 'pi-play-circle';
                case 'pdf':
                    return 'pi-file-pdf';
                case 'audio':
                    return 'pi-volume-up';
                case 'html':
                    return 'pi-code';
                case 'quiz':
                    return 'pi-question-circle';
                case 'assignment':
                    return 'pi-pencil';
                case 'interactive':
                    return 'pi-bolt';
                case 'image':
                    return 'pi-image';
                case 'link':
                case 'web_page':
                    return 'pi-link';
                default:
                    return 'pi-file';
            }
        };

        return (
            <div className="surface-card border-round-xl shadow-2 sticky" style={{ top: '1rem' }}>
                {/* Module List Header */}
                <div className="p-3 border-bottom-1 surface-border">
                    <h3 className="m-0 text-lg font-semibold text-900">
                        <i className="pi pi-list mr-2"></i>Course Content
                    </h3>
                    <p className="text-xs text-500 mt-1 mb-0">
                        {state.modules.length} modules • {state.chapters.length} chapters • {state.lessons.length} lessons
                    </p>
                </div>

                {/* Modules Accordion */}
                <ScrollPanel style={{ height: 'calc(100vh - 280px)' }}>
                    <div className="p-2">
                        {state.modules.map((module, mIndex) => {
                            const moduleChapters = state.chapters.filter((c) => extractId(c.moduleId) === String(module._id)).sort((a, b) => a.hierarchyOrder - b.hierarchyOrder);
                            const moduleLessons = state.lessons.filter((l) => extractId(l.moduleId) === String(module._id));
                            const isModuleExpanded = expandedModules.has(module._id);
                            const isCurrentModule = String(state.currentModule?._id) === String(module._id);
                            const moduleProgress = getModuleProgress(module._id);

                            return (
                                <div key={module._id} className="mb-2">
                                    {/* Module Header */}
                                    <div
                                        className={`p-3 border-round-lg cursor-pointer transition-colors transition-duration-150 ${isCurrentModule ? 'bg-primary-50 border-left-3 border-primary' : 'hover:surface-hover'}`}
                                        onClick={() => toggleModule(module._id)}
                                    >
                                        <div className="flex align-items-center justify-content-between mb-2">
                                            <div className="flex align-items-center gap-2">
                                                <Badge value={mIndex + 1} severity={isCurrentModule ? 'info' : 'warning'} />
                                                <span className={`font-semibold ${isCurrentModule ? 'text-primary' : 'text-900'}`}>{module.moduleName}</span>
                                            </div>
                                            <i className={`pi ${isModuleExpanded ? 'pi-chevron-down' : 'pi-chevron-right'} text-500`}></i>
                                        </div>
                                        <div className="flex align-items-center justify-content-between">
                                            <div className="flex align-items-center gap-2">
                                                <ProgressBar value={moduleProgress} showValue={false} style={{ height: '4px', width: '80px' }} />
                                                <span className="text-xs text-500">{moduleProgress}%</span>
                                            </div>
                                            <span className="text-xs text-500">
                                                {moduleChapters.length} ch • {moduleLessons.length} ls
                                            </span>
                                        </div>
                                    </div>

                                    {/* Chapters (Expanded when module is expanded) */}
                                    {isModuleExpanded && (
                                        <div className="pl-3 mt-2 border-left-2 surface-border ml-3">
                                            {moduleChapters.length === 0 ? (
                                                <div className="p-2 text-sm text-500 font-italic">No chapters yet</div>
                                            ) : (
                                                moduleChapters.map((chapter) => {
                                                    const chapterLessons = getChapterLessons(chapter._id);
                                                    const isChapterExpanded = expandedChapters.has(chapter._id);
                                                    const isCurrentChapter = String(state.currentChapter?._id) === String(chapter._id);
                                                    const completedInChapter = chapterLessons.filter((l) => state.lessonProgress.get(l._id)?.isCompleted).length;

                                                    return (
                                                        <div key={chapter._id} className="mb-2">
                                                            {/* Chapter Header */}
                                                            <div className={`p-2 border-round cursor-pointer ${isCurrentChapter ? 'surface-100' : 'hover:surface-hover'}`} onClick={() => toggleChapter(chapter._id)}>
                                                                <div className="flex align-items-center justify-content-between">
                                                                    <div className="flex align-items-center gap-2">
                                                                        <i className={`pi pi-folder${isChapterExpanded ? '-open text-primary' : ' text-500'}`}></i>
                                                                        <span className={`text-sm ${isCurrentChapter ? 'font-semibold text-900' : 'text-700'}`}>{chapter.chapterName}</span>
                                                                    </div>
                                                                    <div className="flex align-items-center gap-2">
                                                                        <span className="text-xs text-500">
                                                                            {completedInChapter}/{chapterLessons.length}
                                                                        </span>
                                                                        <i className={`pi ${isChapterExpanded ? 'pi-chevron-down' : 'pi-chevron-right'} text-400 text-xs`}></i>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Lessons */}
                                                            {isChapterExpanded && (
                                                                <div className="pl-4 mt-1">
                                                                    {chapterLessons.length === 0 ? (
                                                                        <div className="p-2 text-xs text-500 font-italic">No lessons yet</div>
                                                                    ) : (
                                                                        chapterLessons.map((lesson) => {
                                                                            const isCurrentLesson = String(state.currentLesson?._id) === String(lesson._id);
                                                                            const isCompleted = state.lessonProgress.get(lesson._id)?.isCompleted;
                                                                            const showQuizIndicator = isCurrentLesson && state.hasLessonQuiz;

                                                                            return (
                                                                                <div
                                                                                    key={lesson._id}
                                                                                    className={`p-2 border-round cursor-pointer flex align-items-center gap-2 ${isCurrentLesson ? 'bg-primary-100' : 'hover:surface-hover'}`}
                                                                                    onClick={() => {
                                                                                        selectLesson(lesson);
                                                                                        // Also update current module/chapter for context
                                                                                        const lessonChapter = state.chapters.find((c) => String(c._id) === String(lesson.chapterId));
                                                                                        const lessonModule = state.modules.find((m) => String(m._id) === String(lesson.moduleId));
                                                                                        if (lessonModule) updateState({ currentModule: lessonModule });
                                                                                        if (lessonChapter) updateState({ currentChapter: lessonChapter });
                                                                                        updateState({ activeView: 'learning' });
                                                                                    }}
                                                                                >
                                                                                    {isCompleted ? <i className="pi pi-check-circle text-green-500"></i> : <i className={`pi ${getContentTypeIcon(lesson.contentType)} text-400`}></i>}
                                                                                    <span className={`text-sm flex-grow-1 ${isCurrentLesson ? 'font-semibold text-primary' : 'text-700'}`}>{lesson.lessonTitle}</span>
                                                                                    {showQuizIndicator && <i className="pi pi-question-circle text-orange-500" title="Quiz Available"></i>}
                                                                                    {lesson.lessonDuration && <span className="text-xs text-500">{lesson.lessonDuration}m</span>}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollPanel>
            </div>
        );
    };

    const renderLessonContent = () => {
        if (!state.currentLesson) {
            return (
                <div className="surface-card border-round-xl shadow-2 p-6 text-center">
                    <i className="pi pi-inbox text-6xl text-300 mb-4"></i>
                    <h3 className="text-900 mb-2">No Lesson Selected</h3>
                    <p className="text-600">Select a lesson from the sidebar to begin learning</p>
                </div>
            );
        }

        return (
            <div className="surface-card border-round-xl shadow-2 overflow-hidden">
                {/* Lesson Header */}
                <div className="p-4 border-bottom-1 surface-border">
                    <div className="flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <div className="flex align-items-center gap-2 mb-2">
                                <Tag value={state.currentModule?.moduleName || ''} severity="info" />
                                <i className="pi pi-chevron-right text-300"></i>
                                <Tag value={state.currentChapter?.chapterName || ''} severity="info" />
                            </div>
                            <h2 className="text-xl lg:text-2xl font-bold text-900 m-0">{state.currentLesson.lessonTitle}</h2>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <Button icon="pi pi-chevron-left" className="p-button-outlined p-button-primary" tooltip="Previous Lesson" onClick={() => navigateLesson('prev')} />
                            <Button icon="pi pi-chevron-right" className="p-button-outlined p-button-primary" tooltip="Next Lesson" onClick={() => navigateLesson('next')} />
                            <Divider layout="vertical" className="mx-2" />
                            <Button icon="pi pi-bookmark" className="p-button-text" tooltip="Add Note" onClick={openNoteDialog} />
                            <Button icon="pi pi-check" label="Mark Complete" className="p-button-success" onClick={markLessonComplete} />
                        </div>
                    </div>
                </div>

                {/* Lesson Tabs */}
                <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
                    {/* Content Tab */}
                    <TabPanel header="Content" leftIcon="pi pi-play mr-2">
                        <div className="p-4">
                            {(() => {
                                // Primary lesson content loads from lesson.contentUrl and lesson.contentType
                                const contentUrl = state.currentLesson.contentUrl || '';
                                const contentType = state.currentLesson.contentType || 'video';

                                // Video error handler
                                const handleVideoError = (error: any) => {
                                    console.error('Video playback error:', error);
                                    showToast('error', 'Video Error', 'Failed to load video. Please try again.');
                                };

                                // PDF handlers
                                const handlePdfLoadSuccess = ({ numPages }: { numPages: number }) => {
                                    setPdfTotalPages(numPages);
                                };

                                const openPdfDialog = (url: string, materialId?: string) => {
                                    setPdfUrl(url);
                                    setPdfMaterialId(materialId || null);
                                    // Don't reset page if we have saved progress
                                    if (pdfPageNumber <= 1) {
                                        setPdfPageNumber(1);
                                        setPdfPageInput(1);
                                    }
                                    setPdfDialogVisible(true);
                                };

                                return (
                                    <>
                                        {/* Video Player - Using VideoPlayer component */}
                                        {(contentType === 'video' || contentType === 'video_link') && contentUrl && (
                                            <div className="mb-4">
                                                {/* Resume indicator */}
                                                {videoStartPosition > 0 && (
                                                    <div className="flex align-items-center gap-2 mb-2 p-2 surface-100 border-round">
                                                        <i className="pi pi-history text-primary"></i>
                                                        <span className="text-sm text-600">
                                                            Resuming from {Math.floor(videoStartPosition / 60)}:{String(Math.floor(videoStartPosition % 60)).padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="relative border-round-lg overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
                                                    <VideoPlayer
                                                        playerRef={reactPlayerRef}
                                                        url={contentUrl}
                                                        playing={videoPlaying}
                                                        controls={true}
                                                        width="100%"
                                                        height="100%"
                                                        onProgress={handleVideoProgressUpdate}
                                                        onPlay={() => setVideoPlaying(true)}
                                                        onPause={handleVideoPause}
                                                        onEnded={handleVideoEnded}
                                                        onError={handleVideoError}
                                                        onReady={handleVideoReady}
                                                        pip={true}
                                                    />
                                                </div>
                                                {/* Video Progress Indicator */}
                                                <div className="mt-2">
                                                    <div className="flex justify-content-between text-xs text-500 mb-1">
                                                        <span>
                                                            {Math.floor(videoCurrentTime / 60)}:{String(Math.floor(videoCurrentTime % 60)).padStart(2, '0')}
                                                        </span>
                                                        {videoDuration > 0 && (
                                                            <span>
                                                                {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ProgressBar value={videoProgress} showValue={false} style={{ height: '4px' }} />
                                                </div>
                                            </div>
                                        )}

                                        {/* PDF Viewer - Using react-pdf */}
                                        {(contentType === 'pdf' || contentType === 'pdf_link') && contentUrl && (
                                            <div className="mb-4">
                                                <div className="flex align-items-center justify-content-between mb-3 p-3 surface-100 border-round-lg">
                                                    <span className="font-semibold text-900">
                                                        <i className="pi pi-file-pdf mr-2 text-red-500"></i>
                                                        PDF Document
                                                    </span>
                                                    <Button icon="pi pi-expand" label="Full Screen" className="p-button-sm" onClick={() => openPdfDialog(contentUrl)} />
                                                </div>
                                                {/* Inline PDF using PdfViewer component */}
                                                <div className="border-1 surface-border border-round-lg overflow-hidden bg-gray-800" style={{ minHeight: '500px' }}>
                                                    <div className="flex flex-column align-items-center p-3">
                                                        <PdfViewer
                                                            file={contentUrl}
                                                            pageNumber={1}
                                                            width={typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.6, 800) : 600}
                                                            onLoadSuccess={({ numPages }) => setPdfTotalPages(numPages)}
                                                            onPageClick={() => openPdfDialog(contentUrl)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Audio Player */}
                                        {contentType === 'audio' && contentUrl && (
                                            <div className="mb-4 p-4 surface-100 border-round-lg">
                                                <div className="flex align-items-center gap-3 mb-3">
                                                    <i className="pi pi-volume-up text-3xl text-primary"></i>
                                                    <span className="font-semibold text-900">Audio Lesson</span>
                                                </div>
                                                <audio src={contentUrl} controls className="w-full" />
                                            </div>
                                        )}

                                        {/* HTML Content */}
                                        {contentType === 'html' && state.currentLesson.contentHtml && (
                                            <div className="mb-4 p-4 surface-card border-round-lg border-1 surface-border">
                                                <div className="prose max-w-full" dangerouslySetInnerHTML={{ __html: state.currentLesson.contentHtml }} />
                                            </div>
                                        )}

                                        {/* Quiz Content */}
                                        {contentType === 'quiz' && (
                                            <div className="mb-4 p-6 surface-100 border-round-lg text-center">
                                                <i className="pi pi-question-circle text-6xl text-purple-500 mb-3"></i>
                                                <h4 className="text-900 mb-2">Quiz Available</h4>
                                                <p className="text-600 mb-3">This lesson includes a quiz. Navigate to the Quiz tab to take it.</p>
                                                <Button label="Go to Quiz" icon="pi pi-arrow-right" className="p-button-rounded" onClick={() => setActiveTabIndex(2)} />
                                            </div>
                                        )}

                                        {/* Assignment Content */}
                                        {contentType === 'assignment' && (
                                            <div className="mb-4 p-6 surface-100 border-round-lg text-center">
                                                <i className="pi pi-pencil text-6xl text-orange-500 mb-3"></i>
                                                <h4 className="text-900 mb-2">Assignment</h4>
                                                <p className="text-600 mb-3">This lesson includes an assignment to complete.</p>
                                                {contentUrl && <Button label="Open Assignment" icon="pi pi-external-link" className="p-button-rounded" onClick={() => window.open(contentUrl, '_blank')} />}
                                            </div>
                                        )}

                                        {/* Interactive Content */}
                                        {contentType === 'interactive' && contentUrl && (
                                            <div className="mb-4">
                                                <div className="flex align-items-center justify-content-between mb-2">
                                                    <span className="font-semibold text-900">
                                                        <i className="pi pi-bolt mr-2 text-cyan-500"></i>
                                                        Interactive Content
                                                    </span>
                                                    <Button
                                                        icon="pi pi-expand"
                                                        label="Full Screen"
                                                        className="p-button-sm"
                                                        onClick={() => {
                                                            setWebUrl(contentUrl);
                                                            setWebDialogVisible(true);
                                                        }}
                                                    />
                                                </div>
                                                <iframe src={contentUrl} className="w-full border-round-lg border-1 surface-border" style={{ height: '600px' }} title="Interactive Content" allowFullScreen />
                                            </div>
                                        )}

                                        {/* Image Content */}
                                        {(contentType === 'image' || contentType === 'image_link') && contentUrl && (
                                            <div className="mb-4">
                                                <div className="flex align-items-center justify-content-between mb-2">
                                                    <span className="font-semibold text-900">
                                                        <i className="pi pi-image mr-2 text-green-500"></i>
                                                        Image Content
                                                    </span>
                                                    <Button
                                                        icon="pi pi-expand"
                                                        label="View Full Size"
                                                        className="p-button-sm p-button-text"
                                                        onClick={() => {
                                                            setImageUrl(contentUrl);
                                                            setImageTitle(state.currentLesson.lessonTitle);
                                                            setImageDialogVisible(true);
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-center surface-100 border-round-lg p-4">
                                                    <Image src={contentUrl} alt={state.currentLesson.lessonTitle} width="100%" style={{ maxHeight: '500px', objectFit: 'contain' }} preview />
                                                </div>
                                            </div>
                                        )}

                                        {/* Link / Web Page Content */}
                                        {(contentType === 'link' || contentType === 'web_page') && contentUrl && (
                                            <div className="mb-4">
                                                <div className="flex align-items-center justify-content-between mb-2">
                                                    <span className="font-semibold text-900">
                                                        <i className="pi pi-link mr-2 text-blue-500"></i>
                                                        External Resource
                                                    </span>
                                                    <Button
                                                        icon="pi pi-expand"
                                                        label="Full Screen"
                                                        className="p-button-sm"
                                                        onClick={() => {
                                                            setWebUrl(contentUrl);
                                                            setWebDialogVisible(true);
                                                        }}
                                                    />
                                                </div>
                                                <iframe src={contentUrl} className="w-full border-round-lg border-1 surface-border" style={{ height: '500px' }} title="External Content" allowFullScreen />
                                            </div>
                                        )}

                                        {/* No Content Placeholder */}
                                        {!contentUrl && !['html', 'quiz', 'assignment'].includes(contentType) && (
                                            <div className="surface-100 border-round-lg p-6 text-center mb-4">
                                                <i
                                                    className={`pi pi-${
                                                        contentType === 'video'
                                                            ? 'video'
                                                            : contentType === 'pdf'
                                                            ? 'file-pdf'
                                                            : contentType === 'audio'
                                                            ? 'volume-up'
                                                            : contentType === 'interactive'
                                                            ? 'bolt'
                                                            : contentType === 'image'
                                                            ? 'image'
                                                            : 'file'
                                                    } text-6xl text-400 mb-3`}
                                                ></i>
                                                <h4 className="text-900 mb-2">Content Not Available</h4>
                                                <p className="text-600 m-0">The {contentType || 'lesson'} content for this lesson has not been uploaded yet.</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Lesson Description */}
                            {state.currentLesson.lessonDescription && (
                                <div className="surface-50 border-round-lg p-4 mt-4">
                                    <h4 className="text-900 mb-2">
                                        <i className="pi pi-info-circle mr-2"></i>About this Lesson
                                    </h4>
                                    <p className="text-700 line-height-3 m-0">{state.currentLesson.lessonDescription}</p>
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Materials Tab */}
                    <TabPanel header="Materials" leftIcon="pi pi-folder mr-2">
                        <div className="p-4">
                            {state.materials.length === 0 ? (
                                <div className="text-center p-6">
                                    <i className="pi pi-folder-open text-5xl text-300 mb-3"></i>
                                    <p className="text-600">No additional materials for this lesson</p>
                                </div>
                            ) : (
                                <div className="grid">
                                    {state.materials.map((material) => {
                                        // Get icon and color based on material type
                                        const getTypeStyles = (type: string) => {
                                            switch (type) {
                                                case 'pdf':
                                                case 'pdf_link':
                                                    return { bg: 'bg-red-100', icon: 'file-pdf', color: 'text-red-500' };
                                                case 'video':
                                                case 'video_link':
                                                    return { bg: 'bg-blue-100', icon: 'video', color: 'text-blue-500' };
                                                case 'image':
                                                case 'image_link':
                                                    return { bg: 'bg-green-100', icon: 'image', color: 'text-green-500' };
                                                case 'link':
                                                case 'web_page':
                                                    return { bg: 'bg-purple-100', icon: 'link', color: 'text-purple-500' };
                                                case 'audio':
                                                    return { bg: 'bg-orange-100', icon: 'volume-up', color: 'text-orange-500' };
                                                default:
                                                    return { bg: 'bg-gray-100', icon: 'file', color: 'text-gray-500' };
                                            }
                                        };
                                        const styles = getTypeStyles(material.materialType);

                                        // Format file size
                                        const formatFileSize = (bytes?: number) => {
                                            if (!bytes) return '';
                                            if (bytes < 1024) return `${bytes} B`;
                                            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                                            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                                        };

                                        // Handle material click based on type
                                        const handleMaterialClick = () => {
                                            const type = material.materialType;
                                            const url = material.materialURL;

                                            if (!url) {
                                                showToast('warn', 'No URL', 'This material does not have a URL configured.');
                                                return;
                                            }

                                            if (type === 'pdf' || type === 'pdf_link') {
                                                // Open PDF in dialog
                                                setPdfUrl(url);
                                                setPdfPageNumber(1);
                                                setPdfPageInput(1);
                                                setPdfTotalPages(0);
                                                setPdfDialogVisible(true);
                                            } else if (type === 'image' || type === 'image_link') {
                                                // Open image in dialog
                                                setImageUrl(url);
                                                setImageTitle(material.materialTitle);
                                                setImageDialogVisible(true);
                                            } else if (type === 'link' || type === 'web_page') {
                                                // Open web page in dialog
                                                setWebUrl(url);
                                                setWebDialogVisible(true);
                                            } else if (type === 'video' || type === 'video_link') {
                                                // Open video in dialog
                                                setVideoDialogUrl(url);
                                                setVideoDialogTitle(material.materialTitle);
                                                setVideoDialogVisible(true);
                                            } else if (type === 'audio') {
                                                // Audio plays inline, just show a toast
                                                showToast('info', 'Audio Material', 'Click the play button on the audio player below.');
                                            } else {
                                                // For other types, show in web dialog
                                                setWebUrl(url);
                                                setWebDialogVisible(true);
                                            }
                                        };

                                        return (
                                            <div key={material._id} className="col-12 md:col-6 lg:col-4">
                                                <div className="surface-50 border-round-lg p-3 h-full hover:shadow-2 transition-all transition-duration-200 cursor-pointer" onClick={handleMaterialClick}>
                                                    <div className="flex align-items-start gap-3">
                                                        <div className="flex-shrink-0">
                                                            <div className={`w-3rem h-3rem border-round flex align-items-center justify-content-center ${styles.bg}`}>
                                                                <i className={`pi pi-${styles.icon} text-xl ${styles.color}`}></i>
                                                            </div>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h5 className="text-900 font-semibold mb-1">{material.materialTitle}</h5>
                                                            <p className="text-600 text-sm mb-2 line-clamp-2">{material.materialDescription || 'No description'}</p>
                                                            <div className="flex align-items-center gap-2 flex-wrap">
                                                                <Tag value={material.materialType} severity="info" className="text-xs" />
                                                                {material.fileSize && <span className="text-xs text-500">{formatFileSize(material.fileSize)}</span>}
                                                                {material.pageCount && <span className="text-xs text-500">{material.pageCount} pages</span>}
                                                                {material.duration && (
                                                                    <span className="text-xs text-500">
                                                                        {Math.floor(material.duration / 60)}:{(material.duration % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 flex gap-2">
                                                                <Button
                                                                    label="View"
                                                                    icon="pi pi-play"
                                                                    className="p-button-sm p-button-text"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleMaterialClick();
                                                                    }}
                                                                />
                                                                {material.isDownloadable && (
                                                                    <Button
                                                                        icon="pi pi-download"
                                                                        className="p-button-sm p-button-text p-button-secondary"
                                                                        tooltip="Download"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // Create a download link
                                                                            const link = document.createElement('a');
                                                                            link.href = material.materialURL;
                                                                            link.download = material.materialTitle || 'download';
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Quiz Tab */}
                    <TabPanel
                        header={
                            <span className="flex align-items-center gap-2">
                                Quiz
                                {state.hasLessonQuiz && <Badge severity="warning" value="!" className="ml-1" />}
                            </span>
                        }
                        leftIcon="pi pi-question-circle mr-2"
                    >
                        <div className="p-4">
                            {/* No Quiz Available */}
                            {!state.hasLessonQuiz && (
                                <div className="flex flex-column align-items-center justify-content-center py-8">
                                    <i className="pi pi-info-circle text-6xl text-400 mb-3"></i>
                                    <h4 className="text-500 mb-2">No Quiz Available</h4>
                                    <p className="text-400 text-center">There is no quiz available for this lesson yet.</p>
                                </div>
                            )}

                            {/* Quiz Available - Not Started */}
                            {state.hasLessonQuiz && !state.quizAttemptInProgress && state.quizScore === null && (
                                <div className="flex flex-column align-items-center justify-content-center py-8">
                                    <div className="text-center mb-4">
                                        <i className="pi pi-file-edit text-6xl text-orange-500 mb-3"></i>
                                        <h3 className="text-primary mb-2">Quiz Available</h3>
                                        {state.quizMeta && (
                                            <div className="text-600">
                                                <p className="mb-1">
                                                    <strong>{state.quizMeta.totalQuestions}</strong> Questions
                                                </p>
                                                <p className="mb-1">
                                                    Total Marks: <strong>{state.quizMeta.totalMarks}</strong>
                                                </p>
                                                {state.quizMeta.timeLimit && (
                                                    <p>
                                                        Time Limit: <strong>{state.quizMeta.timeLimit} minutes</strong>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Button icon="pi pi-play" label="Start Quiz" onClick={startQuizAttempt} className="p-button-lg p-button-warning" />
                                    <p className="text-500 mt-3 text-center">Click to begin your quiz session. Make sure you&apos;re ready!</p>
                                </div>
                            )}

                            {/* Quiz In Progress */}
                            {state.quizAttemptInProgress && (
                                <div className="quiz-container">
                                    <div className="flex justify-content-between align-items-center mb-4 pb-3 border-bottom-1 surface-border">
                                        <div>
                                            <h4 className="text-900 m-0">{state.quizMeta?.title || 'Lesson Quiz'}</h4>
                                            <span className="text-500">
                                                {state.currentQuizAnswers.size} of {state.quizQuestions.length} answered
                                            </span>
                                        </div>
                                        <Button icon="pi pi-send" label="Submit Quiz" onClick={submitQuiz} className="p-button-success" />
                                    </div>

                                    {/* Render all question types using DisplayQuestions component */}
                                    <DisplayQuestions questions={state.quizQuestions as QuizQuestionData[]} currentAnswers={state.currentQuizAnswers} onAnswerChange={handleQuizAnswerChange} showAllQuestions={true} />

                                    {/* Submit Button at Bottom */}
                                    <div className="flex justify-content-center mt-4 pt-4 border-top-1 surface-border">
                                        <Button icon="pi pi-send" label="Submit Quiz" onClick={submitQuiz} className="p-button-success p-button-lg" />
                                    </div>
                                </div>
                            )}

                            {/* Quiz Completed - Show Score */}
                            {state.quizScore !== null && !state.quizAttemptInProgress && (
                                <div className="flex flex-column align-items-center justify-content-center py-8">
                                    <i className="pi pi-check-circle text-6xl text-green-500 mb-3"></i>
                                    <h3 className="text-900 mb-2">Quiz Completed!</h3>
                                    <div className="text-center mb-4">
                                        <p className="text-4xl font-bold text-primary mb-2">
                                            {state.quizScore} / {state.quizMeta?.totalMarks || 0}
                                        </p>
                                        <p className="text-600">{state.quizMeta?.totalMarks && state.quizScore !== null ? `${Math.round((state.quizScore / state.quizMeta.totalMarks) * 100)}%` : ''}</p>
                                    </div>
                                    <Button icon="pi pi-refresh" label="Retake Quiz" onClick={resetQuizState} className="p-button-outlined" />
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Notes Tab */}
                    <TabPanel header="My Notes" leftIcon="pi pi-pencil mr-2">
                        <div className="p-4">
                            <div className="flex justify-content-between align-items-center mb-4">
                                <h4 className="m-0 text-900">Your Notes for this Lesson</h4>
                                <Button icon="pi pi-plus" label="Add Note" className="p-button-outlined" onClick={openNoteDialog} />
                            </div>

                            {state.notes.filter((n) => n.lessonId === state.currentLesson?._id).length === 0 ? (
                                <div className="text-center p-6 surface-50 border-round-lg">
                                    <i className="pi pi-pencil text-5xl text-300 mb-3"></i>
                                    <p className="text-600 mb-3">No notes yet for this lesson</p>
                                    <Button icon="pi pi-plus" label="Create your first note" className="p-button-outlined" onClick={openNoteDialog} />
                                </div>
                            ) : (
                                <div className="flex flex-column gap-3">
                                    {state.notes
                                        .filter((n) => n.lessonId === state.currentLesson?._id)
                                        .map((note) => (
                                            <div key={note._id} className="surface-50 border-round-lg p-4">
                                                <div className="flex justify-content-between align-items-start mb-2">
                                                    <h5 className="text-900 font-semibold m-0">{note.title}</h5>
                                                    <span className="text-xs text-500">{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}</span>
                                                </div>
                                                <div className="text-700 line-height-3" dangerouslySetInnerHTML={{ __html: note.content }} />
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Discussion Tab */}
                    <TabPanel header="Discussion" leftIcon="pi pi-comments mr-2">
                        <div className="p-4 text-center">
                            <i className="pi pi-comments text-5xl text-300 mb-3"></i>
                            <h4 className="text-900">Coming Soon</h4>
                            <p className="text-600">Lesson discussions will be available soon</p>
                        </div>
                    </TabPanel>
                </TabView>
            </div>
        );
    };

    const renderOverview = () => (
        <div className="grid">
            {/* Learning Outcomes */}
            {state.course?.lmsCourse?.learningOutcomes && state.course.lmsCourse.learningOutcomes.length > 0 && (
                <div className="col-12">
                    <div className="surface-card border-round-xl shadow-2 p-4 mb-4">
                        <h3 className="text-xl font-semibold text-900 mb-3">
                            <i className="pi pi-star mr-2 text-primary"></i>What You&apos;ll Learn
                        </h3>
                        <div className="grid">
                            {state.course.lmsCourse.learningOutcomes.map((outcome, index) => (
                                <div key={index} className="col-12 md:col-6">
                                    <div className="flex align-items-start gap-2">
                                        <i className="pi pi-check-circle text-green-500 mt-1"></i>
                                        <span className="text-700">{outcome}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Module Cards */}
            <div className="col-12">
                <h3 className="text-xl font-semibold text-900 mb-3">Course Modules</h3>
                <div className="grid">
                    {state.modules.map((module, index) => {
                        const moduleChapters = state.chapters.filter((c) => extractId(c.moduleId) === String(module._id));
                        const moduleLessons = state.lessons.filter((l) => extractId(l.moduleId) === String(module._id));
                        const progress = getModuleProgress(module._id);

                        return (
                            <div key={module._id} className="col-12 md:col-6 lg:col-4">
                                <div className="surface-card border-round-xl shadow-2 p-4 h-full cursor-pointer hover:shadow-4 transition-all transition-duration-200" onClick={() => selectModule(module)}>
                                    <div className="flex align-items-start gap-3 mb-3">
                                        <div className="flex-shrink-0 w-3rem h-3rem border-round-lg bg-primary-100 flex align-items-center justify-content-center">
                                            <span className="text-primary font-bold text-xl">{index + 1}</span>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h4 className="text-900 font-semibold m-0 mb-1">{module.moduleName}</h4>
                                            <p className="text-600 text-sm m-0 line-clamp-2">{module.moduleDescription || 'No description'}</p>
                                        </div>
                                    </div>

                                    <div className="flex align-items-center gap-3 mb-3 text-sm text-600">
                                        <span>
                                            <i className="pi pi-folder mr-1"></i>
                                            {moduleChapters.length} Chapters
                                        </span>
                                        <span>
                                            <i className="pi pi-play mr-1"></i>
                                            {moduleLessons.length} Lessons
                                        </span>
                                        {module.estimatedDuration && (
                                            <span>
                                                <i className="pi pi-clock mr-1"></i>
                                                {formatDuration(module.estimatedDuration)}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex justify-content-between mb-1">
                                            <span className="text-xs text-500">Progress</span>
                                            <span className="text-xs font-semibold">{progress}%</span>
                                        </div>
                                        <ProgressBar value={progress} showValue={false} style={{ height: '6px' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Start Learning CTA */}
            {state.modules.length > 0 && (
                <div className="col-12">
                    <div className="surface-card border-round-xl shadow-2 p-4 text-center">
                        <Button
                            icon="pi pi-play"
                            label="Continue Learning"
                            size="large"
                            className="p-button-lg"
                            onClick={() => {
                                if (state.currentModule) {
                                    updateState({ activeView: 'learning' });
                                } else {
                                    selectModule(state.modules[0]);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    // ========================================================================
    // MAIN RENDER
    // ========================================================================

    if (state.isLoading) {
        return renderLoader();
    }

    if (!state.course) {
        return (
            <div className="surface-ground min-h-screen flex align-items-center justify-content-center">
                <div className="text-center">
                    <i className="pi pi-exclamation-circle text-6xl text-orange-500 mb-4"></i>
                    <h2 className="text-900 mb-2">Course Not Found</h2>
                    <p className="text-600 mb-4">The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
                    <Button label="Browse Courses" icon="pi pi-arrow-left" onClick={() => router.push('/lms/my-courses')} />
                </div>
            </div>
        );
    }

    return (
        <div className="surface-ground min-h-screen">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 surface-card shadow-8 p-3 z-5">
                <Button icon="pi pi-list" label="Course Content" className="w-full" onClick={() => setSidebarVisible(true)} />
            </div>

            {/* Mobile Sidebar */}
            <Sidebar visible={sidebarVisible} onHide={() => setSidebarVisible(false)} className="w-full md:w-25rem">
                {renderCourseSidebar()}
            </Sidebar>

            <div className="p-3 lg:p-4 pb-8 lg:pb-4">
                {/* Course Header */}
                {renderCourseHeader()}

                {/* Main Content Area */}
                <div className="grid">
                    {/* Sidebar - Desktop */}
                    <div className="hidden lg:block lg:col-3">{renderCourseSidebar()}</div>

                    {/* Main Content */}
                    <div className="col-12 lg:col-9">{state.activeView === 'overview' ? renderOverview() : renderLessonContent()}</div>
                </div>
            </div>

            {/* Note Dialog */}
            <Dialog
                visible={noteDialogVisible}
                onHide={() => setNoteDialogVisible(false)}
                header="Add Note"
                style={{ width: '90vw', maxWidth: '600px' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" outlined onClick={() => setNoteDialogVisible(false)} />
                        <Button label="Save Note" icon="pi pi-check" onClick={saveNote} />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <div>
                        <label className="font-semibold text-900 mb-2 block">Title</label>
                        <InputText value={newNote.title} onChange={(e) => setNewNote((prev) => ({ ...prev, title: e.target.value }))} placeholder="Note title..." className="w-full" />
                    </div>
                    <div>
                        <label className="font-semibold text-900 mb-2 block">Content</label>
                        <Editor value={newNote.content} onTextChange={(e) => setNewNote((prev) => ({ ...prev, content: e.htmlValue || '' }))} style={{ height: '200px' }} />
                    </div>
                </div>
            </Dialog>

            {/* PDF Viewer Dialog */}
            <Dialog
                visible={pdfDialogVisible}
                onHide={handlePdfDialogClose}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-file-pdf text-red-500"></i>
                        <span>PDF Viewer</span>
                    </div>
                }
                maximizable
                style={{ width: '95vw', maxWidth: '1200px' }}
                contentStyle={{ padding: 0, overflow: 'hidden' }}
                footer={
                    <div className="flex align-items-center justify-content-between flex-wrap gap-2 px-3 py-2">
                        <div className="flex align-items-center gap-2">
                            <Button
                                icon="pi pi-angle-left"
                                className="p-button-sm p-button-outlined"
                                disabled={pdfPageNumber <= 1}
                                onClick={() => {
                                    const newPage = pdfPageNumber - 1;
                                    handlePdfPageChange(newPage, pdfTotalPages);
                                }}
                                tooltip="Previous Page"
                            />
                            <span className="flex align-items-center gap-2">
                                <span className="text-600">Page</span>
                                <InputNumber
                                    value={pdfPageInput}
                                    onChange={(e) => setPdfPageInput(e.value || 1)}
                                    onBlur={() => {
                                        if (pdfPageInput >= 1 && pdfPageInput <= pdfTotalPages) {
                                            handlePdfPageChange(pdfPageInput, pdfTotalPages);
                                        } else {
                                            setPdfPageInput(pdfPageNumber);
                                        }
                                    }}
                                    min={1}
                                    max={pdfTotalPages || 1}
                                    className="w-4rem"
                                    inputClassName="text-center p-1"
                                />
                                <span className="text-600">of {pdfTotalPages}</span>
                            </span>
                            <Button
                                icon="pi pi-angle-right"
                                className="p-button-sm p-button-outlined"
                                disabled={pdfPageNumber >= pdfTotalPages}
                                onClick={() => {
                                    const newPage = pdfPageNumber + 1;
                                    handlePdfPageChange(newPage, pdfTotalPages);
                                }}
                                tooltip="Next Page"
                            />
                        </div>
                        <div className="flex align-items-center gap-2">
                            <Button icon="pi pi-times" label="Close" className="p-button-sm p-button-outlined" onClick={handlePdfDialogClose} />
                        </div>
                    </div>
                }
            >
                <div className="flex justify-content-center align-items-center bg-gray-800" style={{ minHeight: '70vh', overflow: 'auto' }}>
                    {pdfUrl && <PdfViewer file={pdfUrl} pageNumber={pdfPageNumber} width={typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.85, 1000) : 800} onLoadSuccess={({ numPages }) => setPdfTotalPages(numPages)} />}
                </div>
            </Dialog>

            {/* Image Viewer Dialog */}
            <Dialog
                visible={imageDialogVisible}
                onHide={() => setImageDialogVisible(false)}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-image text-green-500"></i>
                        <span>{imageTitle || 'Image Viewer'}</span>
                    </div>
                }
                maximizable
                style={{ width: '95vw', maxWidth: '1200px' }}
                contentStyle={{ padding: 0 }}
            >
                <div className="flex justify-content-center align-items-center bg-gray-900 p-4" style={{ minHeight: '60vh' }}>
                    {imageUrl && <img src={imageUrl} alt={imageTitle || 'Image'} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />}
                </div>
            </Dialog>

            {/* Web Page Viewer Dialog */}
            <Dialog
                visible={webDialogVisible}
                onHide={() => setWebDialogVisible(false)}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-globe text-blue-500"></i>
                        <span>External Resource</span>
                    </div>
                }
                maximizable
                style={{ width: '95vw', maxWidth: '1400px' }}
                contentStyle={{ padding: 0, overflow: 'hidden' }}
                footer={
                    <div className="flex justify-content-end gap-2 px-3 py-2">
                        <Button icon="pi pi-times" label="Close" className="p-button-sm p-button-outlined" onClick={() => setWebDialogVisible(false)} />
                    </div>
                }
            >
                <iframe src={webUrl} style={{ width: '100%', height: '75vh', border: 'none' }} title="External Resource" allowFullScreen />
            </Dialog>

            {/* Video Player Dialog (for materials) */}
            <Dialog
                visible={videoDialogVisible}
                onHide={() => {
                    setVideoDialogVisible(false);
                    setVideoDialogUrl('');
                }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-video text-blue-500"></i>
                        <span>{videoDialogTitle || 'Video Player'}</span>
                    </div>
                }
                maximizable
                style={{ width: '95vw', maxWidth: '1200px' }}
                contentStyle={{ padding: 0, overflow: 'hidden', backgroundColor: '#1a1a1a' }}
                footer={
                    <div className="flex justify-content-end gap-2 px-3 py-2">
                        <Button icon="pi pi-times" label="Close" className="p-button-sm p-button-outlined" onClick={() => setVideoDialogVisible(false)} />
                    </div>
                }
            >
                <div className="flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                    {videoDialogUrl && <VideoPlayer url={videoDialogUrl} playing={true} controls={true} width="100%" height="100%" style={{ aspectRatio: '16/9' }} pip={true} />}
                </div>
            </Dialog>

            {/* Quiz Score Dialog */}
            <Dialog
                visible={state.showQuizScoreDialog}
                onHide={() => updateState({ showQuizScoreDialog: false })}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-chart-bar text-primary"></i>
                        <span>Quiz Results</span>
                    </div>
                }
                style={{ width: '90vw', maxWidth: '500px' }}
                footer={
                    <div className="flex justify-content-center gap-2">
                        <Button label="Close" icon="pi pi-times" outlined onClick={() => updateState({ showQuizScoreDialog: false })} />
                        <Button label="Retake Quiz" icon="pi pi-refresh" onClick={resetQuizState} />
                    </div>
                }
            >
                <div className="flex flex-column align-items-center py-4">
                    <i className="pi pi-trophy text-6xl text-yellow-500 mb-3"></i>
                    <h2 className="text-900 mb-2">Quiz Completed!</h2>
                    <div className="text-center">
                        <p className="text-5xl font-bold text-primary mb-2">
                            {state.quizScore} / {state.quizMeta?.totalMarks || 0}
                        </p>
                        <p className="text-xl text-600">{state.quizMeta?.totalMarks && state.quizScore !== null ? `${Math.round((state.quizScore / state.quizMeta.totalMarks) * 100)}%` : ''}</p>
                    </div>
                    <div className="mt-4 text-center">
                        {state.quizMeta?.totalMarks && state.quizScore !== null && (
                            <Tag value={state.quizScore / state.quizMeta.totalMarks >= 0.7 ? 'Passed' : 'Needs Improvement'} severity={state.quizScore / state.quizMeta.totalMarks >= 0.7 ? 'success' : 'warning'} className="text-lg px-3 py-2" />
                        )}
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default StudentLearningPortal;
