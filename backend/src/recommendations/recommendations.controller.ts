import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('feed')
  getFeed() {
    return this.recommendationsService.getFeed();
  }

  @Post('events/:eventId/generate')
  async generateRecommendation(@Param('eventId') eventId: string) {
    return await this.recommendationsService.generateRecommendation(eventId);
  }
}
