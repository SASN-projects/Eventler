import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { SliderQuestion } from './entities/slider-question.entity';
import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Group } from '../groups/entities/group.entity';
import { EventType } from '../events/enums/event.enums';
import { EventStatus } from '../events/enums/event-status.enum';
import { GroupLifecycleService } from '../events/group-lifecycle.service';

describe('SlidesService', () => {
  let service: SlidesService;
  let eventResponseRepositoryMock: any;
  let eventRepositoryMock: any;
  let userRepositoryMock: any;
  let groupRepositoryMock: any;
  let groupLifecycleServiceMock: any;

  beforeEach(async () => {
    eventResponseRepositoryMock = {
      create: jest.fn((dto) => dto),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    eventRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'event-1', status: EventStatus.OPEN, eventType: EventType.INDIVIDUAL }),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepositoryMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    groupRepositoryMock = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    groupLifecycleServiceMock = {
      checkAndCloseIfDeadlinePassed: jest.fn().mockResolvedValue(false),
      checkAndCloseIfAllMembersAnswered: jest.fn().mockResolvedValue(true),
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
        { provide: GroupLifecycleService, useValue: groupLifecycleServiceMock },
      ],
    }).compile();

    service = module.get<SlidesService>(SlidesService);
  });

  it('marks individual event as recommendations_ready after slide answers are submitted', async () => {
    await service.submitAnswers('event-1', 'user-1', {
      answers: [{ question: 'mood', answerValue: 'lively' }],
    } as any);

    expect(eventRepositoryMock.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      { status: EventStatus.RECOMMENDATIONS_READY },
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

  it('rejects slide answers if group questionnaire is closed', async () => {
    const closedGroupEvent = {
      id: 'event-1',
      status: EventStatus.CLOSED,
      eventType: EventType.GROUP,
      groupId: 'group-1',
    };
    eventRepositoryMock.findOne.mockResolvedValue(closedGroupEvent);

    await expect(
      service.submitAnswers('event-1', 'user-1', {
        answers: [{ question: 'mood', answerValue: 'lively' }],
      } as any),
    ).rejects.toThrow('Questionnaire is closed. No new answers are accepted.');
  });

  it('delegates to GroupLifecycleService when all group members have answered', async () => {
    const groupEvent = { id: 'event-1', status: EventStatus.OPEN, eventType: EventType.GROUP, groupId: 'group-1' };
    eventRepositoryMock.findOne.mockResolvedValue(groupEvent);

    groupRepositoryMock.findOne.mockResolvedValue({
      id: 'group-1',
      members: [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });

    eventResponseRepositoryMock.find
      .mockResolvedValueOnce([]) // First call: existing responses check
      .mockResolvedValueOnce([
        { userId: 'user-1', eventId: 'event-1' },
        { userId: 'user-2', eventId: 'event-1' },
      ]); // Second call: counted answered members

    await service.submitAnswers('event-1', 'user-2', {
      answers: [{ question: 'mood', answerValue: 'quiet' }],
    } as any);

    expect(groupLifecycleServiceMock.checkAndCloseIfAllMembersAnswered).toHaveBeenCalledWith(
      'event-1',
      expect.any(Set),
      ['user-1', 'user-2'],
    );
  });

  it('getSlides assembles up to 7 questions when 10 questions are available', async () => {
    const makeQuestion = (code: string) => ({
      id: `id-${code}`,
      code,
      label: `Label for ${code}`,
      description: '',
      answerMode: 'options',
      options: [
        { id: `opt-${code}-1`, value: 'Option A' },
        { id: `opt-${code}-2`, value: 'Option B' },
      ],
    });

    const tenQuestions = [
      'activity', 'budget', 'energy-level', 'food-drinks',
      'group-dynamic', 'must-have', 'occasion', 'setting',
      'time-of-day', 'vibe',
    ].map(makeQuestion);

    const mockSliderRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tenQuestions),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        SlidesService,
        { provide: getRepositoryToken(SlideAnswer), useValue: {} },
        { provide: getRepositoryToken(EventResponse), useValue: eventResponseRepositoryMock },
        { provide: getRepositoryToken(SliderQuestion), useValue: mockSliderRepo },
        { provide: getRepositoryToken(Event), useValue: eventRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: getRepositoryToken(Group), useValue: groupRepositoryMock },
        { provide: GroupLifecycleService, useValue: groupLifecycleServiceMock },
      ],
    }).compile();

    const localService = module.get<SlidesService>(SlidesService);
    const result = await localService.getSlides('user-1');

    expect(result.length).toBeLessThanOrEqual(7);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
