import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';
import { SlideAnswer } from './entities/slide-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SlideAnswer])],
  controllers: [SlidesController],
  providers: [SlidesService],
  exports: [SlidesService],
})
export class SlidesModule { }
