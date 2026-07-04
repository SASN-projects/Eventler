import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';

export type HistoryScope = 'user' | 'group';

export interface HistorySignalQuery {
  scope: HistoryScope;
  subjectId: string;
  currentEventId: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Aggregated, privacy-safe summary of a user's historical recommendation choices.
 *
 * All fields are derived through aggregation — raw event titles, addresses,
 * recommendation descriptions, or user answers are never exposed here.
 *
 * This struct is the ONLY thing passed out of this service. Callers must not
 * query raw history records directly.
 */
export interface HistorySignalSummary {
  /** Scope used to resolve the history signal. */
  scope: HistoryScope;

  /** Number of past events with a user-selected recommendation. */
  historyItemsCount: number;

  /**
   * True when at least one historical item was found and the summary contains
   * a meaningful signal. False when the history is empty or lookup failed.
   */
  historySignalUsed: boolean;

  /** Top event types (e.g. ['individual', 'group']) seen in history, by frequency. */
  dominantEventTypes: string[];

  /** Top cities the user has previously chosen events in, by frequency. */
  preferredLocations: string[];

  /**
   * Keyword-level category hints derived from recommendation titles only.
   * Uses a small fixed vocabulary to avoid leaking raw content.
   */
  preferredCategories: string[];

  /**
   * Human-readable summary suitable for inclusion in an LLM prompt.
   * Never contains raw event data — always an aggregated natural-language paragraph.
   */
  summaryText: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of historical records to consider. */
const HISTORY_LIMIT = 20;

/**
 * Minimum frequency threshold for a value to be considered "dominant".
 * A signal must appear in at least this many past events to be reported.
 */
const MIN_FREQUENCY = 2;

/**
 * Fixed keyword vocabulary used to extract safe category hints from
 * recommendation titles. Using a fixed set avoids leaking arbitrary text
 * from titles into the prompt.
 */
const CATEGORY_KEYWORDS: string[] = [
  'restaurant',
  'food',
  'cafe',
  'coffee',
  'bar',
  'pub',
  'outdoor',
  'park',
  'hiking',
  'museum',
  'gallery',
  'art',
  'cinema',
  'movie',
  'theater',
  'theatre',
  'sport',
  'fitness',
  'bowling',
  'escape',
  'cooking',
  'workshop',
  'market',
  'shopping',
  'beach',
  'club',
  'music',
  'concert',
  'karaoke',
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class RecommendationHistoryService {
  private readonly logger = new Logger(RecommendationHistoryService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) { }

  /**
   * Retrieve and aggregate historical choices into a safe summary.
   *
   * This method:
   *  1. Queries past events for the given subject that have a selected recommendation.
   *  2. Excludes the current event.
   *  3. Limits to HISTORY_LIMIT most-recent records.
   *  4. Aggregates raw data into category/location/type signals.
   *  5. Returns a HistorySignalSummary — never raw history objects.
   */
  async getHistorySignal(query: HistorySignalQuery): Promise<HistorySignalSummary> {
    const noHistory = this.buildNoHistorySummary(query.scope);

    try {
      const subjectField = query.scope === 'group' ? 'event.groupId' : 'event.createdById';
      const historicEvents = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.recommendation', 'recommendation')
        .where(`${subjectField} = :subjectId`, { subjectId: query.subjectId })
        .andWhere('event.id != :currentEventId', { currentEventId: query.currentEventId })
        .andWhere('event.recommendation IS NOT NULL')
        .orderBy('COALESCE(event.finalizedAt, event.createdAt)', 'DESC')
        .limit(HISTORY_LIMIT)
        .getMany();

      if (historicEvents.length === 0) {
        return noHistory;
      }

      return this.buildSummary(query.scope, historicEvents);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `History lookup failed for ${query.scope} (redacted): ${errorMessage}`,
      );
      return noHistory;
    }
  }

  async getHistorySummary(userId: string, currentEventId: string): Promise<HistorySignalSummary> {
    return this.getHistorySignal({
      scope: 'user',
      subjectId: userId,
      currentEventId,
    });
  }

  // ---------------------------------------------------------------------------
  // Private aggregation helpers
  // ---------------------------------------------------------------------------

  /**
   * Aggregate raw history events into a HistorySignalSummary.
   * Never exposes raw event data — only aggregated signals.
   */
  private buildSummary(scope: HistoryScope, events: Event[]): HistorySignalSummary {
    const dominantEventTypes = this.topValues(
      events.map((e) => e.eventType).filter(Boolean),
      MIN_FREQUENCY,
      2,
    );

    const preferredLocations = this.topValues(
      events.map((e) => e.locationCity).filter(Boolean),
      MIN_FREQUENCY,
      3,
    );

    const preferredCategories = this.extractCategories(events);

    const summaryText = this.buildSummaryText(
      scope,
      events.length,
      dominantEventTypes,
      preferredLocations,
      preferredCategories,
    );

    return {
      scope,
      historyItemsCount: events.length,
      historySignalUsed: summaryText.length > 0,
      dominantEventTypes,
      preferredLocations,
      preferredCategories,
      summaryText,
    };
  }

  /**
   * Extract safe category keywords from recommendation titles.
   *
   * Titles are matched against a fixed CATEGORY_KEYWORDS vocabulary.
   * No raw title text is ever returned — only the matched keyword labels.
   */
  private extractCategories(events: Event[]): string[] {
    const keywordCounts: Map<string, number> = new Map();

    for (const event of events) {
      const title = event.recommendation?.title;
      if (typeof title !== 'string' || title.trim().length === 0) {
        continue;
      }

      const lowerTitle = title.toLowerCase();
      for (const kw of CATEGORY_KEYWORDS) {
        if (lowerTitle.includes(kw)) {
          keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
        }
      }
    }

    return [...keywordCounts.entries()]
      .filter(([, count]) => count >= MIN_FREQUENCY)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([kw]) => kw);
  }

