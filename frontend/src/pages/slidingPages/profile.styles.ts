import { Box, Paper, Avatar, Card, CardContent, Button, IconButton, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

// App.tsx Styled Components
export const AppContainer = styled(Box)({
  height: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  background: "var(--eventler-gradient-soft)",
  overflow: "hidden",
});

export const MainContentArea = styled(Box)({
  flex: 1,
  overflow: "hidden",
  position: "relative",
});

export const BottomNavPaper = styled(Paper)({
  height: 72,
  backgroundColor: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(18px)",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  borderTopLeftRadius: "24px",
  borderTopRightRadius: "24px",
  border: "1px solid var(--eventler-border)",
  borderBottom: 0,
  boxShadow: "0 -10px 30px rgba(85, 73, 145, 0.12)",
  zIndex: 1000,
});

export const HomeIconButton = styled(IconButton)<{ $active: boolean }>(({ $active }) => ({
  background: $active ? "rgba(255, 88, 118, 0.12)" : "transparent",
  borderRadius: "14px",
  color: $active ? "var(--eventler-primary)" : "var(--eventler-muted)",
  padding: "10px",
  transition: "all 0.25s ease",
  "&:hover": { transform: "scale(1.05)" },
}));

export const PlusIconButton = styled(IconButton)({
  background: "linear-gradient(135deg, var(--eventler-primary) 0%, var(--eventler-secondary) 100%)",
  borderRadius: "50%",
  color: "white",
  width: 54,
  height: 54,
  boxShadow: "0 10px 24px rgba(255, 88, 118, 0.28)",
  transform: "translateY(-14px)",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-16px) scale(1.05)",
    boxShadow: "0 8px 20px rgba(224, 195, 252, 0.7)",
  },
});

export const ProfileIconButton = styled(IconButton)<{ $active: boolean }>(({ $active }) => ({
  background: $active ? "rgba(255, 88, 118, 0.12)" : "transparent",
  borderRadius: "14px",
  color: $active ? "var(--eventler-primary)" : "var(--eventler-muted)",
  padding: "10px",
  transition: "all 0.25s ease",
  "&:hover": { transform: "scale(1.05)" },
}));


// ProfilePage.tsx Styled Components
export const ProfileContainer = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--eventler-gradient-soft)",
  overflow: "hidden",
  position: "relative",
});

export const TopBanner = styled(Box)({
  background: "var(--eventler-gradient)",
  paddingTop: "24px",
  paddingBottom: "32px",
  paddingLeft: "24px",
  paddingRight: "24px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
  boxShadow: "var(--eventler-shadow-soft)",
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
  color: "var(--eventler-primary)",
});

export const TabButton = styled(Button)<{ $active: boolean }>(({ $active }) => ({
  borderRadius: "16px",
  textTransform: "none",
  fontWeight: 700,
  fontSize: "14px",
  paddingLeft: "24px",
  paddingRight: "24px",
  paddingTop: "8px",
  paddingBottom: "8px",
  backgroundColor: $active ? "white" : "rgba(255,255,255,0.75)",
  color: $active ? "var(--eventler-secondary)" : "var(--eventler-muted)",
  boxShadow: $active ? "var(--eventler-shadow-soft)" : "none",
  border: "1px solid var(--eventler-border)",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: $active ? "white" : "rgba(255,255,255,0.9)",
  },
}));

export const HistoryCard = styled(Card)({
  borderRadius: "18px",
  boxShadow: "var(--eventler-shadow-soft)",
  marginBottom: "20px",
  overflow: "hidden",
  border: "1px solid var(--eventler-border)",
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
  backgroundColor: "#eef1ff",
  color: "var(--eventler-secondary)",
});

export const OverflowAvatar = styled(Avatar)({
  width: 26,
  height: 26,
  fontSize: "9px",
  fontWeight: 800,
  backgroundColor: "#fff0f6",
  color: "var(--eventler-primary-dark)",
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
  border: $selected ? '3px solid var(--eventler-secondary)' : '2px solid var(--eventler-border)',
  backgroundColor: $selected ? '#eef1ff' : 'white',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.2s ease',
  boxShadow: $selected ? '0 10px 22px rgba(109, 114, 232, 0.16)' : 'none',
  '&:hover': {
    borderColor: $selected ? 'var(--eventler-secondary)' : 'rgba(109, 114, 232, 0.32)',
    transform: 'translateY(-2px)',
  },
}));

export const PreferenceIcon = styled(Typography)({
  fontSize: '28px',
});

export const PreferenceLabel = styled(Typography)({
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--eventler-text)',
});
