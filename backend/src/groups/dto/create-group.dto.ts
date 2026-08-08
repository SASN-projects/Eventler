import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
    name: string;

  @IsString()
  @IsOptional()
    description?: string;

  @IsArray()
  @IsUUID('loose', { each: true })
  @IsOptional()
    memberIds?: string[];
}
