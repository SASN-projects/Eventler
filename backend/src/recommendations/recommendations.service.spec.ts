import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ILangfuseTrace, ILangfuseSpan } from '../langfuse/interfaces/langfuse.interface';

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


describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let eventRepositoryMock: any;
  let recommendationRepositoryMock: any;
  let slideAnswerServiceMock: any;
  let langfuseServiceMock: any;
  let geminiServiceMock: any;

  const mockTraceInstance = (): ILangfuseTrace => {
    const spanMock: ILangfuseSpan = {
      update: jest.fn(),
      end: jest.fn(),
    };
    return {
      generation: jest.fn(),
      span: jest.fn().mockReturnValue(spanMock),
      update: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    eventRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    recommendationRepositoryMock = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entities) =>
        entities.map((e: any, idx: number) => ({ id: `rec-${idx + 1}`, ...e }))
      ),
    };

    slideAnswerServiceMock = {
      getEventAnswers: jest.fn().mockResolvedValue([
        { question: 'Vibe', answerValue: 'Relaxed' },
      ]),
    };

    langfuseServiceMock = {
      trace: jest.fn().mockReturnValue(mockTraceInstance()),
    };

    geminiServiceMock = {
      generateJsonContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: recommendationRepositoryMock,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: eventRepositoryMock,
        },
        {
          provide: getRepositoryToken(Venue),
          useValue: {},
        },
        {
          provide: SlidesService,
          useValue: slideAnswerServiceMock,
        },
        {
          provide: LangfuseService,
          useValue: langfuseServiceMock,
        },
        {
          provide: GeminiService,
          useValue: geminiServiceMock,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should generate recommendations and save them on success', async () => {
    const eventId = 'test-event-uuid';
    eventRepositoryMock.findOne.mockResolvedValue({
      id: eventId,
      createdById: 'user-123',
      eventType: 'casual',
      locationCity: 'New York',
      locationCountry: 'USA',
      participantCount: 5,
    });

    geminiServiceMock.generateJsonContent.mockResolvedValue({
      recommendedEvents: [
        { title: 'Event 1', description: 'Desc 1', address: 'Addr 1' },
        { title: 'Event 2', description: 'Desc 2', address: 'Addr 2' },
        { title: 'Event 3', description: 'Desc 3', address: 'Addr 3' },
      ],
    });

    const result = await service.generateRecommendation(eventId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0].title).toBe('Event 1');

    // Verify Langfuse trace was created
    expect(langfuseServiceMock.trace).toHaveBeenCalledWith('generate-recommendations', expect.objectContaining({
      userId: 'user-123',
      sessionId: eventId,
    }));

    // Verify database saving
    expect(recommendationRepositoryMock.save).toHaveBeenCalled();
  });

  it('should retry on Gemini failure and log retry states', async () => {
    // Speed up jest setTimeout during retry loops
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());

    const eventId = 'test-event-uuid';
    eventRepositoryMock.findOne.mockResolvedValue({
      id: eventId,
      createdById: 'user-123',
    });

    // Make Gemini fail twice, then succeed
    geminiServiceMock.generateJsonContent
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockRejectedValueOnce(new Error('Transient connection error'))
      .mockResolvedValueOnce({
        recommendedEvents: [
          { title: 'Event 1', description: 'Desc 1', address: 'Addr 1' },
          { title: 'Event 2', description: 'Desc 2', address: 'Addr 2' },
          { title: 'Event 3', description: 'Desc 3', address: 'Addr 3' },
        ],
      });

    const result = await service.generateRecommendation(eventId);

    expect(result.success).toBe(true);
    expect(geminiServiceMock.generateJsonContent).toHaveBeenCalledTimes(3);
  });

  it('should update trace with error output if all retries fail', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());

    const eventId = 'test-event-uuid';
    eventRepositoryMock.findOne.mockResolvedValue({
      id: eventId,
      createdById: 'user-123',
    });

    geminiServiceMock.generateJsonContent.mockRejectedValue(new Error('Gemini API is down'));

    const mockTrace = mockTraceInstance();
    langfuseServiceMock.trace.mockReturnValue(mockTrace);

    const result = await service.generateRecommendation(eventId);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to generate recommendation after 3 attempts');

    expect(mockTrace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({
          success: false,
          error: expect.stringContaining('Failed to generate recommendation after 3 attempts'),
        }),
      })
    );
  });
});
