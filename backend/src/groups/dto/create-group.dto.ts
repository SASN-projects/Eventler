import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsArray()
  memberIds?: string[];

  @IsOptional()
  @IsArray()
  members?: any[];
}
