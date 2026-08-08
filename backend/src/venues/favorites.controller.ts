import { Controller, Get, Post, Delete, Param, ParseUUIDPipe, UseGuards, Request, HttpCode } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';

@Controller('users/me/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  listFavorites(@Request() req: AuthRequest) {
    return this.favoritesService.listFavorites(req.user.sub);
  }

  @Post(':venueId')
  @HttpCode(204)
  async addFavorite(@Request() req: AuthRequest, @Param('venueId', ParseUUIDPipe) venueId: string) {
    await this.favoritesService.addFavorite(req.user.sub, venueId);
  }

  @Delete(':venueId')
  @HttpCode(204)
  async removeFavorite(@Request() req: AuthRequest, @Param('venueId', ParseUUIDPipe) venueId: string) {
    await this.favoritesService.removeFavorite(req.user.sub, venueId);
  }
}
