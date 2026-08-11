import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService, classifyGeminiError } from './gemini.service';
import { ILangfuseTrace, ILangfuseGeneration } from '../langfuse/interfaces/langfuse.interface';
import { sanitizeData } from '../langfuse/utils/redact';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    shutdownAsync: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockGenerateContent = jest.fn();
/** Model names passed to getGenerativeModel, in call order. */
const requestedModels: string[] = [];

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(({ model }: { model: string }) => {
      requestedModels.push(model);
      return { generateContent: mockGenerateContent };
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const successfulApiResponse = (jsonPayload: object) => ({
  response: {
    text: jest.fn().mockReturnValue(JSON.stringify(jsonPayload)),
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30,
    },
  },
});

const mockConfigService = (apiKey?: string, fallbackModel?: string) => ({
  get: jest.fn((key: string) => {
    if (key === 'GOOGLE_API_KEY') return apiKey;
    if (key === 'GOOGLE_GEMINI_MODEL') return 'gemini-2.5-flash';
    if (key === 'GEMINI_FALLBACK_MODEL') return fallbackModel;
    return undefined;
  }),
});

/** A 429 shaped like the quota errors the Gemini API actually returns. */
const rateLimitError = () =>
  Object.assign(new Error('[429] Quota exceeded for metric: generate_content_free_tier_requests'), {
    status: 429,
  });

const createMockTrace = (): ILangfuseTrace => {
  const generationMock: ILangfuseGeneration = {
    update: jest.fn(),
    end: jest.fn(),
  };
  return {
    generation: jest.fn().mockReturnValue(generationMock),
    span: jest.fn(),
    update: jest.fn(),
    score: jest.fn(),
  } as any;
};

async function buildService(apiKey?: string, fallbackModel?: string): Promise<GeminiService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GeminiService,
      { provide: ConfigService, useValue: mockConfigService(apiKey, fallbackModel) },
    ],
  }).compile();
  return module.get<GeminiService>(GeminiService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GeminiService', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    requestedModels.length = 0;
  });

  // -------------------------------------------------------------------------
  // Model fallback
  //
  // Regression cover: the Places search plan and the home feed call this method
  // without pinning a model. Before the fallback existed here, one quota-exhausted
  // model took both of those paths down completely.
  // -------------------------------------------------------------------------
  describe('model fallback', () => {
    it('retries on the fallback model when the default model is rate limited', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError())
        .mockResolvedValueOnce(successfulApiResponse({ queries: [{ textQuery: 'sushi' }] }));

      const service = await buildService('fake-api-key', 'gemini-2.5-flash-lite');

      const response = await service.generateJsonContent<{ queries: any[] }>({
        prompt: 'plan searches',
        responseSchema: {} as any,
      });

      expect(response.queries).toHaveLength(1);
      expect(requestedModels).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
    });

    it('does not fall back when the caller pinned an explicit model', async () => {
      mockGenerateContent.mockRejectedValue(rateLimitError());

      const service = await buildService('fake-api-key', 'gemini-2.5-flash-lite');

      await expect(
        service.generateJsonContent({
          prompt: 'judge this',
          responseSchema: {} as any,
          modelName: 'gemini-2.5-flash-lite',
        }),
      ).rejects.toThrow(/Quota exceeded/);

      expect(requestedModels).toEqual(['gemini-2.5-flash-lite']);
    });

    it('does not fall back on a non-retryable error', async () => {
      mockGenerateContent.mockRejectedValue(
        Object.assign(new Error('API key not valid'), { status: 400 }),
      );

      const service = await buildService('fake-api-key', 'gemini-2.5-flash-lite');

      await expect(
        service.generateJsonContent({ prompt: 'x', responseSchema: {} as any }),
      ).rejects.toThrow('API key not valid');

      expect(requestedModels).toEqual(['gemini-2.5-flash']);
    });

    it('propagates the error when no fallback model is configured', async () => {
      mockGenerateContent.mockRejectedValue(rateLimitError());

      const service = await buildService('fake-api-key');

      await expect(
        service.generateJsonContent({ prompt: 'x', responseSchema: {} as any }),
      ).rejects.toThrow(/Quota exceeded/);

      expect(requestedModels).toEqual(['gemini-2.5-flash']);
    });
  });

  // -------------------------------------------------------------------------
  // No API key
  // -------------------------------------------------------------------------
  it('should throw when GOOGLE_API_KEY is not defined', async () => {
    const service = await buildService(undefined);
    await expect(
      service.generateJsonContent({ prompt: 'test', responseSchema: {} as any }),
    ).rejects.toThrow('GOOGLE_API_KEY is required for Gemini integration.');
  });

  // -------------------------------------------------------------------------
  // Happy path — token reporting + tracing
  // -------------------------------------------------------------------------
  it('should call Gemini SDK, report usage, and log to Langfuse trace', async () => {
    mockGenerateContent.mockResolvedValue(
      successfulApiResponse({
        recommendedEvents: [
          { title: 'Test Event', description: 'Test Desc', address: '123 Test St' },
        ],
      }),
    );

    const service = await buildService('fake-api-key');
    const mockTrace = createMockTrace();

    const response = await service.generateJsonContent<{ recommendedEvents: any[] }>({
      prompt: 'test prompt',
      responseSchema: {} as any,
      parentTrace: mockTrace,
      promptName: 'test-prompt',
      promptVersion: '1.0.0',
    });

    expect(response.recommendedEvents).toHaveLength(1);
    expect(response.recommendedEvents[0].title).toBe('Test Event');

    // generation() called with correct params
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockTrace.generation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-prompt',
        model: 'gemini-2.5-flash',
        input: 'test prompt',
      }),
    );

    // Retrieve the generation instance the service received and check end()
    const generationInstance = (mockTrace.generation as jest.Mock).mock.results[0].value as ILangfuseGeneration;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(generationInstance.end).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Generation failure — item 9: generation failure + item 6: error re-thrown
  // -------------------------------------------------------------------------
  describe('LLM failure handling', () => {
    it('records ERROR level on generation and re-throws to caller', async () => {
      mockGenerateContent.mockRejectedValue(new Error('upstream API down'));

      const service = await buildService('fake-api-key');
      const mockTrace = createMockTrace();

      await expect(
        service.generateJsonContent({
          prompt: 'test',
          responseSchema: {} as any,
          parentTrace: mockTrace,
          promptName: 'failing-prompt',
        }),
      ).rejects.toThrow('upstream API down');

      // generation.end() must have been called with ERROR level
      const generationInstance = (mockTrace.generation as jest.Mock).mock.results[0].value as ILangfuseGeneration;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(generationInstance.end).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          statusMessage: 'upstream API down',
        }),
      );
    });

    it('still throws even without a parentTrace (no trace crash)', async () => {
      mockGenerateContent.mockRejectedValue(new Error('no trace error'));

      const service = await buildService('fake-api-key');

      await expect(
        service.generateJsonContent({
          prompt: 'test',
          responseSchema: {} as any,
          // no parentTrace
        }),
      ).rejects.toThrow('no trace error');
    });
  });

  // -------------------------------------------------------------------------
  // Redaction and sanitization utility — item 9: nested redaction
  // -------------------------------------------------------------------------
  describe('sanitizeData utility', () => {
    it('redacts top-level sensitive keys', () => {
      const data = {
        apiKey: 'AIzaSyExampleKey',
        password: 'super_secret',
        token: 'bearer-xyz',
      };
      const sanitized = sanitizeData(data);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('recursively redacts nested sensitive fields', () => {
      const data = {
        user: {
          username: 'john_doe',
          password: 'super_secret',
          cookie: 'session=123',
          profile: {
            displayName: 'John',
            secretAnswer: 'blue', // "secret" token → redacted
          },
        },
        items: [
          { name: 'regular_item' },
          { token: 'bearer-token-val' },
        ],
      };
      const sanitized = sanitizeData(data);

      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.cookie).toBe('[REDACTED]');
      expect(sanitized.user.profile.secretAnswer).toBe('[REDACTED]');
      expect(sanitized.user.username).toBe('john_doe');
      expect(sanitized.user.profile.displayName).toBe('John');
      expect(sanitized.items[1].token).toBe('[REDACTED]');
      expect(sanitized.items[0].name).toBe('regular_item');
    });

    it('does NOT redact generic fields that merely contain a sensitive substring', () => {
      // "monkey" contains "key" as substring — must NOT be redacted
      const data = {
        monkey: 'fun animal',
        donkey: 'another animal',
        marketCategory: 'electronics', // "category" has no sensitive token
      };
      const sanitized = sanitizeData(data);
      expect(sanitized.monkey).toBe('fun animal');
      expect(sanitized.donkey).toBe('another animal');
      expect(sanitized.marketCategory).toBe('electronics');
    });

    it('does redact camelCase and snake_case variants of sensitive words', () => {
      const data = {
        apiKey: 'should-redact',         // tokens: ['api', 'key']
        API_KEY: 'should-redact',        // tokens: ['api', 'key']
        secretToken: 'should-redact',    // tokens: ['secret', 'token']
        user_password: 'should-redact',  // tokens: ['user', 'password']
      };
      const sanitized = sanitizeData(data);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.API_KEY).toBe('[REDACTED]');
      expect(sanitized.secretToken).toBe('[REDACTED]');
      expect(sanitized.user_password).toBe('[REDACTED]');
    });

    it('handles circular references without throwing', () => {
      const obj: any = { name: 'root' };
      obj.self = obj;
      const sanitized = sanitizeData(obj);
      expect(sanitized.name).toBe('root');
      expect(sanitized.self).toBe('[Circular Reference]');
    });

    it('handles null and undefined gracefully', () => {
      expect(sanitizeData(null)).toBeNull();
      expect(sanitizeData(undefined)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error Classification Tests
  // -------------------------------------------------------------------------
  describe('classifyGeminiError', () => {
    it('classifies 503 Service Unavailable / high demand as retryable', () => {
      const err = new Error('503 Service Unavailable: This model is currently experiencing high demand.');
      (err as any).status = 503;
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(true);
      expect(classified.errorCode).toBe('PROVIDER_TEMPORARILY_UNAVAILABLE');
      expect(classified.providerUnavailable).toBe(true);
      expect(classified.statusCode).toBe(503);
    });

    it('classifies 429 Rate Limit / Resource Exhausted as retryable', () => {
      const err = new Error('429 Resource Exhausted: Rate limit exceeded');
      (err as any).status = 429;
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(true);
      expect(classified.errorCode).toBe('PROVIDER_RATE_LIMIT');
      expect(classified.providerUnavailable).toBe(true);
    });

    it('classifies network timeouts and fetch failures as retryable', () => {
      const err = new Error('request to https://generativelanguage.googleapis.com failed, reason: fetch failed ETIMEDOUT');
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(true);
      expect(classified.errorCode).toBe('PROVIDER_NETWORK_TIMEOUT');
      expect(classified.providerUnavailable).toBe(true);
    });

    it('classifies 500 server errors as retryable', () => {
      const err = new Error('Internal server error');
      (err as any).status = 500;
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(true);
      expect(classified.errorCode).toBe('PROVIDER_SERVER_ERROR');
    });

    it('classifies 401/403 auth errors as non-retryable', () => {
      const err = new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.');
      (err as any).status = 400;
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(false);
      expect(classified.errorCode).toBe('PROVIDER_AUTH_ERROR');
      expect(classified.providerUnavailable).toBe(false);
    });

    it('classifies 400 bad request / invalid argument as non-retryable', () => {
      const err = new Error('Invalid argument: prompt exceeds context limit');
      (err as any).status = 400;
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(false);
      expect(classified.errorCode).toBe('PROVIDER_INVALID_REQUEST');
    });

    it('classifies safety blocks as non-retryable', () => {
      const err = new Error('Candidate was blocked due to SAFETY');
      const classified = classifyGeminiError(err);

      expect(classified.isRetryable).toBe(false);
      expect(classified.errorCode).toBe('PROVIDER_SAFETY_BLOCKED');
    });
  });
});
