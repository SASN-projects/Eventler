import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { FavoriteVenue } from './entities/favorite-venue.entity';
import { FavoriteVenueListItem } from './dto/favorites-list-item.dto';
import { GooglePlacesService } from '../recommendations/google-places.service';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(FavoriteVenue)
    private readonly favoriteRepository: Repository<FavoriteVenue>,
    private readonly googlePlacesService: GooglePlacesService,
  ) {}

  async addFavorite(userId: string, venueId: string): Promise<void> {
    const venue = await this.venueRepository.findOneBy({ id: venueId });
    if (!venue) {
      throw new NotFoundException(`Venue with id ${venueId} not found`);
    }

    await this.favoriteRepository
      .createQueryBuilder()
      .insert()
      .into(FavoriteVenue)
      .values({ userId, venueId })
      .orIgnore()
      .execute();
  }

  async removeFavorite(userId: string, venueId: string): Promise<void> {
    await this.favoriteRepository.delete({ userId, venueId });
  }

  async listFavorites(userId: string): Promise<FavoriteVenueListItem[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      favorites
        .filter((favorite) => favorite.venue)
        .map(async (favorite) => ({
          id: favorite.venue.id,
          title: favorite.venue.name,
          address: favorite.venue.address,
          imageUrl: await this.resolvePhotoUrl(favorite.venue.photoReference),
          rating: favorite.venue.rating,
          category: favorite.venue.category,
          priceLevel: favorite.venue.priceLevel,
          favoritedAt: favorite.createdAt,
        })),
    );
  }

  async getFavoriteVenueIdSet(userId: string, venueIds: string[]): Promise<Set<string>> {
    if (venueIds.length === 0) return new Set();

    const rows = await this.favoriteRepository
      .createQueryBuilder('favorite')
      .select('favorite.venueId', 'venueId')
      .where('favorite.userId = :userId', { userId })
      .andWhere('favorite.venueId IN (:...venueIds)', { venueIds })
      .getRawMany<{ venueId: string }>();

    return new Set(rows.map((row) => row.venueId));
  }

  private async resolvePhotoUrl(photoReference: string | null): Promise<string | null> {
    if (!photoReference) return null;

    try {
      const photoUrl = await this.googlePlacesService.getPhotoUri(photoReference);
      return photoUrl ?? null;
    } catch (error: any) {
      this.logger.warn(`Failed to resolve photo for reference ${photoReference}: ${error.message}`);
      return null;
    }
  }
}
