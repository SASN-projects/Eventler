import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";
import { Box, CircularProgress, Fade, Typography } from "@mui/material";
import { type FunctionComponent, useContext, useEffect, useState } from "react";
import { PrimeButton } from "../../components/buttons";
import api from "../../config/api";
import { AuthContext } from "../../contexts/AuthContext";
import { postSelectedRecommendation } from "./api";
import { GOOD_MATCH_SUBTITLE, SLIDING_COMPLETED_TITLE } from "./consts";
import {
  LocationContainer,
  RecommendationCard,
  RecommendationContainer,
  RecommendationDescription,
  RecommendationName,
  RecommendationsGrid,
} from "./styles";
import type { Recommendation } from "./types";

interface RecommendationsProps {
  eventId: string;
  onRestart: () => void;
  recommendations: Recommendation[];
}

export const RecommendationsPage: FunctionComponent<RecommendationsProps> = ({
  recommendations,
  onRestart,
  eventId,
}) => {
  const auth = useContext(AuthContext);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [canSelectRecommendation, setCanSelectRecommendation] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadEventAccess = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        if (!isMounted) return;

        const creatorId = data?.createdById ?? data?.creator?.id;
        setCanSelectRecommendation(Boolean(creatorId) && auth?.user?.id === creatorId);
      } catch {
        if (isMounted) {
          setCanSelectRecommendation(false);
        }
      }
    };

    void loadEventAccess();

    return () => {
      isMounted = false;
    };
  }, [auth?.user?.id, eventId]);

  const handleSubmitSelection = async (recommendationId: string) => {
    if (!canSelectRecommendation) return;

    setIsSubmitting(true);
    try {
      await postSelectedRecommendation(eventId, recommendationId);
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onRestart();
      }, 2000);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  if (isSubmitting || isSuccess) {
    return (
      <RecommendationContainer>
        {isSubmitting && (
          <Fade in={isSubmitting}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <CircularProgress size={60} sx={{ color: "#edb53c" }} />
              <Typography sx={{ fontSize: "20px", fontWeight: "bold", color: "#1976d2" }}>
                Saving your event...
              </Typography>
            </Box>
          </Fade>
        )}
        {isSuccess && (
          <Fade in={isSuccess} timeout={500}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <CheckCircleIcon sx={{ fontSize: 80, color: "#4caf50" }} />
              <Typography sx={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>
                Event Created!
              </Typography>
            </Box>
          </Fade>
        )}
      </RecommendationContainer>
    );
  }

  const renderRecommendation = (recommendation: Recommendation, index: number) => {
    const isSelected = selectedIndex === index;
    const showSelectionButton = canSelectRecommendation && isSelected;

    return (
      <RecommendationCard
        key={recommendation.id || index}
        $isSelected={isSelected}
        onClick={() => {
          if (canSelectRecommendation) {
            setSelectedIndex(index);
          }
        }}
      >
        {recommendation.photoUrl && (
          <Box
            sx={{
              width: "100%",
              aspectRatio: "16 / 10",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#f5f7fb",
            }}
          >
            <Box
              component="img"
              src={recommendation.photoUrl}
              alt={recommendation.title}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Box>
        )}

        <RecommendationName $isSelected={isSelected}>
          {recommendation.title}
        </RecommendationName>

        <RecommendationDescription>
          {recommendation.description}
        </RecommendationDescription>

        {(recommendation.rating || recommendation.userRatingCount) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px", color: "#edb53c" }}>
            <StarIcon fontSize="small" />
            <Typography sx={{ fontSize: "14px", color: "text.primary" }}>
              {recommendation.rating ? recommendation.rating.toFixed(1) : "Rated"}
              {recommendation.userRatingCount ? ` (${recommendation.userRatingCount} reviews)` : ""}
            </Typography>
          </Box>
        )}

        <LocationContainer>
          <LocationOnIcon fontSize="small" color="primary" />
          <Typography
            component={recommendation.googleMapsUri ? "a" : "span"}
            href={recommendation.googleMapsUri}
            target={recommendation.googleMapsUri ? "_blank" : undefined}
            rel={recommendation.googleMapsUri ? "noreferrer" : undefined}
            sx={{
              fontSize: "14px",
              color: "#1976d2",
              textDecoration: recommendation.googleMapsUri ? "underline" : "none",
            }}
          >
            {recommendation.address}
          </Typography>
        </LocationContainer>

        <Box sx={{ flex: 1 }} />

        {showSelectionButton ? (
          <PrimeButton
            onClick={(event) => {
              event.stopPropagation();
              handleSubmitSelection(recommendation.id);
            }}
            sx={{ alignSelf: "center", marginTop: "8px", padding: "8px 16px", fontSize: "14px" }}
          >
            that's my event
          </PrimeButton>
        ) : !canSelectRecommendation ? (
          <Typography sx={{ fontSize: "13px", color: "#718096", textAlign: "center" }}>
            Only the event creator can choose the final recommendation.
          </Typography>
        ) : null}
      </RecommendationCard>
    );
  };

  return (
    <RecommendationContainer>
      <Typography sx={{ fontSize: "18px", margin: 0 }}>{SLIDING_COMPLETED_TITLE}</Typography>
      <Typography sx={{ fontSize: "24px", margin: 0, mb: 1 }}>{GOOD_MATCH_SUBTITLE}</Typography>

      <RecommendationsGrid>
        {(recommendations || []).map((rec, index) => renderRecommendation(rec, index))}
      </RecommendationsGrid>
    </RecommendationContainer>
  );
};

export default RecommendationsPage;
