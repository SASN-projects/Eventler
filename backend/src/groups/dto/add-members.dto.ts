import { IsArray, IsUUID, IsOptional } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
    memberIds?: string[];
}
