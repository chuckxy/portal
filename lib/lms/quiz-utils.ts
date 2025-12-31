// Quiz Management Utility Functions
import { QuestionType, QuestionOption, MatchingPair, QuizQuestion, Quiz, ParseResult } from './quiz-types';
import { questionTypeMap, OPTION_LETTERS, MAX_MATCHING_PAIRS } from './quiz-constants';

/**
 * Convert number to letter (0 -> A, 1 -> B, etc.)
 */
export const numberToLetter = (num: number): string => {
    return String.fromCharCode(65 + num);
};

/**
 * Map question type from various formats to standard type
 */
export const mapQuestionTypeFromUpload = (type: string): QuestionType | null => {
    const normalizedType = type?.toLowerCase()?.replace(/[\s-]/g, '');
    return questionTypeMap[normalizedType] || null;
};

/**
 * Parse a CSV line handling quoted values
 */
export const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

/**
 * Parse options from CSV row data
 */
export const parseOptionsFromCSV = (rowData: Record<string, string>, questionType: QuestionType): QuestionOption[] => {
    const options: QuestionOption[] = [];

    OPTION_LETTERS.forEach((letter, idx) => {
        const optionKey = `option${letter}`;
        const correctKey = `correct${letter}`;
        const imageKey = `option${letter}image`;

        if (rowData[optionKey] && rowData[optionKey].trim()) {
            options.push({
                id: String(idx + 1),
                optionLabel: letter.toUpperCase(),
                text: rowData[optionKey].trim(),
                isCorrect: rowData[correctKey]?.toLowerCase() === 'true' || rowData[correctKey] === '1',
                optionPoints: 0,
                imageUrl: rowData[imageKey] || ''
            });
        }
    });

    return options;
};

/**
 * Parse options from JSON data
 */
export const parseOptionsFromJSON = (q: any): QuestionOption[] => {
    if (q.questionOptions) return q.questionOptions;
    if (q.options && Array.isArray(q.options)) {
        return q.options.map((opt: any, idx: number) => ({
            id: opt.id || String(idx + 1),
            optionLabel: numberToLetter(idx),
            text: opt.text || opt.label || opt.value || '',
            isCorrect: opt.isCorrect || opt.correct || false,
            optionPoints: opt.points || 0,
            imageUrl: opt.imageUrl || opt.image || ''
        }));
    }
    return [];
};

/**
 * Parse matching pairs from CSV row data
 */
export const parseMatchingPairsFromCSV = (rowData: Record<string, string>): MatchingPair[] => {
    const pairs: MatchingPair[] = [];
    for (let i = 1; i <= MAX_MATCHING_PAIRS; i++) {
        const left = rowData[`left${i}`];
        const right = rowData[`right${i}`];
        if (left && right) {
            pairs.push({ id: String(i), left, right });
        }
    }
    return pairs;
};

/**
 * Parse correct options from CSV row data
 */
export const parseCorrectOptionsFromCSV = (rowData: Record<string, string>, questionType: QuestionType): string[] => {
    const correctOptions: string[] = [];

    OPTION_LETTERS.forEach((letter, idx) => {
        const correctKey = `correct${letter}`;
        if (rowData[correctKey]?.toLowerCase() === 'true' || rowData[correctKey] === '1') {
            correctOptions.push(String(idx + 1));
        }
    });

    // Also check for "correctoptions" column with semicolon-separated values
    if (rowData.correctoptions) {
        const parsed = rowData.correctoptions.split(';').map((v) => v.trim());
        return parsed;
    }

    return correctOptions;
};

/**
 * Parse CSV content to quiz questions
 */
