import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { fetchSlidesQuestions, getRecomendationByAnswers } from "./api";
import { type Answers, type DecisionStep, type Question } from "./types";

const DecisionPage: FunctionComponent = () => {
    const [decisionStep, setDecisionStep] = useState<DecisionStep>('base');
    const [recommendation, setRecommendation] = useState('');
    const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);

    const handleAnswers = async (answers: Answers) => {
        const recsByAnswers = await getRecomendationByAnswers(answers);
        setRecommendation(recsByAnswers);
        setDecisionStep('recommendation');
    };

    const onRestart = () => {
        setDecisionStep('base');
        setRecommendation('');
    };

    const fetchQuestions = async () => {
        const questions = await fetchSlidesQuestions();
        setSlidersQuestions(questions);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onBaseComplete={() => setDecisionStep('sliding')} />,
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