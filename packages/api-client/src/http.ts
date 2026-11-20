import { ApiClientError } from './errors';

export interface HttpClientConfig {
  baseUrl: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  defaultHeaders?: Record<string, string>;
}

export class HttpClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null | Promise<string | null>;
  private onUnauthorized?: () => void;
  private defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAuthToken = config.getAuthToken;
    this.onUnauthorized = config.onUnauthorized;
    this.defaultHeaders = config.defaultHeaders || {};
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const headers = new Headers(options.headers || {});

    // Set default JSON headers
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');

    // Add custom default headers
    for (const [key, value] of Object.entries(this.defaultHeaders)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    // Attach Bearer token if available
    if (this.getAuthToken && !headers.has('Authorization')) {
      const token = await this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const isIdempotent = !options.method || options.method === 'GET' || options.method === 'HEAD';
    const maxRetries = isIdempotent ? 3 : 0;
    let attempt = 0;
    let response: Response;

      while (true) {
        try {
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', // Ensures httpOnly refresh cookies are sent per security rules
          });
          break;
        } catch (networkErr: any) {
          attempt++;
          if (attempt <= maxRetries) {
            // Exponential backoff for server boot/restart: 400ms, 800ms, 1200ms
            await new Promise((resolve) => setTimeout(resolve, attempt * 400));
            continue;
          }
          throw networkErr;
        }
      }

      if (response.status === 401 && !endpoint.includes('auth/login') && !endpoint.includes('auth/register') && this.onUnauthorized) {
        this.onUnauthorized();
      }

      if (!response.ok) {
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        throw ApiClientError.fromResponse(response, errorBody);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    }

  public get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const query = searchParams.toString();
      if (query) {
        url += (url.includes('?') ? '&' : '?') + query;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

