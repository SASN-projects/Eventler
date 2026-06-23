import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangfuseService } from './langfuse.service';
import { NoopLangfuseTrace } from './interfaces/langfuse.interface';

// ---------------------------------------------------------------------------
// Base mock factory — returns a fully-functioning fake Langfuse client.
// Individual tests override parts of it as needed.
// ---------------------------------------------------------------------------
const makeFakeClient = (overrides: Partial<ReturnType<typeof makeFakeClient>> = {}) => ({
  trace: jest.fn().mockReturnValue({
    generation: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
    span: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
    update: jest.fn(),
  }),
  getPrompt: jest.fn().mockResolvedValue({
    prompt: 'Hello {{name}}',
    version: 3,
    isFallback: false,
  }),
  shutdownAsync: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

jest.mock('langfuse', () => {
  return {
    // The constructor mock is replaced per-test where necessary via
    // jest.mocked(Langfuse).mockImplementation(...) — but we need a default.
    Langfuse: jest.fn().mockImplementation(() => makeFakeClient()),
  };
});

// Grab a typed reference to the mocked constructor after jest.mock hoisting.
import { Langfuse } from 'langfuse';
const MockedLangfuse = Langfuse as jest.MockedClass<typeof Langfuse>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockConfigService = (values: Record<string, string>) => ({
  get: jest.fn((key: string) => values[key]),
});

async function buildService(configValues: Record<string, string>): Promise<LangfuseService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      LangfuseService,
      { provide: ConfigService, useValue: mockConfigService(configValues) },
    ],
  }).compile();
  return module.get<LangfuseService>(LangfuseService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LangfuseService', () => {
  beforeEach(() => {
    MockedLangfuse.mockClear();
    // Reset to default successful implementation before each test.
    MockedLangfuse.mockImplementation(() => makeFakeClient());
  });

  // -------------------------------------------------------------------------
  // Disabled-mode tests (items 9 — disabled mode, missing credentials)
  // -------------------------------------------------------------------------
  describe('disabled mode', () => {
    it('returns NoopLangfuseTrace when LANGFUSE_ENABLED is false', async () => {
      const service = await buildService({ LANGFUSE_ENABLED: 'false' });

      expect(MockedLangfuse).not.toHaveBeenCalled();
      expect(service.trace('test')).toBeInstanceOf(NoopLangfuseTrace);
    });

    it('returns NoopLangfuseTrace when credentials are missing', async () => {
      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: '',
        LANGFUSE_SECRET_KEY: '',
      });

      expect(MockedLangfuse).not.toHaveBeenCalled();
      expect(service.trace('test')).toBeInstanceOf(NoopLangfuseTrace);
    });

    it('onModuleDestroy resolves without throwing when disabled', async () => {
      const service = await buildService({ LANGFUSE_ENABLED: 'false' });
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // SDK initialization failure (item 9 — SDK failure)
  // -------------------------------------------------------------------------
  describe('SDK initialization failure', () => {
    it('falls back to disabled mode when Langfuse constructor throws', async () => {
      MockedLangfuse.mockImplementation(() => {
        throw new Error('SDK init boom');
      });

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      // isEnabled must be false → trace() returns Noop
      const trace = service.trace('test');
      expect(trace).toBeInstanceOf(NoopLangfuseTrace);

      // onModuleDestroy must not throw (client was never assigned)
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Enabled mode — trace() call failure (item 9 — SDK failure at call time)
  // -------------------------------------------------------------------------
  describe('trace() runtime failure', () => {
    it('returns NoopLangfuseTrace when the SDK trace() call throws', async () => {
      const bustedClient = makeFakeClient({
        trace: jest.fn().mockImplementation(() => {
          throw new Error('trace() exploded');
        }),
      });
      MockedLangfuse.mockImplementation(() => bustedClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      // trace() must swallow the error and return a Noop
      const trace = service.trace('my-trace');
      expect(trace).toBeInstanceOf(NoopLangfuseTrace);
    });
  });

  // -------------------------------------------------------------------------
  // Enabled mode — happy path sanity check
  // -------------------------------------------------------------------------
  describe('enabled mode', () => {
    it('initializes the SDK and returns a real trace wrapper', async () => {
      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      expect(MockedLangfuse).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: 'pk-test', secretKey: 'sk-test' }),
      );

      const trace = service.trace('my-trace', { userId: 'u1', sessionId: 's1' });
      expect(trace).toBeDefined();
      expect(trace).not.toBeInstanceOf(NoopLangfuseTrace);
    });

    it('calls shutdownAsync on module destroy', async () => {
      const fakeClient = makeFakeClient();
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      await service.onModuleDestroy();
      expect(fakeClient.shutdownAsync).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // score() method tests
  // -------------------------------------------------------------------------
  describe('trace.score()', () => {
    it('delegates to the SDK score() function in enabled mode', async () => {
      const fakeTraceClient = {
        generation: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
        span: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
        update: jest.fn(),
        score: jest.fn(),
      };
      const fakeClient = makeFakeClient({
        trace: jest.fn().mockReturnValue(fakeTraceClient),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      const trace = service.trace('test-trace');
      trace.score({ name: 'json_validity', value: 1 });

      expect(fakeTraceClient.score).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'json_validity', value: 1 }),
      );
    });

    it('score() is a no-op on NoopLangfuseTrace and does not throw', () => {
      const noop = new NoopLangfuseTrace();
      expect(() => noop.score({ name: 'any_metric', value: 0 })).not.toThrow();
    });

    it('swallows SDK score() errors and does not propagate them', async () => {
      const bustedTraceClient = {
        generation: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
        span: jest.fn().mockReturnValue({ update: jest.fn(), end: jest.fn() }),
        update: jest.fn(),
        score: jest.fn().mockImplementation(() => {
          throw new Error('score() SDK exploded');
        }),
      };
      const fakeClient = makeFakeClient({
        trace: jest.fn().mockReturnValue(bustedTraceClient),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      const trace = service.trace('test-trace');
      // Must not throw even though the underlying SDK call throws
      expect(() => trace.score({ name: 'schema_compliance', value: 0 })).not.toThrow();
    });

    it('score() in disabled mode returns without contacting the SDK', async () => {
      const service = await buildService({ LANGFUSE_ENABLED: 'false' });
      const trace = service.trace('noop-trace');

      // NoopLangfuseTrace.score() must be a complete no-op
      expect(() => trace.score({ name: 'any_metric', value: 1 })).not.toThrow();
      // SDK was never instantiated
      expect(MockedLangfuse).not.toHaveBeenCalled();
    });
  });
  // -------------------------------------------------------------------------
  // getPrompt() tests
  // -------------------------------------------------------------------------
  describe('getPrompt()', () => {
    const FALLBACK = 'FALLBACK_TEMPLATE';
    const PROMPT_NAME = 'event-recommendation-planner';

    it('returns source: "langfuse" and resolved version when enabled and SDK succeeds', async () => {
      const fakeClient = makeFakeClient({
        getPrompt: jest.fn().mockResolvedValue({
          prompt: 'Managed template {{eventCoreContext}}',
          version: 7,
          isFallback: false,
        }),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      const result = await service.getPrompt(PROMPT_NAME, FALLBACK);

      expect(result.source).toBe('langfuse');
      expect(result.version).toBe(7);
      expect(result.template).toBe('Managed template {{eventCoreContext}}');
      // SDK was called with the correct prompt name and default label
      expect(fakeClient.getPrompt).toHaveBeenCalledWith(
        PROMPT_NAME,
        undefined,
        { type: 'text', label: 'development' },
      );
    });

    it('passes optional version number to SDK getPrompt()', async () => {
      const fakeClient = makeFakeClient({
        getPrompt: jest.fn().mockResolvedValue({
          prompt: 'v2 template',
          version: 2,
          isFallback: false,
        }),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      await service.getPrompt(PROMPT_NAME, FALLBACK, 2);

      expect(fakeClient.getPrompt).toHaveBeenCalledWith(PROMPT_NAME, 2, { type: 'text', label: 'development' });
    });

    it('uses LANGFUSE_PROMPT_LABEL config when provided', async () => {
      const fakeClient = makeFakeClient();
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
        LANGFUSE_PROMPT_LABEL: 'production',
      });

      await service.getPrompt(PROMPT_NAME, FALLBACK);

      expect(fakeClient.getPrompt).toHaveBeenCalledWith(
        PROMPT_NAME,
        undefined,
        { type: 'text', label: 'production' },
      );
    });

    it('returns source: "fallback" when Langfuse is disabled', async () => {
      const service = await buildService({ LANGFUSE_ENABLED: 'false' });
      const result = await service.getPrompt(PROMPT_NAME, FALLBACK);

      expect(result.source).toBe('fallback');
      expect(result.template).toBe(FALLBACK);
      expect(result.version).toBe('fallback');
    });

    it('returns source: "fallback" when credentials are missing', async () => {
      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: '',
        LANGFUSE_SECRET_KEY: '',
      });
      const result = await service.getPrompt(PROMPT_NAME, FALLBACK);

      expect(result.source).toBe('fallback');
      expect(result.template).toBe(FALLBACK);
    });

    it('returns source: "fallback" when SDK getPrompt() throws', async () => {
      const fakeClient = makeFakeClient({
        getPrompt: jest.fn().mockRejectedValue(new Error('Prompt not found')),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      const result = await service.getPrompt(PROMPT_NAME, FALLBACK);

      expect(result.source).toBe('fallback');
      expect(result.template).toBe(FALLBACK);
      expect(result.version).toBe('fallback');
    });

    it('never throws even when SDK throws', async () => {
      const fakeClient = makeFakeClient({
        getPrompt: jest.fn().mockRejectedValue(new Error('Network timeout')),
      });
      MockedLangfuse.mockImplementation(() => fakeClient);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      await expect(service.getPrompt(PROMPT_NAME, FALLBACK)).resolves.not.toThrow();
    });

    it('returns source: "fallback" when SDK constructor throws (service disabled)', async () => {
      MockedLangfuse.mockImplementation(() => {
        throw new Error('SDK init boom');
      });

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      const result = await service.getPrompt(PROMPT_NAME, FALLBACK);
      expect(result.source).toBe('fallback');
    });
  });
});
