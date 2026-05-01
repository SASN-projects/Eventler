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

export const getRecomendationById = (eventId: string) => {
    // try {
    //     const { data } = await api.get(`/recommendations/for-event/${eventId}`);
    //     return data;
    // } catch {
    return ({
        "eventId": "57f82b8f-9ca2-4646-a18f-276c87de80f9",
        "recommendations": [
            {
                "id": "a26c1f57-fa87-4f23-bcca-cb896a142e00",
                "eventId": "57f82b8f-9ca2-4646-a18f-276c87de80f9",
                "venueId": "95213b5b-66f2-4e4b-b5a0-8ced5b45a008",
                "score": "45.6000",
                "createdAt": "2026-04-11T19:11:16.355Z",
                "venue": {
                    "id": "95213b5b-66f2-4e4b-b5a0-8ced5b45a008",
                    "name": "Cafe Mocha",
                    "category": "Coffee Shop",
                    "description": "A cozy place to enjoy great coffee and pastries.",
                    "address": "123 Main Street",
                    "city": "New York",
                    "country": "USA",
                    "priceLevel": 2,
                    "rating": "4.50",
                    "source": "Internal",
                    "externalSourceId": "cafe-mocha-123",
                    "createdAt": "2026-04-11T19:11:16.339Z",
                    "updatedAt": "2026-04-11T19:11:16.339Z"
                }
            }
        ],
        "count": 1
    });
    // }
};
