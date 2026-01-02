// Quiz Template Generators for CSV and JSON Downloads

/**
 * Generate CSV template content for quiz questions
 */
export const generateCSVTemplate = (): string => {
    const headers =
        'questionText,questionType,points,optionA,correctA,optionAImage,optionB,correctB,optionBImage,optionC,correctC,optionCImage,optionD,correctD,optionDImage,optionE,correctE,optionEImage,optionF,correctF,optionFImage,optionG,correctG,optionGImage,optionH,correctH,optionHImage,left1,right1,left2,right2,left3,right3,left4,right4,left5,right5,correctText,correctOptions,explanation,imageUrl,isRequired';

    const examples = [
        // Single Choice Radio
        '"What is the capital of France?",single_choice_radio,1,"London",false,,"Paris",true,,"Berlin",false,,"Madrid",false,,,,,,,,,,,,,,,,,,,,"Paris is the capital and largest city of France","",true',
        // Single Choice Dropdown
        '"Select the largest planet in our solar system",single_choice_dropdown,1,"Mars",false,,"Jupiter",true,,"Venus",false,,"Saturn",false,,,,,,,,,,,,,,,,,,,,"Jupiter is the largest planet","",true',
        // Multiple Choice (multiple correct answers)
        '"Which of the following are programming languages?",multiple_choice,2,"Python",true,,"HTML",false,,"JavaScript",true,,"CSS",false,,"Java",true,,,,,,,,,,,,,,,,"Select all that are actual programming languages","",true',
        // Picture Choice (with image URLs for options)
        '"Identify the correct traffic sign for STOP",picture_choice,1,"Yield Sign",false,"https://example.com/yield.png","Stop Sign",true,"https://example.com/stop.png","Speed Limit",false,"https://example.com/speed.png","No Entry",false,"https://example.com/noentry.png",,,,,,,,,,,,,,,,,,"The octagonal red sign means STOP","https://example.com/traffic-signs.png",true',
        // Fill in the Blanks
        '"The chemical formula for water is ___",fill_blanks,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"H2O",,"Water consists of 2 hydrogen and 1 oxygen atom","",true',
        // Matching (pairs)
        '"Match the countries with their capitals",matching,3,,,,,,,,,,,,,,,,,,,,,,,,"France","Paris","Germany","Berlin","Italy","Rome","Spain","Madrid","Japan","Tokyo",,,"Match each country to its correct capital city","",true',
        // Matching Text
        '"Match the terms with their definitions",matching_text,2,,,,,,,,,,,,,,,,,,,,,,,,"Photosynthesis","Process by which plants make food","Respiration","Process of breathing","Digestion","Breaking down food",,,,,,"Connect each term to its definition","",true',
        // Free Text / Essay
        '"Explain the importance of renewable energy sources",free_text,5,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"Renewable energy sources are important because they are sustainable, reduce carbon emissions, and help combat climate change.",,"Include at least 3 key points","",true'
    ];

    return headers + '\n' + examples.join('\n');
};

/**
 * Generate JSON template content for quiz questions
 */
export const generateJSONTemplate = (): string => {
    const template = {
        questions: [
            {
                questionText: 'What is the capital of France?',
                questionType: 'single_choice_radio',
                points: 1,
                options: [
                    { text: 'London', isCorrect: false },
                    { text: 'Paris', isCorrect: true },
                    { text: 'Berlin', isCorrect: false },
                    { text: 'Madrid', isCorrect: false }
                ],
                explanation: 'Paris is the capital and largest city of France',
                isRequired: true
            },
            {
                questionText: 'Select the largest planet',
                questionType: 'single_choice_dropdown',
                points: 1,
                options: [
                    { text: 'Mars', isCorrect: false },
                    { text: 'Jupiter', isCorrect: true },
                    { text: 'Venus', isCorrect: false },
                    { text: 'Saturn', isCorrect: false }
                ],
                explanation: 'Jupiter is the largest planet in our solar system'
            },
            {
                questionText: 'Which are programming languages? (select all)',
                questionType: 'multiple_choice',
                points: 2,
                options: [
                    { text: 'Python', isCorrect: true },
                    { text: 'HTML', isCorrect: false },
                    { text: 'JavaScript', isCorrect: true },
                    { text: 'CSS', isCorrect: false },
                    { text: 'Java', isCorrect: true }
                ],
                explanation: 'Python, JavaScript, and Java are programming languages. HTML and CSS are markup/styling languages.'
            },
            {
                questionText: 'Identify the STOP sign',
                questionType: 'picture_choice',
                points: 1,
                imageUrl: 'https://example.com/traffic-signs.png',
                options: [
                    { text: 'Yield Sign', isCorrect: false, imageUrl: 'https://example.com/yield.png' },
                    { text: 'Stop Sign', isCorrect: true, imageUrl: 'https://example.com/stop.png' },
                    { text: 'Speed Limit', isCorrect: false, imageUrl: 'https://example.com/speed.png' }
                ]
            },
            {
                questionText: 'The chemical formula for water is ___',
                questionType: 'fill_blanks',
                points: 1,
                correctText: 'H2O',
                explanation: 'Water consists of 2 hydrogen atoms and 1 oxygen atom'
            },
            {
                questionText: 'Match the countries with their capitals',
                questionType: 'matching',
                points: 3,
                matchingPairs: [
                    { id: '1', left: 'France', right: 'Paris' },
                    { id: '2', left: 'Germany', right: 'Berlin' },
                    { id: '3', left: 'Italy', right: 'Rome' },
                    { id: '4', left: 'Spain', right: 'Madrid' }
                ],
                explanation: 'Match each country to its correct capital city'
            },
            {
                questionText: 'Match the terms with their definitions',
                questionType: 'matching_text',
                points: 2,
                matchingPairs: [
                    { id: '1', left: 'Photosynthesis', right: 'Process by which plants make food' },
                    { id: '2', left: 'Respiration', right: 'Process of breathing' },
                    { id: '3', left: 'Digestion', right: 'Breaking down food' }
                ]
            },
            {
                questionText: 'Explain the importance of renewable energy sources',
                questionType: 'free_text',
                points: 5,
                correctText: 'Renewable energy sources are important because they are sustainable, reduce carbon emissions, and help combat climate change.',
                explanation: 'Include at least 3 key points in your answer'
            }
        ]
    };

    return JSON.stringify(template, null, 2);
};

/**
 * Download CSV template
 */
export const downloadCSVTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Download JSON template
 */
export const downloadJSONTemplate = () => {
    const template = generateJSONTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_questions_template.json';
    a.click();
    URL.revokeObjectURL(url);
};
