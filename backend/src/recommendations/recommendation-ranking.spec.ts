import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import { RecommendationPromptContextBuilder } from './recommendation-prompt-context.builder';
import { RecommendationHistoryService } from './recommendation-history.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { GooglePlacesService } from './google-places.service';

jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    shutdownAsync: jest.fn().mockResolvedValue(undefined),
  })),
}));

/**
 * A Places candidate as the ranking stage sees it.
 */
const makePlace = (partial: Partial<any> = {}) => ({
  id: 'place-1',
  displayName: 'Some Venue',
  formattedAddress: 'Some St 1, Tel Aviv-Yafo',
  primaryType: 'restaurant',
  types: ['restaurant'],
  searchQuery: 'restaurant in Tel Aviv, Israel',
  rating: 4.2,
  userRatingCount: 500,
  planWeight: 1,
  ...partial,
});

/**
 * The contrast the ranker has to get right: a globally famous cocktail bar that matches
 * nothing the user asked for, against a modest venue that matches exactly.
 */
const FAMOUS_UNRELATED_BAR = makePlace({
  id: 'bellboy',
  displayName: 'Bellboy',
  primaryType: 'bar',
  types: ['bar', 'night_club'],
  searchQuery: 'bar in Tel Aviv, Israel',
  rating: 4.7,
  userRatingCount: 6250,
});

const MODEST_MATCHING_RESTAURANT = makePlace({
  id: 'hummus-place',
  displayName: 'Hummus Ashkara',
  primaryType: 'mediterranean_restaurant',
  types: ['mediterranean_restaurant', 'restaurant'],
  searchQuery: 'mediterranean restaurant in Tel Aviv, Israel',
  rating: 4.1,
  userRatingCount: 320,
});

describe('RecommendationsService — Places ranking', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        RecommendationQualityEvaluator,
        { provide: getRepositoryToken(Recommendation), useValue: {} },
        { provide: getRepositoryToken(Event), useValue: {} },
        { provide: getRepositoryToken(Venue), useValue: {} },
        { provide: SlidesService, useValue: {} },
        {
          provide: LangfuseService,
          useValue: { trace: jest.fn(), getPrompt: jest.fn() },
        },
        {
          provide: GeminiService,
          useValue: { generateJsonContent: jest.fn(), getDefaultModel: jest.fn() },
        },
        {
          provide: GooglePlacesService,
          useValue: { isConfigured: jest.fn().mockReturnValue(true), searchText: jest.fn() },
        },
        {
          provide: RecommendationJudgeService,
          useValue: { isEnabled: jest.fn().mockReturnValue(false), shouldSample: jest.fn() },
        },
        { provide: RecommendationPromptContextBuilder, useValue: { build: jest.fn() } },
        { provide: RecommendationHistoryService, useValue: { getHistorySignal: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('preference matching', () => {
    const coverage = (place: any, answers: any[]) =>
      service['scorePreferenceMatches'](place, answers);

    it('matches an option label against the Places type vocabulary via synonyms', () => {
      // "Mediterranean or Middle Eastern" never appears verbatim in a Places payload;
      // matching has to go through the synonym expansion to reach mediterranean_restaurant.
      expect(
        coverage(MODEST_MATCHING_RESTAURANT, [
          { question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' },
        ]),
      ).toBe(1);
    });

    it('does not match an unrelated venue on the same answer', () => {
      expect(
        coverage(FAMOUS_UNRELATED_BAR, [
          { question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' },
        ]),
      ).toBe(0);
    });

    it('maps activity answers onto the venue types that satisfy them', () => {
      const beach = makePlace({
        displayName: 'Hilton Beach',
        primaryType: 'beach',
        types: ['beach'],
        searchQuery: 'water activities in Tel Aviv, Israel',
      });

      expect(coverage(beach, [{ question: 'Activity', answerValue: 'Water activities' }])).toBe(1);
      expect(
        coverage(FAMOUS_UNRELATED_BAR, [{ question: 'Activity', answerValue: 'Water activities' }]),
      ).toBe(0);
    });

    it('reports partial coverage when only some answers are satisfied', () => {
      expect(
        coverage(MODEST_MATCHING_RESTAURANT, [
          { question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' },
          { question: 'Activity', answerValue: 'Water activities' },
        ]),
      ).toBe(0.5);
    });

    it('ignores answers that describe no venue characteristic', () => {
      // Price bands and group sizes are handled by the search plan's priceLevels, not by
      // string matching, so they must not dilute coverage in either direction.
      const terms = (value: string) => service['preferenceSearchTerms'](value);

      expect(terms('150-300 NIS')).toEqual([]);
      expect(terms('No preference')).toEqual([]);
      expect(terms('Open to anything')).toEqual([]);
      expect(coverage(FAMOUS_UNRELATED_BAR, [{ question: 'Budget', answerValue: '150-300 NIS' }])).toBe(0);
    });
  });

  describe('scorePlace', () => {
    const score = (place: any, answers: any[]) => service['scorePlace'](place, answers);

    it('ranks a matching venue above a more famous unrelated one', () => {
      // Rating (4.7 vs 4.1) and review count (6,250 vs 320) both favour the bar, so this
      // pins that preference fit outweighs raw popularity rather than the other way round.
      const answers = [
        { question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' },
        { question: 'Format', answerValue: 'Sit-down restaurant' },
      ];

      expect(score(MODEST_MATCHING_RESTAURANT, answers)).toBeGreaterThan(
        score(FAMOUS_UNRELATED_BAR, answers),
      );
    });

    it('still prefers the higher-quality venue when neither matches the answers', () => {
      const answers = [{ question: 'Activity', answerValue: 'Water activities' }];

      expect(score(FAMOUS_UNRELATED_BAR, answers)).toBeGreaterThan(
        score(MODEST_MATCHING_RESTAURANT, answers),
      );
    });

    it('still prefers the higher-quality venue when both match equally', () => {
      const answers = [{ question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' }];
      const busierMatch = { ...MODEST_MATCHING_RESTAURANT, id: 'busier', rating: 4.6, userRatingCount: 4000 };

      expect(score(busierMatch, answers)).toBeGreaterThan(score(MODEST_MATCHING_RESTAURANT, answers));
    });

    it('never fills two result slots with the same venue name', () => {
      // The venue index can list one place under several ids, which survives id-based
      // deduplication and would otherwise occupy two of the three recommendation slots.
      const ranked = [
        { title: 'Yarkon Park', placeId: 'a' },
        { title: 'yarkon park', placeId: 'b' },
        { title: 'Bellboy', placeId: 'c' },
        { title: 'Menachem Begin Park', placeId: 'd' },
      ];

      const picked = service['pickDistinctTop'](ranked, 3);

      expect(picked.map((p) => p.title)).toEqual(['Yarkon Park', 'Bellboy', 'Menachem Begin Park']);
      expect(new Set(picked.map((p) => p.title.toLowerCase())).size).toBe(3);
    });

    it('returns fewer than requested when there are not enough distinct venues', () => {
      const picked = service['pickDistinctTop'](
        [{ title: 'Same Place', placeId: 'a' }, { title: 'Same Place', placeId: 'b' }],
        3,
      );

      expect(picked).toHaveLength(1);
    });

    it('penalises a venue that is closed at the planned visit time', () => {
      const answers = [{ question: 'Cuisine', answerValue: 'Mediterranean or Middle Eastern' }];

      expect(score(MODEST_MATCHING_RESTAURANT, answers)).toBeGreaterThan(
        service['scorePlace'](MODEST_MATCHING_RESTAURANT, answers, { status: 'closed' }),
      );
    });
  });
});
