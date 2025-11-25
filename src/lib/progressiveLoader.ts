/**
 * Progressive Image Loader
 * Loads images one at a time in the background to avoid overwhelming the network
 */

interface LoadTask {
  url: string;
  priority: number;
  onLoad: (url: string) => void;
  onError?: (url: string, error: Error) => void;
}

class ProgressiveImageLoader {
  private queue: LoadTask[] = [];
  private loading = false;
  private loadedUrls = new Set<string>();
  private failedUrls = new Set<string>();
  private maxConcurrent = 3; // Load 3 images at a time
  private activeLoads = 0;

  /**
   * Add image to load queue
   */
  enqueue(
    url: string,
    onLoad: (url: string) => void,
    priority: number = 0,
    onError?: (url: string, error: Error) => void
  ): void {
    // Skip if already loaded or failed
    if (this.loadedUrls.has(url) || this.failedUrls.has(url)) {
      if (this.loadedUrls.has(url)) {
        onLoad(url);
      }
      return;
    }

    // Add to queue
    this.queue.push({ url, priority, onLoad, onError });
    
    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.processQueue();
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    while (this.queue.length > 0 && this.activeLoads < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeLoads++;
      this.loadImage(task).finally(() => {
        this.activeLoads--;
        this.processQueue();
      });
    }

    this.loading = false;
  }

  /**
   * Load a single image
   */
  private async loadImage(task: LoadTask): Promise<void> {
    const { url, onLoad, onError } = task;

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          this.loadedUrls.add(url);
          onLoad(url);
          resolve();
        };
        
        img.onerror = () => {
          const error = new Error(`Failed to load image: ${url}`);
          this.failedUrls.add(url);
          if (onError) {
            onError(url, error);
          }
          reject(error);
        };
        
        img.src = url;
      });
    } catch (error) {
      console.warn('Image load failed:', url, error);
    }
  }

  /**
   * Check if image is loaded
   */
  isLoaded(url: string): boolean {
    return this.loadedUrls.has(url);
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.activeLoads = 0;
  }

  /**
   * Set max concurrent loads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  /**
   * Get queue size
   */
  get queueSize(): number {
    return this.queue.length;
  }
}

// Global instance
export const imageLoader = new ProgressiveImageLoader();

/**
 * Preload images progressively
 */
export function preloadImages(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = urls.length;

    if (total === 0) {
      resolve();
      return;
    }

    urls.forEach((url, index) => {
      imageLoader.enqueue(
        url,
        () => {
          loaded++;
          if (onProgress) {
            onProgress(loaded, total);
          }
          if (loaded === total) {
            resolve();
          }
        },
        urls.length - index // Higher priority for earlier images
      );
    });
  });
}
