import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { IsPasswordsMatching } from '../decorators/match-password.decorator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
    email: string;

  @IsString()
  @IsNotEmpty()
    firstName: string;

  @IsString()
  @IsNotEmpty()
    lastName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
    password: string;

  @IsString()
  @IsNotEmpty()
  @IsPasswordsMatching()
    confirmPassword: string;

  @IsOptional()
  @IsString()
    username?: string;

  @IsOptional()
  @IsString()
    city?: string;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
    age?: number;

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