  /**
   * Count occurrences of each value, return the top-N with at least minFreq hits.
   */
  private topValues(
    values: (string | null | undefined)[],
    minFreq: number,
    topN: number,
  ): string[] {
    const counts: Map<string, number> = new Map();
    for (const v of values) {
      if (typeof v === 'string' && v.trim().length > 0) {
        const normalised = v.trim();
        counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .filter(([, count]) => count >= minFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([v]) => v);
  }

  /**
   * Compose a human-readable summary from aggregated signals.
   * Does not contain any raw event/recommendation content.
   */
  private buildSummaryText(
    scope: HistoryScope,
    count: number,
    eventTypes: string[],
    locations: string[],
    categories: string[],
  ): string {
    const subjectLabel = scope === 'group' ? 'group' : 'user';
    const lines: string[] = [
      `Historical ${subjectLabel} preference signals (secondary — must not override current-event preferences):`,
    ];

    if (categories.length > 0) {
      const categoryList =
        categories.length === 1
          ? `${categories[0]}-related`
          : categories.slice(0, -1).join(', ') + ', or ' + categories[categories.length - 1] + '-related';
      lines.push(
        `- User often selected ${categoryList} recommendations.`,
      );
    }

    if (eventTypes.length > 0) {
      const typeLabel =
        eventTypes.length === 1
          ? `${eventTypes[0]}-type events`
          : `${eventTypes.join(' or ')} events`;
      lines.push(`- ${subjectLabel === 'group' ? 'This group' : 'User'} frequently organized ${typeLabel}.`);
    }

    if (locations.length > 0) {
      lines.push(
        `- ${subjectLabel === 'group' ? 'This group' : 'User'} has previously preferred events in: ${locations.join(', ')}.`,
      );
    }

    // If no signals were dominant enough, return a minimal note rather than noise.
    if (lines.length === 1) {
      lines.push(
        `- ${count} previous event selection(s) found but no dominant preference detected.`,
      );
    }

    lines.push(
      '- These signals are SECONDARY. The current event\'s explicit preferences and constraints take priority.',
    );

    return lines.join('\n');
  }

  /** The canonical no-history fallback returned on empty result or error. */
  private buildNoHistorySummary(scope: HistoryScope): HistorySignalSummary {
    return {
      scope,
      historyItemsCount: 0,
      historySignalUsed: false,
      dominantEventTypes: [],
      preferredLocations: [],
      preferredCategories: [],
      summaryText:
        scope === 'group'
          ? 'No historical group selection data is available.'
          : 'No historical user selection data is available.',
    };
  }
}
