import type { SelectionBaseParams } from "./types";

export const msInTwoHours = 5 * 60 * 60 * 1000;

export const DEFAULT_PARAMS: SelectionBaseParams = {
    place: 'Tel Aviv',
    participantsAmount: 2,
    time: new Date(Date.now() + msInTwoHours),
};