import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { FeedService } from './feed.service';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import { RecommendationPromptContextBuilder } from './recommendation-prompt-context.builder';
import { RecommendationHistoryService } from './recommendation-history.service';
import { GooglePlacesService } from './google-places.service';
import { Recommendation } from './entities/recommendation.entity';
import { UserFeedItem } from './entities/user-feed-item.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../auth/entities/user.entity';
import { Venue } from 'src/venues/entities/venue.entity';
import { UserPreferences } from 'src/users/entities/user-preferences.entity';
import { SlideAnswer } from 'src/slides/entities/slide-answer.entity';
import { SlidesModule } from 'src/slides/slides.module';
import { GeminiModule } from '../gemini/gemini.module';
import { VenuesModule } from '../venues/venues.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, Event, Venue, SlideAnswer, UserFeedItem, UserPreferences, User]),
    SlidesModule,
    GeminiModule,
    VenuesModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    FeedService,
    RecommendationQualityEvaluator,
    RecommendationJudgeService,
    RecommendationPromptContextBuilder,
    RecommendationHistoryService,
    GooglePlacesService,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
