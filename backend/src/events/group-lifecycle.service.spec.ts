import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { GroupLifecycleService } from './group-lifecycle.service';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';
import { EventType } from './enums/event.enums';
import { RecommendationsService } from '../recommendations/recommendations.service';

describe('GroupLifecycleService', () => {
  let service: GroupLifecycleService;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let recommendationsService: jest.Mocked<RecommendationsService>;

  const mockUser = { id: 'user-1', email: 'owner@example.com' } as any;

  const createMockEvent = (overrides: Partial<Event> = {}): Event =>
    ({
      id: 'event-1',
      title: 'Group Dinner',
      description: 'Dinner with friends',
      eventType: EventType.GROUP,
      status: EventStatus.OPEN,
      createdById: 'user-1',
      creator: mockUser,
      groupId: 'group-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Event);

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockRecService = {
      generateRecommendation: jest.fn().mockResolvedValue({ success: true, data: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupLifecycleService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepo,
        },
        {
          provide: RecommendationsService,
          useValue: mockRecService,
        },
      ],
    }).compile();

    service = module.get<GroupLifecycleService>(GroupLifecycleService);
    eventRepository = module.get(getRepositoryToken(Event));
    recommendationsService = module.get(RecommendationsService);
  });

  describe('closeQuestionnaire', () => {
    it('should transition event from OPEN to CLOSED and trigger recommendation generation', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      await service.closeQuestionnaire('event-1');

      expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: 'event-1' } });
      expect(mockEvent.status).toBe(EventStatus.CLOSED);
      expect(eventRepository.save).toHaveBeenCalledWith(mockEvent);

      // Verify recommendation generation triggers
      expect(eventRepository.update).toHaveBeenCalledWith(
        { id: 'event-1' },
        { status: EventStatus.GENERATING_RECOMMENDATIONS },
      );
      expect(recommendationsService.generateRecommendation).toHaveBeenCalledWith('event-1');
      expect(eventRepository.update).toHaveBeenCalledWith(
        { id: 'event-1' },
        { status: EventStatus.RECOMMENDATIONS_READY },
      );
    });

    it('should be idempotent if event is already CLOSED or further along', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.CLOSED });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.closeQuestionnaire('event-1');

      expect(result.status).toBe(EventStatus.CLOSED);
      expect(eventRepository.save).not.toHaveBeenCalled();
      expect(recommendationsService.generateRecommendation).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if event does not exist', async () => {
      eventRepository.findOne.mockResolvedValue(null);

      await expect(
        service.closeQuestionnaire('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should revert to CLOSED status if recommendation generation fails', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);
      recommendationsService.generateRecommendation.mockResolvedValueOnce({
        success: false,
        message: 'LLM failed',
      });

      await service.closeQuestionnaire('event-1');

      expect(eventRepository.update).toHaveBeenCalledWith(
        { id: 'event-1' },
        { status: EventStatus.CLOSED },
      );
    });
  });

  describe('ownerCloseQuestionnaire', () => {
    it('should allow event creator to close an OPEN group questionnaire', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      await service.ownerCloseQuestionnaire('event-1', 'user-1');

      expect(mockEvent.status).toBe(EventStatus.CLOSED);
    });

    it('should throw ForbiddenException if user is not the event creator', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      await expect(
        service.ownerCloseQuestionnaire('event-1', 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if event is not a group event', async () => {
      const mockEvent = createMockEvent({ eventType: EventType.INDIVIDUAL, status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      await expect(
        service.ownerCloseQuestionnaire('event-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if questionnaire is not OPEN', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.RECOMMENDATIONS_READY });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      await expect(
        service.ownerCloseQuestionnaire('event-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkAndCloseIfDeadlinePassed', () => {
    it('should auto-close questionnaire if deadlineAt is in the past and status is OPEN', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000);
      const mockEvent = createMockEvent({ status: EventStatus.OPEN, deadlineAt: pastDate });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      const wasClosed = await service.checkAndCloseIfDeadlinePassed(mockEvent);

      expect(wasClosed).toBe(true);
      expect(mockEvent.status).toBe(EventStatus.CLOSED);
    });

    it('should not close questionnaire if deadlineAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000);
      const mockEvent = createMockEvent({ status: EventStatus.OPEN, deadlineAt: futureDate });

      const wasClosed = await service.checkAndCloseIfDeadlinePassed(mockEvent);

      expect(wasClosed).toBe(false);
      expect(eventRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('checkAndCloseIfAllMembersAnswered', () => {
    it('should close questionnaire if all group members have submitted answers', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });
      eventRepository.findOne.mockResolvedValue(mockEvent);

      const groupMembers = ['user-1', 'user-2'];
      const answeredUsers = new Set(['user-1', 'user-2']);

      const wasClosed = await service.checkAndCloseIfAllMembersAnswered(
        'event-1',
        answeredUsers,
        groupMembers,
      );

      expect(wasClosed).toBe(true);
      expect(mockEvent.status).toBe(EventStatus.CLOSED);
    });

    it('should not close questionnaire if not all group members have submitted answers', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.OPEN });

      const groupMembers = ['user-1', 'user-2'];
      const answeredUsers = new Set(['user-1']);

      const wasClosed = await service.checkAndCloseIfAllMembersAnswered(
        'event-1',
        answeredUsers,
        groupMembers,
      );

      expect(wasClosed).toBe(false);
      expect(eventRepository.save).not.toHaveBeenCalled();
    });
  });
});
