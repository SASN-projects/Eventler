import api from "../../config/api";
import { msInTwoHours } from "./consts";
import type { Answers, Question } from "./types";

export const fetchSlidesQuestions = async (): Promise<Question[]> => {
    // try {
    //     const { data } = await api.get('/sliders');
    //     return data;
    // } catch {
        return [
            {
                id: '1',
                code: 'budget',
                label: 'What is your preferred budget?',
                description: '',
                answerMode: 'CHOICE',
                createdAt: new Date(),
                options: [{
                    id: '1',
                    value: 'Low (Under 50 NIS)',
                    questionId: '',
                    createdAt: new Date(),
                    question: {},
                }, {
                    id: '2',
                    value: 'Medium (50-150 NIS)',
                    questionId: '',
                    createdAt: new Date(),
                    question: {},
                }, {
                    id: '3',
                    value: 'High (150-300 NIS)',
                    questionId: '',
                    createdAt: new Date(),
                    question: {},
                }, {
                    id: '4',
                    value: 'Luxury (Over 300 NIS)',
                    questionId: '',
                    createdAt: new Date(),
                    question: {},
                }],
            },
            {
                id: '2',
                code: 'event-type',
                label: 'What type of event do you prefer?',
                description: '',
                answerMode: 'CHOICE',
                createdAt: new Date(),
                options: [
                    {
                        id: '1',
                        value: 'Party and Social Gathering',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '2',
                        value: 'Relaxation and Wellness',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '3',
                        value: 'Restaurant and Dining',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '4',
                        value: 'Outdoor and Adventure',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                ],
            },
            {
                id: '3',
                code: 'Transportation',
                label: 'Transportation preference?',
                description: '',
                answerMode: 'CHOICE',
                createdAt: new Date(),
                options: [
                    {
                        id: '1',
                        value: 'Car',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '2',
                        value: 'Public Transport',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '3',
                        value: 'Bike',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '4',
                        value: 'Walking',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                ],
            },
            {
                id: '4',
                code: 'Crowd',
                label: 'Preferred crowd size?',
                description: '',
                answerMode: 'CHOICE',
                createdAt: new Date(),
                options: [
                    {
                        id: '1',
                        value: 'Small (1-10 people)',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '2',
                        value: 'Medium (11-50 people)',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '3',
                        value: 'Large (51-100 people)',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                    {
                        id: '4',
                        value: 'Very Large (101+ people)',
                        questionId: '',
                        createdAt: new Date(),
                        question: {},
                    },
                ],
            },
        ];
    // }
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
        "locationCountry": "Israel"
    };

    try {
        const { data } = await api.post('/events', eventDetails);
        return data.id;
    } catch {
        console.log('failing to post event');
        return 'id';
    }
};


// export const getRecomendationByAnswers = (answers: Answers) => 'Shakeds';

export const submitAnswers = async (eventId: string, answers: Answers) => {
    // const data = {
    //     answers: Object.entries(answers).map(([question, answerValue]) => ({ question, answerValue }))
    // };

    // try {
    //     api.post(`/slides/submit-answers/${eventId}`, data);
    // } catch {
    //     console.log('failing to post answers');
    // }
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
