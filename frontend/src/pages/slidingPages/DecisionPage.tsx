import { CircularProgress } from "@mui/material";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
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
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState<boolean>(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(true);
    const [questionsError, setQuestionsError] = useState<string>("");

    const fetchQuestions = async () => {
        setIsLoadingQuestions(true);
        setQuestionsError("");

        try {
            const questions = await fetchSlidesQuestions();
            setSlidersQuestions(questions);
            if (questions.length === 0) {
                setQuestionsError("No sliding questions are available right now.");
            }
        } catch {
            setQuestionsError("Failed to load sliding questions.");
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const onBaseComplete = (id: string) => {
        setDecisionStep("sliding");
        setEventId(id);
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
        sliding: isGeneratingRecommendation || isLoadingQuestions ? (
            loadingScreen
        ) : questionsError ? (
            <LoadingContainer>
                <LoadingTextContainer>
                    <LoadingTitle>
                        {questionsError}
                    </LoadingTitle>
                    <LoadingSubtitle>
                        Please go back and try again.
                    </LoadingSubtitle>
                </LoadingTextContainer>
            </LoadingContainer>
        ) : (
            <Slider questions={slidersQuestions} handleAnswers={handleAnswers} />
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
