import { useState, useEffect } from "react";
import { Box, Typography, Button, Stack, CircularProgress, Chip } from "@mui/material";
import api from "../../config/api";
import { PREFERENCE_OPTIONS } from "../auth/PreferencesSetup";
import {
  PreferenceGrid,
  PreferenceCard,
  PreferenceIcon,
  PreferenceLabel,
} from "./profile.styles";

interface PreferencesConfirmProps {
  onConfirm: (selected: string[]) => void;
}

const PREF_MAP: Record<string, string> = {
  budget: "💰 Budget",
  "event-type": "🎉 Type",
  transportation: "🚗 Transport",
  crowd: "👥 Crowd",
  "planning-style": "📅 Plan",
  "location-type": "📍 Vibe",
  "evening-structure": "🍻 Structure",
};

export const PreferencesConfirm = ({ onConfirm }: PreferencesConfirmProps) => {
  const [currentPreferences, setCurrentPreferences] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const { data } = await api.get("/users/preferences");
        const prefs = data.interests || [];
        setCurrentPreferences(prefs);
        setSelected(prefs);
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const toggleSelect = (code: string) => {
    setSelected((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length < 5
        ? [...prev, code]
        : prev
    );
  };

  const handleKeep = () => {
    onConfirm(currentPreferences);
  };

  const handleSaveAndContinue = async () => {
    if (selected.length === 0 || selected.length > 5) return;
    setSaveLoading(true);
    try {
      await api.put("/users/preferences", { interests: selected });
      onConfirm(selected);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" gap={2}>
        <CircularProgress color="secondary" />
        <Typography variant="body2" color="text.secondary">
          Loading your preferences...
        </Typography>
      </Box>
    );
  }

  if (isEditing) {
    return (
      <Box sx={{ width: "100%", maxWidth: "450px", textAlign: "center", mx: "auto", p: 3, bgcolor: "white", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#9c27b0", mb: 1 }}>
          Customize Preferences
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          Select 1 to 5 topics to customize this sliding session:
        </Typography>

        <PreferenceGrid sx={{ maxHeight: "300px", overflowY: "auto", pr: 0.5 }}>
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

        <Stack spacing={1.5} sx={{ mt: 4, width: "100%" }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSaveAndContinue}
            disabled={saveLoading || selected.length === 0}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "16px",
              py: 1.5,
              fontSize: "16px",
              boxShadow: "0 4px 14px rgba(156,39,176,0.25)",
            }}
          >
            {saveLoading ? <CircularProgress size={24} sx={{ color: "inherit" }} /> : "Save & Start Sliding"}
          </Button>
          <Button 
            onClick={() => {
              setSelected(currentPreferences);
              setIsEditing(false);
            }} 
            sx={{ textTransform: "none", color: "text.secondary", fontWeight: 700 }}
          >
            Back
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "450px", textAlign: "center", mx: "auto", p: 4, bgcolor: "white", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#1976d2", mb: 1.5 }}>
        Review Preferences
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, px: 1 }}>
        Would you like to keep your current topic preferences or change them specifically for this sliding session?
      </Typography>

      <Box sx={{ p: 2.5, bgcolor: "#f8fafc", borderRadius: "20px", mb: 4, border: "1px solid #f1f5f9" }}>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", mb: 1.5 }}>
          Current Preference Topics:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1.25, justifyContent: "center" }}>
          {currentPreferences.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              No preference topics selected (general questions will be random)
            </Typography>
          ) : (
            currentPreferences.map(p => (
              <Chip 
                key={p} 
                label={PREF_MAP[p] || p} 
                size="medium" 
                sx={{ bgcolor: "#eff6ff", color: "#1e40af", fontWeight: 700, borderRadius: "10px", border: "1px solid #bfdbfe" }} 
              />
            ))
          )}
        </Stack>
      </Box>

      <Stack spacing={2} sx={{ width: "100%" }}>
        <Button
          variant="contained"
          onClick={handleKeep}
          sx={{
            textTransform: "none",
            bgcolor: "#1976d2",
            color: "white",
            fontWeight: 800,
            borderRadius: "16px",
            py: 1.75,
            fontSize: "16px",
            boxShadow: "0 4px 14px rgba(25,118,210,0.25)",
            "&:hover": { bgcolor: "#1565c0" },
          }}
        >
          Keep Selection & Start
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setIsEditing(true)}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: "16px",
            py: 1.5,
            fontSize: "16px",
            borderWidth: "2px",
            "&:hover": { borderWidth: "2px" },
          }}
        >
          Change Selection
        </Button>
      </Stack>
    </Box>
  );
};
