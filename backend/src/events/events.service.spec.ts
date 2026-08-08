import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventType } from './enums/event.enums';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { EventType as EventTypeEntity } from './entities/event-type.entity';
import { GroupLifecycleService } from './group-lifecycle.service';
import { EventResponse } from './entities/event-response.entity';
import { EventStatus } from './enums/event-status.enum';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let groupMemberRepository: jest.Mocked<Repository<GroupMember>>;
  let eventResponseRepository: jest.Mocked<Repository<EventResponse>>;
  let groupLifecycleService: jest.Mocked<GroupLifecycleService>;

  const createMockEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 'event-1',
    createdById: 'creator-1',
    eventType: EventType.GROUP,
    groupId: 'group-1',
    creator: { id: 'creator-1' } as any,
    status: 'recommendations_ready' as any,
    ...overrides,
  } as Event);

  beforeEach(async () => {
    const mockEventRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockRecommendationRepository = {
      find: jest.fn(),
    };

    const mockGroupMemberRepository = {
      find: jest.fn(),
    };

    const mockEventResponseRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockGroupLifecycleService = {
      checkAndCloseIfDeadlinePassed: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
        { provide: getRepositoryToken(EventTypeEntity), useValue: {} },
        { provide: getRepositoryToken(GroupMember), useValue: mockGroupMemberRepository },
        { provide: getRepositoryToken(Recommendation), useValue: mockRecommendationRepository },
        { provide: getRepositoryToken(EventResponse), useValue: mockEventResponseRepository },
        { provide: GroupLifecycleService, useValue: mockGroupLifecycleService },
      ],
    }).compile();

    service = module.get(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    groupMemberRepository = module.get(getRepositoryToken(GroupMember));
    eventResponseRepository = module.get(getRepositoryToken(EventResponse));
    groupLifecycleService = module.get(GroupLifecycleService);
  });

  it('returns persisted recommendations for a group event', async () => {
    eventRepository.findOne.mockResolvedValue(createMockEvent());
    recommendationRepository.find.mockResolvedValue([
      { id: 'rec-1', title: 'A', description: 'A desc', address: 'A addr' } as Recommendation,
      { id: 'rec-2', title: 'B', description: 'B desc', address: 'B addr' } as Recommendation,
      { id: 'rec-3', title: 'C', description: 'C desc', address: 'C addr' } as Recommendation,
    ]);

    const result = await service.getRecommendations('event-1', 'creator-1');

    expect(recommendationRepository.find).toHaveBeenCalledWith({
      where: { eventId: 'event-1' },
      order: { createdAt: 'ASC' },
    });
    expect(result.success).toBe(true);
    expect(result.eventId).toBe('event-1');
    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe('rec-1');
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0].id).toBe('rec-1');
  });

  describe('getPendingQuestionnaires', () => {
    it('returns empty list if user belongs to no groups', async () => {
      groupMemberRepository.find.mockResolvedValue([]);

      const result = await service.getPendingQuestionnaires('user-1');

      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('returns pending open group questionnaires where current user has not answered', async () => {
      groupMemberRepository.find.mockResolvedValue([{ groupId: 'group-1', userId: 'user-1' }] as any);

      const futureDate = new Date(Date.now() + 3600 * 1000);
      const mockEvent = createMockEvent({
        id: 'event-1',
        groupId: 'group-1',
        title: 'Team Dinner',
        status: EventStatus.OPEN,
        deadlineAt: futureDate,
        createdById: 'creator-1',
        group: { name: 'Dev Team', members: [{ userId: 'user-1' }, { userId: 'creator-1' }] } as any,
      });

      eventRepository.find.mockResolvedValue([mockEvent]);
      eventResponseRepository.count.mockResolvedValue(0); // user-1 has not answered
      eventResponseRepository.find.mockResolvedValue([{ userId: 'creator-1' }] as any);

      const result = await service.getPendingQuestionnaires('user-1');

      expect(result.count).toBe(1);
      expect(result.items[0]).toEqual({
        eventId: 'event-1',
        groupId: 'group-1',
        title: 'Team Dinner',
        groupName: 'Dev Team',
        status: EventStatus.OPEN,
        deadlineAt: futureDate.toISOString(),
        answeredMembersCount: 1,
        expectedMembersCount: 2,
        isCreator: false,
      });
    });

    it('excludes questionnaires where current user has already answered', async () => {
      groupMemberRepository.find.mockResolvedValue([{ groupId: 'group-1', userId: 'user-1' }] as any);

      const mockEvent = createMockEvent({
        id: 'event-1',
        groupId: 'group-1',
        status: EventStatus.OPEN,
        deadlineAt: new Date(Date.now() + 3600 * 1000),
      });

      eventRepository.find.mockResolvedValue([mockEvent]);
      eventResponseRepository.count.mockResolvedValue(3); // user-1 HAS answered

      const result = await service.getPendingQuestionnaires('user-1');

      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('excludes questionnaires auto-closed by deadline', async () => {
      groupMemberRepository.find.mockResolvedValue([{ groupId: 'group-1', userId: 'user-1' }] as any);

      const pastDate = new Date(Date.now() - 3600 * 1000);
      const mockEvent = createMockEvent({
        id: 'event-1',
        groupId: 'group-1',
        status: EventStatus.OPEN,
        deadlineAt: pastDate,
      });

      eventRepository.find.mockResolvedValue([mockEvent]);
      groupLifecycleService.checkAndCloseIfDeadlinePassed.mockResolvedValue(true);

      const result = await service.getPendingQuestionnaires('user-1');

      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
    });
  });
});