import { cache } from './cache';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  cacheTtl?: number;
  retries?: number;
  timeout?: number;
};

const DEFAULT_OPTIONS: Required<RequestOptions> = {
  headers: {},
  params: {},
  cacheTtl: 1000 * 60 * 15, // 15 minutes
  retries: 3,
  timeout: 10000, // 10 seconds
};

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Request queue for rate limiting
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_REQUESTS = 6;
let activeRequests = 0;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift();
    if (request) {
      activeRequests++;
      request().finally(() => {
        activeRequests--;
        processQueue();
      });
    }
  }
  
  isProcessingQueue = false;
}

function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

export class FastHttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseURL.replace(/\/+$/, '');
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...defaultHeaders
    };
  }

  private async request<T>(
    method: RequestMethod,
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      headers = {},
      params = {},
      cacheTtl = DEFAULT_OPTIONS.cacheTtl,
      retries = DEFAULT_OPTIONS.retries,
      timeout = DEFAULT_OPTIONS.timeout,
    } = { ...DEFAULT_OPTIONS, ...options };

    const cacheKey = `http:${this.baseUrl}${url}:${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;

    // Check for duplicate requests
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const makeRequest = async (attempt = 0): Promise<T> => {
      try {
        const queryString = Object.keys(params).length
          ? `?${new URLSearchParams(params).toString()}`
          : '';

        const fullUrl = `${this.baseUrl}${url}${queryString}`;
        
        const response = await fetch(fullUrl, {
          method,
          headers: {
            ...this.defaultHeaders,
            ...headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10) * 1000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            return makeRequest(attempt + 1);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache successful responses
        if (cacheTtl > 0) {
          cache.set(cacheKey, data, cacheTtl);
        }
        
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError' && attempt < retries) {
          return makeRequest(attempt + 1);
        }
        
        throw error;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    };

    const requestPromise = queueRequest(makeRequest);
    pendingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  }

  async get<T>(url: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>('GET', url, options);
  }

  async post<T>(url: string, body: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  }

  // Batch multiple requests for parallel execution
  async batch<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(requests.map(fn => queueRequest(fn)));
  }

  // Clear cache for a specific URL or all URLs starting with a prefix
  clearCache(urlPrefix: string = ''): void {
    cache.clear(`http:${this.baseUrl}${urlPrefix}`);
  }
}
