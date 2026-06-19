import { IsEmail, IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
    email?: string;

  @IsString()
  @IsOptional()
    username?: string;

  @IsOptional()
  @IsString()
    firstName?: string;

  @IsOptional()
  @IsString()
    lastName?: string;

  @IsOptional()
  @IsString()
    city?: string;

  @IsOptional()
  @IsString()
    country?: string;

  @IsOptional()
  @IsDateString()
    dateOfBirth?: string;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
    age?: number;

  @IsOptional()
  @IsString()
    occupation?: string;
}
