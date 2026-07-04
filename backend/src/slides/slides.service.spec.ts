import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { SliderQuestion } from './entities/slider-question.entity';
import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Group } from '../groups/entities/group.entity';
import { EventType } from '../events/enums/event.enums';

describe('SlidesService', () => {
  let service: SlidesService;
  let eventResponseRepositoryMock: any;
  let eventRepositoryMock: any;
  let userRepositoryMock: any;
  let groupRepositoryMock: any;

  beforeEach(async () => {
    eventResponseRepositoryMock = {
      create: jest.fn((dto) => dto),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    eventRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'event-1', status: 'collecting_responses', eventType: EventType.INDIVIDUAL }),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    groupRepositoryMock = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlidesService,
        { provide: getRepositoryToken(SlideAnswer), useValue: {} },
        { provide: getRepositoryToken(EventResponse), useValue: eventResponseRepositoryMock },
        { provide: getRepositoryToken(SliderQuestion), useValue: {} },
        { provide: getRepositoryToken(Event), useValue: eventRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: getRepositoryToken(Group), useValue: groupRepositoryMock },
      ],
    }).compile();

    service = module.get<SlidesService>(SlidesService);
  });

  it('marks the event as recommended after slide answers are submitted for individual events', async () => {
    await service.submitAnswers('event-1', 'user-1', {
      answers: [{ question: 'mood', answerValue: 'lively' }],
    } as any);

    expect(eventRepositoryMock.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      { status: 'recommended' },
    );
  });

  it('blocks duplicate slide submissions for the same user', async () => {
    eventResponseRepositoryMock.find.mockResolvedValue([{ id: 'resp-1', eventId: 'event-1', userId: 'user-1' }]);

    await expect(
      service.submitAnswers('event-1', 'user-1', {
        answers: [{ question: 'mood', answerValue: 'lively' }],
      } as any),
    ).rejects.toThrow('You have already submitted your slide answers for this event.');

    expect(eventResponseRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('does not mark group event as recommended until all members have answered', async () => {
    const groupEvent = { id: 'event-1', status: 'collecting_responses', eventType: EventType.GROUP, groupId: 'group-1' };
    eventRepositoryMock.findOne.mockResolvedValue(groupEvent);

    groupRepositoryMock.findOne.mockResolvedValue({
      id: 'group-1',
      members: [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });

    // Only user-1 has answered so far
    eventResponseRepositoryMock.find.mockResolvedValueOnce([]) // First call for existing responses check
      .mockResolvedValueOnce([{ userId: 'user-1', eventId: 'event-1' }]); // Second call to count answered members

    await service.submitAnswers('event-1', 'user-1', {
      answers: [{ question: 'mood', answerValue: 'lively' }],
    } as any);

    // Should NOT transition to recommended yet
    expect(eventRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('marks group event as recommended once all members have answered', async () => {
    const groupEvent = { id: 'event-1', status: 'collecting_responses', eventType: EventType.GROUP, groupId: 'group-1' };
    eventRepositoryMock.findOne.mockResolvedValue(groupEvent);

    groupRepositoryMock.findOne.mockResolvedValue({
      id: 'group-1',
      members: [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });

    // Both users have answered
    eventResponseRepositoryMock.find.mockResolvedValueOnce([]) // First call for existing responses check
      .mockResolvedValueOnce([
        { userId: 'user-1', eventId: 'event-1' },
        { userId: 'user-2', eventId: 'event-1' },
      ]); // Second call to count answered members

    await service.submitAnswers('event-1', 'user-2', {
      answers: [{ question: 'mood', answerValue: 'quiet' }],
    } as any);

    expect(eventRepositoryMock.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      { status: 'recommended' },
    );
  });
});
