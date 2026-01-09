import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

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
    city?: string;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
    age?: number;

  @IsOptional()
  @IsString()
    occupation?: string;
}
