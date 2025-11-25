/**
 * Request queue system for rate limiting and load balancing
 * Distributes requests across time to prevent API rate limits
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  priority: number;
}

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private processing = false;
  private requestsPerSecond: number;
  private minDelay: number;
  private lastRequestTime = 0;

  constructor(requestsPerSecond: number = 2) {
    this.requestsPerSecond = requestsPerSecond;
    this.minDelay = 1000 / requestsPerSecond;
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority } as QueuedRequest<unknown>);
      
      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we're going too fast
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }

      const request = this.queue.shift();
      if (!request) break;

      this.lastRequestTime = Date.now();

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Get queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Update rate limit
   */
  setRateLimit(requestsPerSecond: number): void {
    this.requestsPerSecond = requestsPerSecond;
    this.minDelay = 1000 / requestsPerSecond;
  }
}

// Global request queues for different APIs
export const anilistQueue = new RequestQueue(2); // 2 requests per second
export const mangaQueue = new RequestQueue(3); // 3 requests per second
export const imageQueue = new RequestQueue(5); // 5 requests per second

/**
 * Wrap a function to use the request queue
 */
export function withQueue<T>(
  queue: RequestQueue,
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return queue.enqueue(fn, priority);
}
