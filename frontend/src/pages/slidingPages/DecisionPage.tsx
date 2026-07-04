import { CircularProgress } from "@mui/material";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { PreferencesConfirm } from "./PreferencesConfirm";
import { fetchSlidesQuestions, getRecomendationsById, submitAnswers } from "./api";
import { LOADING_SUBTITLE, LOADING_TITLE } from "./consts";
import { LoadingContainer, LoadingSubtitle, LoadingTextContainer, LoadingTitle } from "./styles";
import { type Answers, type DecisionStep, type Question, type Recommendation } from "./types";

const DecisionPage: FunctionComponent = () => {
    const [eventId, setEventId] = useState("");
    const [decisionStep, setDecisionStep] = useState<DecisionStep>("base");
    const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState<boolean>(false);

    const fetchQuestions = async () => {
        const questions = await fetchSlidesQuestions();
        setSlidersQuestions(questions);
    };

    const handleVibeSelect = async (vibe: string) => {
        const questions = await fetchSlidesQuestions(vibe);
        setSlidersQuestions(questions);
    };

    const onBaseComplete = (id: string) => {
        setEventId(id);
        setDecisionStep("preferences-confirm");
    };

    const onPreferencesConfirm = async (_selected: string[]) => {
        // Refetch questions to capture the updated preferences immediately
        const questions = await fetchSlidesQuestions();
        setSlidersQuestions(questions);
        setDecisionStep("sliding");
    };

    const handleAnswers = async (answers: Answers) => {
        setIsGeneratingRecommendation(true);
        await submitAnswers(eventId, answers);

        const { data } = await getRecomendationsById(eventId);
        setRecommendations(data);

        setIsGeneratingRecommendation(false);
        setDecisionStep("recommendation");
    };

    const onRestart = () => {
        setDecisionStep("base");
        setRecommendations([]);
        setIsGeneratingRecommendation(false);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const loadingScreen = (
        <LoadingContainer>
            <CircularProgress />
            <LoadingTextContainer>
                <LoadingTitle>
                    {LOADING_TITLE}
                </LoadingTitle>
                <LoadingSubtitle>
                    {LOADING_SUBTITLE}
                </LoadingSubtitle>
            </LoadingTextContainer>
        </LoadingContainer>
    );

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onBaseComplete={onBaseComplete} />,
        "preferences-confirm": <PreferencesConfirm onConfirm={onPreferencesConfirm} />,
        sliding: isGeneratingRecommendation ? (
            loadingScreen
        ) : (
            <Slider 
                questions={slidersQuestions} 
                handleAnswers={handleAnswers} 
                onVibeSelect={handleVibeSelect}
            />
        ),
        recommendation: (
            <RecommendationsPage
                eventId={eventId}
                onRestart={onRestart}
                recommendations={recommendations}
            />
        ),
    };

    return <FullSizeContainer>{steps[decisionStep]}</FullSizeContainer>;
};

export default DecisionPage;