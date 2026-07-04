import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersListController } from './users-list.controller';
import { DevUsersController } from './dev-users.controller';
import { UsersService } from './users.service';
import { User } from '../auth/entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { EventType } from '../events/entities/event-type.entity';
import { Event } from '../events/entities/event.entity';
import { EventResponse } from '../events/entities/event-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreferences, EventType, Event, EventResponse])],
  controllers: [UsersListController, UsersController, DevUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
