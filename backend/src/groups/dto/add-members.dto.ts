import { IsArray, IsUUID, IsOptional } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @IsUUID('loose', { each: true })
  @IsOptional()
    memberIds?: string[];
}
