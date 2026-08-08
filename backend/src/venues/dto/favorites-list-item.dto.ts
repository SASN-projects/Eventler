export interface FavoriteVenueListItem {
  id: string;
  title: string;
  address: string | null;
  imageUrl: string | null;
  rating: number | null;
  category: string | null;
  priceLevel: number | null;
  favoritedAt: Date;
}
