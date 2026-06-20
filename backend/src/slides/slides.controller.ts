import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SlidesService } from './slides.service';
import { CreateSlideAnswersDto } from './dto/create-slide-answers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';

@Controller('slides')
@UseGuards(JwtAuthGuard)
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) { }

  @Get()
  getSlides(@Request() req: AuthRequest) {
    const userId = req?.user?.sub || '11111111-1111-1111-1111-111111111111';
    return this.slidesService.getSlides(userId);
  }

  @Post('submit-answers/:eventId')
  async submitAnswers(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
    @Body() createSlideAnswersDto: CreateSlideAnswersDto,
  ) {
    return await this.slidesService.submitAnswers(
      eventId,
      req.user.sub,
      createSlideAnswersDto,
    );
  }

  @Get('event-answers/:eventId')
  async getEventAnswers(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
  ) {
    return await this.slidesService.getEventAnswers(eventId);
  }
}
