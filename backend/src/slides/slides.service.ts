import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlideAnswer } from './entities/slide-answer.entity';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';
import { SliderQuestion } from './entities/slider-question.entity';
import { EventResponse } from 'src/events/entities/event-response.entity';
import { User } from 'src/auth/entities/user.entity';

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
  ) {}

  async getSlides(): Promise<SliderQuestion[]> {
    const subQuery = this.sliderQuestionRepository
      .createQueryBuilder('subQuestion')
      .select('subQuestion.id')
      .orderBy('RANDOM()')
      .limit(4)
      .getQuery();

    return this.sliderQuestionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .where(`question.id IN (${subQuery})`)
      .orderBy('question.code', 'ASC')
      .addOrderBy('option.value', 'ASC')
      .getMany();
  }

  async submitAnswers(
    eventId: string,
    userId: string = '11111111-1111-1111-1111-111111111111',
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
