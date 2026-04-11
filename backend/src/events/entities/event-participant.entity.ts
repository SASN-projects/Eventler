import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../auth/entities/user.entity';
import { ParticipantStatus } from '../enums/participant-status.enum';

@Entity('event_participants')
export class EventParticipant {
  @PrimaryColumn({ name: 'event_id' })
    eventId: string;

  @PrimaryColumn({ name: 'user_id' })
    userId: string;

  @Column({ name: 'participant_status', type: 'varchar', length: 20, default: ParticipantStatus.PENDING })
    participantStatus: ParticipantStatus;

  @CreateDateColumn({ name: 'submitted_at' })
    submittedAt: Date;

  @ManyToOne(() => Event, (event) => event.participants)
  @JoinColumn({ name: 'event_id' })
    event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;
}
