import type { Answers, Question } from "./types";

export const formatTimeAsText = (time: Date) =>
    time instanceof Date && !isNaN(time.getTime())
        ? time.toISOString().slice(0, 16)
        : '';

export const createAnswersObject = (questions: Question[]) =>
    questions.reduce((acc, q) => ({ ...acc, [q.question]: '' }), {} as Answers);