import { type ApiErrorResponse } from '@clm/shared-types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly validationErrors?: Array<{
    field: string;
    constraints: Record<string, string>;
  }>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    if (details && typeof details === 'object' && 'validationErrors' in details) {
      this.validationErrors = (details as ApiErrorResponse).validationErrors;
    }
  }

  static fromResponse(response: Response, body?: any): ApiClientError {
    const statusCode = response.status;
    const message = body?.message || response.statusText || 'An unexpected API error occurred';
    const code = body?.code || `HTTP_${statusCode}`;
    return new ApiClientError(message, statusCode, code, body);
  }
}

