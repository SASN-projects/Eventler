import type { Answers, Question, Recommendation } from "./types";

export const formatTimeAsText = (time: Date) =>
    time instanceof Date && !isNaN(time.getTime())
        ? time.toISOString().slice(0, 16)
        : '';

export const createAnswersObject = (questions: Question[]) =>
    questions.reduce((acc, q) => ({ ...acc, [q.label]: '' }), {} as Answers);

export const EMPTY_RECOMMENDATION: Recommendation = ({
    name: '',
    city: '',
    rating: '',
    address: '',
    country: '',
    category: '',
    priceLevel: '',
    description: ''
});

// change by req types later
export const extractRecommendation = ({ recommendations }: any): Recommendation => {
    const { venue: {
        name,
        city,
        rating,
        address,
        country,
        category,
        priceLevel,
        description,
    } } = recommendations[0];

    return ({
        name,
        city,
        rating,
        address,
        country,
        category,
        priceLevel,
        description
    });
};