import { Box, IconButton, InputBase, Paper, Typography, styled } from "@mui/material";

export const FeedContainer = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--eventler-gradient-soft)",
  overflow: "hidden",
});

export const FeedHeaderBanner = styled(Box)({
  background: "var(--eventler-gradient)",
  paddingTop: "28px",
  paddingBottom: "40px",
  paddingLeft: "24px",
  paddingRight: "24px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
  boxShadow: "var(--eventler-shadow-soft)",
  textAlign: "center",
});

export const FeedTitle = styled(Typography)({
  color: "white",
  fontWeight: 800,
  fontSize: "26px",
  letterSpacing: "0.5px",
});

export const SearchBarPaper = styled(Paper)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 18px",
  borderRadius: "18px",
  backgroundColor: "white",
  boxShadow: "var(--eventler-shadow-soft)",
  border: "1px solid var(--eventler-border)",
  marginTop: "-24px",
  marginLeft: "16px",
  marginRight: "16px",
  position: "relative",
  zIndex: 2,
});

export const SearchInput = styled(InputBase)({
  flex: 1,
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--eventler-text)",
  "& input::placeholder": {
    color: "var(--eventler-muted)",
    opacity: 1,
  },
});

// Responsive feed grid: 1 column on mobile (matches the original phone-card
// design), growing to 2/3/4 columns from tablet width up.
export const FeedListArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: "auto",
  padding: "20px 16px 16px",
  display: "grid",
  gap: "14px",
  gridTemplateColumns: "repeat(1, 1fr)",
  [theme.breakpoints.up("sm")]: { gridTemplateColumns: "repeat(2, 1fr)" },
  [theme.breakpoints.up("md")]: { gridTemplateColumns: "repeat(3, 1fr)" },
  [theme.breakpoints.up("lg")]: { gridTemplateColumns: "repeat(4, 1fr)" },
}));

// Full-width helper for non-card content (loading/error/empty/load-more)
// rendered inside the grid — spans every column regardless of count.
export const FeedFullWidthRow = styled(Box)({
  gridColumn: "1 / -1",
});

export const FeedCardPaper = styled(Paper)({
  borderRadius: "20px",
  overflow: "hidden",
  border: "1px solid var(--eventler-border)",
  boxShadow: "var(--eventler-shadow-soft)",
  backgroundColor: "var(--eventler-surface)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  display: "flex",
  flexDirection: "column",
  minHeight: "380px",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  },
});

export const FeedCardImageBox = styled(Box)({
  width: "100%",
  height: "200px",
  backgroundColor: "#eef1ff",
  backgroundSize: "cover",
  backgroundPosition: "center",
});

export const FeedCardPlaceholderBox = styled(Box)({
  width: "100%",
  height: "200px",
  background: "var(--eventler-gradient-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const FeedCardContent = styled(Box)({
  padding: "16px 16px 8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const FeedCardMetaRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "2px",
});

export const FeedCardCategory = styled(Typography)({
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--eventler-primary)",
  background: "rgba(25, 118, 210, 0.08)",
  padding: "2px 8px",
  borderRadius: "12px",
});

export const FeedCardDescription = styled(Typography)({
  fontSize: "13px",
  color: "rgba(0,0,0,0.66)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
  marginTop: "4px",
});

export const FeedCardFooter = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 16px 16px",
  gap: "8px",
});

export const FeedCardTitle = styled(Typography)({
  fontWeight: 700,
  fontSize: "16px",
  color: "var(--eventler-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const FeedCardSubtitle = styled(Typography)({
  fontSize: "12px",
  color: "var(--eventler-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const FeedCardActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  flexShrink: 0,
});

export const FavoriteToggleButton = styled(IconButton)<{ $active: boolean }>(({ $active }) => ({
  color: $active ? "var(--eventler-primary)" : "var(--eventler-muted)",
  transition: "transform 0.15s ease",
  "&:active": { transform: "scale(0.85)" },
}));

export const ShareButton = styled(IconButton)({
  color: "var(--eventler-secondary)",
});
