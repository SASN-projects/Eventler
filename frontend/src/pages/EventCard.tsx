import { Box, Stack, Typography, Chip } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { formatDate, formatTimeRange } from "./slidingPages/profile.utils";
import {
  HistoryCard,
  HistoryCardContent,
  ParticipantAvatar,
  OverflowAvatar,
} from "./slidingPages/profile.styles";
import type { FunctionComponent } from "react";

interface EventCardProps {
  event: any;
}

const EventCard: FunctionComponent<EventCardProps> = ({ event }) => {
  const hasRecommendation = !!event.recommendation;
  const title = hasRecommendation ? event.recommendation.title : event.title || "Custom Event";
  const description = hasRecommendation ? event.recommendation.description : event.description;
  const location = hasRecommendation ? event.recommendation.address : event.locationCity || "No Location Configured";
  const dateStr = formatDate(event.targetDate || event.targetDateFrom);
  const timeStr = formatTimeRange(event.targetDateFrom, event.targetDateTo);
  const participantCount = event.participantCount || 1;
  const remainingParticipants = participantCount > 3 ? participantCount - 3 : 0;

  return (
    <HistoryCard>
      <HistoryCardContent>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "17px", mb: 0.5, color: "#2d3748" }}>
            {title}
          </Typography>

          {description && (
            <Typography variant="body2" sx={{ color: "#4a5568", fontSize: "13px", mb: 1.5, lineHeight: 1.5 }}>
              {description}
            </Typography>
          )}

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#718096", mb: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: "15px", color: "#a0aec0" }} />
            <Typography variant="body2" sx={{ fontSize: "12px", fontWeight: 500 }}>
              {location}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#718096" }}>
            <AccessTimeIcon sx={{ fontSize: "15px", color: "#a0aec0" }} />
            <Typography variant="body2" sx={{ fontSize: "12px", fontWeight: 500 }}>
              {dateStr} {timeStr && `| ${timeStr}`}
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {Array.from({ length: Math.min(participantCount, 3) }).map((_, i) => (
              <ParticipantAvatar key={i} sx={{ ml: i === 0 ? 0 : -1 }}>
                <PersonIcon sx={{ fontSize: "14px" }} />
              </ParticipantAvatar>
            ))}
            {remainingParticipants > 0 && (
              <OverflowAvatar sx={{ ml: -1 }}>
                +{remainingParticipants}
              </OverflowAvatar>
            )}
          </Box>

          <Chip
            label={hasRecommendation ? "Recommendation Selected" : "Created Event"}
            size="small"
            sx={{
              bgcolor: hasRecommendation ? "#e8f5e9" : "#e3f2fd",
              color: hasRecommendation ? "#2e7d32" : "#1565c0",
              fontWeight: 700,
              fontSize: "10px",
              height: "20px",
            }}
          />
        </Stack>
      </HistoryCardContent>
    </HistoryCard>
  );
}

export default EventCard;