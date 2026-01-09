import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transportation } from '../enums/transportation.enum';

export class UpdatePreferencesDto {
  @IsNumber()
  @IsOptional()
    budget?: number;

  @IsString()
  @IsOptional()
    location?: string;

  @IsUUID()
  @IsOptional()
    eventTypeId?: string;

  @IsEnum(Transportation)
  @IsOptional()
    transportation?: Transportation;
}
