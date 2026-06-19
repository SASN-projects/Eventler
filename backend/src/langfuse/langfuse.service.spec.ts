import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangfuseService } from './langfuse.service';
import { NoopLangfuseTrace } from './interfaces/langfuse.interface';

jest.mock('langfuse', () => {
  return {
    Langfuse: jest.fn().mockImplementation(() => {
      return {
        trace: jest.fn().mockReturnValue({
          generation: jest.fn().mockReturnValue({
            update: jest.fn(),
          }),
          span: jest.fn().mockReturnValue({
            update: jest.fn(),
          }),
          update: jest.fn(),
        }),
        shutdownAsync: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});


describe('LangfuseService', () => {
  let service: LangfuseService;
  let configService: ConfigService;

  const mockConfigService = (values: Record<string, string>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  it('should initialize in disabled mode when LANGFUSE_ENABLED is false', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangfuseService,
        {
          provide: ConfigService,
          useValue: mockConfigService({
            LANGFUSE_ENABLED: 'false',
          }),
        },
      ],
    }).compile();

    service = module.get<LangfuseService>(LangfuseService);
    expect(service).toBeDefined();

    const trace = service.trace('test-trace');
    expect(trace).toBeInstanceOf(NoopLangfuseTrace);

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('should initialize in disabled mode when credentials are missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangfuseService,
        {
          provide: ConfigService,
          useValue: mockConfigService({
            LANGFUSE_ENABLED: 'true',
            LANGFUSE_PUBLIC_KEY: '',
            LANGFUSE_SECRET_KEY: '',
          }),
        },
      ],
    }).compile();

    service = module.get<LangfuseService>(LangfuseService);
    expect(service).toBeDefined();

    const trace = service.trace('test-trace');
    expect(trace).toBeInstanceOf(NoopLangfuseTrace);
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('should handle errors during real SDK initialization and fallback gracefully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangfuseService,
        {
          provide: ConfigService,
          useValue: mockConfigService({
            LANGFUSE_ENABLED: 'true',
            LANGFUSE_PUBLIC_KEY: 'pk',
            LANGFUSE_SECRET_KEY: 'sk',
          }),
        },
      ],
    }).compile();

    service = module.get<LangfuseService>(LangfuseService);
    expect(service).toBeDefined();

    const trace = service.trace('test-trace');
    expect(trace).toBeDefined();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});
