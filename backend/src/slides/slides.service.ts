import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlideAnswer } from './entities/slide-answer.entity';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';

@Injectable()
export class SlidesService {
  constructor(
    @InjectRepository(SlideAnswer)
    private slideAnswerRepository: Repository<SlideAnswer>,
  ) { }

  getSlides() {
    // This would typically return slide questions/templates
    // For now, return a sample structure
    return {
      slides: [
        { question: 'What is your preferred budget?', type: 'number' },
        { question: 'What type of event do you prefer?', type: 'choice' },
        { question: 'Preferred location?', type: 'text' },
        { question: 'Transportation preference?', type: 'choice' },
      ],
    };
  }

  async submitAnswers(
    eventId: string,
    userId: string,
    createSlideAnswersDto: CreateSlideAnswersDto,
  ) {
    const answers = createSlideAnswersDto.answers.map((answer) =>
      this.slideAnswerRepository.create({
        eventId,
        userId,
        question: answer.question,
        answer: answer.answer,
        weight: answer.weight,
      }),
    );

    await this.slideAnswerRepository.save(answers);

    return {
      message: 'Slide answers submitted successfully',
      count: answers.length,
    };
  }

  async getEventAnswers(eventId: string) {
    const answers = await this.slideAnswerRepository.find({
      where: { eventId },
      relations: ['user'],
    });

    return answers;
  }
}
