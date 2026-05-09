import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventType } from './entities/event-type.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { SlidesModule } from 'src/slides/slides.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventType, GroupMember]), SlidesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule { }
