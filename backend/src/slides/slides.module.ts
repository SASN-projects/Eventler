import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';
import { EventResponse } from 'src/events/entities/event-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SlideAnswer, EventResponse])],
  controllers: [SlidesController],
  providers: [SlidesService],
  exports: [SlidesService],
})
export class SlidesModule { }
