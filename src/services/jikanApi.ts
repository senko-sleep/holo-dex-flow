import { cache } from '@/lib/cache';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
  type: string;
  source: string;
  episodes: number;
  status: string;
  airing: boolean;
  score: number;
  scored_by: number;
  rank: number;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background: string | null;
  season: string | null;
  year: number | null;
  genres: { name: string }[];
  themes: { name: string }[];
  demographics: { name: string }[];
}

export const jikanApi = {
  async searchAnime(query: string, page = 1, limit = 10) {
    const cacheKey = `jikan_search_${query}_${page}_${limit}`;
    const cached = cache.get<JikanAnime[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&sfw=false`
      );
      
      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.data || [];
      
      // Cache for 1 hour
      cache.set(cacheKey, results, 60 * 60 * 1000);
      return results;
    } catch (error) {
      console.error('Error searching Jikan API:', error);
      return [];
    }
  },

  async getAnimeById(id: number) {
    const cacheKey = `jikan_anime_${id}`;
    const cached = cache.get<JikanAnime>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
      
      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.statusText}`);
      }

      const { data } = await response.json();
      
      // Cache for 1 day
      cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      return data;
    } catch (error) {
      console.error('Error fetching anime from Jikan:', error);
      return null;
    }
  },

  async getTopAnime(page = 1, limit = 10) {
    const cacheKey = `jikan_top_${page}_${limit}`;
    const cached = cache.get<JikanAnime[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${limit}&sfw=false`
      );
      
      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.data || [];
      
      // Cache for 1 hour
      cache.set(cacheKey, results, 60 * 60 * 1000);
      return results;
    } catch (error) {
      console.error('Error fetching top anime from Jikan:', error);
      return [];
    }
  }
};
