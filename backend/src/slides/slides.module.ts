import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';
import { EventResponse } from 'src/events/entities/event-response.entity';
import { SliderQuestion } from './entities/slider-question.entity';
import { User } from 'src/auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SlideAnswer, EventResponse, SliderQuestion, Event, User, Group])],
  controllers: [SlidesController],
  providers: [SlidesService],
  exports: [SlidesService],
})
export class SlidesModule { }
