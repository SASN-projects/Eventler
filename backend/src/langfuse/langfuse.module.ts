import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LangfuseService } from './langfuse.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LangfuseService],
  exports: [LangfuseService],
})
export class LangfuseModule {}
