import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchemaType, ObjectSchema } from '@google/generative-ai';
import { UserFeedItem } from './entities/user-feed-item.entity';
import { Venue } from '../venues/entities/venue.entity';
import { User } from '../auth/entities/user.entity';
import { UserPreferences } from '../users/entities/user-preferences.entity';
import { FavoritesService } from '../venues/favorites.service';
import { GooglePlacesService, GooglePlaceCandidate } from './google-places.service';
import { GeminiService } from '../gemini/gemini.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';
import { RecommendationHistoryService } from './recommendation-history.service';
import { inferRegionCode, mentionsDifferentCountry } from './region-code.util';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedItemDto, FeedResponseDto } from './dto/feed-response.dto';

const DEFAULT_COUNTRY = 'Israel';

interface FeedUserProfile {
  location: string;
  city: string;
  country: string;
  vibe?: string;
  interests: string[];
  budgetMin?: number;
  budgetMax?: number;
  historySummaryText: string;
}

interface FeedSearchPlanItem {
  textQuery: string;
  includedType?: string;
  minRating?: number;
  priceLevels?: string[];
  weight?: number;
}

interface FeedSearchPlan {
  searches: FeedSearchPlanItem[];
}

interface FeedCandidate {
  name: string;
  address: string;
  description?: string;
  category?: string;
  city?: string;
  country?: string;
  rating?: number | null;
  userRatingCount?: number;
  priceLevel?: string;
  photoName?: string;
  source: string;
  externalSourceId?: string;
  score: number;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 2,
  PRICE_LEVEL_MODERATE: 3,
  PRICE_LEVEL_EXPENSIVE: 4,
  PRICE_LEVEL_VERY_EXPENSIVE: 5,
};

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);
  private readonly feedTtlMs: number;

  constructor(
    @InjectRepository(UserFeedItem)
    private readonly userFeedItemRepository: Repository<UserFeedItem>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    private readonly favoritesService: FavoritesService,
    private readonly googlePlacesService: GooglePlacesService,
    private readonly geminiService: GeminiService,
    private readonly historyService: RecommendationHistoryService,
    private readonly langfuseService: LangfuseService,
    private readonly configService: ConfigService,
  ) {
    const ttlHours = Number(this.configService.get<string>('FEED_TTL_HOURS'));
    this.feedTtlMs = (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 12) * 3600_000;
  }

  async getFeed(userId: string, query: FeedQueryDto): Promise<FeedResponseDto> {
    await this.ensureFreshFeed(userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.q?.trim();

    const qb = this.userFeedItemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.venue', 'venue')
      .where('item.userId = :userId', { userId });

    if (search) {
      qb.andWhere('(venue.name ILIKE :search OR venue.category ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();

    const rows = await qb
      .orderBy('item.rank', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const venueIds = rows.map((row) => row.venueId);
    const favoriteIds = await this.favoritesService.getFavoriteVenueIdSet(userId, venueIds);

    const items = await Promise.all(rows.map((row) => this.toFeedItemDto(row.venue, favoriteIds)));

    return {
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  private async ensureFreshFeed(userId: string): Promise<void> {
    const latest = await this.userFeedItemRepository.findOne({
      where: { userId },
      order: { generatedAt: 'DESC' },
    });

    const [user, preferences] = await Promise.all([
      this.userRepository.findOneBy({ id: userId }),
      this.userPreferencesRepository.findOneBy({ userId }),
    ]);

    const isStale =
      !latest ||
      Date.now() - latest.generatedAt.getTime() > this.feedTtlMs ||
      (preferences?.updatedAt && preferences.updatedAt.getTime() > latest.generatedAt.getTime()) ||
      (user?.updatedAt && user.updatedAt.getTime() > latest.generatedAt.getTime());

    if (isStale) {
      await this.regenerateFeed(userId, user, preferences);
    }
  }

  private async regenerateFeed(userId: string, user: User | null, preferences: UserPreferences | null): Promise<void> {
    const trace = this.langfuseService.trace('generate-feed', {
      userId,
      metadata: { hasPreferences: Boolean(preferences) },
    });

    try {
      const historySignal = await this.historyService.getHistorySignal({
        scope: 'user',
        subjectId: userId,
        currentEventId: '00000000-0000-0000-0000-000000000000',
      });

      const profile = this.buildUserProfile(user, preferences, historySignal.summaryText);

      let candidates: FeedCandidate[] = [];
      if (this.googlePlacesService.isConfigured()) {
        try {
          const searchPlan = await this.generateFeedSearchPlan(profile, trace);
          candidates = await this.searchAndRankCandidates(searchPlan, profile, trace);
        } catch (placesError: any) {
          this.logger.warn(
            `Google Places feed generation failed; falling back to Gemini-only: ${placesError.message}`,
          );
        }
      } else {
        this.logger.warn('Google Places API key is not configured; using Gemini-only feed generation.');
      }

      if (candidates.length === 0) {
        candidates = await this.generateGeminiOnlyCandidates(profile, trace);
      }

      const venues = await this.upsertVenues(candidates);

      await this.userFeedItemRepository.delete({ userId });
      if (venues.length > 0) {
        const generatedAt = new Date();
        await this.userFeedItemRepository.insert(
          venues.map((venue, index) => ({
            userId,
            venueId: venue.id,
            rank: index,
            score: candidates[index]?.score ?? null,
            generatedAt,
          })),
        );
      }

      trace.update({ output: { success: true, venueCount: venues.length } });
    } catch (error: any) {
      this.logger.error(`Feed regeneration failed for user ${userId}: ${error.message}`);
      trace.update({ output: { success: false, error: error.message } });
    }
  }

  private buildUserProfile(user: User | null, preferences: UserPreferences | null, historySummaryText: string): FeedUserProfile {
    const city = user?.city?.trim() || this.parseFallbackCity(preferences);
    const country = user?.country?.trim() || this.parseFallbackCountry(preferences) || DEFAULT_COUNTRY;
    const location = [city, country].filter(Boolean).join(', ') || country;

    return {
      location,
      city,
      country,
      vibe: preferences?.preferredVibe,
      interests: preferences?.interests ?? [],
      budgetMin: preferences?.preferredBudgetMin,
      budgetMax: preferences?.preferredBudgetMax,
      historySummaryText,
    };
  }

  private parseFallbackCity(preferences: UserPreferences | null): string {
    const text = preferences?.preferredLocation?.trim();
    if (!text) return '';
    const [city] = text.split(',').map((part) => part.trim());
    return city || '';
  }

  private parseFallbackCountry(preferences: UserPreferences | null): string {
    const text = preferences?.preferredLocation?.trim();
    if (!text || !text.includes(',')) return '';
    const parts = text.split(',').map((part) => part.trim());
    return parts[1] || '';
  }

  private async generateFeedSearchPlan(profile: FeedUserProfile, trace: ILangfuseTrace): Promise<FeedSearchPlan> {
    const interestsText = profile.interests.length ? profile.interests.join(', ') : 'no specific interests recorded';
    const budgetText =
      profile.budgetMin != null || profile.budgetMax != null
        ? `- Budget range: ${profile.budgetMin ?? '?'} - ${profile.budgetMax ?? '?'}`
        : '';

    const prompt = [
      'You convert a user profile into Google Places Text Search requests for a personalized "things to do" feed.',
      'Return ONLY JSON. Do not recommend final venues.',
      '',
      `HARD CONSTRAINT: every search intent MUST target venues in ${profile.country}. Do not target any other country, even for a strong thematic match.`,
      '',
      'User profile:',
      `- Location: ${profile.location}`,
      `- Preferred vibe: ${profile.vibe || 'unspecified'}`,
      `- Interests: ${interestsText}`,
      budgetText,
      '',
      profile.historySummaryText,
      '',
      'Create 3 to 5 concise Google Places search intents covering a diverse mix of categories',
      '(e.g. dining, activities, culture, nightlife) suited to this profile.',
      'Each textQuery must include the location and a concrete venue/activity category.',
      'Use includedType only when it is a valid Google Places primary type such as restaurant, bar, cafe, park, museum, night_club, movie_theater, bowling_alley, tourist_attraction, shopping_mall.',
      'Use minRating around 4 for quality. Do not use openNow.',
    ]
      .filter(Boolean)
      .join('\n');

    const responseSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        searches: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              textQuery: { type: SchemaType.STRING },
              includedType: { type: SchemaType.STRING },
              minRating: { type: SchemaType.NUMBER },
              priceLevels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              weight: { type: SchemaType.NUMBER },
            },
            required: ['textQuery'],
          },
        },
      },
      required: ['searches'],
    };

    const result = await this.geminiService.generateJsonContent<FeedSearchPlan>({
      prompt,
      responseSchema,
      parentTrace: trace,
      promptName: 'feed-places-search-plan',
      metadata: { location: profile.location },
    });

    const searches = (result.searches ?? [])
      .filter((search) => search.textQuery?.trim())
      .slice(0, 5)
      .map((search) => ({
        ...search,
        textQuery: this.ensureQueryHasLocation(search.textQuery, profile.location),
        weight: Math.min(Math.max(search.weight ?? 1, 0.25), 2),
      }));

    if (searches.length === 0) {
      return { searches: this.buildFallbackSearches(profile) };
    }

    return { searches };
  }

  private async searchAndRankCandidates(
    searchPlan: FeedSearchPlan,
    profile: FeedUserProfile,
    trace: ILangfuseTrace,
  ): Promise<FeedCandidate[]> {
    const span = trace.span({ name: 'feed-places-search-and-rank', input: { searches: searchPlan.searches } });

    const regionCode = inferRegionCode(profile.country);
    const allCandidates: Array<GooglePlaceCandidate & { planWeight: number }> = [];
    for (const search of searchPlan.searches) {
      try {
        const places = await this.googlePlacesService.searchText({
          textQuery: search.textQuery,
          includedType: search.includedType,
          minRating: search.minRating,
          priceLevels: search.priceLevels,
          pageSize: 10,
          regionCode,
        });
        allCandidates.push(...places.map((place) => ({ ...place, planWeight: search.weight ?? 1 })));
      } catch (error: any) {
        this.logger.warn(`Feed places query failed for "${search.textQuery}": ${error.message}`);
      }
    }

    const deduped = this.dedupeCandidates(allCandidates);
    const operational = deduped.filter((place) => !place.businessStatus || place.businessStatus === 'OPERATIONAL');

    const countryMatched = operational.filter((place) => this.matchesCountry(place, profile.country));
    const droppedForCountry = operational.length - countryMatched.length;
    if (droppedForCountry > 0) {
      this.logger.debug(
        `Dropped ${droppedForCountry} feed candidate(s) not matching country "${profile.country}".`,
      );
    }

    const ranked = countryMatched
      .map((place) => this.toFeedCandidate(place, profile))
      .sort((a, b) => b.score - a.score);

    span.end({
      output: {
        candidates: allCandidates.length,
        deduped: deduped.length,
        droppedForCountry,
        ranked: ranked.length,
      },
    });

    return ranked;
  }

  private matchesCountry(place: GooglePlaceCandidate, country: string): boolean {
    return !mentionsDifferentCountry(place.formattedAddress, country);
  }

  private toFeedCandidate(place: GooglePlaceCandidate & { planWeight: number }, profile: FeedUserProfile): FeedCandidate {
    return {
      name: place.displayName,
      address: place.formattedAddress,
      description: place.description,
      category: place.primaryType ?? place.types?.[0],
      city: profile.city,
      country: profile.country,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      photoName: place.photoName,
      source: 'google_places',
      externalSourceId: place.id,
      score: this.scoreCandidate(place, profile),
    };
  }

  private scoreCandidate(place: GooglePlaceCandidate & { planWeight: number }, profile: FeedUserProfile): number {
    const ratingScore = (place.rating ?? 0) * 20;
    const popularityScore = Math.log10((place.userRatingCount ?? 0) + 1) * 12;
    const weightScore = place.planWeight * 10;
    const interestScore = this.scoreInterestMatch(place, profile.interests);
    return ratingScore + popularityScore + weightScore + interestScore;
  }

  private scoreInterestMatch(place: GooglePlaceCandidate, interests: string[]): number {
    if (!interests.length) return 0;
    const haystack = [place.displayName, place.primaryType, ...(place.types ?? [])].join(' ').toLowerCase();
    return interests.reduce((score, interest) => {
      const value = interest.toLowerCase();
      return value.length >= 3 && haystack.includes(value) ? score + 8 : score;
    }, 0);
  }

  private dedupeCandidates<T extends GooglePlaceCandidate>(places: T[]): T[] {
    const byId = new Map<string, T>();
    for (const place of places) {
      if (place.id && !byId.has(place.id)) {
        byId.set(place.id, place);
      }
    }
    return Array.from(byId.values());
  }

  private buildFallbackSearches(profile: FeedUserProfile): FeedSearchPlanItem[] {
    const interestText = profile.interests.join(' ') || profile.vibe || 'popular';
    return [
      { textQuery: `${interestText} restaurant in ${profile.location}`, includedType: 'restaurant', minRating: 4, weight: 1 },
      { textQuery: `${interestText} bar cafe in ${profile.location}`, minRating: 4, weight: 0.9 },
      { textQuery: `${interestText} activity in ${profile.location}`, minRating: 4, weight: 0.8 },
    ];
  }

  private ensureQueryHasLocation(query: string, location: string): string {
    const normalized = query.trim();
    if (normalized.toLowerCase().includes(location.toLowerCase())) {
      return normalized;
    }
    return `${normalized} in ${location}`;
  }

  private async generateGeminiOnlyCandidates(profile: FeedUserProfile, trace: ILangfuseTrace): Promise<FeedCandidate[]> {
    const responseSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        venues: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              address: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
            },
            required: ['title', 'description', 'address'],
          },
        },
      },
      required: ['venues'],
    };

    const prompt = [
      'Suggest 10 diverse venues/activities for a personalized event-planning feed.',
      `HARD CONSTRAINT: every suggestion MUST be located in ${profile.country}. Do not suggest venues located in any other country.`,
      `Location: ${profile.location}`,
      `Preferred vibe: ${profile.vibe || 'unspecified'}`,
      `Interests: ${profile.interests.join(', ') || 'none specified'}`,
      profile.historySummaryText,
      'Return ONLY JSON matching the schema.',
    ].join('\n');

    try {
      const result = await this.geminiService.generateJsonContent<{ venues: any[] }>({
        prompt,
        responseSchema,
        parentTrace: trace,
        promptName: 'feed-gemini-fallback',
        metadata: { location: profile.location },
      });

      return (result.venues ?? []).slice(0, 12).map((venue, index) => ({
        name: venue.title || `Suggestion ${index + 1}`,
        address: venue.address || profile.location,
        description: venue.description,
        category: venue.category,
        city: profile.city,
        country: profile.country,
        rating: null,
        source: 'gemini',
        score: 100 - index,
      }));
    } catch (error: any) {
      this.logger.warn(`Gemini-only feed fallback failed: ${error.message}`);
      return [];
    }
  }

  private async upsertVenues(candidates: FeedCandidate[]): Promise<Venue[]> {
    const venues: Venue[] = [];

    for (const candidate of candidates) {
      let venue: Venue | null = null;

      if (candidate.externalSourceId) {
        venue = await this.venueRepository.findOne({
          where: { source: candidate.source, externalSourceId: candidate.externalSourceId },
        });
      }

      const fields = this.candidateToVenueFields(candidate);
      if (venue) {
        Object.assign(venue, fields);
      } else {
        venue = this.venueRepository.create(fields);
      }

      try {
        venues.push(await this.venueRepository.save(venue));
      } catch (error: any) {
        this.logger.warn(`Failed to persist venue "${candidate.name}": ${error.message}`);
      }
    }

    return venues;
  }

  private candidateToVenueFields(candidate: FeedCandidate): Partial<Venue> {
    return {
      name: candidate.name,
      category: candidate.category ?? '',
      description: candidate.description ?? '',
      address: candidate.address ?? '',
      city: candidate.city ?? '',
      country: candidate.country ?? '',
      priceLevel: this.mapPriceLevel(candidate.priceLevel),
      rating: candidate.rating ?? null,
      source: candidate.source,
      externalSourceId: candidate.externalSourceId ?? null,
      photoReference: candidate.photoName ?? null,
    };
  }

  private mapPriceLevel(priceLevel?: string): number | null {
    if (!priceLevel) return null;
    return PRICE_LEVEL_MAP[priceLevel] ?? null;
  }

  private async toFeedItemDto(venue: Venue, favoriteIds: Set<string>): Promise<FeedItemDto> {
    const imageUrl = await this.resolvePhotoUrl(venue.photoReference);

    return {
      id: venue.id,
      title: venue.name,
      imageUrl,
      address: venue.address || null,
      isFavorite: favoriteIds.has(venue.id),
      rating: venue.rating,
      category: venue.category || null,
      priceLevel: venue.priceLevel,
      description: venue.description || null,
    };
  }

  private async resolvePhotoUrl(photoReference: string | null): Promise<string | null> {
    if (!photoReference) return null;
    try {
      return (await this.googlePlacesService.getPhotoUri(photoReference)) ?? null;
    } catch (error: any) {
      this.logger.warn(`Failed to resolve feed photo: ${error.message}`);
      return null;
    }
  }
}
