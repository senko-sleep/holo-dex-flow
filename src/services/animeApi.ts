import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const ANIMETHEMES_BASE_URL = 'https://api.animethemes.moe';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const animeApi = {
  // Get top anime sorted by rating
  async getTopAnime(page = 1, limit = 24): Promise<Anime[]> {
    try {
      await delay(350); // Jikan rate limit
      const response = await fetch(
        `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch top anime:', response.status);
        return [];
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Get current season anime
  async getCurrentSeasonAnime(): Promise<Anime[]> {
    try {
      await delay(350);
      const response = await fetch(`${JIKAN_BASE_URL}/seasons/now`);
      
      if (!response.ok) {
        console.error('Failed to fetch seasonal anime:', response.status);
        return [];
      }
      
      const data = await response.json();
      return (data.data || []).slice(0, 12);
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  // Search anime
  async searchAnime(query: string): Promise<Anime[]> {
    if (!query.trim()) return [];
    try {
      await delay(350);
      const response = await fetch(
        `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10&order_by=score&sort=desc`
      );
      
      if (!response.ok) {
        console.error('Failed to search anime:', response.status);
        return [];
      }
      
      const data = await response.json();
      return data.data || [];
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
      const searchQuery = encodeURIComponent(animeTitle.replace(/[:\-]/g, ' '));
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
};
