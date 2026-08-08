import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
    q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
    page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
    limit: number = 20;
}
