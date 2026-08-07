import { BadRequestException, Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
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
import { GroupLifecycleService } from '../events/group-lifecycle.service';

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
    @Inject(forwardRef(() => GroupLifecycleService))
    private groupLifecycleService: GroupLifecycleService,
  ) {}

  async getSlides(userId: string, vibes?: string[]): Promise<SliderQuestion[]> {
    // 1. Fetch user to get their preferences
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    // 2. Fetch all questions from the database along with their options
    const allQuestions = await this.sliderQuestionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .orderBy('question.code', 'ASC')
      .addOrderBy('option.value', 'ASC')
      .getMany();

    // 3. Find the vibe selector question (always shown first when no active vibes)
    const vibeQuestion = allQuestions.find(q => q.code === 'vibe');

    // 4. Build the set of preferred question codes from user preferences.
    //    Map interest strings → new question codes (retired codes are intentionally absent).
    const preferredCodes = new Set<string>();

    const interestMapping: Record<string, string> = {
      budget:        'budget',
      cost:          'budget',
      price:         'budget',
      food:          'food-drinks',
      drinks:        'food-drinks',
      dining:        'activity',
      outdoor:       'setting',
      indoor:        'setting',
      active:        'energy-level',
      activity:      'activity',
      occasion:      'occasion',
      vibe:          'vibe',
      group:         'group-dynamic',
      social:        'group-dynamic',
      accessibility: 'must-have',
      musthave:      'must-have',
    };

    if (user?.preferences?.interests) {
      user.preferences.interests.forEach(interest => {
        const mappedCode = interestMapping[interest.toLowerCase()];
        if (mappedCode) {
          preferredCodes.add(mappedCode);
        }
      });
    }

    // Auto-detect preference fields
    if (user?.preferences?.preferredBudgetMin !== undefined ||
        user?.preferences?.preferredBudgetMax !== undefined) {
      preferredCodes.add('budget');
    }

    // Exclude vibe from preferredCodes — it is handled separately as the first question
    preferredCodes.delete('vibe');

    const preferredQuestions = allQuestions.filter(q =>
      preferredCodes.has(q.code) && q.code !== 'vibe',
    );

    // 5. Determine active vibes for tag-based follow-up questions
    const activeVibes: string[] = vibes ? [...vibes] : [];
    if (activeVibes.length === 0 && user?.preferences?.preferredVibe) {
      activeVibes.push(user.preferences.preferredVibe);
    }

    const knownVibes = ['dining', 'sightseeing', 'active', 'clubbing', 'casual', 'cultural'];
    if (activeVibes.length === 0 && user?.preferences?.interests) {
      user.preferences.interests.forEach(interest => {
        if (knownVibes.includes(interest.toLowerCase())) {
          activeVibes.push(interest.toLowerCase());
        }
      });
    }

    // 6. Filter tag-based follow-up questions (not vibe, not already preferred)
    let vibeFollowUpQuestions: SliderQuestion[] = [];
    if (activeVibes.length > 0) {
      vibeFollowUpQuestions = allQuestions.filter(q =>
        q.code !== 'vibe' &&
        !preferredCodes.has(q.code) &&
        q.tags &&
        q.tags.some(tag => activeVibes.includes(tag)),
      );
    }

    // Fallback: when no tag-based follow-ups found, use all remaining non-vibe non-preferred questions
    if (vibeFollowUpQuestions.length === 0) {
      vibeFollowUpQuestions = allQuestions.filter(q =>
        q.code !== 'vibe' &&
        !preferredCodes.has(q.code),
      );
    }

    // 7. Shuffle follow-up questions randomly for variety
    const shuffledFollowUps = [...vibeFollowUpQuestions].sort(() => Math.random() - 0.5);

    // 8. Select follow-ups to fill up to 7 questions total
    //    (vibe question counts as 1 if shown first)
    const includeVibe = (vibeQuestion && (!vibes || vibes.length === 0)) ? 1 : 0;
    const targetTotal = 7;
    const needed = Math.max(0, targetTotal - includeVibe - preferredQuestions.length);
    const selectedFollowUps = shuffledFollowUps.slice(0, needed);

    // 9. Assemble final list: vibe first (if applicable), then preferred, then follow-ups
    const resultQuestions: SliderQuestion[] = [];
    if (vibeQuestion && includeVibe) {
      resultQuestions.push(vibeQuestion);
    }
    resultQuestions.push(...preferredQuestions);
    resultQuestions.push(...selectedFollowUps);

    // 10. Sort options alphabetically within each question (vibe question options stay as-is)
    for (const q of resultQuestions) {
      if (q.options && q.code !== 'vibe') {
        q.options.sort((a, b) => a.value.localeCompare(b.value));
      }
    }

    return resultQuestions;
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

    // ── Lazy deadline check (group events only) ───────────────────────────
    // If the event's closeAt has passed and it's still OPEN, auto-close before
    // processing the answer so we return the correct rejection message.
    if (event.eventType === EventType.GROUP) {
      const closedByDeadline = await this.groupLifecycleService.checkAndCloseIfDeadlinePassed(event);
      if (closedByDeadline) {
        // Re-load the updated event so the status gate below fires correctly
        const refreshed = await this.eventRepository.findOne({ where: { id: eventId } });
        if (refreshed) Object.assign(event, refreshed);
      }
    }

    // ── OPEN gate: reject answers for closed group questionnaires ─────────
    if (event.eventType === EventType.GROUP && event.status !== EventStatus.OPEN) {
      throw new BadRequestException(
        'Questionnaire is closed. No new answers are accepted.',
      );
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

    if (event.eventType === EventType.GROUP && event.groupId) {
      // ── Group event: check if all members have now answered ───────────
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

        // Delegate close + generation to GroupLifecycleService
        await this.groupLifecycleService.checkAndCloseIfAllMembersAnswered(
          eventId,
          answeredUserIds,
          groupMemberIds,
        );
      }
    } else {
      // ── Individual event: immediately ready for recommendations ───────
      await this.eventRepository.update(
        { id: eventId },
        { status: EventStatus.RECOMMENDATIONS_READY },
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
