import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { Character } from '@/types/manga';
import { cache } from '@/lib/cache';
import { anilistApi } from './anilistApi';

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
  // Get top anime sorted by rating (using AniList)
  async getTopAnime(page = 1, limit = 24): Promise<Anime[]> {
    try {
      // AniList uses includeAdult flag - set to true for comprehensive results
      return await anilistApi.getTopAnime(page, limit, true);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Get current season anime (using AniList)
  async getCurrentSeasonAnime(): Promise<Anime[]> {
    try {
      return await anilistApi.getCurrentSeasonAnime(12);
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  // Search anime (using AniList with adult content support)
  async searchAnime(query: string, limit = 20): Promise<Anime[]> {
    if (!query.trim()) return [];
    
    try {
      // Set includeAdult to true to search all anime including mature content
      return await anilistApi.searchAnime(query, limit, true);
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  // Get anime details by ID (using AniList)
  async getAnimeById(id: number): Promise<Anime> {
    try {
      return await anilistApi.getAnimeById(id);
    } catch (error) {
      console.error('Error fetching anime by ID:', error);
      throw error;
    }
  },

  // Get anime characters and voice actors (using AniList)
  async getAnimeCharacters(id: number): Promise<AnimeCharacter[]> {
    try {
      return await anilistApi.getAnimeCharacters(id);
    } catch (error) {
      console.error('Error fetching anime characters:', error);
      return [];
    }
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

  // Search characters (using AniList)
  async searchCharacters(query: string, limit = 10): Promise<Character[]> {
    if (!query.trim()) return [];
    try {
      return await anilistApi.searchCharacters(query, limit);
    } catch (error) {
      console.error('Error searching characters:', error);
      return [];
    }
  },

  // Get top characters by favorites (using AniList)
  async getTopCharacters(page = 1, limit = 50): Promise<Character[]> {
    try {
      return await anilistApi.getTopCharacters(page, limit);
    } catch (error) {
      console.error('Error fetching top characters:', error);
      return [];
    }
  },
};
