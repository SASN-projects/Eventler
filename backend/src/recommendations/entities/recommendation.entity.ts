import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column()
    title: string;

  @Column({ name: 'event_id', nullable: true })
    eventId?: string;

  @ManyToOne(() => Event, event => event.generatedRecommendations, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
    event?: Event;

  @Column({ type: 'text' })
    description: string;

  @Column()
    address: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
