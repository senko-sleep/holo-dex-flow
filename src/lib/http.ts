import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { cache } from './cache';

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const DEFAULT_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export class HttpClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.client = axios.create({
      baseURL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...defaultHeaders
      }
    });
  }

  async get<T>(url: string, config: AxiosRequestConfig = {}, useCache = true): Promise<T> {
    const cacheKey = `http:${this.client.defaults.baseURL}${url}:${JSON.stringify(config.params || {})}`;
    
    if (useCache) {
      const cached = cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    for (let i = 0; i < DEFAULT_RETRIES; i++) {
      try {
        const response: AxiosResponse<T> = await this.client.get(url, {
          ...config,
          validateStatus: status => status >= 200 && status < 500
        });

        if (response.status === 200) {
          if (useCache) {
            cache.set(cacheKey, response.data, DEFAULT_CACHE_TTL);
          }
          return response.data;
        }

        if (response.status === 404) {
          throw new Error('Not found');
        }

        if (response.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = parseInt(response.headers['retry-after'] || '5', 10) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
      } catch (error) {
        if (i === DEFAULT_RETRIES - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw new Error(`Failed to fetch ${url} after ${DEFAULT_RETRIES} attempts`);
  }

  async post<T, D = unknown>(
    url: string, 
    data?: D, 
    config: AxiosRequestConfig<D> = {},
    useCache = false
  ): Promise<T> {
    const cacheKey = `http:${this.client.defaults.baseURL}${url}:${JSON.stringify(data)}`;
    
    if (useCache) {
      const cached = cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    for (let i = 0; i < DEFAULT_RETRIES; i++) {
      try {
        const response: AxiosResponse<T> = await this.client.post(url, data, {
          ...config,
          validateStatus: status => status >= 200 && status < 500
        });

        if (response.status === 200) {
          if (useCache) {
            cache.set(cacheKey, response.data, DEFAULT_CACHE_TTL);
          }
          return response.data;
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers['retry-after'] || '5', 10) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
      } catch (error) {
        if (i === DEFAULT_RETRIES - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw new Error(`Failed to post to ${url} after ${DEFAULT_RETRIES} attempts`);
  }
}
