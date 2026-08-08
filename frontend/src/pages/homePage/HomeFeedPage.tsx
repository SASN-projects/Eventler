import { useCallback, useEffect, useState } from "react";
import type { FunctionComponent } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Skeleton, Snackbar, Typography } from "@mui/material";
import { PrimeButton } from "../../components/buttons";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useFavorites } from "../../contexts/FavoritesContext";
import { shareVenue } from "../../utils/shareVenue";
import { fetchFeed } from "./api";
import FeedCard from "./FeedCard";
import type { FeedItem } from "./types";
import {
  FeedContainer,
  FeedFullWidthRow,
  FeedHeaderBanner,
  FeedListArea,
  FeedTitle,
  SearchBarPaper,
  SearchInput,
} from "./homeFeed.styles";
import { VenueDetailsDialog } from "./VenueDetailsDialog";

const CardSkeleton = () => (
  <Box sx={{ borderRadius: "20px", overflow: "hidden", border: "1px solid var(--eventler-border)" }}>
    <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "4 / 3" }} />
    <Box sx={{ p: 1.5 }}>
      <Skeleton variant="text" width="70%" height={20} />
      <Skeleton variant="text" width="40%" height={16} />
    </Box>
  </Box>
);

const HomeFeedPage: FunctionComponent = () => {
  const favorites = useFavorites();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [selectedVenue, setSelectedVenue] = useState<FeedItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchFeed({ q: debouncedQuery, page: 1, limit: 20 })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setPage(response.page);
        setHasMore(response.hasMore);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your feed. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, retryToken]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const response = await fetchFeed({ q: debouncedQuery, page: page + 1, limit: 20 });
      setItems((prev) => [...prev, ...response.items]);
      setPage(response.page);
      setHasMore(response.hasMore);
    } catch {
      setToast("Could not load more results.");
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedQuery, page]);

  const handleToggleFavorite = useCallback(
    async (venueId: string) => {
      try {
        await favorites.toggleFavorite(venueId);
      } catch {
        setToast("Could not update favorite. Please try again.");
      }
    },
    [favorites],
  );

  const handleShare = useCallback((item: FeedItem) => {
    void shareVenue(
      item,
      () => setToast("Copied to clipboard."),
      () => setToast("Could not copy to clipboard."),
    );
  }, []);

  const displayItems = items.map((item) => ({
    ...item,
    isFavorite: favorites.loading ? item.isFavorite : favorites.isFavorite(item.id),
  }));

  return (
    <FeedContainer>
      <FeedHeaderBanner>
        <FeedTitle>Eventler</FeedTitle>
      </FeedHeaderBanner>

      <SearchBarPaper elevation={0}>
        <SearchIcon sx={{ color: "var(--eventler-muted)" }} />
        <SearchInput
          placeholder="Find the perfect event..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          inputProps={{ "aria-label": "Search events and venues" }}
        />
      </SearchBarPaper>

      <FeedListArea>
        {loading &&
          Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}

        {!loading && error && (
          <FeedFullWidthRow sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ color: "var(--eventler-muted)", mb: 2 }}>{error}</Typography>
            <PrimeButton onClick={() => setRetryToken((t) => t + 1)}>Try again</PrimeButton>
          </FeedFullWidthRow>
        )}

        {!loading && !error && displayItems.length === 0 && (
          <FeedFullWidthRow sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ color: "var(--eventler-muted)" }}>
              {debouncedQuery ? "No matches found." : "No recommendations yet — check back soon."}
            </Typography>
          </FeedFullWidthRow>
        )}

        {!loading &&
          !error &&
          displayItems.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onClick={() => {
                setSelectedVenue(item);
                setIsDetailsOpen(true);
              }}
            />
          ))}

        {!loading && !error && hasMore && (
          <FeedFullWidthRow sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <PrimeButton onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </PrimeButton>
          </FeedFullWidthRow>
        )}
      </FeedListArea>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        message={toast}
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
        onToggleFavorite={handleToggleFavorite}
        onShare={handleShare}
      />
    </FeedContainer>
  );
};

export default HomeFeedPage;
