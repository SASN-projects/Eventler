import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column('decimal', { name: 'preferred_budget_min', precision: 10, scale: 2 })
    preferredBudgetMin: number;

  @Column('decimal', { name: 'preferred_budget_max', precision: 10, scale: 2 })
    preferredBudgetMax: number;

  @Column('text', { name: 'preferred_location' })
    preferredLocation: string;

  @Column('decimal', { name: 'preferred_radius_km', precision: 6, scale: 2 })
    preferredRadiusKm: number;

  @Column({ name: 'preferred_transport', type: 'varchar', length: 20 })
    preferredTransport: Transportation;

  @Column({ name: 'preferred_vibe', length: 50 })
    preferredVibe: string;

  @Column({ name: 'preferred_time_from', type: 'time' })
    preferredTimeFrom: string;

  @Column({ name: 'preferred_time_to', type: 'time' })
    preferredTimeTo: string;

  @Column({ name: 'preferred_event_type' })
    preferredEventTypeId: string;

  @Column('text', { array: true })
    interests: string[];

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
    user: User;

  @ManyToOne(() => EventType, { nullable: true })
  @JoinColumn({ name: 'preferred_event_type' })
    eventType: EventType;
}
