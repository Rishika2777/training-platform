/** URL pattern: protocol, domain ([\w-]+\.)+[\w-]{2,}, optional path. */
export const URL_PATTERN =
  /^(https?:\/\/)([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;

export function isValidUrl(s: string): boolean {
  const trimmed = (s ?? '').trim();
  if (trimmed.length === 0) return false;
  return URL_PATTERN.test(trimmed);
}

/** Use for optional URL fields where value may be a relative path (e.g. from API). Only validates when value looks like a full URL (starts with http). */
export function isOptionalUrlInvalid(value: string | undefined): boolean {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  return !URL_PATTERN.test(trimmed);
}
