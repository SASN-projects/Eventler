import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';
import { EventType } from './enums/event.enums';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class GroupLifecycleService {
  private readonly logger = new Logger(GroupLifecycleService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @Inject(forwardRef(() => RecommendationsService))
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Idempotent close of a group questionnaire.
   * Sets status=CLOSED, then automatically triggers recommendation generation
   * (→ GENERATING_RECOMMENDATIONS → RECOMMENDATIONS_READY).
   *
   * Safe to call multiple times: if event is already CLOSED or beyond, it is a no-op.
   */
  async closeQuestionnaire(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    // Idempotent: already closed or further along → skip
    const alreadyClosedStatuses: EventStatus[] = [
      EventStatus.CLOSED,
      EventStatus.GENERATING_RECOMMENDATIONS,
      EventStatus.RECOMMENDATIONS_READY,
      EventStatus.FINAL_SELECTION_MADE,
      EventStatus.FINALIZED,
    ];
    if (alreadyClosedStatuses.includes(event.status)) {
      this.logger.debug(`Event ${eventId} is already in status ${event.status}; close is a no-op.`);
      return event;
    }

    // Transition to CLOSED
    event.status = EventStatus.CLOSED;
    await this.eventRepository.save(event);
    this.logger.log(`Event ${eventId} closed.`);

    // Auto-trigger recommendation generation (fire-and-forget with status tracking)
    await this.triggerRecommendationGeneration(eventId);

    return event;
  }

  /**
   * Transitions event to GENERATING_RECOMMENDATIONS, calls the recommendations
   * service, then transitions to RECOMMENDATIONS_READY (or back to CLOSED on failure).
   */
  async triggerRecommendationGeneration(eventId: string): Promise<void> {
    // Transition to GENERATING_RECOMMENDATIONS
    await this.eventRepository.update(
      { id: eventId },
      { status: EventStatus.GENERATING_RECOMMENDATIONS },
    );
    this.logger.log(`Event ${eventId} → GENERATING_RECOMMENDATIONS`);

    try {
      const result = await this.recommendationsService.generateRecommendation(eventId);
      if (!result.success) {
        this.logger.warn(
          `Recommendation generation for event ${eventId} returned failure: ${result.message}`,
        );
        // Revert to CLOSED so the owner can retry
        await this.eventRepository.update({ id: eventId }, { status: EventStatus.CLOSED });
        return;
      }
      // generateRecommendation() itself sets RECOMMENDATIONS_READY — but we also set it here
      // as a safety net in case the service doesn't (e.g. Google Places path).
      await this.eventRepository.update(
        { id: eventId },
        { status: EventStatus.RECOMMENDATIONS_READY },
      );
      this.logger.log(`Event ${eventId} → RECOMMENDATIONS_READY`);
    } catch (err: any) {
      this.logger.error(`Recommendation generation failed for event ${eventId}: ${err.message}`);
      // Revert to CLOSED so the owner can retry
      await this.eventRepository.update({ id: eventId }, { status: EventStatus.CLOSED });
    }
  }

  /**
   * Lazy deadline check — called by submitAnswers() before processing the answer.
   * If the event's deadlineAt is in the past and it is still OPEN, close it automatically.
   * Returns true if the event was closed by this check.
   */
  async checkAndCloseIfDeadlinePassed(event: Event): Promise<boolean> {
    if (
      event.eventType === EventType.GROUP &&
      event.status === EventStatus.OPEN &&
      event.deadlineAt &&
      event.deadlineAt <= new Date()
    ) {
      this.logger.log(`Event ${event.id} deadline passed; auto-closing.`);
      await this.closeQuestionnaire(event.id);
      return true;
    }
    return false;
  }

  /**
   * Checks whether all group members have answered and, if so, closes the questionnaire.
   * Returns true if the event was closed by this check.
   */
  async checkAndCloseIfAllMembersAnswered(
    eventId: string,
    answeredUserIds: Set<string>,
    groupMemberIds: string[],
  ): Promise<boolean> {
    const allAnswered = groupMemberIds.every((id) => answeredUserIds.has(id));
    if (allAnswered) {
      this.logger.log(`All members answered for event ${eventId}; auto-closing.`);
      await this.closeQuestionnaire(eventId);
      return true;
    }
    return false;
  }

  /**
   * Owner-triggered manual close.
   * Validates ownership and OPEN status, then delegates to closeQuestionnaire().
   */
  async ownerCloseQuestionnaire(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['creator'],
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    if (event.eventType !== EventType.GROUP) {
      throw new BadRequestException('Only group questionnaires can be manually closed.');
    }

    if (event.creator.id !== userId) {
      throw new ForbiddenException('Only the event creator can close this questionnaire.');
    }

    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException(
        `Questionnaire cannot be closed in its current status: ${event.status}.`,
      );
    }

    return this.closeQuestionnaire(eventId);
  }
}
