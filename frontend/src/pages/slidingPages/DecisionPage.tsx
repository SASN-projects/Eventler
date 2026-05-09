import { CircularProgress } from "@mui/material";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import { fetchSlidesQuestions, submitAnswers } from "./api";
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

    const onBaseComplete = (id: string) => {
        setDecisionStep("sliding");
        setEventId(id);
    };

    const handleAnswers = async (answers: Answers) => {
        setIsGeneratingRecommendation(true);
        await submitAnswers(eventId, answers);

        // const { data } = await getRecomendationById(eventId);
        setRecommendations([
            {
                "title": "Romantic Evening Stroll and Dinner in Old Jaffa",
                "description": "Enjoy a charming evening stroll through the ancient alleys and picturesque port of Old Jaffa, taking in the historical ambiance and breathtaking views of the Tel Aviv coastline. Conclude your perfect date with a delightful dinner at a local restaurant offering fresh seafood or authentic Middle Eastern cuisine.",
                "address": "Old Jaffa Port, Tel Aviv-Yafo, Israel"
            },
            {
                "title": "Lively Dinner at Port Said, Tel Aviv",
                "description": "Enjoy a vibrant dining experience at Port Said, one of Tel Aviv's most popular and bustling restaurants. Known for its delicious Mediterranean-inspired small plates and lively atmosphere, it's perfect for two people looking for a dynamic evening. The large crowd adds to the energetic vibe, and the menu offers excellent value within your preferred medium budget (50-150 NIS per person). It's easily accessible by car, allowing for a comfortable arrival.",
                "address": "Har Sinai St 5, Tel Aviv-Yafo"
            },
            {
                "title": "Lively Dinner at Port Said, Tel Aviv",
                "description": "Enjoy a vibrant dining experience at Port Said, one of Tel Aviv's most popular and bustling restaurants. Known for its delicious Mediterranean-inspired small plates and lively atmosphere, it's perfect for two people looking for a dynamic evening. The large crowd adds to the energetic vibe, and the menu offers excellent value within your preferred medium budget (50-150 NIS per person). It's easily accessible by car, allowing for a comfortable arrival.",
                "address": "Har Sinai St 5, Tel Aviv-Yafo"
            }
        ]);
    
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
        sliding: isGeneratingRecommendation ? (
            loadingScreen
        ) : (
            <Slider questions={slidersQuestions} handleAnswers={handleAnswers} />
        ),
        recommendation: (
            <RecommendationsPage
                recommendations={recommendations}
                onRestart={onRestart}
            />
        ),
    };

    return <FullSizeContainer>{steps[decisionStep]}</FullSizeContainer>;
};

export default DecisionPage;