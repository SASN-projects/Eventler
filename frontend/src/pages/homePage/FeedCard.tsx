import type { FunctionComponent } from "react";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import IosShareIcon from "@mui/icons-material/IosShare";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Box, Typography } from "@mui/material";
import { getCategoryIcon } from "./categoryIcon";
import type { FeedItem } from "./types";
import {
  FeedCardActions,
  FeedCardFooter,
  FeedCardImageBox,
  FeedCardPaper,
  FeedCardPlaceholderBox,
  FeedCardSubtitle,
  FeedCardTitle,
  FavoriteToggleButton,
  ShareButton,
  FeedCardContent,
  FeedCardMetaRow,
  FeedCardCategory,
  FeedCardDescription,
} from "./homeFeed.styles";

interface FeedCardProps {
  item: FeedItem;
  onToggleFavorite: (venueId: string) => void;
  onShare: (item: FeedItem) => void;
  onClick?: () => void;
}

const FeedCard: FunctionComponent<FeedCardProps> = ({ item, onToggleFavorite, onShare, onClick }) => {
  const CategoryIcon = getCategoryIcon(item.category);

  const renderPriceLevel = (level: number | null) => {
    if (!level) return null;
    return (
      <Typography sx={{ fontSize: "12px", color: "var(--eventler-muted)", fontWeight: 700 }}>
        {"$".repeat(level)}
      </Typography>
    );
  };

  return (
    <FeedCardPaper elevation={0} onClick={onClick} sx={{ cursor: onClick ? "pointer" : "default" }}>
      {item.imageUrl ? (
        <FeedCardImageBox sx={{ backgroundImage: `url(${item.imageUrl})` }} role="img" aria-label={item.title} />
      ) : (
        <FeedCardPlaceholderBox role="img" aria-label={item.title}>
          <CategoryIcon sx={{ fontSize: 36, color: "var(--eventler-secondary)", opacity: 0.6 }} />
        </FeedCardPlaceholderBox>
      )}
      
      <FeedCardContent>
        <FeedCardTitle>{item.title}</FeedCardTitle>
        
        <FeedCardMetaRow>
          {item.category && <FeedCardCategory>{item.category}</FeedCardCategory>}
          
          {item.rating != null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "2px", color: "#edb53c" }}>
              <StarIcon sx={{ fontSize: "14px" }} />
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "var(--eventler-text)" }}>
                {Number(item.rating).toFixed(1)}
              </Typography>
            </Box>
          )}

          {renderPriceLevel(item.priceLevel)}
        </FeedCardMetaRow>

        {item.description && (
          <FeedCardDescription>{item.description}</FeedCardDescription>
        )}
      </FeedCardContent>

      <FeedCardFooter>
        <div style={{ minWidth: 0, flex: 1 }}>
          {item.address && (
            <FeedCardSubtitle>
              <LocationOnIcon sx={{ fontSize: "14px", color: "var(--eventler-primary)" }} />
              {item.address}
            </FeedCardSubtitle>
          )}
        </div>
        <FeedCardActions>
          <FavoriteToggleButton
            $active={item.isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {item.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </FavoriteToggleButton>
          <ShareButton
            onClick={(e) => {
              e.stopPropagation();
              onShare(item);
            }}
            aria-label="Share"
          >
            <IosShareIcon />
          </ShareButton>
        </FeedCardActions>
      </FeedCardFooter>
    </FeedCardPaper>
  );
};

export default FeedCard;
