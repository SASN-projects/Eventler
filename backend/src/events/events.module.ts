import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { GroupLifecycleService } from './group-lifecycle.service';
import { Event } from './entities/event.entity';
import { EventType } from './entities/event-type.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { SlidesModule } from 'src/slides/slides.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventType, GroupMember, Recommendation]),
    SlidesModule,
    forwardRef(() => RecommendationsModule),
  ],
  controllers: [EventsController],
  providers: [EventsService, GroupLifecycleService],
  exports: [EventsService, GroupLifecycleService],
})
export class EventsModule {}
