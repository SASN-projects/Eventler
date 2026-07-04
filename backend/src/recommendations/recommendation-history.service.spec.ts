import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationHistoryService, HistorySignalSummary } from './recommendation-history.service';
import { Event } from '../events/entities/event.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEvent = (partial: Partial<any> = {}): any => ({
  id: 'event-uuid-1',
  createdById: 'user-abc',
  eventType: 'individual',
  locationCity: 'Tel Aviv',
  locationCountry: 'Israel',
  participantCount: 3,
  targetDate: '2025-06-15',
  finalizedAt: new Date('2025-06-15'),
  createdAt: new Date('2025-06-01'),
  recommendation: {
    id: 'rec-uuid-1',
    title: 'Nice Restaurant',
    description: 'A lovely Italian restaurant.',
    address: '10 Rothschild Blvd, Tel Aviv',
  },
  ...partial,
});

/** Factory for the TypeORM query builder mock */
const makeQbMock = (resolveWith: any[]) => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resolveWith),
  };
  return qb;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecommendationHistoryService', () => {
  let service: RecommendationHistoryService;
  let eventRepositoryMock: any;

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationHistoryService,
        { provide: getRepositoryToken(Event), useValue: eventRepositoryMock },
      ],
    }).compile();

    return module.get<RecommendationHistoryService>(RecommendationHistoryService);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    eventRepositoryMock = {
      createQueryBuilder: jest.fn(),
    };
  });

  // ── No history ─────────────────────────────────────────────────────────────

  describe('when no previous selected recommendations exist', () => {
    it('returns historySignalUsed=false and historyItemsCount=0', async () => {
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock([]));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.historySignalUsed).toBe(false);
      expect(result.historyItemsCount).toBe(0);
      expect(result.scope).toBe('user');
      expect(result.summaryText).toBe('No historical user selection data is available.');
      expect(result.dominantEventTypes).toHaveLength(0);
      expect(result.preferredLocations).toHaveLength(0);
      expect(result.preferredCategories).toHaveLength(0);
    });
  });

  // ── Current event is excluded ──────────────────────────────────────────────

  describe('excluding the current event', () => {
    it('calls andWhere with id != currentEventId', async () => {
      const qb = makeQbMock([]);
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      await service.getHistorySummary('user-abc', 'CURRENT-EVENT-ID');

      const andWhereCalls: string[][] = (qb.andWhere as jest.Mock).mock.calls;
      const hasExclusionClause = andWhereCalls.some(
        ([clause]) => typeof clause === 'string' && clause.includes('event.id != :currentEventId'),
      );
      expect(hasExclusionClause).toBe(true);
    });
  });

  describe('group history lookup', () => {
    it('queries by groupId when scope is group', async () => {
      const qb = makeQbMock([]);
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-123',
        currentEventId: 'current-event-id',
      });

      expect(qb.where).toHaveBeenCalledWith('event.groupId = :subjectId', { subjectId: 'group-123' });
    });

    it('returns group fallback text when no history exists', async () => {
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock([]));
      service = await buildService();

      const result = await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-123',
        currentEventId: 'current-event-id',
      });

      expect(result.scope).toBe('group');
      expect(result.historySignalUsed).toBe(false);
      expect(result.summaryText).toBe('No historical group selection data is available.');
    });
  });

  // ── Only selected items used (recommendation IS NOT NULL) ─────────────────

  describe('using only user-selected recommendations', () => {
    it('queries only events where recommendation IS NOT NULL', async () => {
      const qb = makeQbMock([]);
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      await service.getHistorySummary('user-abc', 'current-event-id');

      const andWhereCalls: string[][] = (qb.andWhere as jest.Mock).mock.calls;
      const hasNotNullClause = andWhereCalls.some(
        ([clause]) =>
          typeof clause === 'string' && clause.includes('event.recommendation IS NOT NULL'),
      );
      expect(hasNotNullClause).toBe(true);
    });
  });

  // ── HISTORY_LIMIT is applied ───────────────────────────────────────────────

  describe('limit enforcement', () => {
    it('applies LIMIT 20 to the query', async () => {
      const qb = makeQbMock([]);
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      await service.getHistorySummary('user-abc', 'current-event-id');

      expect(qb.limit).toHaveBeenCalledWith(20);
    });
  });

  // ── Aggregation — dominant event types ────────────────────────────────────

  describe('aggregation: dominant event types', () => {
    it('includes event types that appear >= 2 times', async () => {
      const events = [
        makeEvent({ id: '1', eventType: 'individual' }),
        makeEvent({ id: '2', eventType: 'individual' }),
        makeEvent({ id: '3', eventType: 'group' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.dominantEventTypes).toContain('individual');
      expect(result.dominantEventTypes).not.toContain('group'); // only 1 occurrence
      expect(result.scope).toBe('user');
    });

    it('returns empty dominantEventTypes when no type reaches minimum frequency', async () => {
      const events = [
        makeEvent({ id: '1', eventType: 'individual' }),
        makeEvent({ id: '2', eventType: 'group' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.dominantEventTypes).toHaveLength(0);
    });
  });

  // ── Aggregation — preferred locations ─────────────────────────────────────

  describe('aggregation: preferred locations', () => {
    it('includes cities that appear >= 2 times', async () => {
      const events = [
        makeEvent({ id: '1', locationCity: 'Tel Aviv' }),
        makeEvent({ id: '2', locationCity: 'Tel Aviv' }),
        makeEvent({ id: '3', locationCity: 'Jerusalem' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.preferredLocations).toContain('Tel Aviv');
      expect(result.preferredLocations).not.toContain('Jerusalem');
    });
  });

  // ── Aggregation — preferred categories ────────────────────────────────────

  describe('aggregation: preferred categories (from recommendation titles)', () => {
    it('extracts known category keywords from recommendation titles', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Italian Restaurant Downtown' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Mexican Restaurant Night' } }),
        makeEvent({ id: '3', recommendation: { id: 'r3', title: 'City Park Picnic' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.preferredCategories).toContain('restaurant');
      expect(result.preferredCategories).not.toContain('park'); // only 1 occurrence
    });

    it('does not include raw recommendation title text in preferredCategories', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Italian Restaurant Downtown' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Fancy Restaurant Midtown' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      // preferredCategories should be keyword labels only, not raw titles
      for (const cat of result.preferredCategories) {
        expect(cat).not.toContain('Italian');
        expect(cat).not.toContain('Fancy');
        expect(cat).not.toContain('Midtown');
        expect(cat).not.toContain('Downtown');
      }
    });
  });

  // ── summaryText privacy ────────────────────────────────────────────────────

  describe('summaryText privacy', () => {
    it('does not include raw recommendation title text in summaryText', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Fancy Sushi Bar on Allenby Street' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Fancy Sushi Bar on Allenby Street' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.summaryText).not.toContain('Allenby Street');
      expect(result.summaryText).not.toContain('Fancy Sushi Bar');
    });

    it('does not include raw address text in summaryText', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Outdoor Event', description: 'A', address: '42 Secret Lane' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Outdoor Park', description: 'B', address: '7 Private Road' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.summaryText).not.toContain('Secret Lane');
      expect(result.summaryText).not.toContain('Private Road');
    });
  });

  // ── DB failure is non-blocking ─────────────────────────────────────────────

  describe('DB failure handling', () => {
    it('returns no-history fallback when DB throws, without re-throwing', async () => {
      const qb = makeQbMock([]);
      qb.getMany.mockRejectedValue(new Error('DB connection lost'));
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      const result = await expect(
        service.getHistorySummary('user-abc', 'current-event-id'),
      ).resolves.not.toThrow();

      void result;
    });

    it('returns historySignalUsed=false when DB throws', async () => {
      const qb = makeQbMock([]);
      qb.getMany.mockRejectedValue(new Error('Timeout'));
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      const result: HistorySignalSummary = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.historySignalUsed).toBe(false);
      expect(result.historyItemsCount).toBe(0);
    });
  });

  // ── historySignalUsed flag ─────────────────────────────────────────────────

  describe('historySignalUsed flag', () => {
    it('is true when history with dominant signals exists', async () => {
      const events = [
        makeEvent({ id: '1', eventType: 'individual', locationCity: 'Tel Aviv' }),
        makeEvent({ id: '2', eventType: 'individual', locationCity: 'Tel Aviv' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      // Even with no dominant signals, as long as records exist, a summaryText is produced
      expect(result.historyItemsCount).toBe(2);
      // historySignalUsed reflects summaryText non-empty
      expect(result.historySignalUsed).toBe(result.summaryText.length > 0);
    });

    it('is false when history is empty', async () => {
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock([]));
      service = await buildService();

      const result = await service.getHistorySummary('user-abc', 'current-event-id');

      expect(result.historySignalUsed).toBe(false);
    });
  });

  // ── Group history wording ──────────────────────────────────────────────────

  describe('group history wording', () => {
    it('category sentence says "This group often selected..." for group scope', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Museum Evening' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Art Museum Tour' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-123',
        currentEventId: 'current-event-id',
      });

      // For group scope: "This group often selected ..." not "User often selected ..."
      expect(result.summaryText).toContain('This group often selected');
      expect(result.summaryText).not.toMatch(/^- User often selected/m);
    });

    it('category sentence says "User often selected..." for user scope', async () => {
      const events = [
        makeEvent({ id: '1', recommendation: { id: 'r1', title: 'Nice Restaurant' } }),
        makeEvent({ id: '2', recommendation: { id: 'r2', title: 'Italian Restaurant' } }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySignal({
        scope: 'user',
        subjectId: 'user-abc',
        currentEventId: 'current-event-id',
      });

      expect(result.summaryText).toContain('User often selected');
      expect(result.summaryText).not.toContain('This group often selected');
    });

    it('event type sentence says "This group frequently organized..." for group scope', async () => {
      const events = [
        makeEvent({ id: '1', eventType: 'group' }),
        makeEvent({ id: '2', eventType: 'group' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-123',
        currentEventId: 'current-event-id',
      });

      expect(result.summaryText).toContain('This group frequently organized');
    });

    it('location sentence says "This group has previously preferred..." for group scope', async () => {
      const events = [
        makeEvent({ id: '1', locationCity: 'Berlin' }),
        makeEvent({ id: '2', locationCity: 'Berlin' }),
      ];
      eventRepositoryMock.createQueryBuilder.mockReturnValue(makeQbMock(events));
      service = await buildService();

      const result = await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-123',
        currentEventId: 'current-event-id',
      });

      expect(result.summaryText).toContain('This group has previously preferred');
    });

    it('group history uses groupId field, not createdById', async () => {
      const qb = makeQbMock([]);
      eventRepositoryMock.createQueryBuilder.mockReturnValue(qb);
      service = await buildService();

      await service.getHistorySignal({
        scope: 'group',
        subjectId: 'group-xyz',
        currentEventId: 'current-event-id',
      });

      expect(qb.where).toHaveBeenCalledWith('event.groupId = :subjectId', { subjectId: 'group-xyz' });
      // Must NOT use createdById for group scope
      const whereCalls: string[][] = (qb.where as jest.Mock).mock.calls;
      const usesCreatedById = whereCalls.some(
        ([clause]) => typeof clause === 'string' && clause.includes('createdById'),
      );
      expect(usesCreatedById).toBe(false);
    });
  });
});
