import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SliderQuestion } from './slider-question.entity';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'question_id' })
    questionId: string;

  @Column({ length: 100 })
    value: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => SliderQuestion, (question) => question.options)
  @JoinColumn({ name: 'question_id' })
    question: SliderQuestion;
}
