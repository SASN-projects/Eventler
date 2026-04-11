import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';

@Controller('recommendations')
// @UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('feed')
  getFeed() {
    return this.recommendationsService.getFeed();
  }

  @Post('for-event/:eventId')
  async createForEvent(
    @Param('eventId') eventId: string,
    @Body() createRecommendationsDto: CreateRecommendationDto,
  ) {
    return await this.recommendationsService.createForEvent(
      eventId,
      createRecommendationsDto,
    );
  }
}
