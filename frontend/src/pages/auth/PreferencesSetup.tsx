import type { FunctionComponent } from "react";
import { useState } from "react";
import { Box, Typography, Button, Stack, CircularProgress } from "@mui/material";
import api from "../../config/api";
import {
  PreferenceGrid,
  PreferenceCard,
  PreferenceIcon,
  PreferenceLabel,
} from "../slidingPages/profile.styles";

// Codes here must match the active (non-retired) slider_questions codes in
// db/eventler_final_dml.sql / backend SlidesService.VALID_PREFERENCE_CODES.
// 'vibe' and 'activity' are excluded — captured by the dedicated vibe-select
// step. 'time-of-day' is excluded — redundant with the event's chosen start time.
export const PREFERENCE_OPTIONS = [
  { code: "budget", label: "Budget", icon: "💰" },
  { code: "transportation", label: "Transportation", icon: "🚗" },
  { code: "occasion", label: "Occasion", icon: "🎉" },
  { code: "setting", label: "Setting", icon: "📍" },
  { code: "food-drinks", label: "Food & Drinks", icon: "🍽️" },
  { code: "group-dynamic", label: "Group Dynamic", icon: "👥" },
  { code: "energy-level", label: "Energy Level", icon: "⚡" },
  { code: "must-have", label: "Must-Haves", icon: "✅" },
];

interface PreferencesSetupProps {
  onComplete: () => void;
}

export const PreferencesSetup: FunctionComponent<PreferencesSetupProps> = ({ onComplete }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (code: string) => {
    setSelected((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length < 5
        ? [...prev, code]
        : prev
    );
  };

  const handleSave = async () => {
    if (selected.length === 0 || selected.length > 5) return;
    setLoading(true);
    try {
      await api.put("/users/preferences", { interests: selected });
      onComplete();
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "white", mb: 1 }}>
        Choose What Matters Most
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 2 }}>
        Select up to 5 topics to customize recommendations:
      </Typography>

      <PreferenceGrid>
        {PREFERENCE_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.code);
          return (
            <PreferenceCard key={opt.code} $selected={isSelected} onClick={() => toggleSelect(opt.code)}>
              <PreferenceIcon>{opt.icon}</PreferenceIcon>
              <PreferenceLabel>{opt.label}</PreferenceLabel>
            </PreferenceCard>
          );
        })}
      </PreferenceGrid>

      <Stack spacing={1.5} sx={{ mt: 3, width: "100%" }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || selected.length === 0}
          sx={{
            textTransform: "none",
            bgcolor: "white",
            color: "var(--eventler-secondary)",
            fontWeight: 800,
            borderRadius: "16px",
            py: 1.25,
            boxShadow: "0 10px 24px rgba(85, 73, 145, 0.16)",
            "&:hover": { bgcolor: "#eef1ff" },
            "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.4)", color: "rgba(0,0,0,0.25)" },
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: "inherit" }} /> : "Save & Continue"}
        </Button>
        <Button onClick={onComplete} sx={{ textTransform: "none", color: "white", fontWeight: 700 }}>
          Skip for now
        </Button>
      </Stack>
    </Box>
  );
};

export default PreferencesSetup;
