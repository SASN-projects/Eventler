import { Box, Typography } from "@mui/material";
import type { FunctionComponent } from "react";
import { FullSizeContainer } from "../../components/layouts";

const ThankYouPage: FunctionComponent = () => {
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
          color: "#2d3748",
          mb: 2,
        }}
      >
        Thank You! 🎉
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
        Your answers were submitted successfully. You can answer slides only once for this event.
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#718096",
          fontSize: "14px",
          mt: 2,
        }}
      >
        Please wait for the event creator to review and choose the final recommendation.
      </Typography>

      <Box
        sx={{
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
        }}
      />
    </FullSizeContainer>
  );
};

export default ThankYouPage;
