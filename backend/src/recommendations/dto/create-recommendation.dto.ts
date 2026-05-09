import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateRecommendationDto {

  @IsArray()
    venues: CreateVenueDto[]; 
}

export class CreateVenueDto {

  @IsString()
    name: string;

  @IsString()
    category: string;

  @IsString()
    description: string;

  @IsString()
    address: string;

  @IsString()
    city: string;

  @IsString()
    country: string;

  @IsNumber()
    priceLevel: number;

  @IsNumber()
    rating: number;

  @IsString()
    source: string;

  @IsString()
    externalSourceId: string;

  @IsNumber()
    score: number;
}
