import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import { RecommendationPromptContextBuilder } from './recommendation-prompt-context.builder';
import { RecommendationHistoryService } from './recommendation-history.service';
import { RECOMMENDATION_PROMPT_NAME, RECOMMENDATION_FALLBACK_TEMPLATE, compileTemplate } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ConfigService } from '@nestjs/config';
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
  let judgeServiceMock: any;
  let promptContextBuilderMock: any;
  let historyServiceMock: any;
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
      findOne: jest.fn(),
    };

    slideAnswerServiceMock = {
      getEventAnswers: jest.fn().mockResolvedValue([
        { question: 'Vibe', answerValue: 'Relaxed' },
      ]),
    };

    mockTrace = mockTraceInstance();

    // Default getPrompt returns a fallback result so existing tests are unaffected.
    langfuseServiceMock = {
      trace: jest.fn().mockReturnValue(mockTrace),
      getPrompt: jest.fn().mockResolvedValue({
        template: RECOMMENDATION_FALLBACK_TEMPLATE,
        version: 'fallback',
        source: 'fallback',
      }),
    };

    geminiServiceMock = {
      generateJsonContent: jest.fn(),
    };

    // Judge is DISABLED by default in all existing tests to keep them unaffected.
    // Individual judge tests override shouldSample / evaluate as needed.
    judgeServiceMock = {
      isEnabled: jest.fn().mockReturnValue(false),
      shouldSample: jest.fn().mockReturnValue(false),
      evaluate: jest.fn().mockResolvedValue(undefined),
    };

    // Default context builder returns a minimal but complete context.
    promptContextBuilderMock = {
      build: jest.fn().mockReturnValue({
        eventCoreContext: 'Event Type: casual',
        userPreferencesSummary: 'No explicit user preferences were provided.',
        constraintsSummary: 'Location: New York, USA.',
        optionalSignalsSummary: 'No historical user selection data is available.',
        recommendationPolicy: 'Hard constraints first. Historical preferences are secondary.',
        outputFormatInstructions: 'Return JSON with key "recommendedEvents".',
      }),
    };

    // Default history service returns the no-history fallback.
    historyServiceMock = {
      getHistorySummary: jest.fn().mockResolvedValue({
        historyItemsCount: 0,
        historySignalUsed: false,
        dominantEventTypes: [],
        preferredLocations: [],
        preferredCategories: [],
        summaryText: '',
      }),
    };

    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'LANGFUSE_PROMPT_NAME') return 'event-recommendation-planner';
        return undefined;
      }),
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
        { provide: RecommendationJudgeService, useValue: judgeServiceMock },
        { provide: RecommendationPromptContextBuilder, useValue: promptContextBuilderMock },
        { provide: RecommendationHistoryService, useValue: historyServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
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

  it('marks the event as finalized when a recommendation is selected', async () => {
    const event = makeEvent({ status: 'collecting_responses' });
    eventRepositoryMock.findOne.mockResolvedValue(event);
    recommendationRepositoryMock.findOne.mockResolvedValue({
      id: 'rec-1',
      title: 'Event 1',
      description: 'Desc 1',
      address: 'Addr 1',
    });

    const result = await service.selectRecommendation('test-event-uuid', 'rec-1', 'user-123');

    expect(result.success).toBe(true);
    expect(eventRepositoryMock.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'finalized',
      finalizedAt: expect.any(Date),
    }));
  });

  it('blocks non-creators from selecting a recommendation', async () => {
    const event = makeEvent({ status: 'collecting_responses', createdById: 'creator-1' });
    eventRepositoryMock.findOne.mockResolvedValue(event);
    recommendationRepositoryMock.findOne.mockResolvedValue({
      id: 'rec-1',
      title: 'Event 1',
      description: 'Desc 1',
      address: 'Addr 1',
    });

    const result = await service.selectRecommendation('test-event-uuid', 'rec-1', 'other-user');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Only the event creator');
    expect(eventRepositoryMock.save).not.toHaveBeenCalled();
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

      // Collect all span mocks, tagged by name so we can isolate persist spans.
      // (The retrieve-user-history span is also created here, so we cannot use index-based filtering.)
      const spanMocks: ILangfuseSpan[] = [];
      (mockTrace.span as jest.Mock).mockImplementation((opts: any) => {
        const s = makeSpanMock();
        (s as any).__name = opts.name;
        spanMocks.push(s);
        return s;
      });

      const result = await service.generateRecommendation('test-event-uuid');

      // Should have failed all retries → success: false
      expect(result.success).toBe(false);

      // Isolate only persist-recommendations spans (one per retry attempt)
      const persistSpans = spanMocks.filter(
        (s) => (s as any).__name === 'persist-recommendations',
      );
      expect(persistSpans.length).toBeGreaterThan(0);

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

  // -------------------------------------------------------------------------
  // LLM-as-a-Judge tests
  // -------------------------------------------------------------------------
  describe('LLM-as-a-Judge', () => {
    it('does not call judge.evaluate() when shouldSample() returns false', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(false);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);
      expect(judgeServiceMock.evaluate).not.toHaveBeenCalled();
    });

    it('calls judge.evaluate() with userPreferences array when shouldSample() is true', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      expect(judgeServiceMock.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'casual',
          locationCity: 'New York',
          locationCountry: 'USA',
          participantCount: 5,
          userPreferences: [{ question: 'Vibe', answerValue: 'Relaxed' }],
          recommendations: expect.arrayContaining([
            expect.objectContaining({ title: 'Event 1' }),
          ]),
        }),
        mockTrace,
      );
    });

    it('includes raw slide answer content in the judge input', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);
      slideAnswerServiceMock.getEventAnswers.mockResolvedValue([
        { question: 'Vibe', answerValue: 'Relaxed' },
        { question: 'Budget', answerValue: 'Low' },
      ]);

      await service.generateRecommendation('test-event-uuid');

      const judgeInput = judgeServiceMock.evaluate.mock.calls[0][0];
      expect(judgeInput.userPreferences).toEqual([
        { question: 'Vibe', answerValue: 'Relaxed' },
        { question: 'Budget', answerValue: 'Low' },
      ]);
    });

    it('recommendation flow succeeds even when judge.evaluate() throws', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      judgeServiceMock.evaluate.mockRejectedValue(new Error('Judge model exploded'));
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      // judgeService.evaluate() is awaited directly in the service, so we need
      // to ensure a caught exception here doesn't bubble. The service itself
      // wraps the judge call — let's verify the result is still success.
      const result = await service.generateRecommendation('test-event-uuid');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('sample rate 0 — shouldSample returns false, judge is never called', async () => {
      // Simulate Math.random() returning 0.5, sampleRate effectively 0
      judgeServiceMock.shouldSample.mockReturnValue(false);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');
      expect(judgeServiceMock.evaluate).not.toHaveBeenCalled();
    });

    it('sample rate 1 — shouldSample returns true, judge is always called', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');
      expect(judgeServiceMock.evaluate).toHaveBeenCalledTimes(1);
    });
  });



  // -------------------------------------------------------------------------
  // History signal tests
  // -------------------------------------------------------------------------
  describe('retrieve-user-history span', () => {
    it('creates a retrieve-user-history span for each recommendation generation', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const spanNames = (mockTrace.span as jest.Mock).mock.calls.map(
        (call: any[]) => call[0].name,
      );
      expect(spanNames).toContain('retrieve-user-history');
    });

    it('retrieve-user-history span output contains only aggregate metadata (not raw titles)', async () => {
      historyServiceMock.getHistorySummary.mockResolvedValue({
        historyItemsCount: 3,
        historySignalUsed: true,
        dominantEventTypes: ['individual'],
        preferredLocations: ['Tel Aviv'],
        preferredCategories: ['restaurant'],
        summaryText: 'Historical user preference signals (secondary)...',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const spanMocks: ILangfuseSpan[] = [];
      (mockTrace.span as jest.Mock).mockImplementation((opts: any) => {
        const s = makeSpanMock();
        spanMocks.push(s);
        // tag the mock so we can identify the history span
        (s as any).__name = opts.name;
        return s;
      });

      await service.generateRecommendation('test-event-uuid');

      const historySpan = spanMocks.find((s) => (s as any).__name === 'retrieve-user-history');
      expect(historySpan).toBeDefined();

      const endCall = (historySpan!.end as jest.Mock).mock.calls[0][0];
      const serialized = JSON.stringify(endCall);

      // Aggregate metadata is present
      expect(endCall.output.historyItemsCount).toBe(3);
      expect(endCall.output.historySignalUsed).toBe(true);

      // Raw sensitive content is NOT present
      expect(serialized).not.toContain('Historical user preference signals');
      expect(serialized).not.toContain('summaryText');
      expect(serialized).not.toContain('preferredCategories');
    });

    it('generation succeeds when history lookup throws an unexpected error', async () => {
      historyServiceMock.getHistorySummary.mockRejectedValue(
        new Error('Unexpected history error'),
      );
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('history span ends with ERROR level when getHistorySummary throws', async () => {
      historyServiceMock.getHistorySummary.mockRejectedValue(new Error('DB crash'));
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const spanMocks: ILangfuseSpan[] = [];
      (mockTrace.span as jest.Mock).mockImplementation((opts: any) => {
        const s = makeSpanMock();
        spanMocks.push(s);
        (s as any).__name = opts.name;
        return s;
      });

      await service.generateRecommendation('test-event-uuid');

      const historySpan = spanMocks.find((s) => (s as any).__name === 'retrieve-user-history');
      expect(historySpan).toBeDefined();

      const endCall = (historySpan!.end as jest.Mock).mock.calls[0][0];
      expect(endCall.level).toBe('ERROR');
      expect(endCall.statusMessage).toContain('DB crash');
    });

    it('passes historySummary to promptContextBuilder.build when history is available', async () => {
      const mockHistory = {
        historyItemsCount: 4,
        historySignalUsed: true,
        dominantEventTypes: ['group'],
        preferredLocations: ['Berlin'],
        preferredCategories: ['museum'],
        summaryText: 'Historical signals: museum, Berlin.',
      };
      historyServiceMock.getHistorySummary.mockResolvedValue(mockHistory);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      expect(promptContextBuilderMock.build).toHaveBeenCalledWith(
        expect.anything(), // eventInput
        expect.anything(), // eventAnswers
        mockHistory,       // historySummary
      );
    });

    it('Gemini receives prompt that includes historical signal when history is available', async () => {
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any, history: any) => realBuilder.build(input, answers, history),
      );
      historyServiceMock.getHistorySummary.mockResolvedValue({
        historyItemsCount: 2,
        historySignalUsed: true,
        dominantEventTypes: ['individual'],
        preferredLocations: ['Paris'],
        preferredCategories: ['cafe'],
        summaryText:
          'Historical user preference signals (secondary):\n- User often selected cafe-related recommendations.',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const geminiCallArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      const prompt: string = geminiCallArg.prompt;
      expect(prompt).toContain('secondary');
      expect(prompt).toContain('cafe-related');
    });

    it('Gemini receives prompt with no-history fallback when history is empty', async () => {
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any, history: any) => realBuilder.build(input, answers, history),
      );
      historyServiceMock.getHistorySummary.mockResolvedValue({
        historyItemsCount: 0,
        historySignalUsed: false,
        dominantEventTypes: [],
        preferredLocations: [],
        preferredCategories: [],
        summaryText: '',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const geminiCallArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      const prompt: string = geminiCallArg.prompt;
      expect(prompt).toContain('No historical user selection data is available.');
    });

    it('API response shape is unchanged after adding history signal', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      const item = result.data![0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('address');
      // No extra fields leaked from history
      expect(item).not.toHaveProperty('historySummary');
      expect(item).not.toHaveProperty('historySignalUsed');
    });

    it('prompt policy contains priority order: constraints > preferences > historical', async () => {
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any, history: any) => realBuilder.build(input, answers, history),
      );
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const geminiCallArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      const prompt: string = geminiCallArg.prompt;
      // Policy must state the priority order explicitly
      expect(prompt.toLowerCase()).toContain('hard constraints');
      expect(prompt.toLowerCase()).toContain('secondary');
      expect(prompt.toLowerCase()).toContain('must never override');
    });
  });

  // -------------------------------------------------------------------------
  // LLM Judge — history signal passed to judge
  // -------------------------------------------------------------------------
  describe('LLM Judge — history signal integration', () => {
    it('passes historySummaryText to judge when history is available', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      historyServiceMock.getHistorySummary.mockResolvedValue({
        historyItemsCount: 3,
        historySignalUsed: true,
        dominantEventTypes: ['individual'],
        preferredLocations: ['Berlin'],
        preferredCategories: ['museum'],
        summaryText: 'Historical signals: museum in Berlin.',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      expect(judgeServiceMock.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          historySummaryText: 'Historical signals: museum in Berlin.',
        }),
        mockTrace,
      );
    });

    it('does not pass historySummaryText to judge when history is empty', async () => {
      judgeServiceMock.shouldSample.mockReturnValue(true);
      historyServiceMock.getHistorySummary.mockResolvedValue({
        historyItemsCount: 0,
        historySignalUsed: false,
        dominantEventTypes: [],
        preferredLocations: [],
        preferredCategories: [],
        summaryText: '',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      expect(judgeServiceMock.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ historySummaryText: undefined }),
        mockTrace,
      );
    });
  });

  describe('Langfuse Prompt Management metadata', () => {
    it('passes promptSource: "fallback" to Gemini metadata when getPrompt returns fallback', async () => {
      langfuseServiceMock.getPrompt.mockResolvedValue({
        template: RECOMMENDATION_FALLBACK_TEMPLATE,
        version: 'fallback',
        source: 'fallback',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const callArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      expect(callArg.metadata.promptSource).toBe('fallback');
      expect(callArg.metadata.promptVersion).toBe('fallback');
      expect(callArg.metadata.promptName).toBe(RECOMMENDATION_PROMPT_NAME);
    });

    it('passes promptSource: "langfuse" and numeric version to Gemini metadata when getPrompt returns managed prompt', async () => {
      langfuseServiceMock.getPrompt.mockResolvedValue({
        template: RECOMMENDATION_FALLBACK_TEMPLATE,
        version: 5,
        source: 'langfuse',
      });
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const callArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      expect(callArg.metadata.promptSource).toBe('langfuse');
      expect(callArg.metadata.promptVersion).toBe(5);
    });

    it('recommendation flow still succeeds when getPrompt returns fallback (Langfuse disabled)', async () => {
      langfuseServiceMock.getPrompt.mockResolvedValue({
        template: RECOMMENDATION_FALLBACK_TEMPLATE,
        version: 'fallback',
        source: 'fallback',
      });
      langfuseServiceMock.trace.mockReturnValue(new NoopLangfuseTrace());
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      const result = await service.generateRecommendation('test-event-uuid');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('getPrompt is called once per generateRecommendation invocation (before retry loop)', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      // Fail twice, succeed on 3rd — getPrompt should still be called exactly once
      geminiServiceMock.generateJsonContent
        .mockRejectedValueOnce(new Error('Transient'))
        .mockRejectedValueOnce(new Error('Transient'))
        .mockResolvedValueOnce(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      expect(langfuseServiceMock.getPrompt).toHaveBeenCalledTimes(1);
    });

    it('all retry attempt promptNames include the attempt number', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const calls = geminiServiceMock.generateJsonContent.mock.calls;
      expect(calls[0][0].promptName).toContain('attempt 1');
      expect(calls[1][0].promptName).toContain('attempt 2');
      expect(calls[2][0].promptName).toContain('attempt 3');
    });
  });

  // -------------------------------------------------------------------------
  // compileTemplate helper unit tests
  // -------------------------------------------------------------------------
  describe('compileTemplate()', () => {
    it('substitutes all {{variable}} placeholders', () => {
      const template = 'Hello {{name}}, you are in {{city}}.';
      const result = compileTemplate(template, { name: 'Alice', city: 'Paris' });
      expect(result).toBe('Hello Alice, you are in Paris.');
    });

    it('replaces unknown placeholders with empty string (no "undefined" leakage)', () => {
      const template = 'Hello {{name}} and {{unknown}}.';
      const result = compileTemplate(template, { name: 'Bob' });
      expect(result).not.toContain('undefined');
      expect(result).toBe('Hello Bob and .');
    });

    it('handles templates with no placeholders', () => {
      const template = 'Static text only.';
      const result = compileTemplate(template, {});
      expect(result).toBe('Static text only.');
    });
  });

  // -------------------------------------------------------------------------
  // Context builder integration — preferences audit (maintained from Phase 2)
  // -------------------------------------------------------------------------
  describe('prompt preferences audit', () => {
    it('GeminiService receives a prompt compiled from the context (includes preferences)', async () => {
      // Make the real context builder available for this test by letting the
      // mock pass through to a real build call on a real builder instance.
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any) => realBuilder.build(input, answers),
      );
      slideAnswerServiceMock.getEventAnswers.mockResolvedValue([
        { question: 'Vibe', answerValue: 'Lively' },
      ]);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const geminiCallArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      const prompt: string = geminiCallArg.prompt;
      expect(prompt).toContain('Lively');
      expect(prompt).toContain('Vibe');
    });

    it('GeminiService receives the no-preferences fallback when no answers exist', async () => {
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any) => realBuilder.build(input, answers),
      );
      slideAnswerServiceMock.getEventAnswers.mockResolvedValue([]);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const geminiCallArg = geminiServiceMock.generateJsonContent.mock.calls[0][0];
      const prompt: string = geminiCallArg.prompt;
      expect(prompt).toContain('No explicit user preferences were provided.');
    });

    it('retrieve-user-preferences span still contains only answersCount', async () => {
      slideAnswerServiceMock.getEventAnswers.mockResolvedValue([
        { question: 'Vibe', answerValue: 'Relaxed' },
        { question: 'Budget', answerValue: 'Low' },
      ]);
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      await service.generateRecommendation('test-event-uuid');

      const retrievalSpan = (mockTrace.span as jest.Mock).mock.results[0].value as ILangfuseSpan;
      const endCall = (retrievalSpan.end as jest.Mock).mock.calls[0][0];

      expect(endCall.output).toEqual({ answersCount: 2 });
      const serialized = JSON.stringify(endCall);
      expect(serialized).not.toContain('Relaxed');
      expect(serialized).not.toContain('answerValue');
      expect(serialized).not.toContain('question');
    });

    it('changing user answers produces a different prompt', async () => {
      const realBuilder = new RecommendationPromptContextBuilder();
      promptContextBuilderMock.build.mockImplementation(
        (input: any, answers: any) => realBuilder.build(input, answers),
      );
      eventRepositoryMock.findOne.mockResolvedValue(makeEvent());
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);

      slideAnswerServiceMock.getEventAnswers.mockResolvedValueOnce([
        { question: 'Vibe', answerValue: 'Relaxed' },
      ]);
      await service.generateRecommendation('test-event-uuid');
      const promptA: string = geminiServiceMock.generateJsonContent.mock.calls[0][0].prompt;

      slideAnswerServiceMock.getEventAnswers.mockResolvedValueOnce([
        { question: 'Vibe', answerValue: 'Energetic' },
      ]);
      geminiServiceMock.generateJsonContent.mockResolvedValue(threeRecommendations);
      await service.generateRecommendation('test-event-uuid');
      const promptB: string = geminiServiceMock.generateJsonContent.mock.calls[1][0].prompt;

      expect(promptA).not.toBe(promptB);
      expect(promptA).toContain('Relaxed');
      expect(promptB).toContain('Energetic');
    });
  });
});
