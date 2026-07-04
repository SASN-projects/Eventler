import { CircularProgress } from "@mui/material";
import type { FunctionComponent, ReactElement } from "react";
import { useEffect, useState, useContext } from "react";
import { FullSizeContainer } from "../../components/layouts";
import BaseQuestions from "./BaseQuestions";
import RecommendationsPage from "./RecommendationsPage";
import Slider from "./SliderPage";
import Slide from "./Slide";
import { PreferencesConfirm } from "./PreferencesConfirm";
import ThankYouPage from "./ThankYouPage";
import {
  fetchSlidesQuestions,
  getEventAnswers,
  getRecomendationsById,
  submitAnswers,
  getEventDetails,
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
import { AuthContext } from "../../contexts/AuthContext";

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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState<boolean>(false);
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [existingAnswers, setExistingAnswers] = useState<Answers>({});
  const [hasLoadedResume, setHasLoadedResume] = useState(false);
  const [resumeRequestKey, setResumeRequestKey] = useState<string | null>(null);
  const [eventCreatedById, setEventCreatedById] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState("");

  const fetchQuestions = async () => {
    const questions = await fetchSlidesQuestions();
    setSlidersQuestions(questions);
  };

  const onBaseComplete = async (id: string) => {
    setExistingAnswers({});
    setEventId(id);
    setDecisionStep("preferences-confirm");
    
    // Fetch event details to check if current user is creator
    const eventDetails = await getEventDetails(id);
    if (eventDetails) {
      setEventCreatedById(eventDetails.createdById);
    }
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
    if (!eventId) {
      return;
    }

    setIsGeneratingRecommendation(true);

    try {
      // Merge the vibe answer into final submitted answers
      const finalAnswers = {
        "What's your vibe?": selectedVibe,
        ...answers,
      };

      await submitAnswers(eventId, finalAnswers);

      // Check if current user is the event creator
      const isCreator = auth?.user?.id === eventCreatedById;

      if (!isCreator) {
        // Non-creator: show thank-you screen before returning to decision start
        setDecisionStep("thankYou");
        setTimeout(() => {
          onRestart();
        }, 2000);
        return;
      }

      // Creator: proceed with recommendation generation
      setDecisionStep("recommendation");
      const { data } = await getRecomendationsById(eventId);
      setRecommendations(data);
    } catch {
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
    setIsGeneratingRecommendation(false);
    setIsResuming(false);
    setEventCreatedById(null);
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
        setSelectedVibe("");
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

      if (resumeEvent.mode === "recommendations") {
        setDecisionStep("recommendation");
        const eventDetails = await getEventDetails(resumeEvent.eventId);
        if (eventDetails) {
          setEventCreatedById(eventDetails.createdById);
        }
        const response = await getRecomendationsById(resumeEvent.eventId);
        setRecommendations(response?.data || []);
        setIsResuming(false);
        return;
      }

      const [questions, answers, eventDetails] = await Promise.all([
        fetchSlidesQuestions(),
        getEventAnswers(resumeEvent.eventId),
        getEventDetails(resumeEvent.eventId),
      ]);

      const creatorId = eventDetails?.createdById ?? null;
      const currentUserId = auth?.user?.id ?? null;
      const hasCurrentUserAnswered = Boolean(
        currentUserId &&
          (answers || []).some((item: any) => item.userId === currentUserId),
      );

      setEventCreatedById(creatorId);

      if (hasCurrentUserAnswered) {
        if (creatorId && creatorId === currentUserId) {
          setDecisionStep("recommendation");
          const response = await getRecomendationsById(resumeEvent.eventId);
          setRecommendations(response?.data || []);
        } else {
          setDecisionStep("thankYou");
        }

        setIsResuming(false);
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

      const vibe = mappedAnswers["What's your vibe?"];
      if (vibe) {
        setSelectedVibe(vibe);
        const tagQuestions = await fetchSlidesQuestions(vibe);
        setSlidersQuestions(tagQuestions);
        setDecisionStep("sliding");
      } else {
        setSlidersQuestions(questions);
        setDecisionStep("preferences-confirm");
      }

      setIsResuming(false);
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
    thankYou: <ThankYouPage />,
  };

  return <FullSizeContainer>{steps[decisionStep]}</FullSizeContainer>;
};

export default DecisionPage;
