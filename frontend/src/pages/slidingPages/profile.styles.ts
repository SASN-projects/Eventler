import { Box, Paper, Avatar, Card, CardContent, Button, IconButton, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

// App.tsx Styled Components
export const AppContainer = styled(Box)({
  height: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f8f9fa",
  overflow: "hidden",
});

export const MainContentArea = styled(Box)({
  flex: 1,
  overflow: "hidden",
  position: "relative",
});

export const BottomNavPaper = styled(Paper)({
  height: 72,
  backgroundColor: "white",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  borderTopLeftRadius: "28px",
  borderTopRightRadius: "28px",
  boxShadow: "0 -5px 25px rgba(0,0,0,0.06)",
  zIndex: 1000,
});

export const HomeIconButton = styled(IconButton)<{ $active: boolean }>(({ $active }) => ({
  background: $active ? "linear-gradient(45deg, #ffe5d9 0%, #ffd6db 100%)" : "transparent",
  borderRadius: "16px",
  color: $active ? "#ff5876" : "#757575",
  padding: "10px",
  transition: "all 0.25s ease",
  "&:hover": { transform: "scale(1.05)" },
}));

export const PlusIconButton = styled(IconButton)({
  background: "linear-gradient(135deg, #b3c5ff 0%, #e0c3fc 100%)",
  borderRadius: "50%",
  color: "white",
  width: 54,
  height: 54,
  boxShadow: "0 5px 15px rgba(224, 195, 252, 0.5)",
  transform: "translateY(-14px)",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-16px) scale(1.05)",
    boxShadow: "0 8px 20px rgba(224, 195, 252, 0.7)",
  },
});

export const ProfileIconButton = styled(IconButton)<{ $active: boolean }>(({ $active }) => ({
  background: $active ? "linear-gradient(45deg, #ffe5d9 0%, #ffd6db 100%)" : "transparent",
  borderRadius: "16px",
  color: $active ? "#ff5876" : "#757575",
  padding: "10px",
  transition: "all 0.25s ease",
  "&:hover": { transform: "scale(1.05)" },
}));


// ProfilePage.tsx Styled Components
export const ProfileContainer = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f8f9fa",
  overflow: "hidden",
  position: "relative",
});

export const TopBanner = styled(Box)({
  background: "linear-gradient(135deg, #b3c5ff 0%, #e0c3fc 50%, #ffd8be 100%)",
  paddingTop: "24px",
  paddingBottom: "32px",
  paddingLeft: "24px",
  paddingRight: "24px",
  borderBottomLeftRadius: "32px",
  borderBottomRightRadius: "32px",
  boxShadow: "0 10px 30px rgba(224, 195, 252, 0.2)",
});

export const HeaderButton = styled(IconButton)({
  color: "white",
  backgroundColor: "rgba(0,0,0,0.1)",
  "&:hover": { backgroundColor: "rgba(0,0,0,0.15)" },
});

export const UserAvatar = styled(Avatar)({
  width: 76,
  height: 76,
  border: "3px solid white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  backgroundColor: "white",
  color: "#ff5876",
});

export const TabButton = styled(Button)<{ $active: boolean }>(({ $active }) => ({
  borderRadius: "24px",
  textTransform: "none",
  fontWeight: 700,
  fontSize: "14px",
  paddingLeft: "24px",
  paddingRight: "24px",
  paddingTop: "8px",
  paddingBottom: "8px",
  backgroundColor: $active ? "white" : "rgba(255,255,255,0.75)",
  color: $active ? "#9c27b0" : "#757575",
  boxShadow: $active ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
  border: $active ? "none" : "1px solid rgba(0,0,0,0.06)",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: $active ? "white" : "rgba(255,255,255,0.9)",
  },
}));

export const HistoryCard = styled(Card)({
  borderRadius: "24px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
  marginBottom: "20px",
  overflow: "hidden",
  border: "1px solid rgba(0,0,0,0.03)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  },
});

export const HistoryCardContent = styled(CardContent)({
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  "&:last-child": { paddingBottom: "24px" },
});

export const ParticipantAvatar = styled(Avatar)({
  width: 26,
  height: 26,
  border: "2px solid white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  backgroundColor: "#e2e8f0",
  color: "#718096",
});

export const OverflowAvatar = styled(Avatar)({
  width: 26,
  height: 26,
  fontSize: "9px",
  fontWeight: 800,
  backgroundColor: "#fce4ec",
  color: "#d81b60",
  border: "2px solid white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
});

// Preferences Styled Components
export const PreferenceGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
  gap: '12px',
  width: '100%',
  marginTop: '16px',
});

export const PreferenceCard = styled(Box)<{ $selected: boolean }>(({ $selected }) => ({
  padding: '16px',
  borderRadius: '16px',
  border: $selected ? '3px solid #9c27b0' : '2px solid #e2e8f0',
  backgroundColor: $selected ? '#fdf4ff' : 'white',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.2s ease',
  boxShadow: $selected ? '0 4px 12px rgba(156, 39, 176, 0.15)' : 'none',
  '&:hover': {
    borderColor: $selected ? '#9c27b0' : '#cbd5e1',
    transform: 'translateY(-2px)',
  },
}));

export const PreferenceIcon = styled(Typography)({
  fontSize: '28px',
});

export const PreferenceLabel = styled(Typography)({
  fontSize: '13px',
  fontWeight: 700,
  color: '#475569',
});
