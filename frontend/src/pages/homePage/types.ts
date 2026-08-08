export interface FeedItem {
  id: string;
  title: string;
  imageUrl: string | null;
  address: string | null;
  isFavorite: boolean;
  rating: number | null;
  category: string | null;
  priceLevel: number | null;
  description?: string | null;
}

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
