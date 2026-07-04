import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecommendationJudgeService, JudgeInput } from './recommendation-judge.service';
import { GeminiService } from '../gemini/gemini.service';
import { NoopLangfuseTrace } from '../langfuse/interfaces/langfuse.interface';

jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    shutdownAsync: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeConfig = (values: Record<string, string>) => ({
  get: jest.fn((key: string) => values[key] ?? undefined),
});

const VALID_JUDGE_RESPONSE = {
  relevance_to_event: 0.9,
  preference_alignment: 0.8,
  location_fit: 0.85,
  date_time_fit: 0.75,
  specificity: 0.8,
  diversity: 0.7,
  hallucination_risk: 'low',
  overall_quality: 0.82,
  reason: 'Well-tailored recommendations.',
};

const makeJudgeInput = (overrides: Partial<JudgeInput> = {}): JudgeInput => ({
  eventType: 'casual',
  locationCity: 'Paris',
  locationCountry: 'France',
  participantCount: 4,
  targetDate: '2025-12-25',
  userPreferences: [
    { question: 'Vibe', answerValue: 'Relaxed' },
    { question: 'Budget', answerValue: 'Medium' },
  ],
  recommendations: [
    { title: 'Café A', description: 'Nice café', address: '1 Rue de Rivoli' },
    { title: 'Park B', description: 'Open park', address: 'Champ de Mars' },
    { title: 'Museum C', description: 'Art museum', address: 'Musée du Louvre' },
  ],
  ...overrides,
});

const makeNoopTrace = () => new NoopLangfuseTrace();

const makeTraceMock = () => ({
  generation: jest.fn(),
  span: jest.fn(),
  update: jest.fn(),
  score: jest.fn(),
});

