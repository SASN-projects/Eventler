import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { QuestionOption } from './question-option.entity';
import { AnswerMode } from '../../events/enums/answer-mode.enum';

@Entity('slider_questions')
export class SliderQuestion {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ unique: true, length: 100 })
    code: string;

  @Column({ length: 255 })
    label: string;

  @Column('text')
    description: string;

  @Column({ name: 'answer_mode', type: 'varchar', length: 50 })
    answerMode: AnswerMode;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @OneToMany(() => QuestionOption, (option) => option.question)
    options: QuestionOption[];
}
