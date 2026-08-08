import type { SelectionBaseParams } from "./types";

export const msInTwoHours = 5 * 60 * 60 * 1000;

export const DEFAULT_PARAMS: SelectionBaseParams = {
    place: 'Tel Aviv',
    participantsAmount: 2,
    time: new Date(Date.now() + msInTwoHours),
};

export const NEW_EVENT_TITLE = "New Event";
export const START_SLIDING_BTN = "Start Sliding!";
export const DECISION_MODE_TITLE = "Choose a decision mode";
export const SOLO_DECISION_LABEL = "Solo Decision";
export const GROUP_DECISION_LABEL = "Group Decision";
export const DECISION_MODE_DESCRIPTION = "Pick how you want to make this decision.";
export const TIME_ERROR_MSG = "Time must be equal to or later than now";
export const PLACE_ERROR_MSG = "Place cannot be empty";
export const AMOUNT_ERROR_MSG = "Amount must be at least 1";

export const LOADING_TITLE = "Generating recommendation";
export const LOADING_SUBTITLE = "This may take a moment.";

export const SLIDING_COMPLETED_TITLE = "Sliding Completed";
export const GOOD_MATCH_SUBTITLE = "Looks like this can be a good match!";
export const START_NEW_EVENT_BTN = "Start New Event";

export const VIBE_QUESTION_LABEL = "What's your vibe?";
export const VIBE_OPTIONS = ["dining", "sightseeing", "active", "clubbing", "casual", "cultural"];
