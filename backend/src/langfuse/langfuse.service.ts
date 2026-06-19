import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Langfuse } from 'langfuse';
import {
  ILangfuseTrace,
  ILangfuseGeneration,
  ILangfuseSpan,
  NoopLangfuseTrace,
  NoopLangfuseGeneration,
  NoopLangfuseSpan,
} from './interfaces/langfuse.interface';
import { sanitizeData } from './utils/redact';

const telemetryLogger = new Logger('LangfuseTelemetry');

class LangfuseGenerationWrapper implements ILangfuseGeneration {
  constructor(private readonly realClient: any) {}

  update(options: any): void {
    try {
      const sanitized = sanitizeData(options);
      this.realClient.update(sanitized);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to update Langfuse generation: ${err.message}`);
    }
  }

  end(options?: any): void {
    try {
      const sanitized = sanitizeData(options);
      // Call the SDK's .end() so it correctly records endTime and closes the generation.
      this.realClient.end(sanitized);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to end Langfuse generation: ${err.message}`);
    }
  }
}

class LangfuseSpanWrapper implements ILangfuseSpan {
  constructor(private readonly realClient: any) {}

  update(options: any): void {
    try {
      const sanitized = sanitizeData(options);
      this.realClient.update(sanitized);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to update Langfuse span: ${err.message}`);
    }
  }

  end(options?: any): void {
    try {
      const sanitized = sanitizeData(options);
      // Call the SDK's .end() so it correctly records endTime and closes the span.
      this.realClient.end(sanitized);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to end Langfuse span: ${err.message}`);
    }
  }
}

class LangfuseTraceWrapper implements ILangfuseTrace {
  constructor(private readonly realClient: any) {}

  generation(options: any): ILangfuseGeneration {
    try {
      const sanitized = sanitizeData(options);
      const realGen = this.realClient.generation(sanitized);
      return new LangfuseGenerationWrapper(realGen);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to create Langfuse generation: ${err.message}`);
      return new NoopLangfuseGeneration();
    }
  }

  span(options: any): ILangfuseSpan {
    try {
      const sanitized = sanitizeData(options);
      const realSpan = this.realClient.span(sanitized);
      return new LangfuseSpanWrapper(realSpan);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to create Langfuse span: ${err.message}`);
      return new NoopLangfuseSpan();
    }
  }

  update(options: any): void {
    try {
      const sanitized = sanitizeData(options);
      this.realClient.update(sanitized);
    } catch (err: any) {
      telemetryLogger.warn(`Failed to update Langfuse trace: ${err.message}`);
    }
  }
}

@Injectable()
export class LangfuseService implements OnModuleDestroy {
  private readonly logger = new Logger(LangfuseService.name);
  private langfuseClient: Langfuse | null = null;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<string>('LANGFUSE_ENABLED') === 'true';
    const publicKey = this.configService.get<string>('LANGFUSE_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('LANGFUSE_SECRET_KEY');
    const baseUrl = this.configService.get<string>('LANGFUSE_BASE_URL') || 'https://cloud.langfuse.com';
    const environment = this.configService.get<string>('LANGFUSE_ENVIRONMENT') || this.configService.get<string>('NODE_ENV') || 'development';
    const release = this.configService.get<string>('LANGFUSE_RELEASE') || '0.0.1';

    if (enabled && publicKey && secretKey) {
      try {
        this.langfuseClient = new Langfuse({
          publicKey,
          secretKey,
          baseUrl,
        });
        this.isEnabled = true;
        this.logger.log(`Langfuse service initialized. Environment: ${environment}, Release: ${release}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Langfuse SDK: ${err.message}. Observability is disabled.`);
      }
    } else {
      this.logger.log('Langfuse observability is disabled (LANGFUSE_ENABLED=false or missing credentials).');
    }
  }

  /**
   * Start a trace in Langfuse. Returns a Trace wrapper or a Noop if disabled/failed.
   */
  trace(name: string, options?: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): ILangfuseTrace {
    if (!this.isEnabled || !this.langfuseClient) {
      return new NoopLangfuseTrace();
    }

    try {
      const environment = this.configService.get<string>('LANGFUSE_ENVIRONMENT') || this.configService.get<string>('NODE_ENV') || 'development';
      const release = this.configService.get<string>('LANGFUSE_RELEASE') || '0.0.1';

      const traceParams = sanitizeData({
        name,
        userId: options?.userId,
        sessionId: options?.sessionId,
        metadata: {
          environment,
          release,
          ...options?.metadata,
        },
        tags: options?.tags,
      });

      const realTrace = this.langfuseClient.trace(traceParams);
      return new LangfuseTraceWrapper(realTrace);
    } catch (err: any) {
      this.logger.warn(`Failed to create Langfuse trace: ${err.message}. Returning Noop.`);
      return new NoopLangfuseTrace();
    }
  }

  /**
   * Graceful shutdown: flush any queued telemetry events on NestJS module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.langfuseClient) {
      this.logger.log('Flushing Langfuse events...');
      try {
        await this.langfuseClient.shutdownAsync();
        this.logger.log('Langfuse flushed and shut down successfully.');
      } catch (err: any) {
        this.logger.error(`Error flushing Langfuse events during shutdown: ${err.message}`);
      }
    }
  }
}
