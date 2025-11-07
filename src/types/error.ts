export interface APIError extends Error {
  isRateLimited?: boolean;
  statusCode?: number;
  message: string;
  retryAfter?: number;
}

export class RateLimitError extends Error {
  isRateLimited = true;
  retryAfter: number;
  
  constructor(message: string, retryAfter: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class APIResponseError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'APIResponseError';
    this.statusCode = statusCode;
  }
}
