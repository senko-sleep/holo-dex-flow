// YouTube API loader utility to prevent race conditions and multiple loading attempts
class YouTubeAPIManager {
  private static instance: YouTubeAPIManager;
  private isLoading = false;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private callbacks: (() => void)[] = [];

  private constructor() {}

  static getInstance(): YouTubeAPIManager {
    if (!YouTubeAPIManager.instance) {
      YouTubeAPIManager.instance = new YouTubeAPIManager();
    }
    return YouTubeAPIManager.instance;
  }

  async loadAPI(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        this.isLoaded = true;
        resolve();
        return;
      }

      if (this.isLoading) {
        // Wait for existing load to complete
        this.callbacks.push(() => resolve());
        return;
      }

      this.isLoading = true;

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        // Script exists, wait for it to load
        const checkLoaded = () => {
          if (window.YT && window.YT.Player) {
            this.isLoaded = true;
            this.isLoading = false;
            resolve();
            this.callbacks.forEach(cb => cb());
            this.callbacks = [];
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Load the script
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;

      script.onload = () => {
        // Wait for API to be ready
        const checkAPI = () => {
          if (window.YT && window.YT.Player) {
            this.isLoaded = true;
            this.isLoading = false;
            resolve();
            this.callbacks.forEach(cb => cb());
            this.callbacks = [];
          } else {
            setTimeout(checkAPI, 100);
          }
        };
        checkAPI();
      };

      script.onerror = () => {
        this.isLoading = false;
        this.loadPromise = null;
        reject(new Error('Failed to load YouTube API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  isAPILoaded(): boolean {
    return this.isLoaded && !!(window.YT && window.YT.Player);
  }
}

export const youtubeAPIManager = YouTubeAPIManager.getInstance();
