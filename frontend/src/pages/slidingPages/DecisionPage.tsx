import { CircularProgress } from "@mui/material";
import axios from "axios";
import type { FunctionComponent, ReactElement } from "react";
import { useContext, useEffect, useState } from "react";
import { PrimeButton } from "../../components/buttons";
import { FullSizeContainer } from "../../components/layouts";
import { AuthContext } from "../../contexts/AuthContext";
import BaseQuestions from "./BaseQuestions";
import CreatorDecisionPage from "./CreatorDecisionPage";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import Slide from "./Slide";
import { PreferencesConfirm } from "./PreferencesConfirm";
import ThankYouPage from "./ThankYouPage";
import {
  closeQuestionnaire,
  fetchSlidesQuestions,
  getEventAnswers,
  getEventDetails,
  getRecomendationsById,
  pollUntilRecommendationsReady,
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

type EventAnswer = {
  userId?: string;
  question?: string;
  answerValue?: string;
};

interface DecisionPageProps {
  resumeEvent?: { eventId: string; mode: "slides" | "recommendations" } | null;
  onFinalSelectionComplete?: () => void;
}

const DecisionPage: FunctionComponent<DecisionPageProps> = ({
  resumeEvent,
  onFinalSelectionComplete,
}) => {
  const auth = useContext(AuthContext);
  const [eventId, setEventId] = useState("");
  const [decisionStep, setDecisionStep] = useState<DecisionStep>("base");
  const [slidersQuestions, setSlidersQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [isClosingQuestionnaire, setIsClosingQuestionnaire] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [existingAnswers, setExistingAnswers] = useState<Answers>({});
  const [hasLoadedResume, setHasLoadedResume] = useState(false);
  const [resumeRequestKey, setResumeRequestKey] = useState<string | null>(null);
  const [eventCreatedById, setEventCreatedById] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState<Answers | null>(null);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [thankYouVariant, setThankYouVariant] = useState<"waiting" | "creator-success">("waiting");

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

  const loadEventDetails = async (id: string) => {
    const eventDetails = await getEventDetails(id);
    const creatorId = eventDetails?.createdById ?? eventDetails?.creator?.id ?? null;
    const isGroup = (eventDetails?.eventType ?? "").toLowerCase() === "group";
    setEventCreatedById(creatorId);
    return { creatorId, isGroup, eventDetails };
  };

  const onBaseComplete = async (id: string, _isGroup = false) => {
    setExistingAnswers({});
    setRecommendations([]);
    setGenerationError("");
    setLastSubmittedAnswers(null);
    setSelectedVibe("");
    setDecisionStep("sliding");
    setEventId(id);
    await loadEventDetails(id);
  };

  const loadRecommendations = async (id: string) => {
    setIsGeneratingRecommendation(true);
    try {
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
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };

  const onPreferencesConfirm = async () => {
    setDecisionStep("vibe-select");
  };

  const onVibeConfirm = async (vibe: string) => {
    setSelectedVibe(vibe);
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

    const vibeQuestionLabel = slidersQuestions.find((question) => question.code === "vibe")?.label
      ?? "What's your vibe?";
    const vibeFromAnswers = answers[vibeQuestionLabel]?.trim() ?? "";
    const vibe = selectedVibe.trim() || vibeFromAnswers;

    if (!vibe) {
      setGenerationError("Please choose a vibe before generating recommendations.");
      return;
    }

    if (vibe !== selectedVibe) {
      setSelectedVibe(vibe);
    }

    setLastSubmittedAnswers(answers);
    setIsGeneratingRecommendation(true);
    setGenerationError("");

    try {
      const finalAnswers = {
        [vibeQuestionLabel]: vibe,
        ...answers,
      };

      const sanitizedAnswers = Object.fromEntries(
        Object.entries(finalAnswers).filter(([, answerValue]) => typeof answerValue === "string" && answerValue.trim().length > 0),
      );

      await submitAnswers(eventId, sanitizedAnswers);

      const { creatorId, isGroup } = await loadEventDetails(eventId);
      const isCreator = auth?.user?.id === (creatorId ?? eventCreatedById);

      if (!isCreator) {
        setThankYouVariant("waiting");
        setDecisionStep("thankYou");
        return;
      }

      if (isGroup) {
        setDecisionStep("creator-decision");
      } else {
        await loadRecommendations(eventId);
      }
    } catch (error) {
      setRecommendations([]);
      setGenerationError(getErrorMessage(error));
      setDecisionStep("sliding");
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };

  const handleCreatorFinishNow = async () => {
    if (!eventId) return;
    setIsClosingQuestionnaire(true);
    setGenerationError("");
    setDecisionStep("generating");

    try {
      await closeQuestionnaire(eventId);
      const finalStatus = await pollUntilRecommendationsReady(eventId);

      if (finalStatus === "recommendations_ready") {
        await loadRecommendations(eventId);
      } else if (finalStatus === "closed") {
        throw new Error("Recommendation generation failed. The questionnaire is closed and you can try generating again.");
      } else {
        throw new Error(`Event status is '${finalStatus}'. Could not complete recommendation generation.`);
      }
    } catch (err) {
      setGenerationError(getErrorMessage(err));
      setDecisionStep("creator-decision");
    } finally {
      setIsClosingQuestionnaire(false);
    }
  };

  const handleCreatorKeepOpen = () => {
    setThankYouVariant("waiting");
    setDecisionStep("thankYou");
  };

  const handleFinalSelectionSuccess = () => {
    setThankYouVariant("creator-success");
    setDecisionStep("thankYou");
    if (onFinalSelectionComplete) {
      onFinalSelectionComplete();
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
    setIsClosingQuestionnaire(false);
    setIsResuming(false);
    setEventCreatedById(null);
    setGenerationError("");
    setLastSubmittedAnswers(null);
    setSelectedVibe("");
    setThankYouVariant("waiting");
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
        setThankYouVariant("waiting");
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

      try {
        const { creatorId, isGroup, eventDetails } = await loadEventDetails(resumeEvent.eventId);
        const currentUserId = auth?.user?.id ?? null;
        const isCreator = Boolean(currentUserId && creatorId && creatorId === currentUserId);
        const normalizedStatus = (eventDetails?.status ?? "").toLowerCase();

        if (normalizedStatus === "final_selection_made" || normalizedStatus === "finalized") {
          setThankYouVariant(isCreator ? "creator-success" : "waiting");
          setDecisionStep("thankYou");
          return;
        }

        if (normalizedStatus === "recommendations_ready") {
          if (isCreator) {
            await loadRecommendations(resumeEvent.eventId);
          } else {
            setThankYouVariant("waiting");
            setDecisionStep("thankYou");
          }
          return;
        }

        if (normalizedStatus === "closed" || normalizedStatus === "generating_recommendations") {
          if (isCreator) {
            setDecisionStep("generating");
            const finalStatus = await pollUntilRecommendationsReady(resumeEvent.eventId);
            if (finalStatus === "recommendations_ready") {
              await loadRecommendations(resumeEvent.eventId);
            } else {
              setGenerationError(`Recommendation generation ended with status '${finalStatus}'.`);
              setDecisionStep("creator-decision");
            }
          } else {
            setThankYouVariant("waiting");
            setDecisionStep("thankYou");
          }
          return;
        }

        // Status is OPEN / DRAFT — check member answers
        const [questions, answers] = await Promise.all([
          fetchSlidesQuestions(),
          getEventAnswers(resumeEvent.eventId),
        ]);

        const eventAnswers = (answers || []) as EventAnswer[];
        const hasCurrentUserAnswered = Boolean(
          currentUserId &&
          eventAnswers.some((item) => item.userId === currentUserId),
        );

        setSlidersQuestions(questions);

        if (hasCurrentUserAnswered) {
          if (isCreator && isGroup) {
            setDecisionStep("creator-decision");
          } else if (isCreator && !isGroup) {
            await loadRecommendations(resumeEvent.eventId);
          } else {
            setThankYouVariant("waiting");
            setDecisionStep("thankYou");
          }
          return;
        }

        const mappedAnswers = eventAnswers
          .filter((item) => item.userId === currentUserId)
          .reduce(
            (acc: Answers, item) => ({
              ...acc,
              [item.question ?? ""]: item.answerValue || "",
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
    "group-deadline": loadingScreen, // Handled inside BaseQuestions dialog
    sliding: slidingStep,
    "creator-decision": (
      <CreatorDecisionPage
        onFinishNow={handleCreatorFinishNow}
        onKeepOpen={handleCreatorKeepOpen}
        isClosing={isClosingQuestionnaire}
      />
    ),
    generating: (
      <LoadingContainer>
        <CircularProgress size={50} sx={{ color: "#edb53c", mb: 2 }} />
        <LoadingTextContainer>
          <LoadingTitle>Closing questionnaire & generating recommendations…</LoadingTitle>
          <LoadingSubtitle>
            Analyzing group preferences to find top 3 matching venues. Please wait a moment.
          </LoadingSubtitle>
        </LoadingTextContainer>
      </LoadingContainer>
    ),
    recommendation:
      isResuming || isGeneratingRecommendation ? (
        loadingScreen
      ) : (
        <RecommendationsPage
          eventId={eventId}
          onRestart={onRestart}
          onFinalSelectionComplete={handleFinalSelectionSuccess}
          recommendations={recommendations}
        />
      ),
    thankYou: <ThankYouPage variant={thankYouVariant} />,
  };

  return <FullSizeContainer>{steps[decisionStep]}</FullSizeContainer>;
};

export default DecisionPage;
