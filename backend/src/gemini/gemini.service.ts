import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, ObjectSchema } from '@google/generative-ai';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';

export interface GenerateJsonContentOptions<T> {
  prompt: string;
  responseSchema: ObjectSchema;
  parentTrace?: ILangfuseTrace;
  modelName?: string;
  promptName?: string;
  promptVersion?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    this.defaultModel = this.configService.get<string>('GOOGLE_GEMINI_MODEL') || 'gemini-2.5-flash';

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GOOGLE_API_KEY is not defined in environment variables. Gemini calls will fail.');
    }
  }

  async generateJsonContent<T>(options: GenerateJsonContentOptions<T>): Promise<T> {
    if (!this.genAI) {
      throw new Error('GOOGLE_API_KEY is required for Gemini integration.');
    }

    const modelName = options.modelName || this.defaultModel;
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const startTime = new Date();

    const generation = options.parentTrace?.generation({
      name: options.promptName || 'gemini-generate',
      model: modelName,
      startTime,
      input: options.prompt,
      modelParameters: {
        responseMimeType: 'application/json',
      },
      metadata: {
        promptVersion: options.promptVersion,
        ...options.metadata,
      },
    });

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
        },
      });

      const response = await result.response;
      const text = response.text();
      const endTime = new Date();

      const usageMetadata = response.usageMetadata;
      const usage = usageMetadata
        ? {
          promptTokens: usageMetadata.promptTokenCount,
          completionTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        }
        : undefined;

      generation?.end({
        output: text,
        endTime,
        usage,
      });

      return JSON.parse(text) as T;
    } catch (err: any) {
      const endTime = new Date();
      generation?.end({
        level: 'ERROR',
        statusMessage: err.message,
        endTime,
      });

      this.logger.error(`Gemini call failed: ${err.message}`);
      throw err;
    }
  }
}
