import type { FunctionComponent } from "react";
import { useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import { Box, Typography } from "@mui/material";
import Slide from "./Slide";
import type { Answers, Question } from "./types";
import { createAnswersObject } from "./utils";

interface SlidesProps {
  questions: Question[];
  handleAnswers: (answers: Answers) => void;
}

export const Slider: FunctionComponent<SlidesProps> = ({
  questions,
  handleAnswers,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>(
    createAnswersObject(questions),
  );
  const currentQuestion = questions[currentStepIndex];

  if (!currentQuestion) {
    return (
      <FullSizeContainer
        sx={{
          background: "linear-gradient(to right, #aed9ff, #d2b7f5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center", color: "white", px: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            No questions available
          </Typography>
          <Typography variant="body2">
            Please try again in a moment.
          </Typography>
        </Box>
      </FullSizeContainer>
    );
  }

  const handleNext = (answer: string) => {
    const updatedAnswers = {
      ...answers,
      [currentQuestion.label]: answer,
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
