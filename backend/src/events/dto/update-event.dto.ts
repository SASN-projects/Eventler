import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateEventDto {
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
