import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import type { ChangeEvent, FunctionComponent } from "react";
import type { User } from "./slidingPages/profile.types";

interface EditProfileDialogProps {
  user: User;
  open: boolean;
  onSave: () => void;
  onClose: () => void;
  onChange: (field: keyof User) => (e: ChangeEvent<HTMLInputElement>) => void;
  saving?: boolean;
  error?: string;
}

const textFieldSx = {
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--eventler-secondary)",
  },
};

const EditProfileDialog: FunctionComponent<EditProfileDialogProps> = ({ open, onClose, user, onChange, onSave, saving = false, error = "" }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
    <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Profile Details</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <TextField label="Username" value={user.username || ""} onChange={onChange("username")} fullWidth size="small" sx={textFieldSx} />
        <Stack direction="row" spacing={2}>
          <TextField label="First Name" value={user.firstName} onChange={onChange("firstName")} fullWidth size="small" sx={textFieldSx} />
          <TextField label="Last Name" value={user.lastName} onChange={onChange("lastName")} fullWidth size="small" sx={textFieldSx} />
        </Stack>
        <TextField label="Email" value={user.email} onChange={onChange("email")} fullWidth size="small" sx={textFieldSx} />
        <Stack direction="row" spacing={2}>
          <TextField label="City" value={user.city || ""} onChange={onChange("city")} fullWidth size="small" sx={textFieldSx} />
          <TextField label="Country" value={user.country || ""} onChange={onChange("country")} fullWidth size="small" sx={textFieldSx} />
        </Stack>
        <TextField
          label="Date of Birth"
          value={user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : ""}
          onChange={onChange("dateOfBirth")}
          type="date"
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
          sx={textFieldSx}
        />
        <TextField label="Occupation" value={user.occupation || ""} onChange={onChange("occupation")} fullWidth size="small" sx={textFieldSx} />
        {error && (
          <Typography color="error" sx={{ fontSize: "13px", lineHeight: 1.4 }}>
            {error}
          </Typography>
        )}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", color: "text.secondary", fontWeight: 700 }}>
        Cancel
      </Button>
      <Button onClick={onSave} variant="contained" disabled={saving} sx={{ textTransform: "none", borderRadius: "14px", fontWeight: 800, px: 3, background: "linear-gradient(135deg, var(--eventler-primary) 0%, var(--eventler-secondary) 100%)" }}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default EditProfileDialog;
