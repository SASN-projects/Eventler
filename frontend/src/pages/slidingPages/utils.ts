import type { Answers, Question, Recommendation } from "./types";

export const formatTimeAsText = (time: Date) =>
    time instanceof Date && !isNaN(time.getTime())
        ? time.toISOString().slice(0, 16)
        : '';

export const createAnswersObject = (questions: Question[]) =>
    questions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {} as Answers);

// change by req types later
export const extractRecommendation = ({ recommendations }: any): Recommendation => {
    const { venue: {
        name,
        // city, 
        // address, 
        // country, 
        // category,
        description
    } } = recommendations[0];

    return ({
        name,
        // city,
        // address,
        // country,
        // category,
        description
    });
};