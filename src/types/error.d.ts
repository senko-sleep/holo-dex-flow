declare module '@/types/error' {
  export interface APIError extends Error {
    isRateLimited?: boolean;
    statusCode?: number;
    message: string;
    retryAfter?: number;
  }

  export class RateLimitError extends Error {
    isRateLimited: boolean;
    retryAfter: number;
    
    constructor(message: string, retryAfter?: number);
  }

  export class APIResponseError extends Error {
    statusCode: number;
    
    constructor(message: string, statusCode: number);
  }
}
