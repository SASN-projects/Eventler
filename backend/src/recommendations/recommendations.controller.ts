import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateRecommendationDTO } from './dto/generate-recommendation.dto';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('feed')
  getFeed() {
    return this.recommendationsService.getFeed();
  }

  @Post('generate')
  async generateRecommendation(@Body() body: GenerateRecommendationDTO) {
    return await this.recommendationsService.generateRecommendation(body);
  }
}
