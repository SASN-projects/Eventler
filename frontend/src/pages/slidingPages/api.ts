import api from "../../config/api";
import { msInTwoHours } from "./consts";
import type { Answers, Question, Recommendation } from "./types";

export interface GenerateRecommendationsResponse {
  success: boolean;
  data?: Recommendation[];
  message?: string;
}

export interface EventRecommendationsResponse {
  success?: boolean;
  eventId?: string;
  data?: Recommendation[];
  recommendations?: Recommendation[];
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


/**
 * Create a new event.
 *
 * @param time               Target date/time of the event.
 * @param place              City / location string.
 * @param participantAmount  Number of participants.
 * @param eventType          "individual" (default) | "group".
 * @param groupId            Required for group events.
 * @param deadlineAt         Questionnaire close deadline. Required for group
 *                           events; auto-set to +2 hours for individual events.
 */
export const postNewEvent = async (
  time: Date,
  place: string,
  participantAmount: number,
  eventType: string = "individual",
  groupId?: string,
  deadlineAt?: Date,
) => {
  const resolvedDeadline =
    deadlineAt ?? new Date(time.getTime() + msInTwoHours);

  const eventDetails: Record<string, unknown> = {
    title: "",
    description: "",
    status: "collecting_responses",
    eventType,
    targetDate: time,
    targetDateFrom: time,
    targetDateTo: new Date(time.getTime() + msInTwoHours),
    deadlineAt: resolvedDeadline,
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

  const { data: responseData } = await api.post(`/slides/submit-answers/${eventId}`, data);
  return responseData as {
    message: string;
    count: number;
    eventStatus?: string;
    allMembersAnswered?: boolean;
  };
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

export const getEventRecommendationsById = async (
  eventId: string,
): Promise<EventRecommendationsResponse> => {
  try {
    const { data } = await api.get(`/events/${eventId}/recommendations`);
    return data;
  } catch {
    const { data } = await api.get(`/events/recommendations/${eventId}`);
    return data;
  }
};

export const fetchPersistedRecommendations = getEventRecommendationsById;

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

/**
 * Tells the backend to close the group questionnaire.
 * Transitions: OPEN → CLOSED → GENERATING_RECOMMENDATIONS → RECOMMENDATIONS_READY.
 * Only the event creator can call this.
 */
export const closeQuestionnaire = async (eventId: string): Promise<void> => {
  await api.post(`/events/${eventId}/close`);
};

/**
 * Polls the event status until it reaches RECOMMENDATIONS_READY (or a terminal
 * failure state), then returns the event status string.
 *
 * @param eventId       The event to poll.
 * @param intervalMs    How often to poll (default: 3 000 ms).
 * @param timeoutMs     Give up after this many ms (default: 120 000 ms = 2 min).
 */
export const pollUntilRecommendationsReady = async (
  eventId: string,
  intervalMs = 3000,
  timeoutMs = 120_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const eventDetails = await getEventDetails(eventId);
    const status: string = (eventDetails?.status ?? "").toLowerCase();

    if (status === "recommendations_ready") return status;

    // Terminal failure — questionnaire reverted to CLOSED after a failed generation
    if (status === "closed") return status;

    // Event was cancelled or something went wrong
    if (status === "cancelled" || status === "finalized" || status === "final_selection_made") return status;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return "timeout";
};

export interface PendingQuestionnaireItem {
  eventId: string;
  groupId: string;
  title: string;
  groupName: string;
  status: string;
  deadlineAt: string | null;
  answeredMembersCount: number;
  expectedMembersCount: number;
  isCreator: boolean;
}

export interface PendingQuestionnairesResponse {
  items: PendingQuestionnaireItem[];
  count: number;
}

export const fetchPendingQuestionnaires = async (): Promise<PendingQuestionnairesResponse> => {
  try {
    const { data } = await api.get('/events/pending-questionnaires');
    return data || { items: [], count: 0 };
  } catch {
    return { items: [], count: 0 };
  }
};
