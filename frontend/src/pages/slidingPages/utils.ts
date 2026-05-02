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
export const extractRecommendation = (response: any): Recommendation => {
    if (!response) {
        return EMPTY_RECOMMENDATION;
    }

    if (response.data && typeof response.data === 'object' && response.data.title) {
        return {
            name: response.data.title,
            city: '',
            rating: '',
            address: response.data.address ?? '',
            country: '',
            category: '',
            priceLevel: '',
            description: response.data.description ?? ''
        };
    }

    if (Array.isArray(response.recommendations) && response.recommendations.length > 0) {
        const { venue } = response.recommendations[0];
        const {
            name,
            city,
            rating,
            address,
            country,
            category,
            priceLevel,
            description,
        } = venue || {};

        return {
            name: name ?? '',
            city: city ?? '',
            rating: rating ?? '',
            address: address ?? '',
            country: country ?? '',
            category: category ?? '',
            priceLevel: priceLevel != null ? String(priceLevel) : '',
            description: description ?? ''
        };
    }

    return EMPTY_RECOMMENDATION;
};