import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { EventType } from '../../events/entities/event-type.entity';
import { Transportation } from '../enums/transportation.enum';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'user_id' })
    userId: string;

  @Column({ nullable: true })
    budget: number;

  @Column({ nullable: true })
    location: string;

  @Column({ name: 'event_type_id', nullable: true })
    eventTypeId: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
    transportation: Transportation;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
    user: User;

  @ManyToOne(() => EventType, { nullable: true })
  @JoinColumn({ name: 'event_type_id' })
    eventType: EventType;
}
