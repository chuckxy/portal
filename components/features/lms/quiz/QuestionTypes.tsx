'use client';

import React, { useEffect, useState } from 'react';
import { RadioButton, RadioButtonChangeEvent } from 'primereact/radiobutton';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { Checkbox, CheckboxChangeEvent } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionOption {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect?: boolean;
    matchingValue?: string;
}

export interface QuizQuestionData {
    _id: string;
    questionNumber: number;
    questionText: string;
    questionType: 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text' | 'picture_choice';
    questionOptions: QuestionOption[];
    correctOptions: string[];
    points: number;
    quizId: string;
    imageUrl?: string;
}

export interface QuestionComponentProps {
    questionData: QuizQuestionData;
    index: number;
    userAnswers: string[];
    onAnswerChange: (questionId: string, selectedOptions: string[]) => void;
    isAnswered: boolean;
}

interface DropdownOption {
    name: string;
    code: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createDropdownOptions = (options: QuestionOption[]): DropdownOption[] => {
    return options.map((opt) => ({
        name: opt.text,
        code: opt.id
    }));
};

// ============================================================================
// QUESTION TYPE COMPONENTS
// ============================================================================

/**
 * Single Choice Radio Button Question
 * User selects one option from radio buttons
 */
export const SingleChoiceRadioButton: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    const selectedValue = userAnswers[0] || '';

    const handleChange = (optionId: string) => {
        onAnswerChange(questionData._id, [optionId]);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Single choice" />

            <div className="flex flex-column gap-3 mt-3">
                {questionData.questionOptions.map((option, optIndex) => (
                    <div
                        key={option.id || optIndex}
                        className={`flex align-items-center p-3 border-round cursor-pointer transition-colors transition-duration-150 ${selectedValue === option.id ? 'bg-primary-100 border-1 border-primary' : 'surface-100 hover:surface-200'}`}
                        onClick={() => handleChange(option.id)}
                    >
                        <RadioButton inputId={`${questionData._id}-${option.id}`} name={`question-${questionData._id}`} value={option.id} onChange={() => handleChange(option.id)} checked={selectedValue === option.id} />
                        <label htmlFor={`${questionData._id}-${option.id}`} className="ml-2 cursor-pointer">
                            {option.text}
                        </label>
                    </div>
                ))}
            </div>
        </Card>
    );
};

/**
 * Single Choice Dropdown Question
 * User selects one option from a dropdown
 */
export const SingleChoiceDropdown: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    const dropdownOptions = createDropdownOptions(questionData.questionOptions);
    const selectedValue = userAnswers[0] ? dropdownOptions.find((opt) => opt.code === userAnswers[0]) : null;

    const handleChange = (e: DropdownChangeEvent) => {
        if (e.value) {
            onAnswerChange(questionData._id, [e.value.code]);
        }
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Single choice" />

            <div className="mt-3">
                <Dropdown value={selectedValue} options={dropdownOptions} optionLabel="name" placeholder="Select an option" onChange={handleChange} className="w-full md:w-20rem" />
            </div>
        </Card>
    );
};

/**
 * Multiple Choice Question
 * User can select multiple options (checkboxes)
 */
