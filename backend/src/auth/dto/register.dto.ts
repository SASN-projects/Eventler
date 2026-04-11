import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
    email: string;

  @IsString()
  @IsNotEmpty()
    username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
    password: string;

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
  @IsString()
    occupation?: string;
}
