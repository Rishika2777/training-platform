export function stripUndefined<T extends Record<string, unknown>>(request: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next as T;
}

