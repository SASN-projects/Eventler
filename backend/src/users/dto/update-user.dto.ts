import { IsEmail, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
    email?: string;

  @IsString()
  @IsOptional()
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
    occupation?: string;
}
