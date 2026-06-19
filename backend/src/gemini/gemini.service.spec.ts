import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { ILangfuseTrace, ILangfuseGeneration } from '../langfuse/interfaces/langfuse.interface';
import { sanitizeData } from '../langfuse/utils/redact';

jest.mock('langfuse', () => {
  return {
    Langfuse: jest.fn().mockImplementation(() => {
      return {
        trace: jest.fn(),
        shutdownAsync: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});


jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue(
                JSON.stringify({
                  recommendedEvents: [
                    {
                      title: 'Test Event',
                      description: 'Test Desc',
                      address: '123 Test St',
                      password: 'secret_value', // should be redacted in trace
                    },
                  ],
                })
              ),
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 20,
                totalTokenCount: 30,
              },
            },
          }),
        }),
      };
    }),
  };
});

describe('GeminiService', () => {
  let service: GeminiService;

  const mockConfigService = (apiKey?: string) => ({
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_API_KEY') return apiKey;
      if (key === 'GOOGLE_GEMINI_MODEL') return 'gemini-2.5-flash';
      return undefined;
    }),
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
    } as any;
  };

  it('should throw when GOOGLE_API_KEY is not defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: mockConfigService(undefined),
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);

    await expect(
      service.generateJsonContent({
        prompt: 'test prompt',
        responseSchema: {} as any,
      })
    ).rejects.toThrow('GOOGLE_API_KEY is required for Gemini integration.');
  });

  it('should call Gemini SDK, report usage, and log to Langfuse trace', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: mockConfigService('fake-api-key'),
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    const mockTrace = createMockTrace();

    const response = await service.generateJsonContent<{ recommendedEvents: any[] }>({
      prompt: 'test prompt with sensitive info like secret_key',
      responseSchema: {} as any,
      parentTrace: mockTrace,
      promptName: 'test-prompt',
      promptVersion: '1.0.0',
    });

    expect(response).toBeDefined();
    expect(response.recommendedEvents).toHaveLength(1);
    expect(response.recommendedEvents[0].title).toBe('Test Event');

    // Verify tracing was called
    expect(mockTrace.generation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-prompt',
        model: 'gemini-2.5-flash',
        input: 'test prompt with sensitive info like secret_key',
      })
    );

    const generationInstance = mockTrace.generation({} as any);
    expect(generationInstance.end).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      })
    );
  });

  describe('Redaction and Sanitization utility', () => {
    it('should recursively redact sensitive fields', () => {
      const data = {
        apiKey: 'AIzaSyExampleKey',
        user: {
          username: 'john_doe',
          password: 'super_secret_password',
          cookie: 'session=123',
          otherVal: 'regular_value',
        },
        items: [
          { name: 'regular_item' },
          { token: 'bearer-token-val' },
        ],
      };

      const sanitized = sanitizeData(data);

      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.cookie).toBe('[REDACTED]');
      expect(sanitized.user.otherVal).toBe('regular_value');
      expect(sanitized.items[1].token).toBe('[REDACTED]');
      expect(sanitized.user.username).toBe('john_doe');
      expect(sanitized.items[0].name).toBe('regular_item');
    });
  });
});