export const parseCSVQuestions = (csvContent: string, targetQuizId: string, schoolSiteId: string): ParseResult => {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const errors: string[] = [];
    const questions: QuizQuestion[] = [];

    if (lines.length < 2) {
        return { questions: [], errors: ['CSV file must have headers and at least one question row'] };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['questiontext', 'questiontype', 'points'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
        return { questions: [], errors: [`Missing required headers: ${missingHeaders.join(', ')}`] };
    }

    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            if (values.length < headers.length) {
                errors.push(`Row ${i + 1}: Incomplete data`);
                continue;
            }

            const rowData: Record<string, string> = {};
            headers.forEach((header, idx) => {
                rowData[header] = values[idx] || '';
            });

            const questionType = mapQuestionTypeFromUpload(rowData.questiontype);
            if (!questionType) {
                errors.push(`Row ${i + 1}: Invalid question type "${rowData.questiontype}"`);
                continue;
            }

            const question: QuizQuestion = {
                quizId: targetQuizId,
                schoolSiteId: schoolSiteId,
                questionNumber: questions.length + 1,
                questionText: rowData.questiontext,
                questionType,
                questionOptions: parseOptionsFromCSV(rowData, questionType),
                matchingPairs: parseMatchingPairsFromCSV(rowData),
                correctOptions: parseCorrectOptionsFromCSV(rowData, questionType),
                correctText: rowData.correcttext || '',
                points: parseInt(rowData.points) || 1,
                isRequired: rowData.isrequired !== 'false',
                explanation: rowData.explanation || '',
                imageUrl: rowData.imageurl || '',
                sortOrder: questions.length + 1,
                isActive: true
            };

            questions.push(question);
        } catch (err) {
            errors.push(`Row ${i + 1}: Parse error - ${err}`);
        }
    }

    return { questions, errors };
};

/**
 * Parse JSON content to quiz questions
 */
export const parseJSONQuestions = (jsonContent: string, targetQuizId: string, schoolSiteId: string): ParseResult => {
    try {
        const data = JSON.parse(jsonContent);
        const questionsArray = Array.isArray(data) ? data : data.questions || [];
        const errors: string[] = [];
        const questions: QuizQuestion[] = [];

        questionsArray.forEach((q: any, index: number) => {
            try {
                const questionType = mapQuestionTypeFromUpload(q.questionType || q.type);
                if (!questionType) {
                    errors.push(`Question ${index + 1}: Invalid question type`);
                    return;
                }

                const question: QuizQuestion = {
                    quizId: targetQuizId,
                    schoolSiteId: schoolSiteId,
                    questionNumber: questions.length + 1,
                    questionText: q.questionText || q.text || q.question || '',
                    questionType,
                    questionOptions: parseOptionsFromJSON(q),
                    matchingPairs: q.matchingPairs || [],
                    correctOptions: q.correctOptions || [],
                    correctText: q.correctText || q.answer || '',
                    points: q.points || q.marks || 1,
                    isRequired: q.isRequired !== false,
                    explanation: q.explanation || '',
                    imageUrl: q.imageUrl || q.image || '',
                    sortOrder: questions.length + 1,
                    isActive: true
                };

                questions.push(question);
            } catch (err) {
                errors.push(`Question ${index + 1}: Parse error`);
            }
        });

        return { questions, errors };
    } catch (err) {
        return { questions: [], errors: ['Invalid JSON format'] };
    }
};

/**
 * Create an empty quiz object
 */
export const createEmptyQuiz = (schoolSiteId: string, userId: string, propSubjectId?: string, propLessonId?: string): Quiz => {
    return {
        title: '',
        description: '',
        subjectId: propSubjectId || '',
        moduleId: '',
        chapterId: '',
        lessonId: propLessonId || '',
        schoolSiteId: schoolSiteId,
        addedBy: userId,
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
};

/**
 * Create an empty question object
 */
export const createEmptyQuestion = (quizId: string, schoolSiteId: string): QuizQuestion => {
    return {
        quizId,
        schoolSiteId: schoolSiteId,
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
};

/**
 * Get default options for a new question
 */
export const getDefaultQuestionOptions = (count: number = 4): QuestionOption[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: String(i + 1),
        optionLabel: numberToLetter(i),
        text: '',
        isCorrect: false,
        optionPoints: 0
    }));
};

/**
 * Reindex options after adding/removing
 */
export const reindexOptions = (options: QuestionOption[]): QuestionOption[] => {
    return options.map((opt, i) => ({
        ...opt,
        id: String(i + 1),
        optionLabel: numberToLetter(i)
    }));
};

/**
 * Filter questions by search term and type
 */
export const filterQuestions = (questions: QuizQuestion[], searchTerm: string, typeFilter: string): QuizQuestion[] => {
    return questions.filter((q) => {
        const matchesSearch = !searchTerm || q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !typeFilter || q.questionType === typeFilter;
        return matchesSearch && matchesType;
    });
};
