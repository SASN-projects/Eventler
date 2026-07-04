import type { FunctionComponent } from "react";
import { useState, useEffect } from "react";
import { FullSizeContainer } from "../../components/layouts";
import Slide from "./Slide";
import type { Answers, Question } from "./types";
import { createAnswersObject } from "./utils";

interface SlidesProps {
  questions: Question[];
  handleAnswers: (answers: Answers) => void;
  onVibeSelect?: (vibe: string) => Promise<void>;
}

export const Slider: FunctionComponent<SlidesProps> = ({
  questions,
  handleAnswers,
  onVibeSelect,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>(
    createAnswersObject(questions),
  );

  useEffect(() => {
    setAnswers((prevAnswers) => ({
      ...createAnswersObject(questions),
      ...prevAnswers,
    }));
  }, [questions]);

  const handleNext = async (answer: string) => {
    const isFirstQuestion = currentStepIndex === 0 && questions[0]?.code === 'vibe';

    const updatedAnswers = {
      ...answers,
      [questions[currentStepIndex].label]: answer,
    };

    if (answer !== "") {
      setAnswers(updatedAnswers);
    }

    if (isFirstQuestion && onVibeSelect) {
      await onVibeSelect(answer);
    }

    if (currentStepIndex < questions.length - 1) {
      setCurrentStepIndex((prevCurrentStep) => prevCurrentStep + 1);
    } else {
      handleAnswers(updatedAnswers);
    }
  };

  const currentQuestion = questions[currentStepIndex];
  const backgroundImage = currentQuestion.imageUrl
    ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.35)), url(${currentQuestion.imageUrl})`
    : "linear-gradient(to right, #aed9ff, #d2b7f5)";

  return (
    <FullSizeContainer
      sx={{
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Slide
        title={currentQuestion.label}
        options={currentQuestion.options.map((option) => option.value)}
        onNext={handleNext}
      />
    </FullSizeContainer>
  );
};

export default Slider;
