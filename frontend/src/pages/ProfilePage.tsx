import {
  Box,
  Container,
  Paper,
  Stack,
  CircularProgress,
  Typography,
  IconButton,
  Chip,
  Snackbar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import RestoreIcon from "@mui/icons-material/Restore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../config/api";
import type { User } from "./slidingPages/profile.types";
import { ProfileContainer, TabButton } from "./slidingPages/profile.styles";
import ProfileHeader from "./ProfileHeader";
import EventCard from "./EventCard";
import EditProfileDialog from "./EditProfileDialog";
import EditPreferencesDialog from "./EditPreferencesDialog";
import GroupsPanel from "./GroupsPanel";
import { useFavorites } from "../contexts/FavoritesContext";
import { styled } from "@mui/material/styles";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { FavoriteToggleButton } from "./homePage/homeFeed.styles";
import { VenueDetailsDialog } from "./homePage/VenueDetailsDialog";
import { shareVenue } from "../utils/shareVenue";

const getFallbackImage = (category?: string | null): string => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("food") || cat.includes("dining") || cat.includes("meal")) {
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("bar") || cat.includes("club") || cat.includes("night") || cat.includes("drink") || cat.includes("pub")) {
    return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("cafe") || cat.includes("coffee") || cat.includes("bakery")) {
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("park") || cat.includes("outdoor") || cat.includes("adventure") || cat.includes("beach") || cat.includes("nature") || cat.includes("garden")) {
    return "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("museum") || cat.includes("art") || cat.includes("culture") || cat.includes("gallery") || cat.includes("history") || cat.includes("historic")) {
    return "https://images.unsplash.com/photo-1574007557239-acf6863bc375?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("entertainment") || cat.includes("escape") || cat.includes("bowling") || cat.includes("cinema") || cat.includes("movie") || cat.includes("theater")) {
    return "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("wellness") || cat.includes("relaxation") || cat.includes("spa") || cat.includes("massage")) {
    return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
};

const FavoriteCardPaper = styled(Paper)({
  display: "flex",
  flexDirection: "row",
  borderRadius: "18px",
  overflow: "hidden",
  border: "1px solid var(--eventler-border)",
  boxShadow: "var(--eventler-shadow-soft)",
  backgroundColor: "var(--eventler-surface)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  },
});

const FavoriteCardImageBox = styled(Box)({
  width: "120px",
  height: "90px",
  flexShrink: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
});

const FavoriteCardContent = styled(Box)({
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minWidth: 0,
  flex: 1,
});

const FavoriteCardTitle = styled(Typography)({
  fontWeight: 700,
  fontSize: "16px",
  color: "var(--eventler-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginBottom: "4px",
});

const FavoriteCardSubtitle = styled(Typography)({
  fontSize: "12px",
  color: "var(--eventler-muted)",
  lineHeight: 1.4,
});

const PREF_MAP: Record<string, string> = {
  budget: "💰 Budget",
  "event-type": "🎉 Type",
  transportation: "🚗 Transport",
  crowd: "👥 Crowd",
  "planning-style": "📅 Plan",
  "location-type": "📍 Vibe",
  "evening-structure": "🍻 Structure",
};

