import {
  AppBar,
  Avatar,
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

type User = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
};

export default function ProfilePage({ onClose }: { onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    company: "",
    phone: "",
  });

  useEffect(() => {
    const raw = localStorage.getItem("eventler_user");
    if (raw) setUser(JSON.parse(raw));
    else
      setUser({
        name: "John Doe",
        email: "john.doe@example.com",
        company: "Eventler",
        phone: "+1 555 123 4567",
      });
  }, []);

  const handleChange =
    (field: keyof User) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((s) => ({ ...s, [field]: e.target.value }));
    };

  const handleSave = () => {
    localStorage.setItem("eventler_user", JSON.stringify(user));
    setEditing(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
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

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
          <Stack spacing={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {user.name}
              </Typography>
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Personal information
              </Typography>
              {editing ? (
                <Stack spacing={2}>
                  <TextField
                    label="Full name"
                    value={user.name}
                    onChange={handleChange("name")}
                    fullWidth
                  />
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
                    <strong>Full name:</strong> {user.name}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong> {user.email}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Work
              </Typography>
              {editing ? (
                <Stack spacing={2}>
                  <TextField
                    label="Company"
                    value={user.company}
                    onChange={handleChange("company")}
                    fullWidth
                  />
                  <TextField
                    label="Phone"
                    value={user.phone}
                    onChange={handleChange("phone")}
                    fullWidth
                  />
                </Stack>
              ) : (
                <Box>
                  <Typography>
                    <strong>Company:</strong> {user.company}
                  </Typography>
                  <Typography>
                    <strong>Phone:</strong> {user.phone}
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
