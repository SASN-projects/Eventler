import { EventType } from './../enums/event.enums';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
// import { EventType } from './event-type.entity';
import { Venue } from '../../venues/entities/venue.entity';
// import { Transportation } from '../../users/enums/transportation.enum';
import { EventStatus } from '../enums/event-status.enum';
import { EventParticipant } from './event-participant.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ length: 200 })
    title: string;

  @Column('text')
    description: string;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
    status: EventStatus;

  @Column({ name: 'created_by' })
    createdById: string;

  @Column({ name: 'group_id' })
    groupId: string;

  @Column({ name: 'event_type' })
    eventType: EventType;

  @Column({ name: 'target_date', type: 'date' })
    targetDate: string;

  @Column({ name: 'target_date_from', type: 'date' })
    targetDateFrom: string;

  @Column({ name: 'target_date_to', type: 'date' })
    targetDateTo: string;

  @Column({ name: 'deadline_at', type: 'timestamp' })
    deadlineAt: Date;

  @Column({ name: 'participant_count', type: 'integer' })
    participantCount: number;

  // @Column('decimal', { name: 'budget_min', precision: 10, scale: 2 })
  //   budgetMin: number;

  // @Column('decimal', { name: 'budget_max', precision: 10, scale: 2 })
  //   budgetMax: number;

  @Column({ name: 'location_city', length: 120 })
    locationCity: string;

  @Column({ name: 'location_country', length: 120 })
    locationCountry: string;

  // @Column({ name: 'transportation_method', type: 'varchar', length: 20 })
  //   transportationMethod: Transportation;

  // @Column({ name: 'preferred_vibe', length: 50 })
  //   preferredVibe: string;

  @Column({ name: 'selected_venue_id' })
    selectedVenueId: string;

  @Column({ name: 'finalized_at', type: 'timestamp' })
    finalizedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
    creator: User;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
    group: Group;

  // @ManyToOne(() => EventType)
  // @JoinColumn({ name: 'event_type_id' })
  //   eventType: EventType;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'selected_venue_id' })
    selectedVenue: Venue;

  @OneToMany(() => EventParticipant, (participant) => participant.event)
    participants: EventParticipant[];
}
