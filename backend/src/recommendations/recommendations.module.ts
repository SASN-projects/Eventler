import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from 'src/venues/entities/venue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recommendation, Event, Venue])],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
