import { cache } from '@/lib/cache';

// YouTube Data API v3 base URL
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  duration?: string;
  thumbnail: string;
  publishedAt: string;
  viewCount?: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
}

// YouTube API response interfaces
interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium?: { url: string };
      default: { url: string };
    };
  };
}

interface YouTubeVideosItem {
  id: string;
  contentDetails: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideosResponse {
  items: YouTubeVideosItem[];
}

// YouTube IFrame Player API types
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data: number;
}

export interface YouTubePlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    iv_load_policy?: 0 | 3;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
  };
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
  };
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
      ready: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry helper with exponential backoff
const retryFetch = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await delay(delayMs);
    return retryFetch(fn, retries - 1, delayMs * 2);
  }
};

export const youtubeService = {
  // Search for audio/music videos by song name and artist
  async searchAudioTracks(query: string, maxResults = 5): Promise<YouTubeSearchResult[]> {
    if (!API_KEY) {
      console.warn('YouTube API key not configured');
      return [];
    }

    // Create search query with music-specific terms
    const searchQuery = `${query} audio official music`;

    const cacheKey = `youtube_search_${searchQuery}_${maxResults}`;
    const cached = cache.get<YouTubeSearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', searchQuery);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
      searchUrl.searchParams.set('maxResults', maxResults.toString());
      searchUrl.searchParams.set('key', API_KEY);
      searchUrl.searchParams.set('order', 'relevance');

      const searchResponse = await retryFetch(() => fetch(searchUrl.toString()));
      const searchData: YouTubeSearchResponse = await searchResponse.json();

      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      // Get video IDs for duration lookup
      const videoIds = searchData.items.map((item: YouTubeSearchItem) => item.id.videoId).join(',');

      // Get video details including duration
      const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      detailsUrl.searchParams.set('part', 'contentDetails,statistics');
      detailsUrl.searchParams.set('id', videoIds);
      detailsUrl.searchParams.set('key', API_KEY);

      const detailsResponse = await retryFetch(() => fetch(detailsUrl.toString()));
      const detailsData: YouTubeVideosResponse = await detailsResponse.json();

      // Combine search and details data
      const results: YouTubeSearchResult[] = searchData.items.map((item: YouTubeSearchItem) => {
        const videoDetail = detailsData.items?.find((detail: YouTubeVideosItem) => detail.id === item.id.videoId);

        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
          duration: videoDetail?.contentDetails?.duration || 'PT0S'
        };
      });

      // Cache results for 1 hour
      cache.set(cacheKey, results, 3600000);

      return results;
    } catch (error) {
      console.error('Error searching YouTube for audio tracks:', error);
      return [];
    }
  },

  // Get YouTube embed URL for audio playback
  getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0`;
  },

  // Get direct YouTube video URL
  getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  },

  // Parse YouTube duration to seconds
  parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  },

  // Format duration from seconds to MM:SS
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};