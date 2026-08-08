import { Controller, Get, Post, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly feedService: FeedService,
  ) {}

  @Get('feed')
  getFeed(@Request() req: AuthRequest, @Query() query: FeedQueryDto) {
    return this.feedService.getFeed(req.user.sub, query);
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
}
