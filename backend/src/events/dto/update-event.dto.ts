import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Transportation } from '../../users/enums/transportation.enum';
import { EventStatus } from '../enums/event-status.enum';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
    title?: string;

  @IsString()
  @IsOptional()
    description?: string;

  @IsEnum(EventStatus)
  @IsOptional()
    status?: EventStatus;

  @IsUUID()
  @IsOptional()
    groupId?: string;

  @IsUUID()
  @IsOptional()
    eventTypeId?: string;

  @IsDateString()
  @IsOptional()
    targetDate?: string;

  @IsDateString()
  @IsOptional()
    targetDateFrom?: string;

  @IsDateString()
  @IsOptional()
    targetDateTo?: string;

  @IsDateString()
  @IsOptional()
    deadlineAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
    participantCount?: number;

  @IsNumber()
  @IsOptional()
    budgetMin?: number;

  @IsNumber()
  @IsOptional()
    budgetMax?: number;

  @IsString()
  @IsOptional()
    locationCity?: string;

  @IsString()
  @IsOptional()
    locationCountry?: string;

  @IsEnum(Transportation)
  @IsOptional()
    transportationMethod?: Transportation;

  @IsString()
  @IsOptional()
    preferredVibe?: string;

  @IsUUID()
  @IsOptional()
    selectedVenueId?: string;

  @IsDateString()
  @IsOptional()
    finalizedAt?: string;
}
