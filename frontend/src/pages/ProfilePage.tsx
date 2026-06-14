import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Avatar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RestoreIcon from "@mui/icons-material/Restore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
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
  const [openEdit, setOpenEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "groups">("history");
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
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
            username: local.username || "",
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

    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/dev/users/events");
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchUser();
    fetchEvents();
  }, []);

  const handleChange =
    (field: keyof User) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((s) => ({ ...s, [field]: e.target.value }));
    };

  const handleSave = async () => {
    try {
      await api.put("/dev/users/me", {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.city,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        occupation: user.occupation,
      });
      setOpenEdit(false);
    } catch (err) {
      localStorage.setItem("eventler_user", JSON.stringify(user));
      setOpenEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeRange = (fromStr: string, toStr: string) => {
    if (!fromStr) return "";
    const from = new Date(fromStr);
    const fromTime = from.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!toStr) return fromTime;
    const to = new Date(toStr);
    const toTime = to.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${fromTime} - ${toTime}`;
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f8f9fa",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Banner Gradient & User Info */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #b3c5ff 0%, #e0c3fc 50%, #ffd8be 100%)",
          pt: 3,
          pb: 4,
          px: 3,
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          boxShadow: "0 10px 30px rgba(224, 195, 252, 0.2)",
        }}
      >
        {/* Navigation / Edit Bar */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <IconButton onClick={onClose} sx={{ color: "white", bgcolor: "rgba(0,0,0,0.1)", "&:hover": { bgcolor: "rgba(0,0,0,0.15)" } }}>
            <ArrowBackIcon />
          </IconButton>
          <IconButton onClick={() => setOpenEdit(true)} sx={{ color: "white", bgcolor: "rgba(0,0,0,0.1)", "&:hover": { bgcolor: "rgba(0,0,0,0.15)" } }}>
            <MoreHorizIcon />
          </IconButton>
        </Stack>

        {/* User Card */}
        <Stack direction="row" alignItems="center" spacing={2.5}>
          {/* Generic New User Profile Pic (Person Icon on elegant gray-pink circle) */}
          <Avatar
            sx={{
              width: 76,
              height: 76,
              border: "3px solid white",
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              bgcolor: "white",
              color: "#ff5876",
            }}
          >
            <PersonIcon sx={{ fontSize: "40px" }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              {`${user.firstName} ${user.lastName}`.trim() || user.username || "Miss Girl"}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 500 }}>
              {user.occupation || "Eventler Enthusiast"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
              {user.email}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Main Container Content */}
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          mt: -2.5,
          pb: 2,
          overflow: "hidden",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Pill Tab Selector */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, justifyContent: "center" }}>
          <Button
            onClick={() => setActiveTab("history")}
            startIcon={<RestoreIcon sx={{ fontSize: "20px" }} />}
            sx={{
              borderRadius: "24px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "14px",
              px: 3,
              py: 1,
              bgcolor: activeTab === "history" ? "white" : "rgba(255,255,255,0.75)",
              color: activeTab === "history" ? "#9c27b0" : "#757575",
              boxShadow: activeTab === "history" ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
              border: activeTab === "history" ? "none" : "1px solid rgba(0,0,0,0.06)",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: activeTab === "history" ? "white" : "rgba(255,255,255,0.9)",
              },
            }}
          >
            History
          </Button>

          <Button
            onClick={() => setActiveTab("favorites")}
            startIcon={<FavoriteBorderIcon sx={{ fontSize: "20px" }} />}
            sx={{
              borderRadius: "24px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "14px",
              px: 3,
              py: 1,
              bgcolor: activeTab === "favorites" ? "white" : "rgba(255,255,255,0.75)",
              color: activeTab === "favorites" ? "#9c27b0" : "#757575",
              boxShadow: activeTab === "favorites" ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
              border: activeTab === "favorites" ? "none" : "1px solid rgba(0,0,0,0.06)",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: activeTab === "favorites" ? "white" : "rgba(255,255,255,0.9)",
              },
            }}
          >
            Favorites
          </Button>

          <Button
            onClick={() => setActiveTab("groups")}
            startIcon={<PeopleOutlineIcon sx={{ fontSize: "20px" }} />}
            sx={{
              borderRadius: "24px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "14px",
              px: 3,
              py: 1,
              bgcolor: activeTab === "groups" ? "white" : "rgba(255,255,255,0.75)",
              color: activeTab === "groups" ? "#9c27b0" : "#757575",
              boxShadow: activeTab === "groups" ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
              border: activeTab === "groups" ? "none" : "1px solid rgba(0,0,0,0.06)",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: activeTab === "groups" ? "white" : "rgba(255,255,255,0.9)",
              },
            }}
          >
            Groups
          </Button>
        </Stack>

        {/* Tab Panel */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
          {activeTab === "history" && (
            <>
              {loadingEvents ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 8 }}>
                  <CircularProgress color="secondary" />
                </Box>
              ) : events.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
                  <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                    No events in your history yet. Start sliding to create one!
                  </Typography>
                </Paper>
              ) : (
                events.map((event) => {
                  const hasRecommendation = !!event.recommendation;
                  const title = hasRecommendation ? event.recommendation.title : event.title || "Custom Event";
                  const description = hasRecommendation ? event.recommendation.description : event.description;
                  const location = hasRecommendation
                    ? event.recommendation.address
                    : event.locationCity || "No Location Configured";
                  const dateStr = formatDate(event.targetDate || event.targetDateFrom);
                  const timeStr = formatTimeRange(event.targetDateFrom, event.targetDateTo);
                  const participantCount = event.participantCount || 1;
                  const remainingParticipants = participantCount > 3 ? participantCount - 3 : 0;

                  return (
                    <Card
                      key={event.id}
                      sx={{
                        borderRadius: "24px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                        mb: 2.5,
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.03)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "17px", mb: 0.5, color: "#2d3748" }}>
                            {title}
                          </Typography>

                          {description && (
                            <Typography variant="body2" sx={{ color: "#4a5568", fontSize: "13px", mb: 1.5, lineHeight: 1.5 }}>
                              {description}
                            </Typography>
                          )}

                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#718096", mb: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: "15px", color: "#a0aec0" }} />
                            <Typography variant="body2" sx={{ fontSize: "12px", fontWeight: 500 }}>
                              {location}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#718096" }}>
                            <AccessTimeIcon sx={{ fontSize: "15px", color: "#a0aec0" }} />
                            <Typography variant="body2" sx={{ fontSize: "12px", fontWeight: 500 }}>
                              {dateStr} {timeStr && `| ${timeStr}`}
                            </Typography>
                          </Stack>
                        </Box>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                          {/* Generic Participant Avatars (Solid grey circles with person icon) */}
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {Array.from({ length: Math.min(participantCount, 3) }).map((_, i) => (
                              <Avatar
                                key={i}
                                sx={{
                                  width: 26,
                                  height: 26,
                                  ml: i === 0 ? 0 : -1,
                                  border: "2px solid white",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                                  bgcolor: "#e2e8f0",
                                  color: "#718096",
                                }}
                              >
                                <PersonIcon sx={{ fontSize: "14px" }} />
                              </Avatar>
                            ))}
                            {remainingParticipants > 0 && (
                              <Avatar
                                sx={{
                                  width: 26,
                                  height: 26,
                                  ml: -1,
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  bgcolor: "#fce4ec",
                                  color: "#d81b60",
                                  border: "2px solid white",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                                }}
                              >
                                +{remainingParticipants}
                              </Avatar>
                            )}
                          </Box>

                          {hasRecommendation ? (
                            <Chip
                              label="Recommendation Selected"
                              size="small"
                              sx={{
                                bgcolor: "#e8f5e9",
                                color: "#2e7d32",
                                fontWeight: 700,
                                fontSize: "10px",
                                height: "20px",
                              }}
                            />
                          ) : (
                            <Chip
                              label="Created Event"
                              size="small"
                              sx={{
                                bgcolor: "#e3f2fd",
                                color: "#1565c0",
                                fontWeight: 700,
                                fontSize: "10px",
                                height: "20px",
                              }}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}

          {activeTab === "favorites" && (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
              <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                No favorite venues selected. Click the heart on recommendations to save them!
              </Typography>
            </Paper>
          )}

          {activeTab === "groups" && (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
              <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                You have not joined any group events yet.
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>

      {/* Redesigned Edit Profile Dialog Modal */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "24px", p: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Profile Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Username" value={user.username} onChange={handleChange("username")} fullWidth size="small" />
            <Stack direction="row" spacing={2}>
              <TextField label="First Name" value={user.firstName} onChange={handleChange("firstName")} fullWidth size="small" />
              <TextField label="Last Name" value={user.lastName} onChange={handleChange("lastName")} fullWidth size="small" />
            </Stack>
            <TextField label="Email" value={user.email} onChange={handleChange("email")} fullWidth size="small" />
            <Stack direction="row" spacing={2}>
              <TextField label="City" value={user.city} onChange={handleChange("city")} fullWidth size="small" />
              <TextField label="Country" value={user.country} onChange={handleChange("country")} fullWidth size="small" />
            </Stack>
            <TextField
              label="Date of Birth"
              value={user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : ""}
              onChange={handleChange("dateOfBirth")}
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
            <TextField label="Occupation" value={user.occupation} onChange={handleChange("occupation")} fullWidth size="small" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenEdit(false)} sx={{ textTransform: "none", color: "text.secondary", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="secondary" sx={{ textTransform: "none", borderRadius: "12px", fontWeight: 700, px: 3 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
