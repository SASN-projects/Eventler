import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { fetchSlidesQuestions, getRecomendationById, submitAnswers } from "./apiWithMockups";
import { type Answers, type DecisionStep, type Question, type Recommendation } from "./types";
import { EMPTY_RECOMMENDATION, extractRecommendation } from "./utils";

const DecisionPage: FunctionComponent = () => {
    const [eventId, setEventId] = useState('');
    const [decisionStep, setDecisionStep] = useState<DecisionStep>('base');
    const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
    const [recommendation, setRecommendation] = useState<Recommendation>(EMPTY_RECOMMENDATION);
    const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);

    const fetchQuestions = async () => {
        const questions = await fetchSlidesQuestions();
        setSlidersQuestions(questions);
    };

    const onBaseComplete = (id: string) => {
        setDecisionStep('sliding');
        setEventId(id);
    };

    const handleAnswers = async (answers: Answers) => {
        setIsGeneratingRecommendation(true);
        await submitAnswers(eventId, answers);

        const recByAnswers = await getRecomendationById(eventId);
        setRecommendation(extractRecommendation(recByAnswers));
        setIsGeneratingRecommendation(false);
        setDecisionStep('recommendation');
    };

    const onRestart = () => {
        setDecisionStep('base');
        setRecommendation(EMPTY_RECOMMENDATION);
        setIsGeneratingRecommendation(false);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const loadingScreen = (
        <FullSizeContainer sx={{ justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>Generating recommendation</Typography>
                <Typography sx={{ fontSize: '16px', color: 'text.secondary' }}>This may take a moment.</Typography>
            </Box>
        </FullSizeContainer>
    );

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onBaseComplete={onBaseComplete} />,
        sliding: isGeneratingRecommendation ? loadingScreen : <Slider questions={slidersQuestions} handleAnswers={handleAnswers} />,
        recommendation: <RecommendationsPage recommendation={recommendation} onRestart={onRestart} />
    };

    return (
        <FullSizeContainer>
            {steps[decisionStep]}
        </FullSizeContainer>
    );
};

export default DecisionPage;