import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import { RecommendationPromptContextBuilder } from './recommendation-prompt-context.builder';
import { RecommendationHistoryService } from './recommendation-history.service';
import { GooglePlacesService } from './google-places.service';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from 'src/venues/entities/venue.entity';
import { SlideAnswer } from 'src/slides/entities/slide-answer.entity';
import { SlidesModule } from 'src/slides/slides.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, Event, Venue, SlideAnswer]),
    SlidesModule,
    GeminiModule,
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RecommendationQualityEvaluator,
    RecommendationJudgeService,
    RecommendationPromptContextBuilder,
    RecommendationHistoryService,
    GooglePlacesService,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}


