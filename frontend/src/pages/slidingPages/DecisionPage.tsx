import { CircularProgress } from "@mui/material";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import {
  fetchSlidesQuestions,
  getEventAnswers,
  getRecomendationsById,
  submitAnswers,
} from "./api";
import { LOADING_SUBTITLE, LOADING_TITLE } from "./consts";
import {
  LoadingContainer,
  LoadingSubtitle,
  LoadingTextContainer,
  LoadingTitle,
} from "./styles";
import {
  type Answers,
  type DecisionStep,
  type Question,
  type Recommendation,
} from "./types";

interface DecisionPageProps {
  resumeEvent?: { eventId: string; mode: "slides" | "recommendations" } | null;
}

const DecisionPage: FunctionComponent<DecisionPageProps> = ({
  resumeEvent,
}) => {
  const [eventId, setEventId] = useState("");
  const [decisionStep, setDecisionStep] = useState<DecisionStep>("base");
  const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState<boolean>(false);
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [existingAnswers, setExistingAnswers] = useState<Answers>({});
  const [hasLoadedResume, setHasLoadedResume] = useState(false);
  const [resumeRequestKey, setResumeRequestKey] = useState<string | null>(null);

  const fetchQuestions = async () => {
    const questions = await fetchSlidesQuestions();
    setSlidersQuestions(questions);
  };

  const onBaseComplete = (id: string) => {
    setExistingAnswers({});
    setDecisionStep("sliding");
    setEventId(id);
  };

  const handleAnswers = async (answers: Answers) => {
    if (!eventId) {
      return;
    }

    setIsGeneratingRecommendation(true);
    setDecisionStep("recommendation");
    await submitAnswers(eventId, answers);

    const { data } = await getRecomendationsById(eventId);
    setRecommendations(data);

    setIsGeneratingRecommendation(false);
  };

  const onRestart = () => {
    setDecisionStep("base");
    setRecommendations([]);
    setEventId("");
    setExistingAnswers({});
    setHasLoadedResume(false);
    setResumeRequestKey(null);
    setIsGeneratingRecommendation(false);
    setIsResuming(false);
  };

  useEffect(() => {
    const loadResumeState = async () => {
      if (!resumeEvent) {
        setExistingAnswers({});
        setEventId("");
        setDecisionStep("base");
        setHasLoadedResume(false);
        setResumeRequestKey(null);
        setIsResuming(false);
        return;
      }

      const resumeKey = `${resumeEvent.eventId}:${resumeEvent.mode}`;
      if (hasLoadedResume && resumeRequestKey === resumeKey) {
        return;
      }

      if (hasLoadedResume && resumeRequestKey !== resumeKey) {
        setHasLoadedResume(false);
        setResumeRequestKey(null);
      }

      setHasLoadedResume(true);
      setResumeRequestKey(resumeKey);
      setIsResuming(true);
      setEventId(resumeEvent.eventId);
      setDecisionStep(
        resumeEvent.mode === "recommendations" ? "recommendation" : "sliding",
      );

      if (resumeEvent.mode === "recommendations") {
        const response = await getRecomendationsById(resumeEvent.eventId);
        setRecommendations(response?.data || []);
        setIsResuming(false);
        return;
      }

      const [questions, answers] = await Promise.all([
        fetchSlidesQuestions(),
        getEventAnswers(resumeEvent.eventId),
      ]);

      setSlidersQuestions(questions);
      const mappedAnswers = (answers || []).reduce(
        (acc: Answers, item: any) => ({
          ...acc,
          [item.question]: item.answerValue || "",
        }),
        {} as Answers,
      );
      setExistingAnswers(mappedAnswers);
      setIsResuming(false);
    };

    fetchQuestions();
    void loadResumeState();
  }, [resumeEvent, hasLoadedResume, resumeRequestKey]);

  const loadingScreen = (
    <LoadingContainer>
      <CircularProgress />
      <LoadingTextContainer>
        <LoadingTitle>{LOADING_TITLE}</LoadingTitle>
        <LoadingSubtitle>{LOADING_SUBTITLE}</LoadingSubtitle>
      </LoadingTextContainer>
    </LoadingContainer>
  );

  const steps: Record<DecisionStep, ReactElement> = {
    base: <BaseQuestions onBaseComplete={onBaseComplete} />,
    sliding:
      isGeneratingRecommendation || isResuming ? (
        loadingScreen
      ) : (
        <Slider
          questions={slidersQuestions}
          handleAnswers={handleAnswers}
          initialAnswers={existingAnswers}
        />
      ),
    recommendation:
      isResuming || isGeneratingRecommendation ? (
        loadingScreen
      ) : (
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