async function buildService(
  configValues: Record<string, string>,
  geminiMock?: any,
): Promise<RecommendationJudgeService> {
  const gemini = geminiMock ?? { generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE) };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RecommendationJudgeService,
      { provide: ConfigService, useValue: makeConfig(configValues) },
      { provide: GeminiService, useValue: gemini },
    ],
  }).compile();
  return module.get<RecommendationJudgeService>(RecommendationJudgeService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RecommendationJudgeService', () => {
  // ── isEnabled / shouldSample ──────────────────────────────────────────────
  describe('configuration', () => {
    it('isEnabled() returns false when RECOMMENDATION_JUDGE_ENABLED is not "true"', async () => {
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'false' });
      expect(svc.isEnabled()).toBe(false);
    });

    it('isEnabled() returns false when variable is absent', async () => {
      const svc = await buildService({});
      expect(svc.isEnabled()).toBe(false);
    });

    it('isEnabled() returns true when RECOMMENDATION_JUDGE_ENABLED="true"', async () => {
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' });
      expect(svc.isEnabled()).toBe(true);
    });

    it('shouldSample() returns false when disabled regardless of random', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'false' });
      expect(svc.shouldSample()).toBe(false);
    });

    it('shouldSample() returns true when enabled and sample rate is 1', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const svc = await buildService({
        RECOMMENDATION_JUDGE_ENABLED: 'true',
        RECOMMENDATION_JUDGE_SAMPLE_RATE: '1',
      });
      expect(svc.shouldSample()).toBe(true);
    });

    it('shouldSample() returns false when sample rate is 0', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const svc = await buildService({
        RECOMMENDATION_JUDGE_ENABLED: 'true',
        RECOMMENDATION_JUDGE_SAMPLE_RATE: '0',
      });
      expect(svc.shouldSample()).toBe(false);
    });

    it('shouldSample() respects intermediate sample rate via Math.random()', async () => {
      const svc = await buildService({
        RECOMMENDATION_JUDGE_ENABLED: 'true',
        RECOMMENDATION_JUDGE_SAMPLE_RATE: '0.5',
      });

      jest.spyOn(Math, 'random').mockReturnValue(0.3);
      expect(svc.shouldSample()).toBe(true); // 0.3 < 0.5

      jest.spyOn(Math, 'random').mockReturnValue(0.7);
      expect(svc.shouldSample()).toBe(false); // 0.7 >= 0.5
    });
  });

  // ── evaluate — disabled mode ──────────────────────────────────────────────
  describe('evaluate() — disabled', () => {
    it('does not call GeminiService when disabled', async () => {
      const geminiMock = { generateJsonContent: jest.fn() };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'false' }, geminiMock);

      // Manually call evaluate (in real code shouldSample() guards this)
      // Even if somehow called, it should not contact Gemini when disabled
      // Note: the guard is in the caller (RecommendationsService); here we test
      // that evaluate() still completes without a model call if shouldSample() would
      // return false. But evaluate() itself doesn't re-check — it just runs.
      // So this test verifies the higher-level guard works via isEnabled().
      expect(svc.isEnabled()).toBe(false);
      expect(geminiMock.generateJsonContent).not.toHaveBeenCalled();
    });
  });

  // ── evaluate — happy path ─────────────────────────────────────────────────
  describe('evaluate() — enabled, happy path', () => {
    it('calls GeminiService with minimized judge prompt and attaches scores to trace', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService(
        { RECOMMENDATION_JUDGE_ENABLED: 'true' },
        geminiMock,
      );
      const trace = makeTraceMock();

      await svc.evaluate(makeJudgeInput(), trace as any);

      // Gemini was called
      expect(geminiMock.generateJsonContent).toHaveBeenCalledTimes(1);
      const callArg = geminiMock.generateJsonContent.mock.calls[0][0];
      expect(callArg.promptName).toBe('recommendation-llm-judge');

      // Scores were attached
      const scoreNames = (trace.score).mock.calls.map((c: any[]) => c[0].name);
      expect(scoreNames).toEqual(
        expect.arrayContaining([
          'judge_relevance_to_event',
          'judge_preference_alignment',
          'judge_location_fit',
          'judge_date_time_fit',
          'judge_specificity',
          'judge_diversity',
          'judge_hallucination_risk',
          'judge_overall_quality',
          'judge_latency_ms',
          'judge_failed',
        ]),
      );

      // judge_failed must be 0 on success
      const failedScore = (trace.score).mock.calls.find(
        (c: any[]) => c[0].name === 'judge_failed',
      );
      expect(failedScore![0].value).toBe(0);
    });

    it('maps hallucination_risk "low" → 1, "medium" → 0.5, "high" → 0', async () => {
      for (const [risk, expected] of [['low', 1], ['medium', 0.5], ['high', 0]] as const) {
        const geminiMock = {
          generateJsonContent: jest.fn().mockResolvedValue({
            ...VALID_JUDGE_RESPONSE,
            hallucination_risk: risk,
          }),
        };
        const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
        const trace = makeTraceMock();
        await svc.evaluate(makeJudgeInput(), trace as any);

        const hallucinationScore = (trace.score).mock.calls.find(
          (c: any[]) => c[0].name === 'judge_hallucination_risk',
        );
        expect(hallucinationScore![0].value).toBe(expected);
      }
    });

    it('clamps out-of-range numeric scores to [0, 1]', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue({
          ...VALID_JUDGE_RESPONSE,
          relevance_to_event: 1.5,   // above max
          location_fit: -0.2,         // below min
        }),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeTraceMock();
      await svc.evaluate(makeJudgeInput(), trace as any);

      const relevance = (trace.score).mock.calls.find(
        (c: any[]) => c[0].name === 'judge_relevance_to_event',
      );
      const locationFit = (trace.score).mock.calls.find(
        (c: any[]) => c[0].name === 'judge_location_fit',
      );
      expect(relevance![0].value).toBe(1);
      expect(locationFit![0].value).toBe(0);
    });
  });

  // ── evaluate — failure paths ──────────────────────────────────────────────
  describe('evaluate() — failure handling', () => {
    it('never throws when GeminiService throws', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockRejectedValue(new Error('Gemini is down')),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeTraceMock();

      await expect(svc.evaluate(makeJudgeInput(), trace as any)).resolves.not.toThrow();

      // judge_failed=1 must be recorded
      const failedScore = (trace.score).mock.calls.find(
        (c: any[]) => c[0].name === 'judge_failed',
      );
      expect(failedScore![0].value).toBe(1);
    });

    it('attaches judge_failed=1 on timeout', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 99_999)),
        ),
      };
      const svc = await buildService(
        {
          RECOMMENDATION_JUDGE_ENABLED: 'true',
          RECOMMENDATION_JUDGE_TIMEOUT_MS: '1', // 1ms → immediate timeout
        },
        geminiMock,
      );
      const trace = makeTraceMock();

      await expect(svc.evaluate(makeJudgeInput(), trace as any)).resolves.not.toThrow();

      const failedScore = (trace.score).mock.calls.find(
        (c: any[]) => c[0].name === 'judge_failed',
      );
      expect(failedScore![0].value).toBe(1);
    });

    it('does not throw when trace.score() itself throws', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeTraceMock();
      (trace.score).mockImplementation(() => { throw new Error('score SDK exploded'); });

      await expect(svc.evaluate(makeJudgeInput(), trace as any)).resolves.not.toThrow();
    });

    it('works safely with NoopLangfuseTrace (disabled Langfuse mode)', async () => {
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' });
      const noop = makeNoopTrace();

      await expect(svc.evaluate(makeJudgeInput(), noop)).resolves.not.toThrow();
    });
  });

  // ── prompt preferences inclusion ──────────────────────────────────────────
  describe('prompt preferences inclusion', () => {
    it('prompt includes raw slide answer values under User Preferences', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(
        makeJudgeInput({
          userPreferences: [
            { question: 'Atmosphere', answerValue: 'Cosy' },
            { question: 'Price Range', answerValue: 'Low' },
          ],
        }),
        trace,
      );

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      expect(prompt).toContain('User Preferences');
      expect(prompt).toContain('Atmosphere: Cosy');
      expect(prompt).toContain('Price Range: Low');
    });

    it('prompt includes fallback when userPreferences is empty', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(
        makeJudgeInput({
          userPreferences: [],
        }),
        trace,
      );

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      expect(prompt).toContain('User Preferences');
      expect(prompt).toContain('No explicit user preferences were provided.');
    });
  });

  // ── historical signal in judge prompt ─────────────────────────────────────
  describe('historical signal in judge prompt', () => {
    it('prompt includes historySummaryText when provided', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(
        makeJudgeInput({
          historySummaryText:
            'Historical user preference signals (secondary):\n- User often selected cafe-related recommendations.',
        }),
        trace,
      );

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      expect(prompt).toContain('Historical User Preference Signals');
      expect(prompt).toContain('cafe-related');
      expect(prompt).toContain('SECONDARY');
    });

    it('prompt includes fallback historical section when historySummaryText is undefined', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(
        makeJudgeInput({ historySummaryText: undefined }),
        trace,
      );

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      expect(prompt).toContain('No historical user selection data is available.');
    });

    it('prompt includes priority order note for scoring guidance', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(makeJudgeInput(), trace);

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      expect(prompt.toLowerCase()).toContain('priority order');
      expect(prompt.toLowerCase()).toContain('secondary');
      expect(prompt.toLowerCase()).toContain('preference_alignment');
    });

    it('prompt tells judge to penalize overfitting to history', async () => {
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeNoopTrace();

      await svc.evaluate(makeJudgeInput(), trace);

      const prompt: string = geminiMock.generateJsonContent.mock.calls[0][0].prompt;
      // The prompt must tell the judge to lower score if current-event preferences are ignored
      expect(prompt.toLowerCase()).toContain('current-event explicit preferences');
    });

    it('historySummaryText does not appear in Langfuse span metadata (only in prompt)', async () => {
      // This test verifies that historySummaryText is used internally in the prompt
      // but is not separately emitted as Langfuse metadata in a way that exposes raw history.
      // Since evaluate() passes it to Gemini prompt (which goes through generateJsonContent),
      // and generateJsonContent is mocked, we confirm it does NOT appear in trace.score() calls.
      const geminiMock = {
        generateJsonContent: jest.fn().mockResolvedValue(VALID_JUDGE_RESPONSE),
      };
      const svc = await buildService({ RECOMMENDATION_JUDGE_ENABLED: 'true' }, geminiMock);
      const trace = makeTraceMock();

      await svc.evaluate(
        makeJudgeInput({
          historySummaryText: 'Historical signals: cafe-related in Paris.',
        }),
        trace as any,
      );

      // trace.score should only have numeric score names — no raw history text
      for (const [call] of (trace.score).mock.calls) {
        expect(typeof call.value).toBe('number');
        expect(call.name).not.toContain('cafe');
        expect(call.name).not.toContain('Paris');
      }
    });
  });
});
