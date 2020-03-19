function isIndexableObject(obj: unknown): obj is { [index: string]: unknown } {
  return typeof obj === 'object' && obj !== null;
}

export function isRateLimitErrorResponse(
  response: unknown
): response is { retry_after: number } {
  if (!isIndexableObject(response)) {
    return false;
  }

  if (
    !('retry_after' in response) ||
    typeof response.retry_after !== 'number'
  ) {
    return false;
  }

  return true;
}
