import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from 'src/venues/entities/venue.entity';
import { SlideAnswer } from 'src/slides/entities/slide-answer.entity';
import { SlidesModule } from 'src/slides/slides.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recommendation, Event, Venue, SlideAnswer]), SlidesModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
