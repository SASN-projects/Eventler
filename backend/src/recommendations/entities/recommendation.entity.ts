import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'event_id' })
    eventId: string;

  @Column({ name: 'venue_id', nullable: true })
    venueId: string;

  @Column('decimal', { precision: 8, scale: 4 })
    score: number;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
    event: Event;

  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn({ name: 'venue_id' })
    venue: Venue;
}
