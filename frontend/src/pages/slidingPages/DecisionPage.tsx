import { CircularProgress } from "@mui/material";
import axios from "axios";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { PrimeButton } from "../../components/buttons";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { fetchSlidesQuestions, getRecomendationsById, submitAnswers } from "./api";
import { LOADING_SUBTITLE, LOADING_TITLE } from "./consts";
import { LoadingContainer, LoadingSubtitle, LoadingTextContainer, LoadingTitle } from "./styles";
import { type Answers, type DecisionStep, type Question, type Recommendation } from "./types";

const DecisionPage: FunctionComponent = () => {
    const [eventId, setEventId] = useState("");
    const [decisionStep, setDecisionStep] = useState<DecisionStep>("base");
    const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState<boolean>(false);
    const [generationError, setGenerationError] = useState<string>("");
    const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState<Answers | null>(null);

    const fetchQuestions = async () => {
        setIsLoadingQuestions(true);
        try {
            const questions = await fetchSlidesQuestions();
            setSlidersQuestions(questions);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const onBaseComplete = (id: string) => {
        setGenerationError("");
        setLastSubmittedAnswers(null);
        setDecisionStep("sliding");
        setEventId(id);
    };

    const getErrorMessage = (error: unknown) => {
        if (axios.isAxiosError<{ message?: string }>(error)) {
            return error.response?.data?.message || error.message;
        }

        return error instanceof Error ? error.message : "Could not generate recommendations. Please try again.";
    };

    const handleAnswers = async (answers: Answers) => {
        const hasAnsweredAllQuestions = slidersQuestions.every((question) => answers[question.label]);
        if (!hasAnsweredAllQuestions) {
            setGenerationError("Please answer all questions before generating recommendations.");
            return;
        }

        setLastSubmittedAnswers(answers);
        setIsGeneratingRecommendation(true);
        setGenerationError("");
        try {
            await submitAnswers(eventId, answers);

            const response = await getRecomendationsById(eventId);
            if (!response.success) {
                throw new Error(response.message || "Could not generate recommendations. Please try again.");
            }

            const nextRecommendations = Array.isArray(response?.data) ? response.data : [];

            if (nextRecommendations.length !== 3) {
                setRecommendations([]);
                throw new Error(`Expected 3 recommendations, but got ${nextRecommendations.length}. Please try again.`);
            }

            setRecommendations(nextRecommendations);
            setDecisionStep("recommendation");
        } catch (error) {
            setRecommendations([]);
            setGenerationError(getErrorMessage(error));
        } finally {
            setIsGeneratingRecommendation(false);
        }
    };

    const onRestart = () => {
        setDecisionStep("base");
        setRecommendations([]);
        setIsGeneratingRecommendation(false);
        setGenerationError("");
        setLastSubmittedAnswers(null);
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

    const slidingStep = isLoadingQuestions || slidersQuestions.length === 0 ? (
        loadingScreen
    ) : (
        <>
            <Slider
                questions={slidersQuestions}
                handleAnswers={handleAnswers}
                disabled={isGeneratingRecommendation}
            />
            {isGeneratingRecommendation && (
                <LoadingContainer
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.72)',
                        zIndex: 10,
                    }}
                >
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
            )}
            {generationError && !isGeneratingRecommendation && (
                <LoadingContainer
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.88)',
                        zIndex: 10,
                        padding: 3,
                    }}
                >
                    <LoadingTextContainer>
                        <LoadingTitle>
                            Recommendation failed
                        </LoadingTitle>
                        <LoadingSubtitle sx={{ color: 'error.main', maxWidth: 520 }}>
                            {generationError}
                        </LoadingSubtitle>
                    </LoadingTextContainer>
                    <PrimeButton
                        onClick={() => {
                            if (lastSubmittedAnswers) {
                                handleAnswers(lastSubmittedAnswers);
                            }
                        }}
                        disabled={!lastSubmittedAnswers}
                    >
                        Try again
                    </PrimeButton>
                    <PrimeButton variant="text" onClick={() => setGenerationError("")}>
                        Change answers
                    </PrimeButton>
                </LoadingContainer>
            )}
        </>
    );

    const steps: Record<DecisionStep, ReactElement> = {
        base: <BaseQuestions onBaseComplete={onBaseComplete} />,
        sliding: slidingStep,
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
