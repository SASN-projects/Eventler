export interface ILangfuseTrace {
  generation(options: {
    name: string;
    model?: string;
    startTime?: Date;
    endTime?: Date;
    input?: any;
    output?: any;
    metadata?: any;
    modelParameters?: Record<string, any>;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  }): ILangfuseGeneration;

  span(options: {
    name: string;
    startTime?: Date;
    endTime?: Date;
    input?: any;
    output?: any;
    metadata?: any;
  }): ILangfuseSpan;

  update(options: {
    output?: any;
    metadata?: any;
    tags?: string[];
  }): void;

  /**
   * Attach a named numeric score to this trace (e.g. a quality metric).
   * No-ops safely when Langfuse is disabled.
   */
  score(options: {
    name: string;
    value: number;
    comment?: string;
  }): void;
}

export interface ILangfuseGeneration {
  update(options: {
    output?: any;
    metadata?: any;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    level?: string;
    statusMessage?: string;
  }): void;

  end(options?: {
    output?: any;
    metadata?: any;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    level?: string;
    statusMessage?: string;
    endTime?: Date;
  }): void;
}

export interface ILangfuseSpan {
  update(options: {
    output?: any;
    metadata?: any;
    level?: string;
    statusMessage?: string;
  }): void;

  end(options?: {
    output?: any;
    metadata?: any;
    level?: string;
    statusMessage?: string;
    endTime?: Date;
  }): void;
}

/**
 * Noop implementations of the Langfuse trace interfaces to support disabled mode cleanly.
 */
export class NoopLangfuseGeneration implements ILangfuseGeneration {
  update(): void {}
  end(): void {}
}

export class NoopLangfuseSpan implements ILangfuseSpan {
  update(): void {}
  end(): void {}
}

export class NoopLangfuseTrace implements ILangfuseTrace {
  private static readonly noopGeneration = new NoopLangfuseGeneration();
  private static readonly noopSpan = new NoopLangfuseSpan();

  generation(): ILangfuseGeneration {
    return NoopLangfuseTrace.noopGeneration;
  }

  span(): ILangfuseSpan {
    return NoopLangfuseTrace.noopSpan;
  }

  update(): void {}

  score(): void {}
}
