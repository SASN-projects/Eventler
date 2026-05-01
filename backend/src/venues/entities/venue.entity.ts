import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { FavoriteVenue } from './favorite-venue.entity';
import { Event } from '../../events/entities/event.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ length: 200 })
    name: string;

  @Column({ length: 100 })
    category: string;

  @Column('text')
    description: string;

  @Column('text')
    address: string;

  @Column({ length: 120 })
    city: string;

  @Column({ length: 120 })
    country: string;

  @Column({ name: 'price_level', type: 'smallint' })
    priceLevel: number;

  @Column({ type: 'numeric', precision: 3, scale: 2 })
    rating: number;

  @Column({ length: 100 })
    source: string;

  @Column({ name: 'external_source_id', length: 255 })
    externalSourceId: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToMany(() => FavoriteVenue, (favorite) => favorite.venue)
    favorites: FavoriteVenue[];

  @OneToMany(() => Event, (event) => event.selectedVenue)
    events: Event[];
}
