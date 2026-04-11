import type { FunctionComponent, ReactElement } from "react";
import { useState } from "react";
import BaseQuestions from "./BaseQuestions";
import Slider from "./Slider";
import { fetchSlidesQuestions, getRecomendationByAnswers } from "./api";
import type { Answers } from "./types";
import { Typography } from "@mui/material";
import { FullSizeContainer } from "../../components/layouts";

type DecisionStep = 'base' | 'sliding' | 'recommendation';

const DecisionPage: FunctionComponent = () => {
    const [decisionStep, setDecisionStep] = useState<DecisionStep>('base');
    const [recommendation, setRecommendation] = useState('');

    const handleAnswers = async (answers: Answers) => {
        const recsByAnswers = await getRecomendationByAnswers(answers);
        setRecommendation(recsByAnswers);
        setDecisionStep('recommendation');
    };

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onComplete={() => setDecisionStep('sliding')} />,
        sliding: <Slider questions={fetchSlidesQuestions()} handleAnswers={handleAnswers} />,
        recommendation: <Typography>{recommendation}</Typography>
    };
    return (
        <FullSizeContainer>
            {steps[decisionStep]}
        </FullSizeContainer>
    );
};

export default DecisionPage;