import { Box, Container, Paper, Stack, CircularProgress, Typography, IconButton, Chip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import RestoreIcon from "@mui/icons-material/Restore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { useEffect, useState } from "react";
import api from "../config/api";
import type { User } from "./slidingPages/profile.types";
import { ProfileContainer, TabButton } from "./slidingPages/profile.styles";
import ProfileHeader from "./ProfileHeader";
import EventCard from "./EventCard";
import EditProfileDialog from "./EditProfileDialog";
import EditPreferencesDialog from "./EditPreferencesDialog";
import GroupsPanel from "./GroupsPanel";

const PREF_MAP: Record<string, string> = {
  budget: "💰 Budget", "event-type": "🎉 Type", transportation: "🚗 Transport",
  crowd: "👥 Crowd", "planning-style": "📅 Plan", "location-type": "📍 Vibe", "evening-structure": "🍻 Structure"
};

export default function ProfilePage({ onClose }: { onClose: () => void }) {
  const [openEdit, setOpenEdit] = useState(false);
  const [openPrefs, setOpenPrefs] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "groups">("history");
  const [events, setEvents] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({ username: "", firstName: "", lastName: "", email: "", city: "", country: "", dateOfBirth: "", occupation: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, evs, prefs] = await Promise.all([api.get("/users/me"), api.get("/users/events"), api.get("/users/preferences")]);
        setUser(u.data); setEvents(evs.data || []); setPreferences(prefs.data.interests || []);
      } catch {
        const raw = localStorage.getItem("eventler_user");
        if (raw) setUser(JSON.parse(raw));
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    try { await api.put("/users/me", user); setOpenEdit(false); } catch { localStorage.setItem("eventler_user", JSON.stringify(user)); setOpenEdit(false); }
  };

  return (
    <ProfileContainer>
      <ProfileHeader user={user} onClose={onClose} onEditClick={() => setOpenEdit(true)} />
      <Container maxWidth="md" sx={{ flex: 1, display: "flex", flexDirection: "column", mt: -2, pb: 2, overflow: "hidden", zIndex: 2 }}>
        <Box sx={{ bgcolor: "white", borderRadius: "20px", p: 2, mb: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.secondary" }}>Event Preferences</Typography>
            <IconButton size="small" onClick={() => setOpenPrefs(true)} sx={{ color: "#9c27b0" }}><EditIcon sx={{ fontSize: "16px" }} /></IconButton>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
            {preferences.length === 0 ? <Typography variant="caption" color="text.secondary">No preferences set. Tap edit to customize recommendations.</Typography> :
              preferences.map(p => <Chip key={p} label={PREF_MAP[p] || p} size="small" variant="outlined" sx={{ borderRadius: "8px", fontWeight: 600 }} />)}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, justifyContent: "center" }}>
          <TabButton onClick={() => setActiveTab("history")} $active={activeTab === "history"} startIcon={<RestoreIcon />}>History</TabButton>
          <TabButton onClick={() => setActiveTab("favorites")} $active={activeTab === "favorites"} startIcon={<FavoriteBorderIcon />}>Favorites</TabButton>
          <TabButton onClick={() => setActiveTab("groups")} $active={activeTab === "groups"} startIcon={<PeopleOutlineIcon />}>Groups</TabButton>
        </Stack>
        <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
          {activeTab === "history" && (loading ? <Box display="flex" justifyContent="center" py={8}><CircularProgress color="secondary" /></Box> :
            events.length === 0 ? <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px", border: "1px dashed rgba(0,0,0,0.12)" }}>No events in history.</Paper> :
            events.map((e) => <EventCard key={e.id} event={e} />))}
          {activeTab === "favorites" && <Paper sx={{ p: 4, textAlign: "center", borderRadius: "24px" }}>No favorite venues.</Paper>}
          {activeTab === "groups" && <GroupsPanel />}
        </Box>
      </Container>
      <EditProfileDialog open={openEdit} onClose={() => setOpenEdit(false)} user={user} onChange={(f) => (e) => setUser((s) => ({ ...s, [f]: e.target.value }))} onSave={handleSave} />
      <EditPreferencesDialog open={openPrefs} onClose={() => setOpenPrefs(false)} initialSelected={preferences} onSave={async (selected) => { await api.put("/users/preferences", { interests: selected }); setPreferences(selected); }} />
    </ProfileContainer>
  );
}
