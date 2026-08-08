import api from "../../config/api";
import type { FeedResponse } from "./types";

export interface FetchFeedParams {
  q?: string;
  page?: number;
  limit?: number;
}

export const fetchFeed = async ({ q, page = 1, limit = 20 }: FetchFeedParams): Promise<FeedResponse> => {
  const { data } = await api.get<FeedResponse>("/recommendations/feed", {
    params: { q: q || undefined, page, limit },
  });
  return data;
};
