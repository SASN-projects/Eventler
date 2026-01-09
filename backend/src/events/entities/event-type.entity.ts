import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('event_types')
export class EventType {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ unique: true, length: 100 })
    name: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
