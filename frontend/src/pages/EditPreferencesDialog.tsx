import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { PREFERENCE_OPTIONS } from "./auth/PreferencesSetup";
import {
  PreferenceGrid,
  PreferenceCard,
  PreferenceIcon,
  PreferenceLabel,
} from "./slidingPages/profile.styles";

interface EditPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
  initialSelected: string[];
  onSave: (selected: string[]) => Promise<void>;
}

export default function EditPreferencesDialog({
  open,
  onClose,
  initialSelected,
  onSave,
}: EditPreferencesDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(initialSelected || []);
    }
  }, [open, initialSelected]);

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
    setLoading(true);
    try {
      await onSave(selected);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "24px", p: 1.5 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Event Preferences</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          Select up to 5 topics that matter most when recommending events:
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "text.secondary", fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="secondary"
          disabled={loading || selected.length === 0}
          sx={{ textTransform: "none", borderRadius: "12px", fontWeight: 700, px: 3 }}
        >
          Save Choices
        </Button>
      </DialogActions>
    </Dialog>
  );
}
