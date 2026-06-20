import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventType } from './entities/event-type.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) { }

  async create(userId: string, createEventDto: CreateEventDto) {
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

    // This is a stub - actual recommendations will be fetched later
    return {
      eventId: event.id,
      recommendations: [],
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
}
