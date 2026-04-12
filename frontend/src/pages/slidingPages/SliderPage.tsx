import type { FunctionComponent } from "react";
import { useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import Slide from "./Slide";
import type { Answers, Question } from "./types";
import { createAnswersObject } from "./utils";

interface SlidesProps {
    questions: Question[];
    handleAnswers: (answers: Answers) => void;
}

export const Slider: FunctionComponent<SlidesProps> = ({ questions, handleAnswers }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<Answers>(createAnswersObject(questions));

    const handleNext = (answer: string) => {
        if (answer !== '')
            setAnswers(prev => ({
                ...prev,
                [questions[currentStepIndex].id]: answer
            }));

        if (currentStepIndex < questions.length - 1)
            setCurrentStepIndex(currentStepIndex + 1);

        if (currentStepIndex === questions.length - 1)
            handleAnswers(answers);
    };

    return (
        <FullSizeContainer sx={{ background: 'linear-gradient(to right, #aed9ff, #d2b7f5)' }}>
            <Slide
                title={questions[currentStepIndex].label}
                options={questions[currentStepIndex].options.map(option => option.value)}
                onNext={handleNext}
            />
        </FullSizeContainer>
    );
};

export default Slider;