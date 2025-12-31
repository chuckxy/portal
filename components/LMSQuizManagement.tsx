'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Calendar } from 'primereact/calendar';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { OrderList } from 'primereact/orderlist';
import { RadioButton } from 'primereact/radiobutton';
import { useAuth } from '@/context/AuthContext';
import { ICourseModule } from '@/models/lms/CourseModule';
import { IChapter } from '@/models/lms/Chapter';
import { ILesson } from '@/models/lms/Lesson';

// Types
type QuizType = 'lesson' | 'chapter' | 'module' | 'course';
type QuestionType = 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'picture_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text';
type ShowAnswersAfter = 'immediately' | 'after_submission' | 'after_deadline' | 'never';

interface Subject {
    _id: string;
    name: string;
    code: string;
}

interface Person {
    _id: string;
    firstName: string;
    lastName: string;
    photoLink?: string;
}

interface QuestionOption {
    id: string;
    optionLabel: string; // A, B, C, D...
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
    optionPoints: number;
    matchingValue?: string; // For matching questions
}

interface MatchingPair {
    id: string;
    left: string;
    right: string;
}

interface QuizQuestion {
    _id?: string;
    quizId: string;
    schoolSiteId: string;
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    questionOptions: QuestionOption[];
    matchingPairs: MatchingPair[];
    correctOptions: string[];
    correctText?: string;
    points: number;
    isRequired: boolean;
    explanation?: string;
    imageUrl?: string;
    audioUrl?: string;
    sortOrder: number;
    isActive: boolean;
}

interface Quiz {
    _id?: string;
    title: string;
    description?: string;
    subjectId: string | Subject;
    moduleId: string | ICourseModule;
    chapterId: string | IChapter;
    lessonId: string | ILesson;
    schoolSiteId: string;
    addedBy: string | Person;
    quizType: QuizType;
    startDate?: string;
    endDate?: string;
    totalMarks: number;
    passingMarks: number;
    timeLimit?: number;
    maxAttempts: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showCorrectAnswers: boolean;
    showCorrectAnswersAfter: ShowAnswersAfter;
    isPublished: boolean;
    publishedAt?: string;
    isActive: boolean;
    questionCount?: number;
    attemptCount?: number;
    createdAt?: string;
}

interface DropdownOption {
    label: string;
    value: string;
}

const quizTypeOptions: DropdownOption[] = [
    { label: '📖 Lesson Quiz', value: 'lesson' },
    { label: '📚 Chapter Quiz', value: 'chapter' },
    { label: '📦 Module Quiz', value: 'module' },
    { label: '🎓 Course Quiz', value: 'course' }
];

const showAnswersOptions: DropdownOption[] = [
    { label: 'Immediately', value: 'immediately' },
    { label: 'After Submission', value: 'after_submission' },
    { label: 'After Deadline', value: 'after_deadline' },
    { label: 'Never', value: 'never' }
];

// Enhanced Quiz Type Options with Icons and Descriptions
interface QuizTypeOptionEnhanced {
    label: string;
    value: QuizType;
    icon: string;
    description: string;
    color: string;
}

const quizTypesArray: QuizTypeOptionEnhanced[] = [
    {
        label: 'Lesson Quiz',
        value: 'lesson',
        icon: 'pi pi-file',
        description: 'Quiz for a specific lesson',
        color: 'blue'
    },
    {
        label: 'Chapter Quiz',
        value: 'chapter',
        icon: 'pi pi-book',
        description: 'Quiz covering an entire chapter',
        color: 'green'
    },
    {
        label: 'Module Quiz',
        value: 'module',
        icon: 'pi pi-folder',
        description: 'Comprehensive module assessment',
        color: 'orange'
    },
    {
        label: 'Course Quiz',
        value: 'course',
        icon: 'pi pi-graduation-cap',
        description: 'Final course examination',
        color: 'purple'
    }
];

// Enhanced Show Answers Options
interface ShowAnswersOptionEnhanced {
    label: string;
    value: ShowAnswersAfter;
    icon: string;
    description: string;
}

const showAnswersOptionsEnhanced: ShowAnswersOptionEnhanced[] = [
    {
        label: 'Immediately',
        value: 'immediately',
        icon: 'pi pi-bolt',
        description: 'Show answers right after each question'
    },
    {
        label: 'After Submission',
        value: 'after_submission',
        icon: 'pi pi-check-circle',
        description: 'Show answers after quiz is submitted'
    },
    {
        label: 'After Deadline',
        value: 'after_deadline',
        icon: 'pi pi-calendar-times',
        description: 'Show answers after quiz deadline passes'
    },
    {
        label: 'Never',
        value: 'never',
        icon: 'pi pi-eye-slash',
        description: 'Never reveal correct answers'
    }
];

// Enhanced Question Types with Icons and Descriptions
interface QuestionTypeOption {
    label: string;
    value: QuestionType;
    icon: string;
    description: string;
    hasOptions: boolean;
    hasCorrectOption: boolean;
    hasMatching: boolean;
}

const questionTypesArray: QuestionTypeOption[] = [
    {
        label: 'Single Choice (Radio)',
        value: 'single_choice_radio',
        icon: 'pi pi-circle',
        description: 'Select one correct answer from radio buttons',
        hasOptions: true,
        hasCorrectOption: true,
        hasMatching: false
    },
    {
        label: 'Single Choice (Dropdown)',
        value: 'single_choice_dropdown',
        icon: 'pi pi-chevron-circle-down',
        description: 'Select one correct answer from a dropdown list',
        hasOptions: true,
        hasCorrectOption: true,
        hasMatching: false
    },
    {
        label: 'Multiple Choice',
        value: 'multiple_choice',
        icon: 'pi pi-check-square',
        description: 'Select multiple correct answers',
        hasOptions: true,
        hasCorrectOption: true,
        hasMatching: false
    },
    {
        label: 'Picture Choice',
        value: 'picture_choice',
        icon: 'pi pi-image',
        description: 'Select answer(s) from image options',
        hasOptions: true,
        hasCorrectOption: true,
        hasMatching: false
    },
    {
        label: 'Fill in the Blanks',
        value: 'fill_blanks',
        icon: 'pi pi-server',
        description: 'Use [a], [b], [c] notation for blanks',
        hasOptions: true,
        hasCorrectOption: false,
        hasMatching: false
    },
    {
        label: 'Matching',
        value: 'matching',
        icon: 'pi pi-arrow-right-arrow-left',
        description: 'Match items from left column to right column',
        hasOptions: true,
        hasCorrectOption: false,
        hasMatching: true
    },
    {
        label: 'Matching (Text)',
        value: 'matching_text',
        icon: 'pi pi-link',
        description: 'Type matching answers for items',
        hasOptions: true,
        hasCorrectOption: false,
        hasMatching: true
    },
    {
        label: 'Free Text',
        value: 'free_text',
        icon: 'pi pi-pencil',
        description: 'Open-ended text response',
        hasOptions: false,
        hasCorrectOption: false,
        hasMatching: false
    }
];

// Utility function to convert number to letter (0 -> A, 1 -> B, etc.)
const numberToLetter = (num: number): string => {
    return String.fromCharCode(65 + num);
};

interface LMSQuizManagementProps {
    subjectId?: string;
    lessonId?: string;
    embedded?: boolean;
}

