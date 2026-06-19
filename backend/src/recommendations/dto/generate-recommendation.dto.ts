import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export enum TransportationType {
  CAR = 'car',
  PUBLIC = 'public',
}

export class GenerateRecommendationDTO {
  @IsString()
  @IsNotEmpty()
    time: string;

  @IsString()
  @IsNotEmpty()
    location: string;

  @IsInt()
  @Min(1)
    peopleAmount: number;

  @IsEnum(TransportationType)
    transportation: TransportationType;

  @IsString()
  @IsNotEmpty()
    vibe: string;

  @IsString()
  @IsNotEmpty()
    placeBusiness: string;

  @IsString()
  @IsNotEmpty()
    budget: string;
}
