import type { FunctionComponent } from "react";
import { useState, useEffect } from "react";
import { FullSizeContainer } from "../../components/layouts";
import Slide from "./Slide";
import type { Answers, Question } from "./types";
import { createAnswersObject } from "./utils";

interface SlidesProps {
  questions: Question[];
  handleAnswers: (answers: Answers) => void;
  initialAnswers?: Answers;
  disabled?: boolean;
}

export const Slider: FunctionComponent<SlidesProps> = ({
  questions,
  handleAnswers,
  initialAnswers,
  disabled = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>({});

  useEffect(() => {
    const baseAnswers = initialAnswers ?? createAnswersObject(questions);
    setAnswers(baseAnswers);

    const firstUnansweredIndex = questions.findIndex((question) => {
      const value = baseAnswers[question.label] ?? "";
      return value === "";
    });

    setCurrentStepIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
  }, [questions, initialAnswers]);

  const handleNext = (answer: string) => {
    const question = questions[currentStepIndex];
    if (!question) return;

    const updatedAnswers = {
      ...answers,
      [question.label]: answer,
    };

    if (answer !== "") {
      setAnswers(updatedAnswers);
    }

    if (currentStepIndex < questions.length - 1) {
      setCurrentStepIndex((prevCurrentStep) => prevCurrentStep + 1);
    } else {
      handleAnswers(updatedAnswers);
    }
  };


  const currentQuestion = questions[currentStepIndex];

  if (!currentQuestion) {
    return null;
  }

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
        disabled={disabled}
      />
    </FullSizeContainer>
  );
};

export default Slider;
