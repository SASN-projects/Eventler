import api from "../../config/api";
import { msInTwoHours } from "./consts";
import type { Answers, Question, Recommendation } from "./types";

export interface GenerateRecommendationsResponse {
  success: boolean;
  data?: Recommendation[];
  message?: string;
}

export const fetchSlidesQuestions = async (vibes?: string): Promise<Question[]> => {
  try {
    const url = vibes ? `/slides?vibes=${encodeURIComponent(vibes)}` : '/slides';
    const { data } = await api.get(url);
    return data.map(
      (question: { image_url?: string; imageUrl?: string;[key: string]: unknown }) => ({
        ...question,
        imageUrl: question.image_url ?? question.imageUrl,
      }),
    );
  } catch {
    console.log('fetching slides failed');
    return [];
  }
};


export const postNewEvent = async (
  time: Date,
  place: string,
  participantAmount: number,
  eventType: string = "individual",
  groupId?: string,
) => {
  const eventDetails: Record<string, unknown> = {
    title: "",
    description: "",
    status: "collecting_responses",
    eventType,
    targetDate: time,
    targetDateFrom: time,
    targetDateTo: new Date(time.getTime() + msInTwoHours),
    deadlineAt: new Date(time.getTime() + msInTwoHours),
    participantCount: participantAmount,
    locationCity: place,
    locationCountry: "",
  };

  if (groupId) {
    eventDetails.groupId = groupId;
  }

  const { data } = await api.post("/events", eventDetails);

  if (!data?.id) {
    throw new Error("Event was created without an id.");
  }

  return data.id;
};

export const submitAnswers = async (eventId: string, answers: Answers) => {
  const normalizedAnswers = Object.entries(answers)
    .map(([question, answerValue]) => ({
      question,
      answerValue: typeof answerValue === "string" ? answerValue.trim() : "",
    }))
    .filter((answer) => answer.answerValue.length > 0);

  if (normalizedAnswers.length === 0) {
    throw new Error("At least one non-empty answer is required.");
  }

  const data = {
    answers: normalizedAnswers,
  };

  await api.post(`/slides/submit-answers/${eventId}`, data);
};

export const getEventAnswers = async (eventId: string) => {
  try {
    const { data } = await api.get(`/slides/event-answers/${eventId}`);
    return data || [];
  } catch {
    console.log("failing to fetch event answers");
    return [];
  }
};

export const getRecomendationsById = async (
  eventId: string,
): Promise<GenerateRecommendationsResponse> => {
  const { data } = await api.post(`/recommendations/events/${eventId}/generate`);
  return data;
};

export const postSelectedRecommendation = async (
  eventId: string,
  recommendationId: string,
) => await api.post(`/recommendations/events/${eventId}/select/${recommendationId}`);

export const getEventDetails = async (eventId: string) => {
  try {
    const { data } = await api.get(`/events/${eventId}`);
    return data;
  } catch {
    console.log("failing to fetch event details");
    return null;
  }
};
