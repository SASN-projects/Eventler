/**
 * Recursively sanitizes data to redact sensitive keys before tracing them in Langfuse.
 * Strip/mask keys like password, token, secret, authorization, cookie, key, apikey, credential.
 *
 * @param data The object, array, or value to sanitize.
 * @param seen WeakSet to track visited objects to prevent infinite loops in circular structures.
 */
export function sanitizeData(data: any, seen = new WeakSet()): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives and functions
  if (typeof data !== 'object') {
    return data;
  }

  // Prevent infinite loops on circular references
  if (seen.has(data)) {
    return '[Circular Reference]';
  }

  // Handle arrays
  if (Array.isArray(data)) {
    seen.add(data);
    const result = data.map(item => sanitizeData(item, seen));
    seen.delete(data);
    return result;
  }

  // Handle Dates, RegExps, etc.
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (data instanceof RegExp) {
    return data.toString();
  }

  // Handle plain objects
  seen.add(data);
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'key',
    'apikey',
    'credential',
    'private',
  ];

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(value, seen);
    }
  }

  seen.delete(data);
  return sanitized;
}
