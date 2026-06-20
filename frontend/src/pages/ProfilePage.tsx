import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import RestoreIcon from "@mui/icons-material/Restore";
import { Box, CircularProgress, Container, Paper, Stack } from "@mui/material";
import { useEffect, useState, type ChangeEvent, type FunctionComponent } from "react";
import api from "../config/api";
import EditProfileDialog from "./EditProfileDialog";
import EventCard from "./EventCard";
import ProfileHeader from "./ProfileHeader";
import { ProfileContainer, TabButton } from "./slidingPages/profile.styles";
import type { User } from "./slidingPages/profile.types";

const ProfilePage: FunctionComponent<{ onClose: () => void; }> = ({ onClose }) => {
  const [openEdit, setOpenEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "groups">("history");
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [user, setUser] = useState<User>({
    username: "", firstName: "", lastName: "", email: "", city: "", country: "", dateOfBirth: "", occupation: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/users/me");
        setUser(data);
      } catch (err) {
        const raw = localStorage.getItem("eventler_user");
        if (raw) setUser(JSON.parse(raw));
      }
    };
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/users/events");
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

  const handleChange = (field: keyof User) => (e: ChangeEvent<HTMLInputElement>) => {
    setUser((s) => ({ ...s, [field]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      await api.put("/users/me", user);
      setOpenEdit(false);
    } catch (err) {
      localStorage.setItem("eventler_user", JSON.stringify(user));
      setOpenEdit(false);
    }
  };

  return (
    <ProfileContainer>
      <ProfileHeader user={user} onClose={onClose} onEditClick={() => setOpenEdit(true)} />
      <Container maxWidth="md" sx={{ flex: 1, display: "flex", flexDirection: "column", mt: -2.5, pb: 2, overflow: "hidden", zIndex: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, justifyContent: "center" }}>
          <TabButton onClick={() => setActiveTab("history")} $active={activeTab === "history"} startIcon={<RestoreIcon />}>History</TabButton>
          <TabButton onClick={() => setActiveTab("favorites")} $active={activeTab === "favorites"} startIcon={<FavoriteBorderIcon />}>Favorites</TabButton>
          <TabButton onClick={() => setActiveTab("groups")} $active={activeTab === "groups"} startIcon={<PeopleOutlineIcon />}>Groups</TabButton>
        </Stack>
        <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
          {activeTab === "history" && (
            loadingEvents ? (
              <Box display="flex" justifyContent="center" py={8}><CircularProgress color="secondary" /></Box>
            ) : events.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
                No events in your history yet. Start sliding to create one!
              </Paper>
            ) : events.map((event) => <EventCard key={event.id} event={event} />)
          )}
          {activeTab === "favorites" && (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
              No favorite venues selected. Click the heart on recommendations to save them!
            </Paper>
          )}
          {activeTab === "groups" && (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>
              You have not joined any group events yet.
            </Paper>
          )}
        </Box>
      </Container>
      <EditProfileDialog open={openEdit} onClose={() => setOpenEdit(false)} user={user} onChange={handleChange} onSave={handleSave} />
    </ProfileContainer>
  );
};

export default ProfilePage;