const LMSQuizManagement: React.FC<LMSQuizManagementProps> = ({ subjectId: propSubjectId, lessonId: propLessonId, embedded = false }) => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);

    // Quiz State
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<Quiz>(getEmptyQuiz());

    // Question State
    const [questionsDialogVisible, setQuestionsDialogVisible] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [questionDialogVisible, setQuestionDialogVisible] = useState(false);
    const [isEditQuestion, setIsEditQuestion] = useState(false);
    const [questionFormData, setQuestionFormData] = useState<QuizQuestion>(getEmptyQuestion(''));

    // Lookup Data
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [modules, setModules] = useState<ICourseModule[]>([]);
    const [chapters, setChapters] = useState<IChapter[]>([]);
    const [lessons, setLessons] = useState<ILesson[]>([]);

    // Filters
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [selectedQuizType, setSelectedQuizType] = useState<string>('');

    function getEmptyQuiz(): Quiz {
        return {
            title: '',
            description: '',
            subjectId: propSubjectId || '',
            moduleId: '',
            chapterId: '',
            lessonId: propLessonId || '',
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            quizType: 'lesson',
            totalMarks: 0,
            passingMarks: 0,
            timeLimit: 30,
            maxAttempts: 1,
            shuffleQuestions: false,
            shuffleOptions: false,
            showCorrectAnswers: true,
            showCorrectAnswersAfter: 'after_submission',
            isPublished: false,
            isActive: true
        };
    }

    function getEmptyQuestion(quizId: string): QuizQuestion {
        return {
            quizId,
            schoolSiteId: user?.schoolSite || '',
            questionNumber: 1,
            questionText: '',
            questionType: 'single_choice_radio',
            questionOptions: [
                { id: '1', optionLabel: 'A', text: '', isCorrect: false, optionPoints: 0 },
                { id: '2', optionLabel: 'B', text: '', isCorrect: false, optionPoints: 0 },
                { id: '3', optionLabel: 'C', text: '', isCorrect: false, optionPoints: 0 },
                { id: '4', optionLabel: 'D', text: '', isCorrect: false, optionPoints: 0 }
            ],
            matchingPairs: [],
            correctOptions: [],
            points: 1,
            isRequired: true,
            sortOrder: 1,
            isActive: true
        };
    }

    // Get current question type config
    const getCurrentQuestionType = (): QuestionTypeOption | undefined => {
        return questionTypesArray.find((t) => t.value === questionFormData.questionType);
    };

    useEffect(() => {
        if (user?.schoolSite) {
            fetchSubjects();
            fetchQuizzes();
        }
    }, [user, selectedQuizType]);

    useEffect(() => {
        if (formData.subjectId && typeof formData.subjectId === 'string') {
            fetchModules(formData.subjectId);
        }
    }, [formData.subjectId]);

    useEffect(() => {
        if (formData.moduleId && typeof formData.moduleId === 'string') {
            fetchChapters(formData.moduleId);
        }
    }, [formData.moduleId]);

    useEffect(() => {
        if (formData.chapterId && typeof formData.chapterId === 'string') {
            fetchLessons(formData.chapterId);
        }
    }, [formData.chapterId]);

    const fetchSubjects = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            params.append('isLMSEnabled', 'true');

            const response = await fetch(`/api/subjects?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchModules = async (subjectId: string) => {
        try {
            const params = new URLSearchParams({ subjectId });
            const response = await fetch(`/api/lms/course-modules?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setModules(data.modules || []);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchChapters = async (moduleId: string) => {
        try {
            const params = new URLSearchParams({ moduleId });
            const response = await fetch(`/api/lms/chapters?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setChapters(data.chapters || []);
            }
        } catch (error) {
            console.error('Error fetching chapters:', error);
        }
    };

    const fetchLessons = async (chapterId: string) => {
        try {
            const params = new URLSearchParams({ chapterId });
            const response = await fetch(`/api/lms/lessons?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLessons(data.lessons || []);
            }
        } catch (error) {
            console.error('Error fetching lessons:', error);
        }
    };

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            if (propSubjectId) params.append('subjectId', propSubjectId);
            if (propLessonId) params.append('lessonId', propLessonId);
            if (selectedQuizType) params.append('quizType', selectedQuizType);

            const response = await fetch(`/api/lms/quizzes?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data.quizzes || []);
            } else {
                showToast('error', 'Error', 'Failed to load quizzes');
            }
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            showToast('error', 'Error', 'Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (quizId: string) => {
        try {
            const response = await fetch(`/api/lms/quiz-questions?quizId=${quizId}`);
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions || []);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        const emptyQuiz = getEmptyQuiz();
        setFormData(emptyQuiz);
        setModules([]);
        setChapters([]);
        setLessons([]);
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = async (quiz: Quiz) => {
        // Extract IDs from populated objects
        const subjectId = typeof quiz.subjectId === 'object' ? quiz.subjectId._id : quiz.subjectId;
        const moduleId = typeof quiz.moduleId === 'object' ? quiz.moduleId._id : quiz.moduleId;
        const chapterId = typeof quiz.chapterId === 'object' ? quiz.chapterId._id : quiz.chapterId;
        const lessonId = typeof quiz.lessonId === 'object' ? quiz.lessonId._id : quiz.lessonId;

        // Fetch dependent data
        if (subjectId) await fetchModules(subjectId);
        if (moduleId) await fetchChapters(moduleId as string);
        if (chapterId) await fetchLessons(chapterId as string);

        setFormData({
            ...quiz,
            subjectId,
            moduleId: moduleId as string,
            chapterId: chapterId as string,
            lessonId: lessonId as string,
            addedBy: typeof quiz.addedBy === 'object' ? quiz.addedBy._id : quiz.addedBy
        });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const openQuestions = async (quiz: Quiz) => {
        setCurrentQuiz(quiz);
        await fetchQuestions(quiz._id!);
        setQuestionsDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyQuiz());
    };

    const hideQuestionsDialog = () => {
        setQuestionsDialogVisible(false);
        setCurrentQuiz(null);
        setQuestions([]);
    };

    const saveQuiz = async () => {
        if (!formData.title || !formData.subjectId || !formData.moduleId || !formData.chapterId || !formData.lessonId) {
            showToast('error', 'Validation Error', 'Title and all location fields are required');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/quizzes/${formData._id}` : '/api/lms/quizzes';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Quiz ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchQuizzes();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save quiz');
            }
        } catch (error) {
            console.error('Error saving quiz:', error);
            showToast('error', 'Error', 'An error occurred while saving quiz');
        } finally {
            setLoading(false);
        }
    };

    const deleteQuiz = async (quizId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this quiz? This will also delete all questions.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/lms/quizzes/${quizId}`, { method: 'DELETE' });
                    if (response.ok) {
                        showToast('success', 'Success', 'Quiz deleted successfully');
                        fetchQuizzes();
                    } else {
                        showToast('error', 'Error', 'Failed to delete quiz');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                }
            }
        });
    };

    const togglePublish = async (quiz: Quiz) => {
        try {
            const response = await fetch(`/api/lms/quizzes/${quiz._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !quiz.isPublished })
            });

            if (response.ok) {
                showToast('success', 'Success', quiz.isPublished ? 'Quiz unpublished' : 'Quiz published');
                fetchQuizzes();
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred');
        }
    };

    // Question Functions
    const openNewQuestion = () => {
        if (!currentQuiz?._id) return;
        setQuestionFormData({
            ...getEmptyQuestion(currentQuiz._id),
            questionNumber: questions.length + 1,
            sortOrder: questions.length + 1
        });
        setIsEditQuestion(false);
        setQuestionDialogVisible(true);
    };

    const openEditQuestion = (question: QuizQuestion) => {
        setQuestionFormData({ ...question });
        setIsEditQuestion(true);
        setQuestionDialogVisible(true);
    };

    const hideQuestionDialog = () => {
        setQuestionDialogVisible(false);
        setQuestionFormData(getEmptyQuestion(''));
    };

    const saveQuestion = async () => {
        if (!questionFormData.questionText) {
            showToast('error', 'Validation Error', 'Question text is required');
            return;
        }

        // Build correct options from question options
        const correctOptions = questionFormData.questionOptions.filter((opt) => opt.isCorrect).map((opt) => opt.id);

        try {
            const url = isEditQuestion ? `/api/lms/quiz-questions/${questionFormData._id}` : '/api/lms/quiz-questions';
            const method = isEditQuestion ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...questionFormData,
                    correctOptions
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Question ${isEditQuestion ? 'updated' : 'added'} successfully`);
                hideQuestionDialog();
                fetchQuestions(currentQuiz!._id!);
                fetchQuizzes(); // Refresh to update total marks
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save question');
            }
        } catch (error) {
            console.error('Error saving question:', error);
            showToast('error', 'Error', 'An error occurred');
        }
    };

    const deleteQuestion = async (questionId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this question?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/lms/quiz-questions/${questionId}`, { method: 'DELETE' });
                    if (response.ok) {
                        showToast('success', 'Success', 'Question deleted');
                        fetchQuestions(currentQuiz!._id!);
                        fetchQuizzes();
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                }
            }
        });
    };

    const addOption = () => {
        const newIndex = questionFormData.questionOptions.length;
        const newId = String(Date.now());
        setQuestionFormData((prev) => ({
            ...prev,
            questionOptions: [
                ...prev.questionOptions,
                {
                    id: newId,
                    optionLabel: numberToLetter(newIndex),
                    text: '',
                    isCorrect: false,
                    optionPoints: 0,
                    matchingValue: ''
                }
            ]
        }));
    };

    const removeOption = (index: number) => {
        setQuestionFormData((prev) => {
            // Reindex option labels after removal
            const filteredOptions = prev.questionOptions.filter((_, i) => i !== index);
            const reindexedOptions = filteredOptions.map((opt, i) => ({
                ...opt,
                optionLabel: numberToLetter(i)
            }));
            return { ...prev, questionOptions: reindexedOptions };
        });
    };

    const updateOption = (index: number, field: keyof QuestionOption, value: string | boolean | number) => {
        setQuestionFormData((prev) => {
            const updated = [...prev.questionOptions];
            updated[index] = { ...updated[index], [field]: value };

            // For single choice, ensure only one option is correct
            if (field === 'isCorrect' && value === true && (prev.questionType === 'single_choice_radio' || prev.questionType === 'single_choice_dropdown')) {
                updated.forEach((opt, i) => {
                    if (i !== index) opt.isCorrect = false;
                });
            }

            return { ...prev, questionOptions: updated };
        });
    };

    // Handle question type change with appropriate option adjustments
    const handleQuestionTypeChange = (newType: QuestionType) => {
        const typeConfig = questionTypesArray.find((t) => t.value === newType);

        setQuestionFormData((prev) => {
            let newOptions = [...prev.questionOptions];

            // Reset matching values if not a matching question
            if (!typeConfig?.hasMatching) {
                newOptions = newOptions.map((opt) => ({ ...opt, matchingValue: undefined }));
            }

            // Reset isCorrect if the type doesn't have correct options
            if (!typeConfig?.hasCorrectOption) {
                newOptions = newOptions.map((opt) => ({ ...opt, isCorrect: false }));
            }

            // For free text, clear options
            if (newType === 'free_text') {
                newOptions = [];
            }

            // For fill_blanks, ensure at least one option for each blank
            if (newType === 'fill_blanks' && newOptions.length === 0) {
                newOptions = [
                    { id: '1', optionLabel: 'A', text: '', isCorrect: false, optionPoints: 0 },
                    { id: '2', optionLabel: 'B', text: '', isCorrect: false, optionPoints: 0 }
                ];
            }

            return {
                ...prev,
                questionType: newType,
                questionOptions: newOptions
            };
        });
    };

    // Add matching pair
    const addMatchingPair = () => {
        const newId = String(Date.now());
        setQuestionFormData((prev) => ({
            ...prev,
            matchingPairs: [...prev.matchingPairs, { id: newId, left: '', right: '' }]
        }));
    };

    // Remove matching pair
    const removeMatchingPair = (index: number) => {
        setQuestionFormData((prev) => ({
            ...prev,
            matchingPairs: prev.matchingPairs.filter((_, i) => i !== index)
        }));
    };

    // Update matching pair
    const updateMatchingPair = (index: number, field: 'left' | 'right', value: string) => {
        setQuestionFormData((prev) => {
            const updated = [...prev.matchingPairs];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, matchingPairs: updated };
        });
    };

    // Templates
    const leftToolbarTemplate = () => (
        <div className="flex gap-2 flex-wrap align-items-center">
            <Button label="New Quiz" icon="pi pi-plus" severity="success" onClick={openNew} />
            <Dropdown value={selectedQuizType} options={[{ label: 'All Types', value: '' }, ...quizTypeOptions]} onChange={(e) => setSelectedQuizType(e.value)} placeholder="Filter by Type" className="w-auto" showClear />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={(e) => setGlobalFilterValue(e.target.value)} placeholder="Search quizzes..." />
            </span>
            <Button icon="pi pi-refresh" severity="info" onClick={fetchQuizzes} loading={loading} tooltip="Refresh" />
        </div>
    );

    const titleBodyTemplate = (rowData: Quiz) => (
        <div className="flex align-items-center gap-2">
            {rowData.isPublished && <i className="pi pi-check-circle text-green-500" title="Published"></i>}
            <span className="font-semibold">{rowData.title}</span>
        </div>
    );

    const typeBodyTemplate = (rowData: Quiz) => {
        const typeConfig: Record<QuizType, { icon: string; severity: 'success' | 'info' | 'warning' | 'danger' }> = {
            lesson: { icon: 'pi pi-file', severity: 'info' },
            chapter: { icon: 'pi pi-book', severity: 'success' },
            module: { icon: 'pi pi-folder', severity: 'warning' },
            course: { icon: 'pi pi-graduation-cap', severity: 'danger' }
        };
        const config = typeConfig[rowData.quizType];
        return <Tag value={rowData.quizType.charAt(0).toUpperCase() + rowData.quizType.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const courseBodyTemplate = (rowData: Quiz) => {
        const subject = typeof rowData.subjectId === 'object' ? rowData.subjectId : null;
        if (!subject) return <span className="text-500">-</span>;
        return (
            <div>
                <div className="font-semibold text-sm">{subject.code}</div>
                <small className="text-500">{subject.name}</small>
            </div>
        );
    };

    const statsBodyTemplate = (rowData: Quiz) => (
        <div className="flex gap-3">
            <div className="flex align-items-center gap-1" title="Questions">
                <i className="pi pi-question-circle text-500"></i>
                <span className="text-sm">{rowData.questionCount || 0}</span>
            </div>
            <div className="flex align-items-center gap-1" title="Attempts">
                <i className="pi pi-users text-500"></i>
                <span className="text-sm">{rowData.attemptCount || 0}</span>
            </div>
            <div className="flex align-items-center gap-1" title="Total Marks">
                <i className="pi pi-star text-500"></i>
                <span className="text-sm">{rowData.totalMarks}</span>
            </div>
        </div>
    );

    const settingsBodyTemplate = (rowData: Quiz) => (
        <div className="flex gap-2 flex-wrap">
            {rowData.timeLimit && <Tag value={`${rowData.timeLimit}min`} severity="info" icon="pi pi-clock" />}
            {rowData.maxAttempts > 1 && <Tag value={`${rowData.maxAttempts}x`} severity="warning" icon="pi pi-replay" />}
        </div>
    );

    const actionBodyTemplate = (rowData: Quiz) => (
        <div className="flex gap-1">
            <Button icon="pi pi-list" rounded outlined severity="help" onClick={() => openQuestions(rowData)} tooltip="Questions" tooltipOptions={{ position: 'top' }} />
            <Button
                icon={rowData.isPublished ? 'pi pi-eye-slash' : 'pi pi-eye'}
                rounded
                outlined
                severity={rowData.isPublished ? 'warning' : 'success'}
                onClick={() => togglePublish(rowData)}
                tooltip={rowData.isPublished ? 'Unpublish' : 'Publish'}
                tooltipOptions={{ position: 'top' }}
            />
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteQuiz(rowData._id!)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const questionItemTemplate = (item: QuizQuestion) => {
        const typeConfig = questionTypesArray.find((t) => t.value === item.questionType);
        return (
            <div className="flex align-items-center justify-content-between p-3 border-round-lg surface-50 hover:surface-100 transition-colors mb-2 w-full border-left-3 border-primary">
                <div className="flex align-items-center gap-3 flex-grow-1">
                    <div className="flex flex-column align-items-center gap-1">
                        <Badge value={item.questionNumber} severity="info" className="w-2rem h-2rem flex align-items-center justify-content-center" />
                        <i className={`${typeConfig?.icon || 'pi pi-question'} text-primary text-sm`} title={typeConfig?.label}></i>
                    </div>
                    <div className="flex-grow-1">
                        <div className="font-semibold text-900 mb-2 line-height-3" style={{ maxWidth: '500px' }}>
                            {item.questionText.length > 100 ? `${item.questionText.substring(0, 100)}...` : item.questionText}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Tag value={typeConfig?.label || item.questionType.replace(/_/g, ' ')} severity="info" className="text-xs" icon={typeConfig?.icon} />
                            <Tag value={`${item.points} pts`} severity="success" className="text-xs" icon="pi pi-star" />
                            {item.isRequired && <Tag value="Required" severity="warning" className="text-xs" />}
                            {item.questionOptions?.length > 0 && <Tag value={`${item.questionOptions.length} options`} className="text-xs bg-purple-100 text-purple-700" />}
                            {item.matchingPairs?.length > 0 && <Tag value={`${item.matchingPairs.length} pairs`} className="text-xs bg-cyan-100 text-cyan-700" />}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button icon="pi pi-pencil" rounded outlined size="small" onClick={() => openEditQuestion(item)} tooltip="Edit Question" tooltipOptions={{ position: 'top' }} />
                    <Button icon="pi pi-trash" rounded outlined severity="danger" size="small" onClick={() => deleteQuestion(item._id!)} tooltip="Delete Question" tooltipOptions={{ position: 'top' }} />
                </div>
            </div>
        );
    };

    const dialogFooter = (
        <div className="flex justify-content-between align-items-center">
            <div className="flex align-items-center gap-2 text-500">
                <i className="pi pi-info-circle"></i>
                <small>
                    {formData.title ? `${formData.title}` : 'Untitled Quiz'} • {quizTypesArray.find((t) => t.value === formData.quizType)?.label || 'Select Type'}
                </small>
            </div>
            <div className="flex gap-2">
                <Button label="Cancel" icon="pi pi-times" outlined severity="secondary" onClick={hideDialog} />
                <Button label={isEditMode ? 'Update Quiz' : 'Create Quiz'} icon={isEditMode ? 'pi pi-check' : 'pi pi-plus'} onClick={saveQuiz} loading={loading} severity="success" />
            </div>
        </div>
    );

    const questionDialogFooter = (
        <div className="flex justify-content-between align-items-center">
            <div className="flex align-items-center gap-2 text-500">
                <i className="pi pi-info-circle"></i>
                <small>
                    {getCurrentQuestionType()?.hasOptions && !getCurrentQuestionType()?.hasMatching
                        ? `${questionFormData.questionOptions.filter((o) => o.isCorrect).length} correct answer(s) selected`
                        : getCurrentQuestionType()?.hasMatching
                        ? `${questionFormData.matchingPairs.length} matching pairs`
                        : 'Free-form response'}
                </small>
            </div>
            <div className="flex gap-2">
                <Button label="Cancel" icon="pi pi-times" outlined severity="secondary" onClick={hideQuestionDialog} className="p-button-sm" />
                <Button label={isEditQuestion ? 'Update Question' : 'Save Question'} icon={isEditQuestion ? 'pi pi-check' : 'pi pi-plus'} onClick={saveQuestion} severity="success" className="p-button-sm" />
            </div>
        </div>
    );

    const content = (
        <>
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Header */}
            {!embedded && (
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Quiz Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Create and manage course quizzes and assessments</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Badge value={quizzes.length.toString()} severity="info" />
                        <i className="pi pi-question-circle text-4xl md:text-5xl text-primary"></i>
                    </div>
                </div>
            )}

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={quizzes}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                dataKey="_id"
                globalFilter={globalFilterValue}
                globalFilterFields={['title', 'description']}
                emptyMessage="No quizzes found"
                className="datatable-responsive"
                responsiveLayout="scroll"
                stripedRows
            >
                <Column body={titleBodyTemplate} header="Title" sortable field="title" style={{ minWidth: '200px' }} />
                <Column body={courseBodyTemplate} header="Course" style={{ minWidth: '150px' }} />
                <Column body={typeBodyTemplate} header="Type" field="quizType" sortable style={{ minWidth: '100px' }} />
                <Column body={statsBodyTemplate} header="Stats" style={{ minWidth: '150px' }} />
                <Column body={settingsBodyTemplate} header="Settings" style={{ minWidth: '120px' }} />
                <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '180px' }} />
            </DataTable>

            {/* Create/Edit Quiz Dialog - Enhanced Modern UI */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '900px' }}
                header={
                    <div className="flex align-items-center gap-3">
                        <div className={`flex align-items-center justify-content-center border-round ${isEditMode ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: '48px', height: '48px' }}>
                            <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-white text-2xl`}></i>
                        </div>
                        <div>
                            <h3 className="m-0 text-900 font-bold">{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h3>
                            <small className="text-500">{isEditMode ? 'Update quiz details and settings' : 'Set up a new quiz for your students'}</small>
                        </div>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <TabView className="quiz-dialog-tabs">
                    {/* Tab 1: Basic Info */}
                    <TabPanel
                        header={
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-info-circle"></i>
                                <span>Basic Info</span>
                            </div>
                        }
                    >
                        <div className="p-3">
                            {/* Quiz Title */}
                            <div className="mb-4">
                                <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                                    <i className="pi pi-bookmark text-primary"></i>
                                    Quiz Title <span className="text-red-500">*</span>
                                </label>
                                <InputText value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} placeholder="Enter a descriptive quiz title..." className="w-full text-lg" />
                            </div>

                            {/* Quiz Description */}
                            <div className="mb-4">
                                <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                                    <i className="pi pi-align-left text-primary"></i>
                                    Description
                                    <span className="text-500 font-normal text-sm">(optional)</span>
                                </label>
                                <InputTextarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    placeholder="Describe the purpose of this quiz, what topics it covers, and any instructions for students..."
                                    className="w-full"
                                    autoResize
                                />
                            </div>

                            {/* Quiz Type Selection */}
                            <div className="mb-4">
                                <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                                    <i className="pi pi-tag text-primary"></i>
                                    Quiz Type <span className="text-red-500">*</span>
                                </label>
                                <div className="grid">
                                    {quizTypesArray.map((type) => (
                                        <div key={type.value} className="col-12 md:col-6 lg:col-3">
                                            <div
                                                className={`p-3 border-round-lg cursor-pointer transition-all transition-duration-200 ${
                                                    formData.quizType === type.value ? `border-2 border-${type.color}-500 bg-${type.color}-50` : 'border-1 border-200 hover:border-300 hover:surface-50'
                                                }`}
                                                onClick={() => setFormData((prev) => ({ ...prev, quizType: type.value }))}
                                            >
                                                <div className="flex flex-column align-items-center text-center gap-2">
                                                    <div
                                                        className={`flex align-items-center justify-content-center border-round-lg ${formData.quizType === type.value ? `bg-${type.color}-500` : 'surface-200'}`}
                                                        style={{ width: '48px', height: '48px' }}
                                                    >
                                                        <i className={`${type.icon} text-xl ${formData.quizType === type.value ? 'text-white' : 'text-600'}`}></i>
                                                    </div>
                                                    <div className="font-semibold text-900">{type.label}</div>
                                                    <small className="text-500 line-height-3">{type.description}</small>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    {/* Tab 2: Location */}
                    <TabPanel
                        header={
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-sitemap"></i>
                                <span>Location</span>
                            </div>
                        }
                    >
                        <div className="p-3">
                            {/* Location Description */}
                            <div className="p-3 surface-100 border-round-lg mb-4">
                                <div className="flex align-items-center gap-2 mb-2">
                                    <i className="pi pi-info-circle text-blue-500"></i>
                                    <span className="font-semibold text-700">Where will this quiz appear?</span>
                                </div>
                                <p className="text-600 m-0 text-sm line-height-3">Select the course hierarchy to determine where students will access this quiz. Follow the path: Course → Module → Chapter → Lesson.</p>
                            </div>

                            {/* Cascading Dropdowns */}
                            <div className="grid">
                                {/* Course Selection */}
                                <div className="col-12 md:col-6">
                                    <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                                        <i className="pi pi-graduation-cap text-purple-500"></i>
                                        Course <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        value={formData.subjectId}
                                        options={subjects.map((s) => ({ label: `${s.code} - ${s.name}`, value: s._id }))}
                                        onChange={(e) => {
                                            setFormData((prev) => ({ ...prev, subjectId: e.value, moduleId: '', chapterId: '', lessonId: '' }));
                                            setModules([]);
                                            setChapters([]);
                                            setLessons([]);
                                        }}
                                        placeholder="Select a course"
                                        className="w-full"
                                        filter
                                        filterPlaceholder="Search courses..."
                                        disabled={!!propSubjectId}
                                        showClear={!propSubjectId}
                                    />
                                    {!formData.subjectId && <small className="text-orange-500 mt-1 block">Please select a course first</small>}
                                </div>

                                {/* Module Selection */}
                                <div className="col-12 md:col-6">
                                    <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                                        <i className="pi pi-folder text-orange-500"></i>
                                        Module <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        value={formData.moduleId}
                                        options={modules.map((m) => ({ label: m.moduleName, value: m._id }))}
                                        onChange={(e) => {
                                            setFormData((prev) => ({ ...prev, moduleId: e.value, chapterId: '', lessonId: '' }));
                                            setChapters([]);
                                            setLessons([]);
                                        }}
                                        placeholder={formData.subjectId ? 'Select a module' : 'Select a course first'}
                                        className="w-full"
                                        filter
                                        filterPlaceholder="Search modules..."
                                        disabled={!formData.subjectId}
                                        showClear
                                    />
                                </div>

                                {/* Chapter Selection */}
                                <div className="col-12 md:col-6">
                                    <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                                        <i className="pi pi-book text-green-500"></i>
                                        Chapter <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        value={formData.chapterId}
                                        options={chapters.map((c) => ({ label: c.chapterName, value: c._id }))}
                                        onChange={(e) => {
                                            setFormData((prev) => ({ ...prev, chapterId: e.value, lessonId: '' }));
                                            setLessons([]);
                                        }}
                                        placeholder={formData.moduleId ? 'Select a chapter' : 'Select a module first'}
                                        className="w-full"
                                        filter
                                        filterPlaceholder="Search chapters..."
                                        disabled={!formData.moduleId}
                                        showClear
                                    />
                                </div>

                                {/* Lesson Selection */}
                                <div className="col-12 md:col-6">
                                    <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                                        <i className="pi pi-file text-blue-500"></i>
                                        Lesson <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        value={formData.lessonId}
                                        options={lessons.map((l) => ({ label: l.lessonTitle, value: l._id }))}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, lessonId: e.value }))}
                                        placeholder={formData.chapterId ? 'Select a lesson' : 'Select a chapter first'}
                                        className="w-full"
                                        filter
                                        filterPlaceholder="Search lessons..."
                                        disabled={!formData.chapterId || !!propLessonId}
                                        showClear={!propLessonId}
                                    />
                                </div>
                            </div>

                            {/* Location Path Preview */}
                            {formData.subjectId && (
                                <div className="mt-4 p-3 border-round-lg surface-50 border-left-3 border-primary">
                                    <div className="flex align-items-center gap-2 mb-2">
                                        <i className="pi pi-sitemap text-primary"></i>
                                        <span className="font-semibold text-700">Quiz Location Path</span>
                                    </div>
                                    <div className="flex flex-wrap align-items-center gap-2">
                                        <Tag value={subjects.find((s) => s._id === formData.subjectId)?.code || 'Course'} severity="info" icon="pi pi-graduation-cap" />
                                        {formData.moduleId && (
                                            <>
                                                <i className="pi pi-chevron-right text-400"></i>
                                                <Tag value={modules.find((m) => String(m._id) === String(formData.moduleId))?.moduleName || 'Module'} className="bg-orange-100 text-orange-700" icon="pi pi-folder" />
                                            </>
                                        )}
                                        {formData.chapterId && (
                                            <>
                                                <i className="pi pi-chevron-right text-400"></i>
                                                <Tag value={chapters.find((c) => String(c._id) === String(formData.chapterId))?.chapterName || 'Chapter'} severity="success" icon="pi pi-book" />
                                            </>
                                        )}
                                        {formData.lessonId && (
                                            <>
                                                <i className="pi pi-chevron-right text-400"></i>
                                                <Tag value={lessons.find((l) => String(l._id) === String(formData.lessonId))?.lessonTitle || 'Lesson'} className="bg-blue-100 text-blue-700" icon="pi pi-file" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Tab 3: Settings */}
                    <TabPanel
                        header={
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-cog"></i>
                                <span>Settings</span>
                            </div>
                        }
                    >
                        <div className="p-3">
                            {/* Scoring Section */}
                            <div className="mb-4">
                                <h4 className="text-900 font-bold mb-3 flex align-items-center gap-2">
                                    <i className="pi pi-star text-yellow-500"></i>
                                    Scoring & Attempts
                                </h4>
                                <div className="grid">
                                    <div className="col-12 md:col-4">
                                        <label className="font-semibold text-700 mb-2 block">Passing Score</label>
                                        <div className="p-inputgroup">
                                            <InputNumber value={formData.passingMarks} onValueChange={(e) => setFormData((prev) => ({ ...prev, passingMarks: e.value || 0 }))} min={0} className="w-full" />
                                            <span className="p-inputgroup-addon">points</span>
                                        </div>
                                        <small className="text-500 mt-1 block">Minimum score to pass</small>
                                    </div>

                                    <div className="col-12 md:col-4">
                                        <label className="font-semibold text-700 mb-2 block">Time Limit</label>
                                        <div className="p-inputgroup">
                                            <InputNumber value={formData.timeLimit} onValueChange={(e) => setFormData((prev) => ({ ...prev, timeLimit: e.value || undefined }))} min={1} max={480} className="w-full" placeholder="No limit" />
                                            <span className="p-inputgroup-addon">
                                                <i className="pi pi-clock"></i>
                                            </span>
                                        </div>
                                        <small className="text-500 mt-1 block">Minutes (leave empty for unlimited)</small>
                                    </div>

                                    <div className="col-12 md:col-4">
                                        <label className="font-semibold text-700 mb-2 block">Max Attempts</label>
                                        <div className="p-inputgroup">
                                            <InputNumber
                                                value={formData.maxAttempts}
                                                onValueChange={(e) => setFormData((prev) => ({ ...prev, maxAttempts: e.value || 1 }))}
                                                min={1}
                                                max={100}
                                                showButtons
                                                buttonLayout="horizontal"
                                                decrementButtonClassName="p-button-outlined p-button-secondary"
                                                incrementButtonClassName="p-button-outlined p-button-secondary"
                                                incrementButtonIcon="pi pi-plus"
                                                decrementButtonIcon="pi pi-minus"
                                                className="w-full"
                                            />
                                        </div>
                                        <small className="text-500 mt-1 block">Times student can retry</small>
                                    </div>
                                </div>
                            </div>

                            <Divider />

                            {/* Schedule Section */}
                            <div className="mb-4">
                                <h4 className="text-900 font-bold mb-3 flex align-items-center gap-2">
                                    <i className="pi pi-calendar text-blue-500"></i>
                                    Schedule
                                </h4>
                                <div className="grid">
                                    <div className="col-12 md:col-6">
                                        <label className="font-semibold text-700 mb-2 block flex align-items-center gap-2">
                                            <i className="pi pi-play text-green-500"></i>
                                            Start Date & Time
                                        </label>
                                        <Calendar
                                            value={formData.startDate ? new Date(formData.startDate) : null}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.value?.toISOString() || '' }))}
                                            showIcon
                                            showTime
                                            hourFormat="12"
                                            className="w-full"
                                            placeholder="Select start date..."
                                            showButtonBar
                                        />
                                        <small className="text-500 mt-1 block">When students can start taking the quiz</small>
                                    </div>

                                    <div className="col-12 md:col-6">
                                        <label className="font-semibold text-700 mb-2 block flex align-items-center gap-2">
                                            <i className="pi pi-stop text-red-500"></i>
                                            End Date & Time
                                        </label>
                                        <Calendar
                                            value={formData.endDate ? new Date(formData.endDate) : null}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.value?.toISOString() || '' }))}
                                            showIcon
                                            showTime
                                            hourFormat="12"
                                            className="w-full"
                                            placeholder="Select end date..."
                                            showButtonBar
                                            minDate={formData.startDate ? new Date(formData.startDate) : undefined}
                                        />
                                        <small className="text-500 mt-1 block">Quiz deadline for submissions</small>
                                    </div>
                                </div>
                            </div>

                            <Divider />

                            {/* Answer Display Settings */}
                            <div className="mb-4">
                                <h4 className="text-900 font-bold mb-3 flex align-items-center gap-2">
                                    <i className="pi pi-eye text-purple-500"></i>
                                    Answer Display
                                </h4>
                                <div className="grid">
                                    {showAnswersOptionsEnhanced.map((option) => (
                                        <div key={option.value} className="col-12 md:col-6 lg:col-3">
                                            <div
                                                className={`p-3 border-round-lg cursor-pointer transition-all ${formData.showCorrectAnswersAfter === option.value ? 'border-2 border-primary bg-primary-50' : 'border-1 border-200 hover:border-300'}`}
                                                onClick={() => setFormData((prev) => ({ ...prev, showCorrectAnswersAfter: option.value }))}
                                            >
                                                <div className="flex align-items-center gap-2 mb-2">
                                                    <RadioButton checked={formData.showCorrectAnswersAfter === option.value} onChange={() => setFormData((prev) => ({ ...prev, showCorrectAnswersAfter: option.value }))} />
                                                    <i className={`${option.icon} ${formData.showCorrectAnswersAfter === option.value ? 'text-primary' : 'text-500'}`}></i>
                                                    <span className="font-semibold text-900">{option.label}</span>
                                                </div>
                                                <small className="text-500 line-height-3">{option.description}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Divider />

                            {/* Behavior Options */}
                            <div className="mb-4">
                                <h4 className="text-900 font-bold mb-3 flex align-items-center gap-2">
                                    <i className="pi pi-sliders-h text-cyan-500"></i>
                                    Quiz Behavior
                                </h4>
                                <div className="grid">
                                    <div className="col-12 md:col-4">
                                        <div
                                            className={`p-3 border-round-lg cursor-pointer transition-all ${formData.shuffleQuestions ? 'border-2 border-green-500 bg-green-50' : 'border-1 border-200 hover:surface-50'}`}
                                            onClick={() => setFormData((prev) => ({ ...prev, shuffleQuestions: !prev.shuffleQuestions }))}
                                        >
                                            <div className="flex align-items-center gap-3">
                                                <Checkbox checked={formData.shuffleQuestions} onChange={(e) => setFormData((prev) => ({ ...prev, shuffleQuestions: e.checked || false }))} />
                                                <div>
                                                    <div className="font-semibold text-900 flex align-items-center gap-2">
                                                        <i className="pi pi-sort-alt text-primary"></i>
                                                        Shuffle Questions
                                                    </div>
                                                    <small className="text-500">Randomize question order</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 md:col-4">
                                        <div
                                            className={`p-3 border-round-lg cursor-pointer transition-all ${formData.shuffleOptions ? 'border-2 border-green-500 bg-green-50' : 'border-1 border-200 hover:surface-50'}`}
                                            onClick={() => setFormData((prev) => ({ ...prev, shuffleOptions: !prev.shuffleOptions }))}
                                        >
                                            <div className="flex align-items-center gap-3">
                                                <Checkbox checked={formData.shuffleOptions} onChange={(e) => setFormData((prev) => ({ ...prev, shuffleOptions: e.checked || false }))} />
                                                <div>
                                                    <div className="font-semibold text-900 flex align-items-center gap-2">
                                                        <i className="pi pi-list text-primary"></i>
                                                        Shuffle Options
                                                    </div>
                                                    <small className="text-500">Randomize answer choices</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 md:col-4">
                                        <div
                                            className={`p-3 border-round-lg cursor-pointer transition-all ${formData.showCorrectAnswers ? 'border-2 border-green-500 bg-green-50' : 'border-1 border-200 hover:surface-50'}`}
                                            onClick={() => setFormData((prev) => ({ ...prev, showCorrectAnswers: !prev.showCorrectAnswers }))}
                                        >
                                            <div className="flex align-items-center gap-3">
                                                <Checkbox checked={formData.showCorrectAnswers} onChange={(e) => setFormData((prev) => ({ ...prev, showCorrectAnswers: e.checked || false }))} />
                                                <div>
                                                    <div className="font-semibold text-900 flex align-items-center gap-2">
                                                        <i className="pi pi-check-circle text-primary"></i>
                                                        Show Answers
                                                    </div>
                                                    <small className="text-500">Display correct answers</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Summary Card */}
                            <div className="p-4 surface-100 border-round-lg">
                                <div className="flex align-items-center gap-2 mb-3">
                                    <i className="pi pi-eye text-primary"></i>
                                    <span className="font-bold text-700">Quiz Settings Summary</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Tag value={`${formData.passingMarks} pts to pass`} severity="success" icon="pi pi-check" />
                                    {formData.timeLimit && <Tag value={`${formData.timeLimit} min limit`} severity="info" icon="pi pi-clock" />}
                                    <Tag value={`${formData.maxAttempts} attempt(s)`} severity="warning" icon="pi pi-replay" />
                                    {formData.shuffleQuestions && <Tag value="Shuffled Questions" className="bg-purple-100 text-purple-700" icon="pi pi-sort-alt" />}
                                    {formData.shuffleOptions && <Tag value="Shuffled Options" className="bg-cyan-100 text-cyan-700" icon="pi pi-list" />}
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>

            {/* Questions Management Dialog */}
            <Dialog
                visible={questionsDialogVisible}
                style={{ width: '95vw', maxWidth: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-list text-primary"></i>
                        <span>Quiz Questions - {currentQuiz?.title}</span>
                    </div>
                }
                modal
                onHide={hideQuestionsDialog}
            >
                <div className="mb-3 flex justify-content-between align-items-center">
                    <div className="flex gap-2">
                        <Tag value={`${questions.length} Questions`} severity="info" />
                        <Tag value={`${currentQuiz?.totalMarks || 0} Total Marks`} severity="success" />
                    </div>
                    <Button label="Add Question" icon="pi pi-plus" onClick={openNewQuestion} />
                </div>

                {questions.length === 0 ? (
                    <div className="text-center p-5 text-500">
                        <i className="pi pi-inbox text-5xl mb-3 block"></i>
                        <p>No questions yet. Click &quot;Add Question&quot; to get started.</p>
                    </div>
                ) : (
                    <div className="flex flex-column gap-2">{questions.map((q) => questionItemTemplate(q))}</div>
                )}
            </Dialog>

            {/* Question Edit Dialog - Enhanced Modern UI */}
            <Dialog
                visible={questionDialogVisible}
                style={{ width: '95vw', maxWidth: '850px' }}
                header={
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center bg-primary border-round" style={{ width: '40px', height: '40px' }}>
                            <i className="pi pi-question-circle text-white text-xl"></i>
                        </div>
                        <div>
                            <h3 className="m-0 text-900">{isEditQuestion ? 'Edit Question' : 'Add New Question'}</h3>
                            <small className="text-500">Question #{questionFormData.questionNumber}</small>
                        </div>
                    </div>
                }
                modal
                className="p-fluid"
                footer={questionDialogFooter}
                onHide={hideQuestionDialog}
            >
                {/* Question Type Selection - Premium Dropdown */}
                <div className="mb-4">
                    <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                        <i className="pi pi-tag text-primary"></i>
                        Question Type
                    </label>
                    <Dropdown
                        value={questionFormData.questionType}
                        options={questionTypesArray}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(e) => handleQuestionTypeChange(e.value)}
                        className="w-full"
                        itemTemplate={(option: QuestionTypeOption) => (
                            <div className="flex align-items-center gap-3 p-2">
                                <div className="flex align-items-center justify-content-center surface-100 border-round" style={{ width: '36px', height: '36px' }}>
                                    <i className={`${option.icon} text-primary`}></i>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="font-semibold text-900">{option.label}</div>
                                    <small className="text-500">{option.description}</small>
                                </div>
                            </div>
                        )}
                        valueTemplate={(option: QuestionTypeOption | null) => {
                            if (!option) return <span className="text-500">Select question type</span>;
                            return (
                                <div className="flex align-items-center gap-2">
                                    <i className={`${option.icon} text-primary`}></i>
                                    <span className="font-medium">{option.label}</span>
                                </div>
                            );
                        }}
                    />
                    {getCurrentQuestionType() && (
                        <div className="flex align-items-center gap-2 mt-2 p-2 surface-50 border-round">
                            <i className="pi pi-info-circle text-blue-500"></i>
                            <small className="text-600">{getCurrentQuestionType()?.description}</small>
                        </div>
                    )}
                </div>

                <Divider />

                {/* Question Text Section */}
                <div className="mb-4">
                    <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                        <i className="pi pi-align-left text-primary"></i>
                        Question Text <span className="text-red-500">*</span>
                    </label>
                    <InputTextarea
                        value={questionFormData.questionText}
                        onChange={(e) => setQuestionFormData((prev) => ({ ...prev, questionText: e.target.value }))}
                        rows={4}
                        placeholder={questionFormData.questionType === 'fill_blanks' ? 'Use [a], [b], [c] for blanks. Example: The capital of France is [a] and the currency is [b].' : 'Enter your question here...'}
                        className="w-full"
                        autoResize
                    />
                    {questionFormData.questionType === 'fill_blanks' && (
                        <div className="p-3 surface-100 border-round mt-2">
                            <div className="flex align-items-center gap-2 mb-2">
                                <i className="pi pi-lightbulb text-yellow-500"></i>
                                <span className="font-semibold text-700">Fill in the Blanks Format</span>
                            </div>
                            <ul className="m-0 pl-4 text-600 text-sm line-height-3">
                                <li>
                                    Use <Tag value="[a]" severity="info" className="text-xs" /> for the first blank
                                </li>
                                <li>
                                    Use <Tag value="[b]" severity="info" className="text-xs" /> for the second blank
                                </li>
                                <li>Add corresponding answers in the options below</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Points and Settings Row */}
                <div className="grid mb-4">
                    <div className="col-12 md:col-4">
                        <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                            <i className="pi pi-star text-yellow-500"></i>
                            Total Points
                        </label>
                        <InputNumber
                            value={questionFormData.points}
                            onValueChange={(e) => setQuestionFormData((prev) => ({ ...prev, points: e.value || 1 }))}
                            min={0}
                            max={100}
                            showButtons
                            buttonLayout="horizontal"
                            decrementButtonClassName="p-button-outlined"
                            incrementButtonClassName="p-button-outlined"
                            incrementButtonIcon="pi pi-plus"
                            decrementButtonIcon="pi pi-minus"
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-bold text-900 mb-2 block flex align-items-center gap-2">
                            <i className="pi pi-sort-numeric-up text-primary"></i>
                            Question Number
                        </label>
                        <InputNumber value={questionFormData.questionNumber} onValueChange={(e) => setQuestionFormData((prev) => ({ ...prev, questionNumber: e.value || 1 }))} min={1} className="w-full" disabled />
                    </div>
                    <div className="col-12 md:col-4 flex align-items-end">
                        <div className="flex align-items-center gap-2 p-3 surface-50 border-round w-full">
                            <Checkbox inputId="isRequired" checked={questionFormData.isRequired} onChange={(e) => setQuestionFormData((prev) => ({ ...prev, isRequired: e.checked || false }))} />
                            <label htmlFor="isRequired" className="cursor-pointer font-medium">
                                Required
                            </label>
                            <i className="pi pi-info-circle text-500 ml-auto" title="Students must answer this question"></i>
                        </div>
                    </div>
                </div>

                <Divider />

                {/* Answer Options Section - For choice-based questions */}
                {getCurrentQuestionType()?.hasOptions && !getCurrentQuestionType()?.hasMatching && questionFormData.questionType !== 'fill_blanks' && (
                    <div className="mb-4">
                        <div className="flex justify-content-between align-items-center mb-3">
                            <label className="font-bold text-900 flex align-items-center gap-2 m-0">
                                <i className="pi pi-list text-primary"></i>
                                Answer Options
                            </label>
                            <Button icon="pi pi-plus" label="Add Option" size="small" outlined onClick={addOption} className="p-button-sm" />
                        </div>

                        <div className="flex flex-column gap-3">
                            {questionFormData.questionOptions.map((opt, index) => (
                                <div key={opt.id} className={`p-3 border-round-lg transition-colors ${opt.isCorrect ? 'surface-100 border-2 border-green-300' : 'surface-50 border-1 border-200'}`}>
                                    <div className="flex align-items-center gap-3">
                                        {/* Option Label Badge */}
                                        <div className={`flex align-items-center justify-content-center border-round font-bold text-sm ${opt.isCorrect ? 'bg-green-500 text-white' : 'surface-200 text-700'}`} style={{ width: '32px', height: '32px' }}>
                                            {opt.optionLabel || numberToLetter(index)}
                                        </div>

                                        {/* Correct Answer Selector */}
                                        {getCurrentQuestionType()?.hasCorrectOption && (
                                            <div className="flex align-items-center">
                                                {questionFormData.questionType === 'multiple_choice' ? (
                                                    <Checkbox checked={opt.isCorrect} onChange={(e) => updateOption(index, 'isCorrect', e.checked || false)} tooltip="Mark as correct answer" tooltipOptions={{ position: 'top' }} />
                                                ) : (
                                                    <RadioButton checked={opt.isCorrect} onChange={() => updateOption(index, 'isCorrect', true)} tooltip="Mark as correct answer" tooltipOptions={{ position: 'top' }} />
                                                )}
                                            </div>
                                        )}

                                        {/* Option Text Input */}
                                        <InputText value={opt.text} onChange={(e) => updateOption(index, 'text', e.target.value)} placeholder={`Enter option ${opt.optionLabel || numberToLetter(index)}...`} className="flex-grow-1" />

                                        {/* Option Points */}
                                        <div className="flex align-items-center gap-2">
                                            <span className="text-500 text-sm white-space-nowrap">Pts:</span>
                                            <InputNumber value={opt.optionPoints} onValueChange={(e) => updateOption(index, 'optionPoints', e.value || 0)} min={0} max={questionFormData.points} className="w-4rem" inputClassName="text-center p-2" />
                                        </div>

                                        {/* Remove Button */}
                                        {questionFormData.questionOptions.length > 2 && (
                                            <Button icon="pi pi-trash" rounded text severity="danger" size="small" onClick={() => removeOption(index)} tooltip="Remove option" tooltipOptions={{ position: 'top' }} />
                                        )}
                                    </div>

                                    {/* Correct answer indicator */}
                                    {opt.isCorrect && (
                                        <div className="flex align-items-center gap-2 mt-2 pt-2 border-top-1 border-green-200">
                                            <i className="pi pi-check-circle text-green-500"></i>
                                            <small className="text-green-700 font-medium">Correct Answer</small>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex align-items-center gap-2 mt-3 p-2 surface-50 border-round">
                            <i className="pi pi-info-circle text-blue-500"></i>
                            <small className="text-600">
                                {questionFormData.questionType === 'multiple_choice' ? 'Check all correct answers. Students can select multiple options.' : 'Select the single correct answer. Students can only choose one option.'}
                            </small>
                        </div>
                    </div>
                )}

                {/* Fill in the Blanks Options */}
                {questionFormData.questionType === 'fill_blanks' && (
                    <div className="mb-4">
                        <div className="flex justify-content-between align-items-center mb-3">
                            <label className="font-bold text-900 flex align-items-center gap-2 m-0">
                                <i className="pi pi-server text-primary"></i>
                                Blank Answers
                            </label>
                            <Button icon="pi pi-plus" label="Add Blank" size="small" outlined onClick={addOption} />
                        </div>

                        <div className="flex flex-column gap-3">
                            {questionFormData.questionOptions.map((opt, index) => (
                                <div key={opt.id} className="flex align-items-center gap-3 p-3 surface-50 border-round-lg">
                                    <Tag value={`[${String.fromCharCode(97 + index)}]`} severity="info" className="text-sm font-bold" />
                                    <InputText value={opt.text} onChange={(e) => updateOption(index, 'text', e.target.value)} placeholder={`Answer for blank [${String.fromCharCode(97 + index)}]...`} className="flex-grow-1" />
                                    <div className="flex align-items-center gap-2">
                                        <span className="text-500 text-sm">Pts:</span>
                                        <InputNumber value={opt.optionPoints} onValueChange={(e) => updateOption(index, 'optionPoints', e.value || 0)} min={0} className="w-4rem" inputClassName="text-center p-2" />
                                    </div>
                                    {questionFormData.questionOptions.length > 1 && <Button icon="pi pi-trash" rounded text severity="danger" size="small" onClick={() => removeOption(index)} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Matching Questions Section */}
                {getCurrentQuestionType()?.hasMatching && (
                    <div className="mb-4">
                        <div className="flex justify-content-between align-items-center mb-3">
                            <label className="font-bold text-900 flex align-items-center gap-2 m-0">
                                <i className="pi pi-arrow-right-arrow-left text-primary"></i>
                                Matching Pairs
                            </label>
                            <Button icon="pi pi-plus" label="Add Pair" size="small" outlined onClick={addMatchingPair} />
                        </div>

                        <div className="flex flex-column gap-3">
                            {/* Header Row */}
                            <div className="grid">
                                <div className="col-1"></div>
                                <div className="col-5">
                                    <small className="font-bold text-600 uppercase">Left Side (Question)</small>
                                </div>
                                <div className="col-1 text-center">
                                    <i className="pi pi-arrows-h text-400"></i>
                                </div>
                                <div className="col-4">
                                    <small className="font-bold text-600 uppercase">Right Side (Answer)</small>
                                </div>
                                <div className="col-1"></div>
                            </div>

                            {questionFormData.matchingPairs.map((pair, index) => (
                                <div key={pair.id} className="grid align-items-center surface-50 border-round-lg p-2">
                                    <div className="col-1">
                                        <Badge value={index + 1} severity="info" />
                                    </div>
                                    <div className="col-5">
                                        <InputText value={pair.left} onChange={(e) => updateMatchingPair(index, 'left', e.target.value)} placeholder="Left item..." className="w-full" />
                                    </div>
                                    <div className="col-1 text-center">
                                        <i className="pi pi-arrow-right text-primary"></i>
                                    </div>
                                    <div className="col-4">
                                        <InputText value={pair.right} onChange={(e) => updateMatchingPair(index, 'right', e.target.value)} placeholder="Right item..." className="w-full" />
                                    </div>
                                    <div className="col-1 text-right">{questionFormData.matchingPairs.length > 1 && <Button icon="pi pi-trash" rounded text severity="danger" size="small" onClick={() => removeMatchingPair(index)} />}</div>
                                </div>
                            ))}
                        </div>

                        {questionFormData.matchingPairs.length === 0 && (
                            <div className="text-center p-4 surface-100 border-round border-dashed border-300">
                                <i className="pi pi-link text-4xl text-400 mb-2 block"></i>
                                <p className="text-500 m-0">Click &quot;Add Pair&quot; to create matching items</p>
                            </div>
                        )}

                        <div className="flex align-items-center gap-2 mt-3 p-2 surface-50 border-round">
                            <i className="pi pi-info-circle text-blue-500"></i>
                            <small className="text-600">Students will match items from the left column to the right column.</small>
                        </div>
                    </div>
                )}

                {/* Free Text Answer Section */}
                {questionFormData.questionType === 'free_text' && (
                    <div className="mb-4">
                        <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                            <i className="pi pi-check-circle text-green-500"></i>
                            Expected Answer (for auto-grading)
                        </label>
                        <InputTextarea
                            value={questionFormData.correctText || ''}
                            onChange={(e) => setQuestionFormData((prev) => ({ ...prev, correctText: e.target.value }))}
                            rows={3}
                            placeholder="Enter the expected answer for automated grading..."
                            className="w-full"
                        />
                        <div className="flex align-items-center gap-2 mt-2 p-2 surface-50 border-round">
                            <i className="pi pi-info-circle text-blue-500"></i>
                            <small className="text-600">This answer will be used for automated scoring comparison.</small>
                        </div>
                    </div>
                )}

                <Divider />

                {/* Explanation Section */}
                <div className="mb-4">
                    <label className="font-bold text-900 mb-3 block flex align-items-center gap-2">
                        <i className="pi pi-book text-purple-500"></i>
                        Explanation
                        <span className="text-500 font-normal text-sm">(optional)</span>
                    </label>
                    <InputTextarea
                        value={questionFormData.explanation || ''}
                        onChange={(e) => setQuestionFormData((prev) => ({ ...prev, explanation: e.target.value }))}
                        rows={3}
                        placeholder="Explain the correct answer. This will be shown to students after they submit their response..."
                        className="w-full"
                    />
                </div>

                {/* Question Preview Summary */}
                <div className="p-3 surface-100 border-round-lg">
                    <div className="flex align-items-center gap-2 mb-2">
                        <i className="pi pi-eye text-primary"></i>
                        <span className="font-bold text-700">Question Summary</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Tag value={getCurrentQuestionType()?.label || 'Select Type'} icon={getCurrentQuestionType()?.icon} />
                        <Tag value={`${questionFormData.points} points`} severity="success" icon="pi pi-star" />
                        <Tag value={questionFormData.isRequired ? 'Required' : 'Optional'} severity={questionFormData.isRequired ? 'danger' : 'warning'} />
                        {getCurrentQuestionType()?.hasOptions && <Tag value={`${questionFormData.questionOptions.length} options`} severity="info" icon="pi pi-list" />}
                        {getCurrentQuestionType()?.hasMatching && <Tag value={`${questionFormData.matchingPairs.length} pairs`} severity="info" icon="pi pi-link" />}
                    </div>
                </div>
            </Dialog>
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="surface-ground p-3 md:p-4">
            <Card>{content}</Card>
        </div>
    );
};

export default LMSQuizManagement;
