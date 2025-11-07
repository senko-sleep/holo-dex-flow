import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { Character } from '@/types/manga';
import { cache } from '@/lib/cache';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const ANIMETHEMES_BASE_URL = 'https://api.animethemes.moe';

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

export const animeApi = {
  // Get top anime sorted by rating
  async getTopAnime(page = 1, limit = 24): Promise<Anime[]> {
    const cacheKey = `top_anime_${page}_${limit}`;
    const cached = cache.get<Anime[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(350); // Jikan rate limit
        const response = await fetch(
          `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
      });
      
      cache.set(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
      return result;
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Get current season anime
  async getCurrentSeasonAnime(): Promise<Anime[]> {
    const cacheKey = 'seasonal_anime';
    const cached = cache.get<Anime[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(350);
        const response = await fetch(`${JIKAN_BASE_URL}/seasons/now`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return (data.data || []).slice(0, 12);
      });
      
      cache.set(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  // Search anime
  async searchAnime(query: string, limit = 20): Promise<Anime[]> {
    if (!query.trim()) return [];
    
    const cacheKey = `search_anime_${query}_${limit}`;
    const cached = cache.get<Anime[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(350);
        const response = await fetch(
          `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&order_by=score&sort=desc`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
      });
      
      cache.set(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  // Get anime details by ID
  async getAnimeById(id: number): Promise<Anime> {
    await delay(350);
    const response = await fetch(`${JIKAN_BASE_URL}/anime/${id}/full`);
    const data = await response.json();
    return data.data;
  },

  // Get anime characters and voice actors
  async getAnimeCharacters(id: number): Promise<AnimeCharacter[]> {
    await delay(350);
    const response = await fetch(`${JIKAN_BASE_URL}/anime/${id}/characters`);
    const data = await response.json();
    return data.data.slice(0, 8); // Top 8 characters
  },

  // Get theme songs from AnimeThemes API
  async getThemeSongs(animeTitle: string): Promise<ThemeSong[]> {
    try {
      const searchQuery = encodeURIComponent(animeTitle.replace(/[:|-]/g, ' '));
      const response = await fetch(
        `${ANIMETHEMES_BASE_URL}/anime?filter[name]=${searchQuery}&include=animethemes.animethemeentries.videos,animethemes.song.artists`
      );
      const data = await response.json();
      
      if (data.anime && data.anime.length > 0) {
        const anime = data.anime[0];
        return anime.animethemes || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching theme songs:', error);
      return [];
    }
  },

  // Search characters
  async searchCharacters(query: string, limit = 10): Promise<Character[]> {
    if (!query.trim()) return [];
    try {
      await delay(350);
      const response = await fetch(
        `${JIKAN_BASE_URL}/characters?q=${encodeURIComponent(query)}&limit=${limit}&order_by=favorites&sort=desc`
      );
      
      if (!response.ok) {
        console.error('Failed to search characters:', response.status);
        return [];
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching characters:', error);
      return [];
    }
  },

  // Get top characters by favorites
  async getTopCharacters(page = 1, limit = 50): Promise<Character[]> {
    const cacheKey = `top_characters_${page}_${limit}`;
    const cached = cache.get<Character[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(350);
        const response = await fetch(
          `${JIKAN_BASE_URL}/top/characters?page=${page}&limit=${limit}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
      });
      
      cache.set(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
      return result;
    } catch (error) {
      console.error('Error fetching top characters:', error);
      return [];
    }
  },
};
