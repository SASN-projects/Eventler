import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'event_id' })
    eventId: string;

  @Column()
    title: string;

  @Column({ type: 'decimal', nullable: true })
    score: number;

  @Column({ nullable: true })
    rank: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
    event: Event;
}
