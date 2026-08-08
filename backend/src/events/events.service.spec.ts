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

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;

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
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockRecommendationRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
        { provide: getRepositoryToken(EventTypeEntity), useValue: {} },
        { provide: getRepositoryToken(GroupMember), useValue: {} },
        { provide: getRepositoryToken(Recommendation), useValue: mockRecommendationRepository },
        { provide: GroupLifecycleService, useValue: {} },
      ],
    }).compile();

    service = module.get(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
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
});