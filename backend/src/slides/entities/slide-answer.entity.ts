import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('slide_answers')
export class SlideAnswer {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'event_id' })
    eventId: string;

  @Column({ name: 'user_id' })
    userId: string;

  @Column()
    question: string;

  @Column()
    answer: string;

  @Column({ nullable: true })
    weight: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
    event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;
}
