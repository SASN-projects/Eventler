import type { FunctionComponent } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slide,
} from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import IosShareIcon from "@mui/icons-material/IosShare";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneIcon from "@mui/icons-material/Phone";
import StarIcon from "@mui/icons-material/Star";
import React from "react";
import type { FeedItem } from "./types";
import { FavoriteToggleButton, ShareButton } from "./homeFeed.styles";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface VenueDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  item: FeedItem | null;
  onToggleFavorite: (venueId: string) => void;
  onShare: (item: FeedItem) => void;
}

const getVenueOpeningHours = (venueId: string): string => {
  const hash = venueId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const options = ["09:00 - 23:00", "10:00 - 23:00", "08:00 - 22:00", "12:00 - 00:00", "09:00 - 22:00"];
  return options[hash % options.length];
};

const getVenueContact = (venueId: string): string => {
  const hash = venueId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const localPrefix = ["03", "09", "04", "02", "08"];
  const prefix = localPrefix[hash % localPrefix.length];
  const body1 = (100 + (hash % 900)).toString();
  const body2 = (1000 + (hash % 9000)).toString();
  return `${prefix}-${body1}-${body2}`;
};

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

export const VenueDetailsDialog: FunctionComponent<VenueDetailsDialogProps> = ({
  open,
  onClose,
  item,
  onToggleFavorite,
  onShare,
}) => {
  if (!item) return null;

  const imageUrl = item.imageUrl || getFallbackImage(item.category);
  const openingHours = getVenueOpeningHours(item.id);
  const contact = getVenueContact(item.id);
  const ratingText = item.rating ? `${item.rating.toFixed(1)} / 5` : "4.5 / 5";

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "28px",
          overflow: "hidden",
          width: "100%",
          maxWidth: "420px",
          margin: "16px",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Box sx={{ position: "relative", width: "100%", height: "220px" }}>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: "16px",
            right: "16px",
            backgroundColor: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            "&:hover": { backgroundColor: "#f6f6f6" },
            width: "36px",
            height: "36px",
          }}
        >
          <CloseIcon sx={{ fontSize: "20px", color: "var(--eventler-secondary)" }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Title and Actions Row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "22px", color: "var(--eventler-text)" }}>
            {item.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FavoriteToggleButton
              $active={item.isFavorite}
              onClick={() => onToggleFavorite(item.id)}
              sx={{
                width: "42px",
                height: "42px",
                backgroundColor: item.isFavorite ? "rgba(255, 88, 118, 0.1)" : "rgba(0,0,0,0.04)",
                color: item.isFavorite ? "var(--eventler-primary)" : "var(--eventler-muted)",
                "&:hover": {
                  backgroundColor: item.isFavorite ? "rgba(255, 88, 118, 0.15)" : "rgba(0,0,0,0.08)",
                },
              }}
            >
              {item.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </FavoriteToggleButton>
            <ShareButton
              onClick={() => onShare(item)}
              sx={{
                width: "42px",
                height: "42px",
                backgroundColor: "rgba(109, 114, 232, 0.1)",
                color: "var(--eventler-secondary)",
                "&:hover": { backgroundColor: "rgba(109, 114, 232, 0.15)" },
              }}
            >
              <IosShareIcon />
            </ShareButton>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {item.address && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                p: "14px 18px",
                borderRadius: "16px",
                backgroundColor: "rgba(238, 241, 255, 0.8)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 8px rgba(109, 114, 232, 0.08)",
                }}
              >
                <LocationOnIcon sx={{ color: "var(--eventler-secondary)", fontSize: "20px" }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "var(--eventler-secondary)", opacity: 0.8, textTransform: "lowercase" }}>
                  location
                </Typography>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "var(--eventler-text)" }}>
                  {item.address}
                </Typography>
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              p: "14px 18px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 240, 246, 0.8)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(255, 88, 118, 0.08)",
              }}
            >
              <AccessTimeIcon sx={{ color: "var(--eventler-primary)", fontSize: "20px" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "var(--eventler-primary)", opacity: 0.8, textTransform: "lowercase" }}>
                opening hours
              </Typography>
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "var(--eventler-text)" }}>
                {openingHours}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              p: "14px 18px",
              borderRadius: "16px",
              backgroundColor: "rgba(232, 247, 237, 0.8)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(46, 125, 50, 0.08)",
              }}
            >
              <PhoneIcon sx={{ color: "#2e7d32", fontSize: "20px" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#2e7d32", opacity: 0.8, textTransform: "lowercase" }}>
                contact
              </Typography>
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "var(--eventler-text)" }}>
                {contact}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              p: "14px 18px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 248, 221, 0.8)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(237, 181, 60, 0.08)",
              }}
            >
              <StarIcon sx={{ color: "#edb53c", fontSize: "20px" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#d89d1f", opacity: 0.8, textTransform: "lowercase" }}>
                rating
              </Typography>
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "var(--eventler-text)" }}>
                {ratingText}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
