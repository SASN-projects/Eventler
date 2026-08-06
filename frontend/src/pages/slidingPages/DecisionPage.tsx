import { CircularProgress } from "@mui/material";
import axios from "axios";
import type { FunctionComponent, ReactElement } from "react";
import { useContext, useEffect, useState } from "react";
import { PrimeButton } from "../../components/buttons";
import { FullSizeContainer } from "../../components/layouts";
import { AuthContext } from "../../contexts/AuthContext";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import Slide from "./Slide";
import { PreferencesConfirm } from "./PreferencesConfirm";
import ThankYouPage from "./ThankYouPage";
import {
  fetchSlidesQuestions,
  getEventAnswers,
  getEventDetails,
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
  const auth = useContext(AuthContext);
  const [eventId, setEventId] = useState("");
  const [decisionStep, setDecisionStep] = useState<DecisionStep>("base");
  const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [existingAnswers, setExistingAnswers] = useState<Answers>({});
  const [hasLoadedResume, setHasLoadedResume] = useState(false);
  const [resumeRequestKey, setResumeRequestKey] = useState<string | null>(null);
  const [eventCreatedById, setEventCreatedById] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState<Answers | null>(null);
  const [selectedVibe, setSelectedVibe] = useState("");

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const questions = await fetchSlidesQuestions();
      setSlidersQuestions(questions);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message || error.message;
    }

    return error instanceof Error
      ? error.message
      : "Could not generate recommendations. Please try again.";
  };

  const loadEventCreator = async (id: string) => {
    const eventDetails = await getEventDetails(id);
    const creatorId = eventDetails?.createdById ?? eventDetails?.creator?.id ?? null;
    setEventCreatedById(creatorId);
    return creatorId;
  };

  const onBaseComplete = async (id: string) => {
    setExistingAnswers({});
    setRecommendations([]);
    setGenerationError("");
    setLastSubmittedAnswers(null);
    setSelectedVibe("");
    setDecisionStep("sliding");
    setEventId(id);
    await loadEventCreator(id);
  };

  const loadRecommendations = async (id: string) => {
    const response = await getRecomendationsById(id);
    if (!response.success) {
      throw new Error(response.message || "Could not generate recommendations. Please try again.");
    }

    const nextRecommendations = Array.isArray(response.data) ? response.data : [];
    if (nextRecommendations.length !== 3) {
      throw new Error(`Expected 3 recommendations, but got ${nextRecommendations.length}. Please try again.`);
    }

    setRecommendations(nextRecommendations);
    setDecisionStep("recommendation");
  };

  const onPreferencesConfirm = async (_selected: string[]) => {
    setDecisionStep("vibe-select");
  };

  const onVibeConfirm = async (vibe: string) => {
    setSelectedVibe(vibe);
    // Fetch questions matching the selected vibe
    const questions = await fetchSlidesQuestions(vibe);
    setSlidersQuestions(questions);
    setDecisionStep("sliding");
  };

  const handleAnswers = async (answers: Answers) => {
    if (!eventId) return;

    const hasAnsweredAllQuestions = slidersQuestions.every((question) => answers[question.label]);
    if (!hasAnsweredAllQuestions) {
      setGenerationError("Please answer all questions before generating recommendations.");
      return;
    }

    setLastSubmittedAnswers(answers);
    setIsGeneratingRecommendation(true);
    setGenerationError("");

    try {
      // Merge the vibe answer into final submitted answers
      const finalAnswers = {
        "What's your vibe?": selectedVibe,
        ...answers,
      };

      await submitAnswers(eventId, finalAnswers);

      const creatorId = eventCreatedById ?? (await loadEventCreator(eventId));
      const isCreator = auth?.user?.id === creatorId;

      if (!isCreator) {
        setDecisionStep("thankYou");
        setTimeout(() => {
          onRestart();
        }, 2000);
        return;
      }

      await loadRecommendations(eventId);
    } catch (error) {
      setRecommendations([]);
      setGenerationError(getErrorMessage(error));
      setDecisionStep("sliding");
    } finally {
      setIsGeneratingRecommendation(false);
    }
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
    setEventCreatedById(null);
    setGenerationError("");
    setLastSubmittedAnswers(null);
    setSelectedVibe("");
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
        setEventCreatedById(null);
        setRecommendations([]);
        setGenerationError("");
        setLastSubmittedAnswers(null);
        setSelectedVibe("");
        return;
      }

      const resumeKey = `${resumeEvent.eventId}:${resumeEvent.mode}`;
      if (hasLoadedResume && resumeRequestKey === resumeKey) return;

      if (hasLoadedResume && resumeRequestKey !== resumeKey) {
        setHasLoadedResume(false);
        setResumeRequestKey(null);
      }

      setHasLoadedResume(true);
      setResumeRequestKey(resumeKey);
      setIsResuming(true);
      setGenerationError("");
      setLastSubmittedAnswers(null);
      setEventId(resumeEvent.eventId);
      setDecisionStep(resumeEvent.mode === "recommendations" ? "recommendation" : "sliding");

      try {
        if (resumeEvent.mode === "recommendations") {
          await loadEventCreator(resumeEvent.eventId);
          await loadRecommendations(resumeEvent.eventId);
          return;
        }

        const [questions, answers, eventDetails] = await Promise.all([
          fetchSlidesQuestions(),
          getEventAnswers(resumeEvent.eventId),
          getEventDetails(resumeEvent.eventId),
        ]);

        const creatorId = eventDetails?.createdById ?? eventDetails?.creator?.id ?? null;
        const currentUserId = auth?.user?.id ?? null;
        const hasCurrentUserAnswered = Boolean(
          currentUserId &&
            (answers || []).some((item: any) => item.userId === currentUserId),
        );

        setEventCreatedById(creatorId);
        setSlidersQuestions(questions);

        if (hasCurrentUserAnswered) {
          if (creatorId && creatorId === currentUserId) {
            await loadRecommendations(resumeEvent.eventId);
          } else {
            setDecisionStep("thankYou");
          }
          return;
        }

        const mappedAnswers = (answers || [])
          .filter((item: any) => item.userId === currentUserId)
          .reduce(
            (acc: Answers, item: any) => ({
              ...acc,
              [item.question]: item.answerValue || "",
            }),
            {} as Answers,
          );
        setExistingAnswers(mappedAnswers);
        setDecisionStep("sliding");
      } catch (error) {
        setGenerationError(getErrorMessage(error));
        setDecisionStep("sliding");
      } finally {
        setIsResuming(false);
      }
    };

    fetchQuestions();
    void loadResumeState();
  }, [resumeEvent, hasLoadedResume, resumeRequestKey, auth?.user?.id]);

  const loadingScreen = (
    <LoadingContainer>
      <CircularProgress />
      <LoadingTextContainer>
        <LoadingTitle>{LOADING_TITLE}</LoadingTitle>
        <LoadingSubtitle>{LOADING_SUBTITLE}</LoadingSubtitle>
      </LoadingTextContainer>
    </LoadingContainer>
  );

  const slidingStep =
    isLoadingQuestions || isResuming || slidersQuestions.length === 0 ? (
      loadingScreen
    ) : (
      <>
        <Slider
          questions={slidersQuestions}
          handleAnswers={handleAnswers}
          initialAnswers={existingAnswers}
          disabled={isGeneratingRecommendation}
        />
        {isGeneratingRecommendation && (
          <LoadingContainer
            sx={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.72)",
              zIndex: 10,
            }}
          >
            <CircularProgress />
            <LoadingTextContainer>
              <LoadingTitle>{LOADING_TITLE}</LoadingTitle>
              <LoadingSubtitle>{LOADING_SUBTITLE}</LoadingSubtitle>
            </LoadingTextContainer>
          </LoadingContainer>
        )}
        {generationError && !isGeneratingRecommendation && (
          <LoadingContainer
            sx={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.88)",
              zIndex: 10,
              padding: 3,
            }}
          >
            <LoadingTextContainer>
              <LoadingTitle>Recommendation failed</LoadingTitle>
              <LoadingSubtitle sx={{ color: "error.main", maxWidth: 520 }}>
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
    "preferences-confirm": <PreferencesConfirm onConfirm={onPreferencesConfirm} />,
    "vibe-select": (
      <FullSizeContainer
        sx={{
          backgroundImage: "linear-gradient(to right, #aed9ff, #d2b7f5)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Slide
          title="What's your vibe?"
          options={["dining", "sightseeing", "active", "clubbing", "casual", "cultural"]}
          onNext={onVibeConfirm}
        />
      </FullSizeContainer>
    ),
    sliding: slidingStep,
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
    thankYou: <ThankYouPage />,
  };

  return <FullSizeContainer>{steps[decisionStep]}</FullSizeContainer>;
};

export default DecisionPage;
