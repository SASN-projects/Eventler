import type { Answers, Question } from "./types";

// request data from backend by axios req
// change type, more informative answer input 
export const fetchSlidesQuestions = (): Question[] => [
    { question: 'What is your preferred budget?', type: 'number' },
    { question: 'What type of event do you prefer?', type: 'choice' },
    { question: 'Preferred location?', type: 'text' },
    { question: 'Transportation preference?', type: 'choice' },
];

// also change
export const getRecomendationByAnswers = (answers: Answers) => 'Shakeds'