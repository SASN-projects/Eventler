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

export const PREFERENCE_OPTIONS = [
  { code: "budget", label: "Budget", icon: "💰" },
  { code: "event-type", label: "Event Type", icon: "🎉" },
  { code: "transportation", label: "Transportation", icon: "🚗" },
  { code: "crowd", label: "Crowd Size", icon: "👥" },
  { code: "planning-style", label: "Planning Style", icon: "📅" },
  { code: "location-type", label: "Location Vibe", icon: "📍" },
  { code: "evening-structure", label: "Evening Plan", icon: "🍻" },
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
            color: "#9c27b0",
            fontWeight: 800,
            borderRadius: "16px",
            py: 1.25,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "#f8f0fc" },
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
