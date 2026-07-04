import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlideAnswer } from './entities/slide-answer.entity';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';
import { SliderQuestion } from './entities/slider-question.entity';
import { EventResponse } from '../events/entities/event-response.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class SlidesService {
  constructor(
    @InjectRepository(SlideAnswer)
    private slideAnswerRepository: Repository<SlideAnswer>,
    @InjectRepository(EventResponse)
    private eventResponseRepository: Repository<EventResponse>,
    @InjectRepository(SliderQuestion)
    private sliderQuestionRepository: Repository<SliderQuestion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

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
      .getMany();

    // 3. Find the vibe selector question
    const vibeQuestion = allQuestions.find(q => q.code === 'vibe');

    // 4. Determine preferred questions based on user preferences and interests
    const preferredCodes = new Set<string>();
    
    // Map of common synonyms to question codes
    const interestMapping: Record<string, string> = {
      cost: 'budget',
      price: 'budget',
      budget: 'budget',
      transport: 'transportation',
      transit: 'transportation',
      travel: 'transportation',
      transportation: 'transportation',
      crowd: 'crowd',
      planning: 'planning-style',
      spontaneous: 'planning-style',
      location: 'location-type',
      spot: 'location-type',
      structure: 'evening-structure',
      stops: 'evening-structure',
    };

    if (user?.preferences?.interests) {
      user.preferences.interests.forEach(interest => {
        const mappedCode = interestMapping[interest.toLowerCase()];
        if (mappedCode) {
          preferredCodes.add(mappedCode);
        }
      });
    }

    // Auto-detect other fields in preferences
    if (user?.preferences?.preferredBudgetMin !== undefined || user?.preferences?.preferredBudgetMax !== undefined) {
      preferredCodes.add('budget');
    }
    if (user?.preferences?.preferredTransport) {
      preferredCodes.add('transportation');
    }

    // Exclude vibe from preferredCodes to avoid duplication
    preferredCodes.delete('vibe');

    // Filter the actual preferred questions
    const preferredQuestions = allQuestions.filter(q => 
      preferredCodes.has(q.code) && q.code !== 'vibe'
    );

    // 5. Determine active vibes for follow-up questions
    const activeVibes: string[] = vibes || [];
    if (activeVibes.length === 0) {
      if (user?.preferences?.preferredVibe) {
        activeVibes.push(user.preferences.preferredVibe);
      }
      
      const knownVibes = ['dining', 'sightseeing', 'active', 'clubbing', 'casual', 'cultural'];
      if (user?.preferences?.interests) {
        user.preferences.interests.forEach(interest => {
          if (knownVibes.includes(interest.toLowerCase())) {
            activeVibes.push(interest.toLowerCase());
          }
        });
      }
    }

    // 6. Filter tag-based follow-up questions (not vibe and not preferred)
    let vibeFollowUpQuestions: SliderQuestion[] = [];
    if (activeVibes && activeVibes.length > 0) {
      vibeFollowUpQuestions = allQuestions.filter(q => 
        q.code !== 'vibe' &&
        !preferredCodes.has(q.code) &&
        q.tags && 
        q.tags.some(tag => activeVibes.includes(tag))
      );
    }

    // Fallback if no follow-ups found: get other non-vibe non-preferred non-preference questions
    if (vibeFollowUpQuestions.length === 0) {
      vibeFollowUpQuestions = allQuestions.filter(q => 
        q.code !== 'vibe' && 
        !preferredCodes.has(q.code) &&
        (!q.tags || !q.tags.includes('preference'))
      );
    }

    // 7. Shuffle follow-up questions
    const shuffledFollowUps = [...vibeFollowUpQuestions].sort(() => Math.random() - 0.5);

    // 8. Select follow-ups to fill up to 6 questions total (vibe + preferred + follow-ups)
    const targetTotal = 6;
    const needed = Math.max(0, targetTotal - (vibeQuestion ? 1 : 0) - preferredQuestions.length);
    const selectedFollowUps = shuffledFollowUps.slice(0, needed);

    // 9. Assemble final list in the correct logical order:
    //    - What's your vibe? (First)
    //    - Preferred questions
    //    - Tag-based follow-ups
    const resultQuestions: SliderQuestion[] = [];
    if (vibeQuestion) {
      resultQuestions.push(vibeQuestion);
    }
    resultQuestions.push(...preferredQuestions);
    resultQuestions.push(...selectedFollowUps);

    // 10. Sort options alphabetically (except for the vibe question options)
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
    // ensure the (connected) user exists and fetch their data
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    const answers = createSlideAnswersDto.answers.map((answer) =>
      this.eventResponseRepository.create({
        eventId,
        userId,
        question: answer.question,
        answerValue: answer.answerValue,
        weight: answer.weight,
        user, // set relation to the fetched user entity
      }),
    );

    await this.eventResponseRepository.save(answers);

    return {
      message: 'Slide answers submitted successfully',
      count: answers.length,
    };
  }

  async getEventAnswers(eventId: string) {
    const answers = await this.eventResponseRepository.find({
      where: { eventId },
    });

    return answers;
  }
}
