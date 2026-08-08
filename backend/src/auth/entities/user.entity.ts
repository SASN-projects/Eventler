import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { UserPreferences } from '../../users/entities/user-preferences.entity';
import { FavoriteVenue } from '../../venues/entities/favorite-venue.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'first_name', length: 100 })
    firstName: string;

  @Column({ name: 'last_name', length: 100 })
    lastName: string;

  @Column({ unique: true })
    email: string;

  @Column({ unique: true })
    username: string;

  @Column({ name: 'password_hash' })
    password: string;

  @Column({ length: 120 })
    city: string;

  @Column({ length: 120 })
    country: string;

  @Column({ length: 255 })
    occupation: string;

  @Column({ name: 'date_of_birth', type: 'date' })
    dateOfBirth: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToOne(() => UserPreferences, (preferences) => preferences.user)
    preferences: UserPreferences;

  @OneToMany(() => FavoriteVenue, (favorite) => favorite.user)
    favoriteVenues: FavoriteVenue[];
}
