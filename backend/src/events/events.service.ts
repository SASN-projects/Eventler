import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventType } from './entities/event-type.entity';
import { EventStatus } from './enums/event-status.enum';
import { EventResponse } from './entities/event-response.entity';
import { EventType as EventTypeEnum } from './enums/event.enums';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { GroupLifecycleService } from './group-lifecycle.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(EventResponse)
    private eventResponseRepository: Repository<EventResponse>,
    @Inject(forwardRef(() => GroupLifecycleService))
    private groupLifecycleService: GroupLifecycleService,
  ) { }

  async create(userId: string, createEventDto: CreateEventDto) {
    // ── Group event: validate questionnaire deadline ────────────────────────
    // For group events the creator must supply a future deadlineAt so group
    // members know when the questionnaire closes. Reject early with a clear
    // 400 so the frontend can show the deadline-picker screen again.
    if (createEventDto.eventType === 'group') {
      if (!createEventDto.deadlineAt) {
        throw new BadRequestException(
          'A questionnaire deadline (deadlineAt) is required for group events.',
        );
      }
      const deadlineDate = new Date(createEventDto.deadlineAt);
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
        throw new BadRequestException(
          'The questionnaire deadline (deadlineAt) must be a valid date in the future.',
        );
      }
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      createdById: userId,
      deadlineAt: createEventDto.deadlineAt
        ? new Date(createEventDto.deadlineAt)
        : undefined,
      finalizedAt: createEventDto.finalizedAt
        ? new Date(createEventDto.finalizedAt)
        : undefined,
    });

    await this.eventRepository.save(event);

    return event;
  }

  async findOne(id: string, userId: string) {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['creator', 'group'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.creator.id !== userId && event.groupId) {
      const groupMember = await this.groupMemberRepository.findOne({
        where: {
          groupId: event.groupId,
          userId: userId,
        },
      });

      if (!groupMember) {
        throw new ForbiddenException('You do not have access to this event');
      }
    }

    return event;
  }

  async update(id: string, userId: string, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.creator.id !== userId) {
      throw new ForbiddenException(
        'Only the event creator can update this event',
      );
    }

    Object.assign(event, {
      ...updateEventDto,
      targetDate: updateEventDto.targetDate
        ? new Date(updateEventDto.targetDate)
        : event.targetDate,
      targetDateFrom: updateEventDto.targetDateFrom
        ? new Date(updateEventDto.targetDateFrom)
        : event.targetDateFrom,
      targetDateTo: updateEventDto.targetDateTo
        ? new Date(updateEventDto.targetDateTo)
        : event.targetDateTo,
      deadlineAt: updateEventDto.deadlineAt
        ? new Date(updateEventDto.deadlineAt)
        : event.deadlineAt,
      finalizedAt: updateEventDto.finalizedAt
        ? new Date(updateEventDto.finalizedAt)
        : event.finalizedAt,
    });

    await this.eventRepository.save(event);

    return event;
  }

  async remove(id: string, userId: string) {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.creator.id !== userId) {
      throw new ForbiddenException(
        'Only the event creator can delete this event',
      );
    }

    await this.eventRepository.remove(event);

    return { message: 'Event deleted successfully' };
  }

  async createRecommendations(id: string, userId: string) {
    const event = await this.findOne(id, userId);

    // This is a stub - actual recommendation logic will be implemented later
    return {
      message: 'Recommendations created for event',
      eventId: event.id,
    };
  }

  async getRecommendations(id: string, userId: string) {
    const event = await this.findOne(id, userId);

    const recommendations = await this.recommendationRepository.find({
      where: { eventId: event.id },
      order: { createdAt: 'ASC' },
    });

    const mapped = recommendations.map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      address: recommendation.address,
    }));

    return {
      success: true,
      eventId: event.id,
      data: mapped,
      recommendations: mapped,
    };
  }

  async getAllEventTypes() {
    return await this.eventTypeRepository.find();
  }

  async getEventTypeById(id: string) {
    const eventType = await this.eventTypeRepository.findOne({ where: { id } });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }

    return eventType;
  }

  /**
   * Owner-triggered close of a group questionnaire.
   * Validates that the caller is the event creator and that the event is OPEN,
   * then delegates to GroupLifecycleService which handles the full lifecycle
   * (CLOSED → GENERATING_RECOMMENDATIONS → RECOMMENDATIONS_READY).
   */
  async closeQuestionnaire(eventId: string, userId: string): Promise<Event> {
    return this.groupLifecycleService.ownerCloseQuestionnaire(eventId, userId);
  }

  /**
   * Owner-triggered final recommendation selection.
   * Validates:
   * - Caller is the event creator
   * - Event status is RECOMMENDATIONS_READY
   * - The given recommendation belongs to this event
   * Then transitions to FINAL_SELECTION_MADE.
   */
  async selectFinalRecommendation(
    eventId: string,
    recommendationId: string,
    userId: string,
  ): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['creator'],
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    if (event.creator.id !== userId) {
      throw new ForbiddenException('Only the event creator can select a recommendation.');
    }

    if (event.status !== EventStatus.RECOMMENDATIONS_READY) {
      throw new BadRequestException(
        `A recommendation can only be selected when the event is in RECOMMENDATIONS_READY status. Current status: ${event.status}`,
      );
    }

    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId, eventId },
    });

    if (!recommendation) {
      throw new NotFoundException(
        `Recommendation with id ${recommendationId} not found for this event`,
      );
    }

    event.recommendation = recommendation;
    event.status = EventStatus.FINAL_SELECTION_MADE;
    event.finalizedAt = new Date();
    await this.eventRepository.save(event);

    return event;
  }

  /**
   * Returns open group questionnaires/events waiting for the current authenticated user's answer.
   * Excludes:
   * - Events where the user has already submitted answers
   * - Events that are closed, generating, ready, finalized, or cancelled
   * - Events where deadlineAt <= NOW()
   * - Individual events
   * - Events for groups the user is not a member of
   */
  async getPendingQuestionnaires(userId: string) {
    const items: any[] = [];

    // ── 1. Group questionnaires waiting for the current user's answer ──────────
    const memberRecords = await this.groupMemberRepository.find({
      where: { userId },
      select: ['groupId'],
    });

    if (memberRecords.length) {
      const groupIds = memberRecords.map((m) => m.groupId);

      const openGroupEvents = await this.eventRepository.find({
        where: {
          groupId: In(groupIds),
          eventType: EventTypeEnum.GROUP,
          status: EventStatus.OPEN,
        },
        relations: ['group', 'group.members', 'creator'],
        order: { deadlineAt: 'ASC' },
      });

      for (const event of openGroupEvents) {
        // Lazy deadline check: auto-close expired questionnaires
        const closedByDeadline = await this.groupLifecycleService.checkAndCloseIfDeadlinePassed(event);
        if (closedByDeadline) {
          continue;
        }

        if (event.deadlineAt && new Date(event.deadlineAt) <= new Date()) {
          continue;
        }

        // Check if current user has already answered this event
        const userAnswersCount = await this.eventResponseRepository.count({
          where: { eventId: event.id, userId },
        });

        if (userAnswersCount > 0) {
          continue;
        }

        const expectedMembersCount = event.group?.members?.length || 0;
        const allResponses = await this.eventResponseRepository.find({
          where: { eventId: event.id },
          select: ['userId'],
        });
        const answeredUserIds = new Set(allResponses.map((r) => r.userId));
        const answeredMembersCount = answeredUserIds.size;

        const isCreator = event.createdById === userId || event.creator?.id === userId;

        items.push({
          eventId: event.id,
          groupId: event.groupId,
          title: event.title || 'Group Event',
          groupName: event.group?.name || 'Group',
          status: event.status,
          deadlineAt: event.deadlineAt ? event.deadlineAt.toISOString() : null,
          answeredMembersCount,
          expectedMembersCount,
          isCreator,
          itemType: 'GROUP_QUESTIONNAIRE_ANSWER_PENDING',
        });
      }

      // ── 2. Group events in RECOMMENDATIONS_READY where current user is creator ──
      const readyGroupEvents = await this.eventRepository.find({
        where: {
          groupId: In(groupIds),
          eventType: EventTypeEnum.GROUP,
          status: EventStatus.RECOMMENDATIONS_READY,
          createdById: userId,
        },
        relations: ['group', 'creator'],
        order: { updatedAt: 'ASC' },
      });

      for (const event of readyGroupEvents) {
        items.push({
          eventId: event.id,
          groupId: event.groupId,
          title: event.title || 'Group Event',
          groupName: event.group?.name || 'Group',
          status: event.status,
          deadlineAt: event.deadlineAt ? event.deadlineAt.toISOString() : null,
          answeredMembersCount: null,
          expectedMembersCount: null,
          isCreator: true,
          itemType: 'GROUP_FINAL_SELECTION_PENDING',
        });
      }
    }

    // ── 3. Individual events in OPEN where current user is creator and hasn't answered ──
    const openIndividualEvents = await this.eventRepository.find({
      where: {
        eventType: EventTypeEnum.INDIVIDUAL,
        status: EventStatus.OPEN,
        createdById: userId,
      },
      order: { createdAt: 'ASC' },
    });

    for (const event of openIndividualEvents) {
      const userAnswersCount = await this.eventResponseRepository.count({
        where: { eventId: event.id, userId },
      });

      if (userAnswersCount > 0) {
        continue;
      }

      items.push({
        eventId: event.id,
        groupId: null,
        title: event.title || 'Individual Event',
        groupName: null,
        status: event.status,
        deadlineAt: null,
        answeredMembersCount: null,
        expectedMembersCount: null,
        isCreator: true,
        itemType: 'INDIVIDUAL_QUESTIONNAIRE_ANSWER_PENDING',
      });
    }

    // ── 4. Individual events in RECOMMENDATIONS_READY where current user is creator ──
    const readyIndividualEvents = await this.eventRepository.find({
      where: {
        eventType: EventTypeEnum.INDIVIDUAL,
        status: EventStatus.RECOMMENDATIONS_READY,
        createdById: userId,
      },
      order: { updatedAt: 'ASC' },
    });

    for (const event of readyIndividualEvents) {
      items.push({
        eventId: event.id,
        groupId: null,
        title: event.title || 'Individual Event',
        groupName: null,
        status: event.status,
        deadlineAt: null,
        answeredMembersCount: null,
        expectedMembersCount: null,
        isCreator: true,
        itemType: 'INDIVIDUAL_FINAL_SELECTION_PENDING',
      });
    }

    return {
      items,
      count: items.length,
    };
  }
}
