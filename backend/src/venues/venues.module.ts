import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { FavoriteVenue } from './entities/favorite-venue.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { GooglePlacesService } from '../recommendations/google-places.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venue, FavoriteVenue])],
  controllers: [FavoritesController],
  providers: [FavoritesService, GooglePlacesService],
  exports: [FavoritesService],
})
export class VenuesModule {}
