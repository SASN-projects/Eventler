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

  @Post('events/:eventId/generate')
  async generateRecommendation(@Param('eventId') eventId: string) {
    return await this.recommendationsService.generateRecommendation(eventId);
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
