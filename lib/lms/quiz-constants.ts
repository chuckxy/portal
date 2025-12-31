// Quiz Management Constants and Configurations
import { QuizType, QuestionType, ShowAnswersAfter, DropdownOption, QuizTypeOptionEnhanced, ShowAnswersOptionEnhanced, QuestionTypeOption } from './quiz-types';

// Basic Quiz Type Options
export const quizTypeOptions: DropdownOption[] = [
    { label: '📖 Lesson Quiz', value: 'lesson' },
    { label: '📚 Chapter Quiz', value: 'chapter' },
    { label: '📦 Module Quiz', value: 'module' },
    { label: '🎓 Course Quiz', value: 'course' }
];

// Basic Show Answers Options
export const showAnswersOptions: DropdownOption[] = [
    { label: 'Immediately', value: 'immediately' },
    { label: 'After Submission', value: 'after_submission' },
    { label: 'After Deadline', value: 'after_deadline' },
    { label: 'Never', value: 'never' }
];

// Enhanced Quiz Type Options with Icons and Descriptions
export const quizTypesArray: QuizTypeOptionEnhanced[] = [
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
export const showAnswersOptionsEnhanced: ShowAnswersOptionEnhanced[] = [
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

// Question Types with Icons and Descriptions
export const questionTypesArray: QuestionTypeOption[] = [
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

// Question type mapping from various formats to standard types
export const questionTypeMap: Record<string, QuestionType> = {
    single_choice_radio: 'single_choice_radio',
    single_choice: 'single_choice_radio',
    radio: 'single_choice_radio',
    singlechoice: 'single_choice_radio',
    single_choice_dropdown: 'single_choice_dropdown',
    dropdown: 'single_choice_dropdown',
    multiple_choice: 'multiple_choice',
    multiplechoice: 'multiple_choice',
    checkbox: 'multiple_choice',
    picture_choice: 'picture_choice',
    picturechoice: 'picture_choice',
    image: 'picture_choice',
    fill_blanks: 'fill_blanks',
    fillblanks: 'fill_blanks',
    fillintheblank: 'fill_blanks',
    blanks: 'fill_blanks',
    matching: 'matching',
    match: 'matching',
    matching_text: 'matching_text',
    matchingtext: 'matching_text',
    free_text: 'free_text',
    freetext: 'free_text',
    essay: 'free_text',
    text: 'free_text'
};

// Option letters for up to 8 options
export const OPTION_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Maximum number of matching pairs
export const MAX_MATCHING_PAIRS = 10;
