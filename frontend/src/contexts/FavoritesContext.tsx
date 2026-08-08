import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api from "../config/api";
import { useAuth } from "../hooks/useAuth";

export interface FavoriteVenue {
  id: string;
  title: string;
  address: string | null;
  imageUrl: string | null;
  rating: number | null;
  category: string | null;
  priceLevel: number | null;
  favoritedAt: string;
}

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  favorites: FavoriteVenue[];
  loading: boolean;
  isFavorite: (venueId: string) => boolean;
  toggleFavorite: (venueId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteVenue[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await api.get<FavoriteVenue[]>("/users/me/favorites");
      setFavorites(data || []);
      setFavoriteIds(new Set((data || []).map((venue) => venue.id)));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshFavorites();
    } else {
      setFavorites([]);
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated, refreshFavorites]);

  const toggleFavorite = useCallback(async (venueId: string) => {
    const wasFavorite = favoriteIds.has(venueId);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(venueId);
      else next.add(venueId);
      return next;
    });

    try {
      if (wasFavorite) {
        await api.delete(`/users/me/favorites/${venueId}`);
        setFavorites((prev) => prev.filter((venue) => venue.id !== venueId));
      } else {
        await api.post(`/users/me/favorites/${venueId}`);
        void refreshFavorites();
      }
    } catch (error) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(venueId);
        else next.delete(venueId);
        return next;
      });
      throw error;
    }
  }, [favoriteIds, refreshFavorites]);

  const isFavorite = useCallback((venueId: string) => favoriteIds.has(venueId), [favoriteIds]);

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, favorites, loading, isFavorite, toggleFavorite, refreshFavorites }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
