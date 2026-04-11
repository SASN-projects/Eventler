export interface SelectionBaseParams {
    time: Date;
    place: string;
    participantsAmount: number;
}

export interface Question {
    question: string;
    type: 'number' | 'text' | 'choice';
}

export type Answers = Record<string, string>;