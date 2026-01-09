import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ProcessType } from '../enums/process-type.enum';

export class CreateEventDto {
  @IsEnum(ProcessType)
    processType: ProcessType;

  @IsUUID()
  @IsOptional()
    groupId?: string;

  @IsUUID()
  @IsOptional()
    eventTypeId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
    participantCount?: number;

  @IsDateString()
  @IsOptional()
    date?: string;

  @IsString()
  @IsOptional()
    location?: string;

  @IsNumber()
  @IsOptional()
    budget?: number;
}
