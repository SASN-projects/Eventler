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

    // 5. Select enough other questions to reach 6 total
    const needed = Math.max(0, 6 - preferredQuestions.length);
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
