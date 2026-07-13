export interface SelectionBaseParams {
    time: Date;
    place: string;
    participantsAmount: number;
}

export interface Option {
    id: string;
    value: string;
    createdAt: Date;
    question: Object;
    questionId: string;
}

export interface Question {
    id: string;
    code: string;
    label: string;
    createdAt: Date;
    description: string;
    answerMode: 'options' | 'value' | 'NUMBER' | 'TEXT' | 'CHOICE';
    imageUrl?: string;
    options: Option[];
}

export type Answers = Record<string, string>;

export type DecisionStep = 'base' | 'sliding' | 'recommendation';

export interface Recommendation {
    id: string;
    title: string;
    rating?: number;
    userRatingCount?: number;
    address: string;
    category?: string;
    priceLevel?: string;
    description: string;
    photoUrl?: string;
    photoAttributions?: Array<{
        displayName?: string;
        uri?: string;
        photoUri?: string;
    }>;
    googleMapsUri?: string;
}
