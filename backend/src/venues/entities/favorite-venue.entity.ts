import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Venue } from './venue.entity';

@Entity('favorite_venues')
export class FavoriteVenue {
  @PrimaryColumn({ name: 'user_id' })
    userId: string;

  @PrimaryColumn({ name: 'venue_id' })
    venueId: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;

  @ManyToOne(() => Venue, (venue) => venue.favorites)
  @JoinColumn({ name: 'venue_id' })
    venue: Venue;
}
