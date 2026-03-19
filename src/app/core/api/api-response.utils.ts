export interface ApiResponseEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T | { content?: T };
  content?: T;
}

export function unwrapApiResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const rec = raw as Record<string, unknown>;

  if ('data' in rec) {
    const data = rec['data'] as unknown;
    if (data && typeof data === 'object' && 'content' in (data as Record<string, unknown>)) {
      const content = (data as Record<string, unknown>)['content'];
      if (content !== undefined && content !== null) {
        return content as T;
      }
    }
    if (data !== undefined && data !== null) {
      return data as T;
    }
  }

  if ('content' in rec) {
    const content = rec['content'];
    if (content !== undefined && content !== null) {
      return content as T;
    }
  }

  return raw as T;
}
