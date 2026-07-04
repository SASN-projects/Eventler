import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Event } from '../events/entities/event.entity';
import { EventResponse } from '../events/entities/event-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, Event, EventResponse])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule { }
