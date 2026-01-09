import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { EventType } from './event-type.entity';
import { ProcessType } from '../enums/process-type.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'creator_id' })
    creatorId: string;

  @Column({ name: 'group_id', nullable: true })
    groupId: string;

  @Column({ name: 'event_type_id', nullable: true })
    eventTypeId: string;

  @Column({ name: 'process_type', type: 'varchar', length: 20 })
    processType: ProcessType;

  @Column({ name: 'participant_count', nullable: true })
    participantCount: number;

  @Column({ nullable: true })
    budget: number;

  @Column({ nullable: true })
    location: string;

  @Column({ nullable: true })
    date: Date;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
    creator: User;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
    group: Group;

  @ManyToOne(() => EventType, { nullable: true })
  @JoinColumn({ name: 'event_type_id' })
    eventType: EventType;
}
