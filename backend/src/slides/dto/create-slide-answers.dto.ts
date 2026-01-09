import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SlideAnswerItem {
  @IsString()
  @IsNotEmpty()
    question: string;

  @IsString()
  @IsNotEmpty()
    answer: string;

  @IsNumber()
  @IsOptional()
    weight?: number;
}

export class CreateSlideAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideAnswerItem)
    answers: SlideAnswerItem[];
}
