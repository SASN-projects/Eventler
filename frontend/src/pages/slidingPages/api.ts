import api from "../../config/api";
import { msInTwoHours } from "./consts";
import type { Answers, Question, Recommendation } from "./types";

export interface GenerateRecommendationsResponse {
    success: boolean;
    data?: Recommendation[];
    message?: string;
}

export const fetchSlidesQuestions = async (): Promise<Question[]> => {
    try {
        const { data } = await api.get('/slides');
        return data.map((question: any) => ({
            ...question,
            imageUrl: question.image_url ?? question.imageUrl,
        }));
    } catch {
        console.log('fetching slides failed');
        return [];
    }
};

export const postNewEvent = async (time: Date, place: string, participantAmount: number) => {
    const eventDetails = {
        "title": "",
        "description": "",
        "status": "collecting_responses",
        "eventType": "individual",
        "targetDate": time,
        "targetDateFrom": time,
        "targetDateTo": new Date(time.getTime() + msInTwoHours),
        "deadlineAt": new Date(time.getTime() + msInTwoHours),
        "participantCount": participantAmount,
        "locationCity": place,
        "locationCountry": ""
    };

    const { data } = await api.post('/events', eventDetails);

    if (!data?.id) {
        throw new Error("Event was created without an id.");
    }

    return data.id;
};

export const submitAnswers = async (eventId: string, answers: Answers) => {
    const data = {
        answers: Object.entries(answers).map(([question, answerValue]) => ({ question, answerValue }))
    };

    await api.post(`/slides/submit-answers/${eventId}`, data);
};

export const getRecomendationsById = async (eventId: string): Promise<GenerateRecommendationsResponse> => {
    const { data } = await api.post(`/recommendations/events/${eventId}/generate`);
    return data;
};

export const postSelectedRecommendation = async (eventId: string, recommendationId: string) =>
    await api.post(`/recommendations/events/${eventId}/select/${recommendationId}`);
