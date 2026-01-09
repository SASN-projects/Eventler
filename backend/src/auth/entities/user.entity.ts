import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { UserPreferences } from '../../users/entities/user-preferences.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ unique: true })
    email: string;

  @Column({ unique: true })
    username: string;

  @Column()
    password: string;

  @Column({ nullable: true })
    city: string;

  @Column({ nullable: true })
    age: number;

  @Column({ nullable: true })
    occupation: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToOne(() => UserPreferences, (preferences) => preferences.user)
    preferences: UserPreferences;
}
