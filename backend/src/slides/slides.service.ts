import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlideAnswer } from './entities/slide-answer.entity';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';
import { SliderQuestion } from './entities/slider-question.entity';
import { AnswerMode } from 'src/events/enums/answer-mode.enum';
import { EventResponse } from 'src/events/entities/event-response.entity';

@Injectable()
export class SlidesService {
  constructor(
    @InjectRepository(SlideAnswer)
    private slideAnswerRepository: Repository<SlideAnswer>,
    @InjectRepository(EventResponse)
    private eventResponseRepository: Repository<EventResponse>,
  ) {}

  getSlides(): SliderQuestion[] {
    // This would typically return slide questions/templates
    // For now, return a sample structure
    return [
      {
        id: '1',
        code: 'budget',
        label: 'What is your preferred budget?',
        description: '',
        answerMode: AnswerMode.CHOICE,
        createdAt: new Date(),
        options: [{
          id: '1',
          value: 'Low (Under 50 NIS)',
          questionId: '',
          createdAt: new Date(),
          question: new SliderQuestion(),
        }, {
          id: '2',
          value: 'Medium (50-150 NIS)',
          questionId: '',
          createdAt: new Date(),
          question: new SliderQuestion(),
        }, {
          id: '3',
          value: 'High (150-300 NIS)',
          questionId: '',
          createdAt: new Date(),
          question: new SliderQuestion(),
        }, {
          id: '4',
          value: 'Luxury (Over 300 NIS)',
          questionId: '',
          createdAt: new Date(),
          question: new SliderQuestion(),
        }],
      },
      {
        id: '2',
        code: 'event-type',
        label: 'What type of event do you prefer?',
        description: '',
        answerMode: AnswerMode.CHOICE,
        createdAt: new Date(),
        options: [
          {
            id: '1',
            value: 'Party and Social Gathering',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '2',
            value: 'Relaxation and Wellness',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '3',
            value: 'Restaurant and Dining',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '4',
            value: 'Outdoor and Adventure',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
        ],
      },
      {
        id: '3',
        code: 'Transportation',
        label: 'Transportation preference?',
        description: '',
        answerMode: AnswerMode.CHOICE,
        createdAt: new Date(),
        options: [
          {
            id: '1',
            value: 'Car',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '2',
            value: 'Public Transport',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '3',
            value: 'Bike',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '4',
            value: 'Walking',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
        ],
      },
      {
        id: '4',
        code: 'Crowd',
        label: 'Preferred crowd size?',
        description: '',
        answerMode: AnswerMode.CHOICE,
        createdAt: new Date(),
        options: [
          {
            id: '1',
            value: 'Small (1-10 people)',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '2',
            value: 'Medium (11-50 people)',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '3',
            value: 'Large (51-100 people)',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
          {
            id: '4',
            value: 'Very Large (101+ people)',
            questionId: '',
            createdAt: new Date(),
            question: new SliderQuestion(),
          },
        ],
      },
    ];
  }

  async submitAnswers(
    eventId: string,
    userId: string = '11111111-1111-1111-1111-111111111111',
    createSlideAnswersDto: CreateSlideAnswersDto,
  ) {
    const answers = createSlideAnswersDto.answers.map((answer) =>
    //   this.eventResponseRepository.create({
    //     eventId,
    //     userId,
    //     question: answer.question,
    //     answer: answer.answer,
    //     weight: answer.weight,
    //   }),
    // );
      this.eventResponseRepository.create({
        eventId,
        userId,
        question: answer.question,
        answerValue: answer.answerValue,
        weight: answer.weight,
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
      relations: ['user'],
    });

    return answers;
  }
}
