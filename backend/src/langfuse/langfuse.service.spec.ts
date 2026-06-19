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
    MockedLangfuse.mockImplementation(() => makeFakeClient() as any);
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
      MockedLangfuse.mockImplementation(() => bustedClient as any);

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
      MockedLangfuse.mockImplementation(() => fakeClient as any);

      const service = await buildService({
        LANGFUSE_ENABLED: 'true',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
      });

      await service.onModuleDestroy();
      expect(fakeClient.shutdownAsync).toHaveBeenCalledTimes(1);
    });
  });
});
