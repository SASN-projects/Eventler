import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../auth/entities/user.entity';
// import { SliderQuestion } from '../../slides/entities/slider-question.entity';

@Index(['eventId', 'userId', 'question'], { unique: true })
@Entity('event_responses')
export class EventResponse {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'event_id' })
    eventId: string;

  @Column({ name: 'user_id' })
    userId: string;

  @Column({ name: 'question' })
    question: string;

  @Column('text', { name: 'answer_value', nullable: true })
    answerValue: string;

  @Column({ name: 'min_value', type: 'integer', nullable: true })
    minValue: number;

  @Column({ name: 'max_value', type: 'integer', nullable: true })
    maxValue: number;

  @Column({ type: 'integer', nullable: true })
    weight: number;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
    event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;

  // @ManyToOne(() => SliderQuestion)
  // @JoinColumn({ name: 'question_id' })
  //   question: SliderQuestion;
}