export const MultipleChoice: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    // Limit number of selections based on correct options
    const maxSelections = questionData.correctOptions.length || questionData.questionOptions.length;

    const handleChange = (optionId: string, checked: boolean) => {
        let newAnswers = [...userAnswers];

        if (checked) {
            // Check if we've reached the max selections
            if (newAnswers.length >= maxSelections) {
                return; // Don't add more
            }
            newAnswers.push(optionId);
        } else {
            newAnswers = newAnswers.filter((id) => id !== optionId);
        }

        onAnswerChange(questionData._id, newAnswers);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type={`Multiple choice (select up to ${maxSelections})`} />

            <div className="flex flex-column gap-3 mt-3">
                {questionData.questionOptions.map((option, optIndex) => {
                    const isChecked = userAnswers.includes(option.id);
                    return (
                        <div
                            key={option.id || optIndex}
                            className={`flex align-items-center p-3 border-round cursor-pointer transition-colors transition-duration-150 ${isChecked ? 'bg-primary-100 border-1 border-primary' : 'surface-100 hover:surface-200'}`}
                            onClick={() => handleChange(option.id, !isChecked)}
                        >
                            <Checkbox inputId={`${questionData._id}-${option.id}`} name={`question-${questionData._id}`} value={option.id} onChange={(e: CheckboxChangeEvent) => handleChange(option.id, e.checked || false)} checked={isChecked} />
                            <label htmlFor={`${questionData._id}-${option.id}`} className="ml-2 cursor-pointer">
                                {option.text}
                            </label>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

/**
 * Picture Choice Question
 * User selects from image options
 */
export const PictureChoice: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    const selectedValue = userAnswers[0] || '';

    const handleChange = (optionId: string) => {
        onAnswerChange(questionData._id, [optionId]);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Picture choice" />

            <div className="grid mt-3">
                {questionData.questionOptions.map((option, optIndex) => (
                    <div key={option.id || optIndex} className="col-6 md:col-4 lg:col-3">
                        <div
                            className={`p-2 border-round cursor-pointer transition-all transition-duration-150 ${selectedValue === option.id ? 'border-2 border-primary bg-primary-100' : 'border-1 surface-border hover:border-primary-300'}`}
                            onClick={() => handleChange(option.id)}
                        >
                            {option.imageUrl && <img src={option.imageUrl} alt={option.text} className="w-full border-round mb-2" style={{ aspectRatio: '1/1', objectFit: 'cover' }} />}
                            <div className="flex align-items-center">
                                <RadioButton inputId={`${questionData._id}-${option.id}`} name={`question-${questionData._id}`} value={option.id} onChange={() => handleChange(option.id)} checked={selectedValue === option.id} />
                                <label htmlFor={`${questionData._id}-${option.id}`} className="ml-2 text-sm cursor-pointer">
                                    {option.text}
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

/**
 * Fill in the Blanks Question
 * User fills in text inputs for blanks marked with [...]
 */
export const FillInTheBlanks: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    // Parse the question text for blanks marked with [...]
    const regex = /\[.*?\]/g;
    const parts = questionData.questionText.split(regex);
    const blanksCount = (questionData.questionText.match(regex) || []).length;

    // Initialize answers array if needed
    const answers = userAnswers.length === blanksCount ? userAnswers : new Array(blanksCount).fill('');

    const handleChange = (blankIndex: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[blankIndex] = value;
        onAnswerChange(questionData._id, newAnswers);
    };

    const renderQuestionWithBlanks = () => {
        const elements: React.ReactNode[] = [];
        let inputIndex = 0;

        parts.forEach((part, partIndex) => {
            // Add text part
            if (part) {
                elements.push(<span key={`text-${partIndex}`} dangerouslySetInnerHTML={{ __html: part }} />);
            }
            // Add input for blank (except after the last part)
            if (partIndex < parts.length - 1) {
                const currentIndex = inputIndex;
                elements.push(<InputText key={`input-${currentIndex}`} value={answers[currentIndex] || ''} onChange={(e) => handleChange(currentIndex, e.target.value)} placeholder="Enter answer" className="mx-2" style={{ width: '150px' }} />);
                inputIndex++;
            }
        });

        return elements;
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Fill in the blanks" />

            <div className="mt-3 p-3 surface-100 border-round line-height-3">{renderQuestionWithBlanks()}</div>
        </Card>
    );
};

/**
 * Matching Question
 * User matches options from dropdowns to items
 */
export const Matching: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    // Create dropdown options from matching values
    const dropdownOptions: DropdownOption[] = questionData.questionOptions.map((opt) => ({
        name: opt.matchingValue || opt.text,
        code: opt.id
    }));

    // Initialize answers array if needed
    const answers = userAnswers.length === questionData.questionOptions.length ? userAnswers : new Array(questionData.questionOptions.length).fill('');

    const handleChange = (optionIndex: number, selectedCode: string) => {
        const newAnswers = [...answers];
        newAnswers[optionIndex] = selectedCode;
        onAnswerChange(questionData._id, newAnswers);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Matching" />

            <div className="flex flex-column gap-3 mt-3">
                {questionData.questionOptions.map((option, optIndex) => {
                    const selectedValue = answers[optIndex] ? dropdownOptions.find((opt) => opt.code === answers[optIndex]) : null;

                    return (
                        <div key={option.id || optIndex} className="flex flex-column md:flex-row align-items-start md:align-items-center gap-2 p-3 surface-100 border-round">
                            <div className="flex-1">
                                <span dangerouslySetInnerHTML={{ __html: option.text }} />
                            </div>
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-arrow-right text-500 hidden md:block"></i>
                                <Dropdown
                                    value={selectedValue}
                                    options={dropdownOptions}
                                    optionLabel="name"
                                    placeholder="Select match"
                                    onChange={(e: DropdownChangeEvent) => handleChange(optIndex, e.value?.code || '')}
                                    className="w-full md:w-15rem"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

/**
 * Matching Text Question
 * User types text to match items
 */
export const MatchingText: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    const matchText = userAnswers[0] || '';

    const handleChange = (value: string) => {
        onAnswerChange(questionData._id, [value]);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Text matching" />

            <div className="mt-3">
                <InputText value={matchText} onChange={(e) => handleChange(e.target.value)} placeholder="Enter your answer" className="w-full" />
            </div>
        </Card>
    );
};

/**
 * Free Text Question
 * User writes a longer text response
 */
export const FreeText: React.FC<QuestionComponentProps> = ({ questionData, index, userAnswers, onAnswerChange, isAnswered }) => {
    const freeText = userAnswers[0] || '';

    const handleChange = (value: string) => {
        onAnswerChange(questionData._id, [value]);
    };

    return (
        <Card className={`surface-50 border-round-lg ${isAnswered ? 'border-left-3 border-green-500' : ''}`}>
            <QuestionHeader questionData={questionData} index={index} isAnswered={isAnswered} type="Free text response" />

            <div className="mt-3">
                <InputTextarea value={freeText} onChange={(e) => handleChange(e.target.value)} placeholder="Write your answer here..." rows={5} className="w-full" autoResize />
            </div>
        </Card>
    );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Common question header component
 */
const QuestionHeader: React.FC<{
    questionData: QuizQuestionData;
    index: number;
    isAnswered: boolean;
    type: string;
}> = ({ questionData, index, isAnswered, type }) => {
    return (
        <div className="flex align-items-start gap-3 mb-2">
            <Badge value={index + 1} severity={isAnswered ? 'success' : 'warning'} className="flex-shrink-0" />
            <div className="flex-1">
                <p className="text-900 font-semibold m-0 mb-2" dangerouslySetInnerHTML={{ __html: questionData.questionText }} />
                <span className="text-xs text-500">
                    {questionData.points} point{questionData.points !== 1 ? 's' : ''} • {type}
                </span>
                {/* Question Image */}
                {questionData.imageUrl && (
                    <div className="mt-2">
                        <img src={questionData.imageUrl} alt="Question" className="border-round max-w-full" style={{ maxHeight: '200px' }} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// DISPLAY QUESTIONS COMPONENT (Main Entry Point)
// ============================================================================

export interface DisplayQuestionsProps {
    questions: QuizQuestionData[];
    currentAnswers: Map<string, string[]>;
    onAnswerChange: (questionId: string, selectedOptions: string[]) => void;
    showAllQuestions?: boolean; // If true, shows all questions at once (legacy mode)
    currentIndex?: number; // Controlled current question index
    onNavigate?: (index: number) => void; // Callback when navigating
    allowBackNavigation?: boolean; // Whether to allow going back
    onSubmit?: () => void; // Callback when submit is clicked on last question
}

/**
 * DisplayQuestions - Main component that renders quiz questions
 * Can render one question per screen or all questions at once
 */
export const DisplayQuestions: React.FC<DisplayQuestionsProps> = ({ questions, currentAnswers, onAnswerChange, showAllQuestions = false, currentIndex: controlledIndex, onNavigate, allowBackNavigation = true, onSubmit }) => {
    // Internal state for uncontrolled mode
    const [internalIndex, setInternalIndex] = useState(0);

    // Use controlled index if provided, otherwise use internal state
    const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

    const handleNavigate = (newIndex: number) => {
        if (onNavigate) {
            onNavigate(newIndex);
        } else {
            setInternalIndex(newIndex);
        }
    };

    const goToNext = () => {
        if (currentIndex < questions.length - 1) {
            handleNavigate(currentIndex + 1);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0 && allowBackNavigation) {
            handleNavigate(currentIndex - 1);
        }
    };

    const renderQuestion = (question: QuizQuestionData, index: number) => {
        const userAnswers = currentAnswers.get(question._id) || [];
        const isAnswered = userAnswers.length > 0 && userAnswers.some((a) => a !== '');

        const commonProps: QuestionComponentProps = {
            questionData: question,
            index,
            userAnswers,
            onAnswerChange,
            isAnswered
        };

        switch (question.questionType) {
            case 'single_choice_radio':
                return <SingleChoiceRadioButton key={question._id} {...commonProps} />;
            case 'single_choice_dropdown':
                return <SingleChoiceDropdown key={question._id} {...commonProps} />;
            case 'multiple_choice':
                return <MultipleChoice key={question._id} {...commonProps} />;
            case 'picture_choice':
                return <PictureChoice key={question._id} {...commonProps} />;
            case 'fill_blanks':
                return <FillInTheBlanks key={question._id} {...commonProps} />;
            case 'matching':
                return <Matching key={question._id} {...commonProps} />;
            case 'matching_text':
                return <MatchingText key={question._id} {...commonProps} />;
            case 'free_text':
                return <FreeText key={question._id} {...commonProps} />;
            default:
                return (
                    <Card key={question._id} className="surface-50 border-round-lg">
                        <QuestionHeader questionData={question} index={index} isAnswered={isAnswered} type="Unknown type" />
                        <p className="text-500 mt-2">This question type is not yet supported.</p>
                    </Card>
                );
        }
    };

    // Show all questions mode (legacy)
    if (showAllQuestions) {
        return <div className="flex flex-column gap-4">{questions.map((question, index) => renderQuestion(question, index))}</div>;
    }

    // Single question per screen mode
    if (questions.length === 0) {
        return (
            <Card className="surface-50 border-round-lg p-4 text-center">
                <i className="pi pi-inbox text-4xl text-300 mb-3"></i>
                <p className="text-500">No questions available</p>
            </Card>
        );
    }

    const currentQuestion = questions[currentIndex];
    const answeredCount = Array.from(currentAnswers.entries()).filter(([_, answers]) => answers.length > 0 && answers.some((a) => a !== '')).length;
    const isLastQuestion = currentIndex === questions.length - 1;
    const isFirstQuestion = currentIndex === 0;

    return (
        <div className="flex flex-column gap-4">
            {/* Progress indicator */}
            <div className="flex justify-content-between align-items-center surface-100 border-round-lg p-3">
                <div className="flex align-items-center gap-2">
                    <Badge value={`${currentIndex + 1}`} severity="info" className="text-lg" />
                    <span className="text-600">of {questions.length} questions</span>
                </div>
                <div className="flex align-items-center gap-2">
                    <span className="text-sm text-500">Answered:</span>
                    <Badge value={`${answeredCount}/${questions.length}`} severity={answeredCount === questions.length ? 'success' : 'warning'} />
                </div>
            </div>

            {/* Question navigator dots */}
            <div className="flex flex-wrap justify-content-center gap-2 py-2">
                {questions.map((q, idx) => {
                    const isAnswered = currentAnswers.has(q._id) && currentAnswers.get(q._id)!.some((a) => a !== '');
                    const isCurrent = idx === currentIndex;
                    return (
                        <button
                            key={q._id}
                            onClick={() => (allowBackNavigation || idx > currentIndex) && handleNavigate(idx)}
                            disabled={!allowBackNavigation && idx < currentIndex}
                            className={`w-2rem h-2rem border-circle flex align-items-center justify-content-center text-sm font-bold cursor-pointer border-none transition-all transition-duration-150
                                ${isCurrent ? 'bg-primary text-white shadow-2' : isAnswered ? 'bg-green-500 text-white' : 'surface-200 text-600 hover:surface-300'}
                                ${!allowBackNavigation && idx < currentIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={`Question ${idx + 1}${isAnswered ? ' (answered)' : ''}`}
                        >
                            {idx + 1}
                        </button>
                    );
                })}
            </div>

            {/* Current question */}
            {renderQuestion(currentQuestion, currentIndex)}

            {/* Navigation buttons */}
            <div className="flex justify-content-between align-items-center pt-3 border-top-1 surface-border">
                <button
                    onClick={goToPrevious}
                    disabled={isFirstQuestion || !allowBackNavigation}
                    className={`flex align-items-center gap-2 px-4 py-2 border-round border-1 surface-border bg-transparent cursor-pointer transition-all transition-duration-150
                        ${isFirstQuestion || !allowBackNavigation ? 'opacity-50 cursor-not-allowed' : 'hover:surface-100'}`}
                >
                    <i className="pi pi-arrow-left"></i>
                    <span>Previous</span>
                </button>

                <span className="text-500 text-sm">
                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                </span>

                {isLastQuestion ? (
                    <button onClick={onSubmit} className="flex align-items-center gap-2 px-4 py-2 border-round border-none bg-green-500 text-white cursor-pointer transition-all transition-duration-150 hover:bg-green-600">
                        <span>Submit Quiz</span>
                        <i className="pi pi-check"></i>
                    </button>
                ) : (
                    <button onClick={goToNext} className="flex align-items-center gap-2 px-4 py-2 border-round border-none bg-primary text-white cursor-pointer transition-all transition-duration-150 hover:bg-primary-600">
                        <span>Next</span>
                        <i className="pi pi-arrow-right"></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default DisplayQuestions;