export default function ProfilePage({
  onClose,
  onContinueEvent,
}: {
  onClose: () => void;
  onContinueEvent?: (event: { id: string; status?: string }) => void;
}) {
  const [searchParams] = useSearchParams();
  const favorites = useFavorites();
  const [favoritesToast, setFavoritesToast] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [openPrefs, setOpenPrefs] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const tabParam = searchParams.get("tab") as "history" | "favorites" | "groups" | null;
  const [activeTab, setActiveTab] = useState<
    "history" | "favorites" | "groups"
  >(tabParam || "history");
  const [events, setEvents] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, evs, prefs] = await Promise.all([
          api.get("/users/me"),
          api.get("/users/events"),
          api.get("/users/preferences"),
        ]);
        setUser(u.data);
        setEvents(evs.data || []);
        setPreferences(prefs.data.interests || []);
      } catch {
        const raw = localStorage.getItem("eventler_user");
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      await api.put("/users/me", user);
      setOpenEdit(false);
    } catch {
      localStorage.setItem("eventler_user", JSON.stringify(user));
      setOpenEdit(false);
    }
  };

  return (
    <ProfileContainer>
      <ProfileHeader
        user={user}
        onClose={onClose}
        onEditClick={() => setOpenEdit(true)}
      />
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          mt: -2,
          pb: 2,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: "rgba(255,255,255,0.88)",
            borderRadius: "18px",
            p: 2,
            mb: 2,
            boxShadow: "var(--eventler-shadow-soft)",
            border: "1px solid var(--eventler-border)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "text.secondary" }}
            >
              Event Preferences
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpenPrefs(true)}
              sx={{ color: "var(--eventler-secondary)" }}
            >
              <EditIcon sx={{ fontSize: "16px" }} />
            </IconButton>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ gap: 1 }}
          >
            {preferences.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No preferences set. Tap edit to customize recommendations.
              </Typography>
            ) : (
              preferences.map((p) => (
                <Chip
                  key={p}
                  label={PREF_MAP[p] || p}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: "10px",
                    fontWeight: 700,
                    borderColor: "rgba(109, 114, 232, 0.24)",
                    color: "var(--eventler-text)",
                    backgroundColor: "rgba(255,255,255,0.72)",
                  }}
                />
              ))
            )}
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ mb: 2, justifyContent: "center" }}
        >
          <TabButton
            onClick={() => setActiveTab("history")}
            $active={activeTab === "history"}
            startIcon={<RestoreIcon />}
          >
            History
          </TabButton>
          <TabButton
            onClick={() => setActiveTab("favorites")}
            $active={activeTab === "favorites"}
            startIcon={<FavoriteBorderIcon />}
          >
            Favorites
          </TabButton>
          <TabButton
            onClick={() => setActiveTab("groups")}
            $active={activeTab === "groups"}
            startIcon={<PeopleOutlineIcon />}
          >
            Groups
          </TabButton>
        </Stack>
        <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
          {activeTab === "history" &&
            (loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress color="secondary" />
              </Box>
            ) : events.length === 0 ? (
              <Paper
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: "18px",
                  border: "1px dashed rgba(109, 114, 232, 0.28)",
                  color: "var(--eventler-muted)",
                  backgroundColor: "rgba(255,255,255,0.78)",
                }}
              >
                No events in history.
              </Paper>
            ) : (
              events.map((e) => (
                <EventCard key={e.id} event={e} onContinue={onContinueEvent} />
              ))
            ))}
          {activeTab === "favorites" &&
            (favorites.loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress color="secondary" />
              </Box>
            ) : favorites.favorites.length === 0 ? (
              <Paper
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: "18px",
                  border: "1px dashed rgba(109, 114, 232, 0.28)",
                  color: "var(--eventler-muted)",
                  backgroundColor: "rgba(255,255,255,0.78)",
                }}
              >
                No favorite venues.
              </Paper>
            ) : (
              <Stack spacing={2}>
                {favorites.favorites.map((venue) => {
                  const fallbackImg = getFallbackImage(venue.category);
                  const imageUrl = venue.imageUrl || fallbackImg;
                  const item = {
                    id: venue.id,
                    title: venue.title,
                    imageUrl: venue.imageUrl,
                    address: venue.address,
                    isFavorite: true,
                    rating: venue.rating,
                    category: venue.category,
                    priceLevel: venue.priceLevel,
                  };
                  return (
                    <FavoriteCardPaper
                      key={venue.id}
                      elevation={0}
                      onClick={() => {
                        setSelectedVenue(item);
                        setIsDetailsOpen(true);
                      }}
                      sx={{ cursor: "pointer" }}
                    >
                      <FavoriteCardImageBox sx={{ backgroundImage: `url(${imageUrl})` }} />
                      <FavoriteCardContent>
                        <FavoriteCardTitle>{venue.title}</FavoriteCardTitle>
                        {venue.address && <FavoriteCardSubtitle>{venue.address}</FavoriteCardSubtitle>}
                      </FavoriteCardContent>
                      <Box sx={{ display: "flex", alignItems: "center", pr: 2 }}>
                        <FavoriteToggleButton
                          $active={true}
                          onClick={(e) => {
                            e.stopPropagation();
                            favorites
                              .toggleFavorite(venue.id)
                              .catch(() => setFavoritesToast("Could not update favorite. Please try again."));
                          }}
                        >
                          <FavoriteIcon />
                        </FavoriteToggleButton>
                      </Box>
                    </FavoriteCardPaper>
                  );
                })}
              </Stack>
            ))}
          {activeTab === "groups" && (
            <GroupsPanel onContinueEvent={onContinueEvent} />
          )}
        </Box>
      </Container>
      <EditProfileDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        user={user}
        onChange={(f) => (e) => setUser((s) => ({ ...s, [f]: e.target.value }))}
        onSave={handleSave}
      />
      <EditPreferencesDialog
        open={openPrefs}
        onClose={() => setOpenPrefs(false)}
        initialSelected={preferences}
        onSave={async (selected) => {
          await api.put("/users/preferences", { interests: selected });
          setPreferences(selected);
        }}
      />
      <Snackbar
        open={Boolean(favoritesToast)}
        autoHideDuration={3000}
        onClose={() => setFavoritesToast("")}
        message={favoritesToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
      <VenueDetailsDialog
        open={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedVenue(null);
        }}
        item={selectedVenue ? {
          ...selectedVenue,
          isFavorite: favorites.isFavorite(selectedVenue.id)
        } : null}
        onToggleFavorite={(venueId) =>
          favorites
            .toggleFavorite(venueId)
            .then(() => {
              if (selectedVenue && selectedVenue.id === venueId) {
                setIsDetailsOpen(false);
                setSelectedVenue(null);
              }
            })
            .catch(() => setFavoritesToast("Could not update favorite. Please try again."))
        }
        onShare={(item) =>
          shareVenue(
            item,
            () => setFavoritesToast("Copied to clipboard."),
            () => setFavoritesToast("Could not copy to clipboard."),
          )
        }
      />
    </ProfileContainer>
  );
}
