import api from "../../config/api";
import { msInTwoHours } from "./consts";
import type { Answers, Question } from "./types";

export const fetchSlidesQuestions = async (): Promise<Question[]> => {
    try {
        const { data } = await api.get('/slides');
        return data;
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

    try {
        const { data } = await api.post('/events', eventDetails);
        return data.id;
    } catch {
        console.log('failing to post event');
        return 'id';
    }
};

export const submitAnswers = async (eventId: string, answers: Answers) => {
    const data = {
        answers: Object.entries(answers).map(([question, answerValue]) => ({ question, answerValue }))
    };

    try {
        api.post(`/slides/submit-answers/${eventId}`, data);
    } catch {
        console.log('failing to post answers');
    }
};

export const getRecomendationById = async (eventId: string) => {
    try {
        const { data } = await api.post(`/recommendations/events/${eventId}/generate`);
        return data;
    } catch {
        console.log('failing to fetch recommendation');
        return null;
    }
};
