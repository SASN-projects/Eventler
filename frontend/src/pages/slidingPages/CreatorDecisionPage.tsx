import { Box, Typography } from "@mui/material";
import type { FunctionComponent } from "react";
import { PrimeButton } from "../../components/buttons";
import { FullSizeContainer } from "../../components/layouts";

interface CreatorDecisionPageProps {
  onFinishNow: () => void;
  onKeepOpen: () => void;
  isClosing?: boolean;
}

export const CreatorDecisionPage: FunctionComponent<CreatorDecisionPageProps> = ({
  onFinishNow,
  onKeepOpen,
  isClosing = false,
}) => {
  return (
    <FullSizeContainer
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: 3,
        padding: 4,
        backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          fontSize: "28px",
          color: "#2d3748",
        }}
      >
        Your answers are submitted! 🎉
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: "#4a5568",
          fontSize: "16px",
          lineHeight: 1.6,
          maxWidth: "440px",
        }}
      >
        What would you like to do next for this group event?
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "100%",
          maxWidth: "360px",
          mt: 2,
        }}
      >
        <PrimeButton
          onClick={onFinishNow}
          disabled={isClosing}
          sx={{
            py: 1.5,
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {isClosing ? "Closing & Generating..." : "Finish questionnaire now"}
        </PrimeButton>

        <PrimeButton
          variant="outlined"
          onClick={onKeepOpen}
          disabled={isClosing}
          sx={{
            py: 1.5,
            fontSize: "15px",
            color: "#4a5568",
            borderColor: "#cbd5e0",
            "&:hover": {
              borderColor: "#a0aec0",
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          Keep questionnaire open
        </PrimeButton>
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: "#718096",
          fontSize: "13px",
          maxWidth: "360px",
          mt: 1,
        }}
      >
        "Keep open" lets other group members answer until the deadline. You can close it anytime from the event details.
      </Typography>
    </FullSizeContainer>
  );
};

export default CreatorDecisionPage;
