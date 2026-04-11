import type { FunctionComponent } from "react";
import { useState } from "react";
import Slide from "./Slide";
import type { Answers, Question } from "./types";

const createAnswersObject = (questions: Question[]) =>
    questions.reduce((acc, q) => ({ ...acc, [q.question]: '' }), {} as Answers);

interface SlidesProps {
    questions: Question[];
    handleAnswers: (answers: Answers) => void;
}

export const Slider: FunctionComponent<SlidesProps> = ({ questions, handleAnswers }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [answers, setAnswers] = useState<Answers>(createAnswersObject(questions));

    const handleNext = (answer: string) => {
        if (answer !== '')
            setAnswers(prev => ({
                ...prev,
                [questions[currentStepIndex].question]: answer
            }));

        if (currentStepIndex < questions.length - 1)
            setCurrentStepIndex(currentStepIndex + 1);

        if (currentStepIndex === questions.length - 1)
            handleAnswers(answers);
    };

    return (
        <Slide
            title={questions[currentStepIndex].question}
            options={['1', '2', '3']}
            onNext={handleNext}
        />
    );
};

export default Slider;