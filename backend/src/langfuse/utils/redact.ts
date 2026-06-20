/**
 * Recursively sanitizes data to redact sensitive keys before tracing them in Langfuse.
 *
 * A field name is considered sensitive when any of its constituent *word tokens*
 * (split on camelCase, underscores, and hyphens) exactly matches a word in the
 * sensitive-word set.  This avoids over-redacting generic words that merely
 * contain a sensitive substring (e.g. "monkey", "donkey", "hockey").
 *
 * Sensitive word tokens (case-insensitive): password, token, secret,
 * authorization, cookie, key, apikey, credential, private.
 *
 * @param data The object, array, or value to sanitize.
 * @param seen WeakSet to track visited objects to prevent infinite loops in circular structures.
 */

/** Split a field name into lower-cased word tokens. */
function tokenizeFieldName(name: string): string[] {
  // Insert a separator before each upper-case letter that follows a lower-case
  // letter or digit (camelCase boundary), then split on underscores, hyphens,
  // and the inserted boundaries.
  return name
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[_\-\s]+/)
    .filter(Boolean);
}

const SENSITIVE_WORDS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'key',
  'apikey',
  'credential',
  'credentials',
  'private',
]);

function isSensitiveKey(fieldName: string): boolean {
  const tokens = tokenizeFieldName(fieldName);
  return tokens.some((t) => SENSITIVE_WORDS.has(t));
}

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
    const result = data.map((item) => sanitizeData(item, seen));
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

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(value, seen);
    }
  }

  seen.delete(data);
  return sanitized;
}
