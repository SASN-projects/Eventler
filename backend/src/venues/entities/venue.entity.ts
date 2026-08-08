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

  @Column({ name: 'price_level', type: 'smallint', nullable: true })
    priceLevel: number | null;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
    rating: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
    source: string | null;

  @Column({ name: 'external_source_id', type: 'varchar', length: 255, nullable: true })
    externalSourceId: string | null;

  @Column({ name: 'photo_reference', type: 'text', nullable: true })
    photoReference: string | null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToMany(() => FavoriteVenue, (favorite) => favorite.venue)
    favorites: FavoriteVenue[];

  @OneToMany(() => Event, (event) => event.selectedVenue)
    events: Event[];
}
