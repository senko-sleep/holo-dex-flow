import { cache } from './cache';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | (string | number | boolean)[] | undefined>;
  body?: BodyInit;
  cacheTtl?: number;
  retries?: number;
  timeout?: number;
};

const DEFAULT_OPTIONS: Required<Omit<RequestOptions, 'body'>> & { body: undefined } = {
  headers: {},
  params: {},
  body: undefined,
  cacheTtl: 1000 * 60 * 15, // 15 minutes
  retries: 3,
  timeout: 10000, // 10 seconds
};

// Request deduplication cache with type-safe storage for different response types
const pendingRequests = new Map<string, Promise<unknown>>();

// Helper function to safely get a typed promise from the pending requests map
function getPendingRequest<T>(key: string): Promise<T> | undefined {
  return pendingRequests.get(key) as Promise<T> | undefined;
}

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
  private useProxy: boolean;
  
  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}, useProxy: boolean = process.env.NODE_ENV === 'development') {
    this.baseUrl = baseURL.replace(/\/+$/, '');
    this.useProxy = useProxy;
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...defaultHeaders
    };
  }

  private async makeRequest<T>(method: RequestMethod, url: string, options: RequestOptions = {}): Promise<T> {
    const { headers = {}, params = {}, body, cacheTtl, retries = 3, timeout = 10000 } = { ...DEFAULT_OPTIONS, ...options };
    
    // Add CORS headers for MangaDex API
    const corsHeaders = {
      'Origin': window.location.origin,
      'Referer': window.location.origin + '/',
      ...headers
    };
    
    const isGet = method === 'GET';
    const cacheKey = `http:${method}:${this.baseUrl}${url}:${JSON.stringify(params)}`;
    
    // Check cache first for GET requests
    if (isGet) {
      const cached = cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Check for duplicate requests for GET
    if (isGet) {
      const pendingRequest = getPendingRequest<T>(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const makeRequest = async (attempt = 0): Promise<T> => {
      try {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

        let fullUrl = `${this.baseUrl}${url}${queryString}`;
        
        // Use CORS proxy in development if enabled and not a local request
        if (this.useProxy && !fullUrl.includes('localhost') && !fullUrl.includes('127.0.0.1')) {
          fullUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
        }
        
        // Fix for TypeScript error by explicitly handling the HEAD method case
        const isGetOrHead = method === 'GET' || method === 'HEAD';
        const response = await fetch(fullUrl, {
          method,
          headers: {
            ...this.defaultHeaders,
            ...corsHeaders,
          },
          body: isGetOrHead ? undefined : body,
          mode: 'cors',
          credentials: 'omit',
        });

        clearTimeout(timeoutId);

        // Handle proxy response
        const responseData = response;
        if (this.useProxy && !fullUrl.includes('localhost') && !fullUrl.includes('127.0.0.1')) {
          const proxyResponse = await response.json();
          if (proxyResponse.contents) {
            return JSON.parse(proxyResponse.contents);
          }
          throw new Error(proxyResponse.message || 'Error from proxy');
        }
        
        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10) * 1000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            return makeRequest(attempt + 1);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache successful GET responses
        if (isGet && cacheTtl > 0) {
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
        if (isGet) {
          pendingRequests.delete(cacheKey);
        }
      }
    };

    const requestPromise = queueRequest(() => makeRequest());
    if (isGet) {
      pendingRequests.set(cacheKey, requestPromise);
    }
    
    return requestPromise;
  }

  async get<T>(url: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.makeRequest<T>('GET', url, options);
  }

  async post<T>(url: string, body: unknown, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.makeRequest<T>('POST', url, {
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
    // @ts-expect-error - cache.clear() is dynamically typed and TypeScript can't infer the correct type
    cache.clear(`http:${this.baseUrl}${urlPrefix}`);
  }

  // Static methods that use the default instance
  static get<T>(url: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return defaultHttpClient.get<T>(url, options);
  }

  static post<T>(url: string, body: unknown, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return defaultHttpClient.post<T>(url, body, options);
  }

  static request<T>(
    method: RequestMethod,
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    return defaultHttpClient.makeRequest<T>(method, url, options);
  }

  static batch<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    return defaultHttpClient.batch(requests);
  }

  static clearCache(urlPrefix: string = ''): void {
    defaultHttpClient.clearCache(urlPrefix);
  }
}

// Default instance for static methods
const defaultHttpClient = new FastHttpClient('');