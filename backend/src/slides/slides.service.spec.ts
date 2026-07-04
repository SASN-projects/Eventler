import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { SliderQuestion } from './entities/slider-question.entity';
import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';

describe('SlidesService', () => {
  let service: SlidesService;
  let eventResponseRepositoryMock: any;
  let eventRepositoryMock: any;
  let userRepositoryMock: any;

  beforeEach(async () => {
    eventResponseRepositoryMock = {
      create: jest.fn((dto) => dto),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    eventRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'event-1', status: 'collecting_responses' }),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlidesService,
        { provide: getRepositoryToken(SlideAnswer), useValue: {} },
        { provide: getRepositoryToken(EventResponse), useValue: eventResponseRepositoryMock },
        { provide: getRepositoryToken(SliderQuestion), useValue: {} },
        { provide: getRepositoryToken(Event), useValue: eventRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
      ],
    }).compile();

    service = module.get<SlidesService>(SlidesService);
  });

  it('marks the event as recommended after slide answers are submitted', async () => {
    await service.submitAnswers('event-1', 'user-1', {
      answers: [{ question: 'mood', answerValue: 'lively' }],
    } as any);

    expect(eventRepositoryMock.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      { status: 'recommended' },
    );
  });

  it('updates existing slide answers instead of creating duplicates', async () => {
    const existingResponses = [{ id: 'resp-1', eventId: 'event-1', userId: 'user-1', question: 'mood', answerValue: 'quiet' }];
    eventResponseRepositoryMock.find.mockResolvedValue(existingResponses);
    eventResponseRepositoryMock.save.mockResolvedValue(undefined);

    await service.submitAnswers('event-1', 'user-1', {
      answers: [{ question: 'mood', answerValue: 'lively' }],
    } as any);

    expect(eventResponseRepositoryMock.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'resp-1',
        eventId: 'event-1',
        userId: 'user-1',
        question: 'mood',
        answerValue: 'lively',
      }),
    ]);
  });
});
