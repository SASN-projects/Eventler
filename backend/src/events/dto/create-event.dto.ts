import {
  IsEnum,
  // IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
// import { Transportation } from '../../users/enums/transportation.enum';
import { EventStatus } from '../enums/event-status.enum';
import { EventType } from '../enums/event.enums';

export class CreateEventDto {
  @IsString()
    title: string;

  @IsString()
    description: string;

  @IsEnum(EventStatus)
  @IsOptional()
    status?: EventStatus = EventStatus.DRAFT;

  @IsUUID()
  @IsOptional()
    groupId: string;

  @IsEnum(EventType)
    eventType: EventType;

  @IsDateString()
    targetDate: string;

  @IsDateString()
    targetDateFrom: string;

  @IsDateString()
    targetDateTo: string;

  @IsDateString()
    deadlineAt: string;

  @IsDateString()
  @IsOptional()
    closeAt?: string;

  @IsInt()
  @Min(1)
    participantCount: number;

  // @IsNumber()
  //   budgetMin: number;

  // @IsNumber()
  //   budgetMax: number;

  @IsString()
    locationCity: string;

  @IsString()
    locationCountry: string;

  // @IsEnum(Transportation)
  //   transportationMethod: Transportation;

  // @IsString()
  //   preferredVibe: string;

  @IsUUID()
  @IsOptional()
    selectedVenueId: string;

  @IsDateString()
  @IsOptional()
    finalizedAt?: string;
}
