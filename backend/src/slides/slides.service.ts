import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlideAnswer } from './entities/slide-answer.entity';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';
import { SliderQuestion } from './entities/slider-question.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { User } from '../auth/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { EventType } from '../events/enums/event.enums';

@Injectable()
export class SlidesService {
  constructor(
    @InjectRepository(SlideAnswer)
    private slideAnswerRepository: Repository<SlideAnswer>,
    @InjectRepository(EventResponse)
    private eventResponseRepository: Repository<EventResponse>,
    @InjectRepository(SliderQuestion)
    private sliderQuestionRepository: Repository<SliderQuestion>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) { }

  async getSlides(userId: string): Promise<SliderQuestion[]> {
    // 1. Fetch user to get their preferences
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    const preferredCodes: string[] = user?.preferences?.interests || [];

    // 2. Fetch all questions from the database along with their options
    const allQuestions = await this.sliderQuestionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .orderBy('question.code', 'ASC')
      .addOrderBy('option.value', 'ASC')
      .getMany();

    // 3. Separate questions into preferred and other categories
    const preferredQuestions = allQuestions.filter((q) =>
      preferredCodes.includes(q.code),
    );
    const otherQuestions = allQuestions.filter(
      (q) => !preferredCodes.includes(q.code),
    );

    // 4. Shuffle other questions randomly
    const shuffledOthers = [...otherQuestions].sort(() => Math.random() - 0.5);

    // 5. Select enough other questions to reach 7 total
    const needed = Math.max(0, 7 - preferredQuestions.length);
    const selectedOthers = shuffledOthers.slice(0, needed);

    // 6. Combine and sort alphabetically by code
    const selectedQuestions = [...preferredQuestions, ...selectedOthers];
    selectedQuestions.sort((a, b) => a.code.localeCompare(b.code));

    // 7. Ensure options inside each question are sorted alphabetically by value
    for (const q of selectedQuestions) {
      if (q.options) {
        q.options.sort((a, b) => a.value.localeCompare(b.value));
      }
    }

    return selectedQuestions;
  }

  async submitAnswers(
    eventId: string,
    userId: string,
    createSlideAnswersDto: CreateSlideAnswersDto,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    const existingResponses = await this.eventResponseRepository.find({
      where: { eventId, userId },
    });

    if (existingResponses.length > 0) {
      throw new BadRequestException('You have already submitted your slide answers for this event.');
    }

    const answersToSave = createSlideAnswersDto.answers.map((answer) => {
      const normalizedWeight = typeof answer.weight === 'number' ? answer.weight : 0;

      return this.eventResponseRepository.create({
        eventId,
        userId,
        question: answer.question,
        answerValue: answer.answerValue,
        weight: normalizedWeight,
        user,
      });
    });

    await this.eventResponseRepository.save(answersToSave);

    // Only transition to RECOMMENDED when all group members have answered (for group events)
    if (event.eventType === EventType.GROUP && event.groupId) {
      const group = await this.groupRepository.findOne({
        where: { id: event.groupId },
        relations: ['members'],
      });

      if (group && group.members && group.members.length > 0) {
        const groupMemberIds = group.members.map((m) => m.userId);
        const answeredUserIds = new Set(
          (
            await this.eventResponseRepository.find({
              where: { eventId },
              select: ['userId'],
            })
          ).map((r) => r.userId),
        );

        const allMembersAnswered = groupMemberIds.every((memberId) =>
          answeredUserIds.has(memberId),
        );

        if (allMembersAnswered) {
          await this.eventRepository.update(
            { id: eventId },
            { status: EventStatus.RECOMMENDED },
          );
        }
      }
    } else {
      // For individual events, immediately transition to RECOMMENDED
      await this.eventRepository.update(
        { id: eventId },
        { status: EventStatus.RECOMMENDED },
      );
    }

    return {
      message: 'Slide answers submitted successfully',
      count: answersToSave.length,
    };
  }

  async getEventAnswers(eventId: string) {
    const answers = await this.eventResponseRepository.find({
      where: { eventId },
    });

    return answers;
  }
}
