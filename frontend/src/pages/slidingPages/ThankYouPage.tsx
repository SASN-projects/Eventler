import { Box, Typography } from "@mui/material";
import type { FunctionComponent } from "react";
import { FullSizeContainer } from "../../components/layouts";

interface ThankYouPageProps {
  /**
   * "waiting"        — Non-creator member submitted answers; waiting for creator to choose.
   * "creator-success" — Creator just selected the final recommendation; event is created.
   */
  variant?: "waiting" | "creator-success";
}

const ThankYouPage: FunctionComponent<ThankYouPageProps> = ({
  variant = "waiting",
}) => {
  const isSuccess = variant === "creator-success";

  return (
    <FullSizeContainer
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: 2,
        padding: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          fontSize: "32px",
          color: isSuccess ? "#276749" : "#2d3748",
          mb: 2,
        }}
      >
        {isSuccess ? "Your event is set! 🎉" : "Thank You! 🎉"}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: "#4a5568",
          fontSize: "16px",
          lineHeight: 1.6,
          maxWidth: "400px",
        }}
      >
        {isSuccess
          ? "The event has been planned and saved. Your group will see the final choice."
          : "Your answers were submitted successfully. You can answer slides only once for this event."}
      </Typography>

      {!isSuccess && (
        <Typography
          variant="body2"
          sx={{
            color: "#718096",
            fontSize: "14px",
            mt: 2,
          }}
        >
          Please wait for the event creator to review and choose the final
          recommendation.
        </Typography>
      )}

      {/* Spinner for waiting variant; checkmark-style pulse for success */}
      <Box
        sx={
          isSuccess
            ? {
                mt: 3,
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#276749",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "& svg": { color: "#fff", fontSize: "28px" },
              }
            : {
                mt: 3,
                width: "40px",
                height: "40px",
                border: "3px solid rgba(237, 181, 60, 0.3)",
                borderRadius: "50%",
                borderTop: "3px solid #edb53c",
                animation: "spin 1s linear infinite",
                "@keyframes spin": {
                  to: { transform: "rotate(360deg)" },
                },
              }
        }
      >
        {isSuccess && (
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </Box>
    </FullSizeContainer>
  );
};

export default ThankYouPage;
