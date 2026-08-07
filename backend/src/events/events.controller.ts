import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';
import { SlidesService } from 'src/slides/slides.service';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly slidesService: SlidesService,
  ) {}

  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() createEventDto: CreateEventDto,
  ) {
    return await this.eventsService.create(req.user.sub, createEventDto);
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.eventsService.findOne(id, req.user.sub);
  }

  @Put(':id')
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return await this.eventsService.update(id, req.user.sub, updateEventDto);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.eventsService.remove(id, req.user.sub);
  }

  /**
   * Owner-triggered manual close of a group questionnaire.
   * Transitions: OPEN → CLOSED → GENERATING_RECOMMENDATIONS → RECOMMENDATIONS_READY
   */
  @Post(':id/close')
  async closeQuestionnaire(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.eventsService.closeQuestionnaire(id, req.user.sub);
  }

  /**
   * Owner-triggered final recommendation selection.
   * Validates RECOMMENDATIONS_READY status and rec-to-event ownership.
   * Transitions: RECOMMENDATIONS_READY → FINAL_SELECTION_MADE
   */
  @Post(':id/select-recommendation/:recommendationId')
  async selectFinalRecommendation(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('recommendationId') recommendationId: string,
  ) {
    return await this.eventsService.selectFinalRecommendation(id, recommendationId, req.user.sub);
  }

  @Post('recommendations/:id')
  async createRecommendations(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return await this.eventsService.createRecommendations(id, req.user.sub);
  }

  @Get('recommendations/:id')
  async getRecommendations(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return await this.eventsService.getRecommendations(id, req.user.sub);
  }

  @Get('types/all')
  async getAllEventTypes() {
    return await this.eventsService.getAllEventTypes();
  }

  @Get('types/:id')
  async getEventTypeById(@Param('id') id: string) {
    return await this.eventsService.getEventTypeById(id);
  }

  @Get('event-answers/:eventId')
  async getEventAnswers(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
  ) {
    const event = await this.eventsService.findOne(eventId, req.user.sub);
    const answers = await this.slidesService.getEventAnswers(eventId);

    return { event, answers };
  }
}
