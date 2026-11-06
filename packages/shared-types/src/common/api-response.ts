export interface ApiResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  validationErrors?: Array<{
    field: string;
    constraints: Record<string, string>;
  }>;
}

