import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { Event } from '../events/entities/event.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventResponse)
    private eventResponseRepository: Repository<EventResponse>,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'city',
        'country',
        'occupation',
        'dateOfBirth',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      email: saved.email,
      username: saved.username,
      firstName: saved.firstName,
      lastName: saved.lastName,
      city: saved.city,
      country: saved.country,
      occupation: saved.occupation,
      dateOfBirth: saved.dateOfBirth,
      updatedAt: saved.updatedAt,
    };
  }

  async findAll() {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'firstName', 'lastName', 'email'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username,
    }));
  }

  async getPreferences(userId: string) {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = this.preferencesRepository.create({
        userId,
        preferredEventTypeId: 'individual',
      });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async updatePreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto) {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        preferredEventTypeId: 'individual',
        ...updatePreferencesDto,
      });
    } else {
      Object.assign(preferences, updatePreferencesDto);
    }

    await this.preferencesRepository.save(preferences);

    return preferences;
  }

  async getUserEvents(userId: string) {
    const events = await this.eventRepository.find({
      where: { createdById: userId },
      relations: ['group', 'recommendation'],
      order: { createdAt: 'DESC' },
    });

    if (events.length === 0) {
      return [];
    }

    const eventIds = events.map((event) => event.id);
    const responses = await this.eventResponseRepository.find({
      where: {
        eventId: In(eventIds),
        userId,
      },
      select: ['eventId'],
    });

    const answeredEventIds = new Set(responses.map((response) => response.eventId));

    return events.map((event) => ({
      ...event,
      hasAnsweredCurrentUser: answeredEventIds.has(event.id),
    }));
  }
}
