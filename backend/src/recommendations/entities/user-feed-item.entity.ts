import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('user_feed_items')
export class UserFeedItem {
  @PrimaryColumn('uuid', { name: 'user_id' })
    userId: string;

  @PrimaryColumn('uuid', { name: 'venue_id' })
    venueId: string;

  @Column('int')
    rank: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
    score: number | null;

  @Column({ name: 'generated_at' })
    generatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
    venue: Venue;
}
