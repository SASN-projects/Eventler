import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { fetchSlidesQuestions, getRecomendationById, submitAnswers } from "./apiWithMockups";
import { type Recommendation, type Answers, type DecisionStep, type Question } from "./types";
import { extractRecommendation } from "./utils";

const EMPTY_RECOMMENDATION: Recommendation = { name: '', description: '' };

const DecisionPage: FunctionComponent = () => {
    const [eventId, setEventId] = useState('');
    const [decisionStep, setDecisionStep] = useState<DecisionStep>('base');
    const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
    const [recommendation, setRecommendation] = useState<Recommendation>(EMPTY_RECOMMENDATION);

    const fetchQuestions = async () => {
        const questions = await fetchSlidesQuestions(); 
        setSlidersQuestions(questions);
    };

    const onBaseComplete = (id: string) => {
        setDecisionStep('sliding');
        setEventId(id);
    };

    const handleAnswers = async (answers: Answers) => {
        await submitAnswers(eventId, answers);
        const recByAnswers = await getRecomendationById(eventId);
        setRecommendation(extractRecommendation(recByAnswers));
        setDecisionStep('recommendation');
    };

    const onRestart = () => {
        setDecisionStep('base');
        setRecommendation(EMPTY_RECOMMENDATION);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onBaseComplete={onBaseComplete} />,
        sliding: <Slider questions={slidersQuestions} handleAnswers={handleAnswers} />,
        recommendation: <RecommendationsPage recommendation={recommendation} onRestart={onRestart} />
    };

    return (
        <FullSizeContainer>
            {steps[decisionStep]}
        </FullSizeContainer>
    );
};

export default DecisionPage;