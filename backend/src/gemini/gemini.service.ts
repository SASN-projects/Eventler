import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, ObjectSchema } from '@google/generative-ai';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';

export interface GenerateJsonContentOptions {
  prompt: string;
  responseSchema: ObjectSchema;
  parentTrace?: ILangfuseTrace;
  modelName?: string;
  promptName?: string;
  promptVersion?: string;
  metadata?: Record<string, any>;
}

export interface ClassifiedGeminiError {
  isRetryable: boolean;
  errorCode: string;
  statusCode?: number;
  providerUnavailable: boolean;
  message: string;
  retryAfterMs?: number;
}

export function parseRetryAfter(err: any): number | undefined {
  // 1. Direct header on response
  const rawHeader =
    err?.response?.headers?.['retry-after'] ||
    err?.headers?.['retry-after'] ||
    err?.retryAfter;

  if (rawHeader) {
    const parsedSec = Number(rawHeader);
    if (!Number.isNaN(parsedSec) && parsedSec > 0) {
      return parsedSec * 1000;
    }
    const parsedDate = new Date(rawHeader).getTime();
    if (!Number.isNaN(parsedDate) && parsedDate > Date.now()) {
      return parsedDate - Date.now();
    }
  }

  // 2. Retry delay hints in Google Generative AI error details
  const message = String(err?.message || '');
  const matchSec = message.match(/retry in ([0-9]+(?:\.[0-9]+)?)\s*s(?:ec|econds)?/i);
  if (matchSec) {
    const sec = parseFloat(matchSec[1]);
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.round(sec * 1000);
    }
  }

  const matchMs = message.match(/retry after ([0-9]+)\s*ms/i);
  if (matchMs) {
    const ms = parseInt(matchMs[1], 10);
    if (!Number.isNaN(ms) && ms > 0) {
      return ms;
    }
  }

  return undefined;
}

export function classifyGeminiError(err: any): ClassifiedGeminiError {
  const status = err?.status || err?.statusCode || err?.response?.status;
  const message = String(err?.message || err || '');
  const lowerMsg = message.toLowerCase();
  const retryAfterMs = parseRetryAfter(err);

  // 1. 404 / Model Not Found / No longer available (Non-retryable)
  if (
    status === 404 ||
    lowerMsg.includes('404') ||
    lowerMsg.includes('not found') ||
    lowerMsg.includes('no longer available') ||
    lowerMsg.includes('is not found')
  ) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_MODEL_NOT_FOUND',
      statusCode: 404,
      providerUnavailable: false,
      message: 'The requested AI model was not found or is no longer available. Please update the model configuration.',
      retryAfterMs,
    };
  }

  // 2. 503 / High Demand / Service Unavailable / Overloaded
  if (
    status === 503 ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('service unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('overloaded') ||
    lowerMsg.includes('temporarily unavailable')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_TEMPORARILY_UNAVAILABLE',
      statusCode: 503,
      providerUnavailable: true,
      message: 'The AI provider is currently experiencing high demand. Please try again later.',
      retryAfterMs,
    };
  }

  // 3. 429 / Rate Limit / Resource Exhausted
  if (
    status === 429 ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('resource exhausted') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('quota')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_RATE_LIMIT',
      statusCode: 429,
      providerUnavailable: true,
      message: 'AI provider rate limit reached. Please try again in a few moments.',
      retryAfterMs,
    };
  }

  // 4. Network / Timeout / Transient Fetch Errors
  if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network error')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_NETWORK_TIMEOUT',
      providerUnavailable: true,
      message: 'Network timeout connecting to AI provider. Please try again.',
      retryAfterMs,
    };
  }

  // 5. Other 5xx Server Errors
  if (typeof status === 'number' && status >= 500 && status < 600) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_SERVER_ERROR',
      statusCode: status,
      providerUnavailable: true,
      message: `AI provider returned server error (${status}). Please try again.`,
      retryAfterMs,
    };
  }

  // 6. Explicit Non-retryable errors (Auth 401/403, Invalid Request 400, Safety blocks)
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('forbidden')
  ) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_AUTH_ERROR',
      statusCode: typeof status === 'number' ? status : 401,
      providerUnavailable: false,
      message: 'Authentication or permission error with AI provider.',
    };
  }

  if (
    status === 400 ||
    lowerMsg.includes('invalid argument') ||
    lowerMsg.includes('bad request') ||
    lowerMsg.includes('invalid model')
  ) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_INVALID_REQUEST',
      statusCode: 400,
      providerUnavailable: false,
      message: 'Invalid request to AI provider.',
    };
  }

  if (lowerMsg.includes('safety') || lowerMsg.includes('blocked')) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_SAFETY_BLOCKED',
      providerUnavailable: false,
      message: 'Content was blocked by AI provider safety filters.',
    };
  }

  // 7. Generic/transient provider errors without explicit 4xx non-retryable status
  return {
    isRetryable: true,
    errorCode: 'PROVIDER_TRANSIENT_ERROR',
    statusCode: typeof status === 'number' ? status : undefined,
    providerUnavailable: true,
    message: 'The AI provider is temporarily unavailable. Please try again.',
    retryAfterMs,
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    this.defaultModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      this.configService.get<string>('GOOGLE_GEMINI_MODEL') ||
      'gemini-3.6-flash';

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GOOGLE_API_KEY is not defined in environment variables. Gemini calls will fail.');
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  async generateJsonContent<T>(options: GenerateJsonContentOptions): Promise<T> {
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

      const response = result.response;
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
      const classified = classifyGeminiError(err);
      (err).classified = classified;

      generation?.end({
        level: 'ERROR',
        statusMessage: err.message,
        endTime,
        metadata: {
          retryable: classified.isRetryable,
          providerErrorCode: classified.errorCode,
          statusCode: classified.statusCode,
          providerUnavailable: classified.providerUnavailable,
        },
      });

      this.logger.error(`Gemini call failed [${classified.errorCode}]: ${err.message}`);
      throw err;
    }
  }
}
