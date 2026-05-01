import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsArray } from 'class-validator';
import { Transportation } from '../enums/transportation.enum';

export class UpdatePreferencesDto {
  @IsNumber()
  @IsOptional()
    preferredBudgetMin?: number;

  @IsNumber()
  @IsOptional()
    preferredBudgetMax?: number;

  @IsString()
  @IsOptional()
    preferredLocation?: string;

  @IsNumber()
  @IsOptional()
    preferredRadiusKm?: number;

  @IsEnum(Transportation)
  @IsOptional()
    preferredTransport?: Transportation;

  @IsString()
  @IsOptional()
    preferredVibe?: string;

  @IsString()
  @IsOptional()
    preferredTimeFrom?: string;

  @IsString()
  @IsOptional()
    preferredTimeTo?: string;

  @IsUUID()
  @IsOptional()
    preferredEventTypeId?: string;

  @IsArray()
  @IsOptional()
    interests?: string[];
}
