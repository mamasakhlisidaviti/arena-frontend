import { HttpErrorResponse } from '@angular/common/http';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ApiClientError(0, 'NETWORK_ERROR', 'The server could not be reached.');
    }
    const body = error.error as ErrorBody | null;
    return new ApiClientError(
      error.status,
      body?.error?.code ?? `HTTP_${error.status}`,
      body?.error?.message ?? error.message,
      body?.error?.details,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(0, 'CLIENT_ERROR', error.message);
  }
  return new ApiClientError(0, 'UNKNOWN_ERROR', 'Unexpected error');
}

/** Translation key that best describes a failed request. */
export function errorTranslationKey(error: unknown): string {
  const apiError = toApiClientError(error);
  if (apiError.status === 0) {
    return 'errors.network';
  }
  if (apiError.status === 401) {
    return 'errors.unauthorized';
  }
  if (apiError.status === 403) {
    return 'errors.forbidden';
  }
  if (apiError.status === 404) {
    return 'errors.notFound';
  }
  if (apiError.status === 422 || apiError.status === 400) {
    return 'errors.validation';
  }
  if (apiError.status === 409) {
    return 'errors.duplicate';
  }
  if (apiError.status === 429) {
    return 'errors.rateLimited';
  }
  return 'errors.generic';
}

/** Field-level errors returned by the API validation layer. */
export function fieldErrors(error: unknown): Record<string, string> {
  const apiError = toApiClientError(error);
  const details = apiError.details;
  const result: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const item of details as { path?: unknown; message?: unknown }[]) {
      const path = Array.isArray(item.path) ? item.path.join('.') : String(item.path ?? '');
      if (path) {
        result[path] = String(item.message ?? '');
      }
    }
  }
  return result;
}
