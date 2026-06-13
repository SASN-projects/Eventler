import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useEffect, useState } from "react";
import api from "../config/api";

type User = {
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  city?: string;
  country?: string;
  dateOfBirth?: string; // ISO date string
  occupation?: string;
};

export default function ProfilePage({ onClose }: { onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<User>({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    city: "",
    country: "",
    dateOfBirth: "",
    occupation: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/dev/users/me");
        // adapt backend user fields to frontend shape
        setUser({
          username: data.username || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          city: data.city || "",
          country: data.country || "",
          dateOfBirth: data.dateOfBirth || "",
          occupation: data.occupation || "",
        });
      } catch (err) {
        const raw = localStorage.getItem("eventler_user");
        if (raw) {
          const local = JSON.parse(raw);
          setUser({
            username: local.username || local.username || "",
            firstName: local.firstName || local.name?.split(" ")[0] || "",
            lastName:
              local.lastName || local.name?.split(" ").slice(1).join(" ") || "",
            email: local.email || "",
            city: local.city || "",
            country: local.country || "",
            dateOfBirth: local.dateOfBirth || "",
            occupation: local.occupation || "",
          });
        }
      }
    };

    fetchUser();
  }, []);

  const handleChange =
    (field: keyof User) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((s) => ({ ...s, [field]: e.target.value }));
    };

  const handleSave = async () => {
    try {
      await api.put("/dev/users/me", {
        // backend expects UpdateUserDto fields; map accordingly
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.city,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        occupation: user.occupation,
      });
      // Optionally update other fields via additional APIs if available
      setEditing(false);
    } catch (err) {
      // fallback: save locally
      localStorage.setItem("eventler_user", JSON.stringify(user));
      setEditing(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <AppBar position="static" elevation={1} color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            Profile
          </Typography>
          {editing ? (
            <>
              <Button color="inherit" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button color="inherit" onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button color="inherit" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4, overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, boxSizing: 'border-box' }}>
          <Stack spacing={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {editing ? (
                <TextField
                  label="Username"
                  value={user.username}
                  onChange={handleChange("username")}
                  fullWidth
                  InputProps={{ sx: { fontSize: '1.5rem', fontWeight: 700 } }}
                />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`.trim()}
                </Typography>
              )}
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Personal information
              </Typography>
              {editing ? (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="First name"
                      value={user.firstName}
                      onChange={handleChange("firstName")}
                      fullWidth
                    />
                    <TextField
                      label="Last name"
                      value={user.lastName}
                      onChange={handleChange("lastName")}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Email"
                    value={user.email}
                    onChange={handleChange("email")}
                    type="email"
                    fullWidth
                  />
                </Stack>
              ) : (
                <Box>
                  <Typography>
                    <strong>Full name:</strong>{" "}
                    {`${user.firstName} ${user.lastName}`.trim()}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong> {user.email}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Details
              </Typography>
              {editing ? (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="City"
                      value={user.city}
                      onChange={handleChange("city")}
                      fullWidth
                    />
                    <TextField
                      label="Country"
                      value={user.country}
                      onChange={handleChange("country")}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Date of birth"
                    value={user.dateOfBirth}
                    onChange={handleChange("dateOfBirth")}
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Occupation"
                    value={user.occupation}
                    onChange={handleChange("occupation")}
                    fullWidth
                  />
                </Stack>
              ) : (
                <Box>
                  <Typography>
                    <strong>City:</strong> {user.city}
                  </Typography>
                  <Typography>
                    <strong>Country:</strong> {user.country}
                  </Typography>
                  <Typography>
                    <strong>Date of birth:</strong> {user.dateOfBirth}
                  </Typography>
                  <Typography>
                    <strong>Occupation:</strong> {user.occupation}
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
