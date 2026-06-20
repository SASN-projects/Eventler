import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ILangfuseTrace, ILangfuseSpan, NoopLangfuseTrace } from '../langfuse/interfaces/langfuse.interface';

jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    shutdownAsync: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeSpanMock = (): ILangfuseSpan => ({
  update: jest.fn(),
  end: jest.fn(),
});

const mockTraceInstance = (): ILangfuseTrace => ({
  generation: jest.fn(),
  span: jest.fn().mockReturnValue(makeSpanMock()),
  update: jest.fn(),
  score: jest.fn(),
});

const makeEvent = (partial: Partial<any> = {}) => ({
  id: 'test-event-uuid',
  createdById: 'user-123',
  eventType: 'casual',
  locationCity: 'New York',
  locationCountry: 'USA',
  participantCount: 5,
  targetDate: '2025-12-31',
  ...partial,
});

const threeRecommendations = {
  recommendedEvents: [
    { title: 'Event 1', description: 'Desc 1', address: 'Addr 1' },
    { title: 'Event 2', description: 'Desc 2', address: 'Addr 2' },
    { title: 'Event 3', description: 'Desc 3', address: 'Addr 3' },
  ],
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let eventRepositoryMock: any;
  let recommendationRepositoryMock: any;
  let slideAnswerServiceMock: any;
  let langfuseServiceMock: any;
  let geminiServiceMock: any;
  let mockTrace: ILangfuseTrace;

  beforeEach(async () => {
    jest.restoreAllMocks();

    eventRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    recommendationRepositoryMock = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entities) =>
        entities.map((e: any, idx: number) => ({ id: `rec-${idx + 1}`, ...e })),
      ),
    };

    slideAnswerServiceMock = {
      getEventAnswers: jest.fn().mockResolvedValue([
        { question: 'Vibe', answerValue: 'Relaxed' },
      ]),
    };

    mockTrace = mockTraceInstance();
    langfuseServiceMock = {
      trace: jest.fn().mockReturnValue(mockTrace),
    };

    geminiServiceMock = {
      generateJsonContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        RecommendationQualityEvaluator,
        { provide: getRepositoryToken(Recommendation), useValue: recommendationRepositoryMock },
        { provide: getRepositoryToken(Event), useValue: eventRepositoryMock },
        { provide: getRepositoryToken(Venue), useValue: {} },
        { provide: SlidesService, useValue: slideAnswerServiceMock },
        { provide: LangfuseService, useValue: langfuseServiceMock },
        { provide: GeminiService, useValue: geminiServiceMock },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  it('generates recommendations, saves them, and returns success', async () => {
    eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
    geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

    const result = await service.generateRecommendation('test-event-uuid');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0].title).toBe('Event 1');

    // Langfuse trace created with correct userId and sessionId
     
    expect(langfuseServiceMock.trace).toHaveBeenCalledWith(
      'generate-recommendations',
      expect.objectContaining({ userId: 'user-123', sessionId: 'test-event-uuid' }),
    );

    // DB save was called
     
    expect(recommendationRepositoryMock.save).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Event not found — no trace should be started
  // -------------------------------------------------------------------------
  it('returns { success: false } without starting a trace when event is not found', async () => {
    eventRepositoryMock.findOne.mockResolvedValue(null);

    const result = await service.generateRecommendation('missing-id');

    expect(result.success).toBe(false);
    expect(langfuseServiceMock.trace).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // persist-recommendations span (item 8)
  // -------------------------------------------------------------------------
  describe('persist-recommendations span', () => {
    it('creates and ends a persist span on successful DB save', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      // span() must have been called with name 'persist-recommendations'
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTrace.span).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'persist-recommendations' }),
      );

      // The span returned by trace.span() must have had .end() called
      const spanInstance = (mockTrace.span as jest.Mock).mock.results[0].value as ILangfuseSpan;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(spanInstance.end).toHaveBeenCalledWith(
        expect.objectContaining({ output: expect.objectContaining({ savedCount: 3 }) }),
      );
    });

    it('ends the persist span with ERROR level when DB save throws, then re-tries', async () => {
      // Speed up retries
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());

      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());

      // Gemini always succeeds, but DB always fails
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);
      recommendationRepositoryMock.save.mockRejectedValue(new Error('DB connection lost'));

      // Each retry creates a new span mock; collect all span mocks via the trace mock
      const spanMocks: ILangfuseSpan[] = [];
      (mockTrace.span as jest.Mock).mockImplementation(() => {
        const s = makeSpanMock();
        spanMocks.push(s);
        return s;
      });

      const result = await service.generateRecommendation('test-event-uuid');

      // Should have failed all retries → success: false
      expect(result.success).toBe(false);

      // Every persist span (one per attempt) should have ended with ERROR
      const persistSpans = spanMocks.filter((_, idx) => idx > 0 || spanMocks.length === 1);
      for (const span of persistSpans) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(span.end).toHaveBeenCalledWith(
          expect.objectContaining({ level: 'ERROR', statusMessage: 'DB connection lost' }),
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Retry tracing — item 7: separate generations per attempt
  // -------------------------------------------------------------------------
  describe('retry tracing', () => {
    it('creates a distinct generation name per retry attempt', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());

      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());

      // Fail twice, succeed on 3rd
      geminiServiceMock.generateJsonContent
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);
      expect(geminiServiceMock.generateJsonContent).toHaveBeenCalledTimes(3);

      // Each call must have a different promptName containing the attempt number
      const calls = geminiServiceMock.generateJsonContent.mock.calls;
      expect(calls[0][0].promptName).toContain('attempt 1');
      expect(calls[1][0].promptName).toContain('attempt 2');
      expect(calls[2][0].promptName).toContain('attempt 3');
    });
  });

  // -------------------------------------------------------------------------
  // All retries exhausted
  // -------------------------------------------------------------------------
  it('updates trace with error output and returns { success: false } after all retries fail', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());

    eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
    geminiServiceMock.generateJsonContent.mockRejectedValue(new Error('Gemini API is down'));

    const result = await service.generateRecommendation('test-event-uuid');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to generate recommendation after 3 attempts');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockTrace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({
          success: false,
          error: expect.stringContaining('Failed to generate recommendation after 3 attempts'),
        }),
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Retrieval span error path — throws from SlidesService
  // -------------------------------------------------------------------------
  it('ends retrieval span with ERROR and re-throws when slide answers fail', async () => {
    eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
    slideAnswerServiceMock.getEventAnswers.mockRejectedValue(new Error('Slide service down'));

    await expect(service.generateRecommendation('test-event-uuid')).rejects.toThrow('Slide service down');

    // retrieve-user-preferences span should have ended with ERROR
    const spanInstance = (mockTrace.span as jest.Mock).mock.results[0].value as ILangfuseSpan;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(spanInstance.end).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', statusMessage: 'Slide service down' }),
    );
  });

  // -------------------------------------------------------------------------
  // Quality score tests
  // -------------------------------------------------------------------------
  describe('quality evaluation scores', () => {
    it('sends all 5 quality scores to Langfuse after successful generation', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);

      // score() must have been called once per quality metric
      const scoreNames = (mockTrace.score as jest.Mock).mock.calls.map(
        (call: any[]) => call[0].name,
      );
      expect(scoreNames).toEqual(
        expect.arrayContaining([
          'json_validity',
          'schema_compliance',
          'recommendations_count',
          'has_duplicate_recommendations',
          'has_empty_required_fields',
        ]),
      );
    });

    it('sends json_validity=1 and schema_compliance=1 for valid model output', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const scoreCalls: Record<string, number> = {};
      for (const [arg] of (mockTrace.score as jest.Mock).mock.calls) {
        scoreCalls[arg.name] = arg.value;
      }

      expect(scoreCalls['json_validity']).toBe(1);
      expect(scoreCalls['schema_compliance']).toBe(1);
      expect(scoreCalls['recommendations_count']).toBe(3);
      expect(scoreCalls['has_duplicate_recommendations']).toBe(0);
      expect(scoreCalls['has_empty_required_fields']).toBe(0);
    });

    it('does not break the recommendation flow when trace.score() throws', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      // Make score() throw to simulate a Langfuse SDK error
      (mockTrace.score as jest.Mock).mockImplementation(() => {
        throw new Error('Langfuse score exploded');
      });

      // The service wraps score() in try/catch — result must still succeed
      const result = await service.generateRecommendation('test-event-uuid');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('still generates recommendations when Langfuse is disabled (NoopLangfuseTrace)', async () => {
      // Override langfuseService to return a real Noop trace (disabled mode)
      langfuseServiceMock.trace.mockReturnValue(new NoopLangfuseTrace());

      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });
});

