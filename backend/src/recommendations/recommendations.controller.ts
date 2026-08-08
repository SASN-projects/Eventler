import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';
// import { CreateRecommendationDto } from './dto/create-recommendation.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  // @Get('for-event/:eventId')
  // getEventRecommendations(@Param('eventId') eventId: string) {
  //   return this.recommendationsService.getEventRecommendations(eventId);
  // }

  @Get('feed')
  getFeed() {
    return this.recommendationsService.getFeed();
  }

  /**
   * Manually trigger recommendation generation for an event.
   * Only the event creator (owner) may call this.
   * For group events, the questionnaire must already be CLOSED (or the
   * GroupLifecycleService is coordinating the call internally).
   */
  @Post('events/:eventId/generate')
  async generateRecommendation(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
  ) {
    return await this.recommendationsService.generateRecommendation(eventId, req.user.sub);
  }

  @Post('events/:eventId/select/:recommendationId')
  async selectRecommendation(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
    @Param('recommendationId') recommendationId: string,
  ) {
    return await this.recommendationsService.selectRecommendation(eventId, recommendationId, req.user.sub);
  }

  // @Post('for-event/:eventId')
  // async createForEvent(
  //   @Param('eventId') eventId: string,
  //   @Body() createRecommendationsDto: CreateRecommendationDto,
  // ) {
  //   return await this.recommendationsService.createForEvent(
  //     eventId,
  //     createRecommendationsDto,
  //   );
  // }
}
