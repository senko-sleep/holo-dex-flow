import { cache } from '@/lib/cache';

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Type definitions
interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

interface AniListCoverImage {
  large?: string;
  medium?: string;
  extraLarge?: string;
}

interface AniListDate {
  year?: number;
  month?: number;
  day?: number;
}

interface AniListStudio {
  id: number;
  name: string;
}

interface AniListTag {
  id: number;
  name: string;
}

interface AniListRanking {
  rank: number;
  type: string;
}

interface AniListMedia {
  id: number;
  idMal?: number;
  title: AniListTitle;
  coverImage: AniListCoverImage;
  format?: string;
  episodes?: number;
  status?: string;
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  description?: string;
  season?: string;
  seasonYear?: number;
  genres?: string[];
  studios?: { nodes: AniListStudio[] };
  tags?: AniListTag[];
  siteUrl: string;
  isAdult?: boolean;
  source?: string;
  startDate?: AniListDate;
  endDate?: AniListDate;
  duration?: number;
  rankings?: AniListRanking[];
  airingSchedule?: { nodes: Array<{ airingAt: number }> };
}

interface AniListCharacterName {
  full?: string;
  native?: string;
}

interface AniListCharacterImage {
  large?: string;
  medium?: string;
}

interface AniListCharacter {
  id: number;
  name: AniListCharacterName;
  image: AniListCharacterImage;
  favourites?: number;
  siteUrl: string;
  description?: string;
}

interface AniListVoiceActor {
  id: number;
  name: AniListCharacterName;
  image: AniListCharacterImage;
  language: string;
  favourites?: number;
}

interface AniListCharacterEdge {
  role: string;
  node: AniListCharacter;
  voiceActors: AniListVoiceActor[];
}

interface TransformedAnime {
  mal_id: number;
  anilist_id?: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url?: string;
      large_image_url?: string;
    };
  };
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  aired: {
    from: string | null;
    to: string | null;
  };
  duration: string | null;
  rating: string;
  score: number | null;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  season?: string;
  year?: number;
  broadcast: {
    string: string | null;
  };
  studios: Array<{ mal_id: number; name: string }>;
  genres: Array<{ mal_id: number; name: string }>;
  themes: Array<{ mal_id: number; name: string }>;
  source?: string;
  isAdult?: boolean;
}

interface TransformedCharacter {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
  name: string;
  name_kanji?: string;
  favorites?: number;
  about?: string;
}

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// GraphQL query helper
async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  await delay(100); // Small delay to avoid overwhelming the API
  
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }

  return json.data;
}

// Transform AniList data to our Anime type
function transformAnime(anilistAnime: AniListMedia): TransformedAnime {
  return {
    mal_id: anilistAnime.idMal || anilistAnime.id,
    anilist_id: anilistAnime.id, // Store AniList ID for character fetching
    url: anilistAnime.siteUrl,
    images: {
      jpg: {
        image_url: anilistAnime.coverImage?.large || anilistAnime.coverImage?.medium || '/placeholder.svg',
        small_image_url: anilistAnime.coverImage?.medium,
        large_image_url: anilistAnime.coverImage?.extraLarge || anilistAnime.coverImage?.large,
      },
    },
    title: anilistAnime.title?.english || anilistAnime.title?.romaji || 'Unknown Title',
    title_english: anilistAnime.title?.english,
    title_japanese: anilistAnime.title?.native,
    type: anilistAnime.format?.replace('_', ' '),
    episodes: anilistAnime.episodes,
    status: anilistAnime.status,
    aired: {
      from: anilistAnime.startDate ? 
        `${anilistAnime.startDate.year}-${String(anilistAnime.startDate.month || 1).padStart(2, '0')}-${String(anilistAnime.startDate.day || 1).padStart(2, '0')}` : 
        null,
      to: anilistAnime.endDate ? 
        `${anilistAnime.endDate.year}-${String(anilistAnime.endDate.month || 1).padStart(2, '0')}-${String(anilistAnime.endDate.day || 1).padStart(2, '0')}` : 
        null,
    },
    duration: anilistAnime.duration ? `${anilistAnime.duration} min per ep` : null,
    rating: anilistAnime.isAdult ? 'R+ - Mild Nudity' : 'PG-13',
    score: anilistAnime.averageScore ? anilistAnime.averageScore / 10 : null,
    scored_by: anilistAnime.popularity,
    rank: anilistAnime.rankings?.find((r) => r.type === 'RATED')?.rank,
    popularity: anilistAnime.popularity,
    members: anilistAnime.popularity,
    favorites: anilistAnime.favourites,
    synopsis: anilistAnime.description?.replace(/<[^>]*>/g, ''), // Remove HTML tags
    season: anilistAnime.season?.toLowerCase(),
    year: anilistAnime.seasonYear || anilistAnime.startDate?.year,
    broadcast: {
      string: anilistAnime.airingSchedule?.nodes?.[0]?.airingAt ? 
        new Date(anilistAnime.airingSchedule.nodes[0].airingAt * 1000).toLocaleString() : 
        null,
    },
    studios: anilistAnime.studios?.nodes?.map((studio) => ({
      mal_id: studio.id,
      name: studio.name,
    })) || [],
    genres: anilistAnime.genres?.map((genre, index) => ({
      mal_id: index,
      name: genre,
    })) || [],
    themes: anilistAnime.tags?.slice(0, 5).map((tag) => ({
      mal_id: tag.id,
      name: tag.name,
    })) || [],
    source: anilistAnime.source,
    isAdult: anilistAnime.isAdult,
  };
}

// Transform AniList character data
function transformCharacter(anilistChar: AniListCharacter): TransformedCharacter {
  return {
    mal_id: anilistChar.id,
    url: anilistChar.siteUrl,
    images: {
      jpg: {
        image_url: anilistChar.image?.large || anilistChar.image?.medium || '/placeholder.svg',
      },
    },
    name: anilistChar.name?.full || anilistChar.name?.native || 'Unknown',
    name_kanji: anilistChar.name?.native,
    favorites: anilistChar.favourites,
    about: anilistChar.description?.replace(/<[^>]*>/g, ''),
  };
}

export const anilistApi = {
  // Get top anime
  async getTopAnime(page = 1, perPage = 24): Promise<TransformedAnime[]> {
    const cacheKey = `anilist_top_anime_v2_${page}_${perPage}`; // v2 to bust old cache
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: SCORE_DESC, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
              extraLarge
            }
            format
            episodes
            status
            averageScore
            popularity
            favourites
            description
            season
            seasonYear
            genres
            studios {
              nodes {
                id
                name
              }
            }
            tags {
              id
              name
            }
            siteUrl
            isAdult
            source
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            duration
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(query, { page, perPage });
      const result = data.Page.media.map(transformAnime);
      cache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error fetching top anime from AniList:', error);
      return [];
    }
  },

  // Get current season anime
  async getCurrentSeasonAnime(perPage = 12): Promise<TransformedAnime[]> {
    const cacheKey = `anilist_seasonal_anime_v2_${perPage}`; // v2 to bust old cache
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let season = 'WINTER';
    if (month >= 2 && month <= 4) season = 'SPRING';
    else if (month >= 5 && month <= 7) season = 'SUMMER';
    else if (month >= 8 && month <= 10) season = 'FALL';

    const query = `
      query ($season: MediaSeason, $year: Int, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
              extraLarge
            }
            format
            episodes
            status
            averageScore
            popularity
            favourites
            description
            season
            seasonYear
            genres
            studios {
              nodes {
                id
                name
              }
            }
            siteUrl
            isAdult
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(query, { season, year, perPage });
      const result = data.Page.media.map(transformAnime);
      cache.set(cacheKey, result, 30 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error fetching seasonal anime from AniList:', error);
      return [];
    }
  },

  // Search anime
  async searchAnime(query: string, perPage = 20): Promise<TransformedAnime[]> {
    if (!query.trim()) return [];

    const cacheKey = `anilist_search_v2_${query}_${perPage}`; // v2 to bust old cache
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const graphqlQuery = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
              extraLarge
            }
            format
            episodes
            status
            averageScore
            popularity
            favourites
            description
            season
            seasonYear
            genres
            siteUrl
            isAdult
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(graphqlQuery, { search: query, perPage });
      const result = data.Page.media.map(transformAnime);
      cache.set(cacheKey, result, 5 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error searching anime on AniList:', error);
      return [];
    }
  },

  // Get anime by ID
  async getAnimeById(id: number): Promise<TransformedAnime> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
            extraLarge
          }
          format
          episodes
          status
          averageScore
          popularity
          favourites
          description
          season
          seasonYear
          genres
          studios {
            nodes {
              id
              name
            }
          }
          tags {
            id
            name
          }
          siteUrl
          isAdult
          source
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          duration
          rankings {
            rank
            type
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Media: AniListMedia }>(query, { id });
      return transformAnime(data.Media);
    } catch (error) {
      console.error('Error fetching anime by ID from AniList:', error);
      throw error;
    }
  },

  // Get anime characters
  async getAnimeCharacters(id: number): Promise<Array<{
    character: TransformedCharacter;
    role: string;
    favorites?: number;
    voice_actors: Array<{
      person: {
        mal_id: number;
        name: string;
        images: { jpg: { image_url?: string } };
      };
      language: string;
      favorites?: number;
    }>;
  }>> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          characters(sort: FAVOURITES_DESC, perPage: 8) {
            edges {
              role
              node {
                id
                name {
                  full
                  native
                }
                image {
                  large
                  medium
                }
                favourites
                siteUrl
                description
              }
              voiceActors(sort: FAVOURITES_DESC) {
                id
                name {
                  full
                  native
                }
                image {
                  large
                  medium
                }
                language
                favourites
              }
            }
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Media: { characters: { edges: AniListCharacterEdge[] } } }>(query, { id });
      return data.Media.characters.edges.map((edge) => ({
        character: transformCharacter(edge.node),
        role: edge.role,
        favorites: edge.node.favourites,
        voice_actors: edge.voiceActors.map((va) => ({
          person: {
            mal_id: va.id,
            name: va.name.full,
            images: {
              jpg: {
                image_url: va.image.large || va.image.medium,
              },
            },
          },
          language: va.language === 'JAPANESE' ? 'Japanese' : va.language === 'ENGLISH' ? 'English' : va.language,
          favorites: va.favourites,
        })),
      }));
    } catch (error) {
      console.error('Error fetching characters from AniList:', error);
      return [];
    }
  },

  // Get top characters
  async getTopCharacters(page = 1, perPage = 50): Promise<TransformedCharacter[]> {
    const cacheKey = `anilist_top_characters_v2_${page}_${perPage}`; // v2 to bust old cache
    const cached = cache.get<TransformedCharacter[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          characters(sort: FAVOURITES_DESC) {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            favourites
            siteUrl
            description
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { characters: AniListCharacter[] } }>(query, { page, perPage });
      const result = data.Page.characters.map(transformCharacter);
      cache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error fetching top characters from AniList:', error);
      return [];
    }
  },

  // Search characters
  async searchCharacters(query: string, perPage = 10): Promise<TransformedCharacter[]> {
    if (!query.trim()) return [];

    const graphqlQuery = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          characters(search: $search, sort: FAVOURITES_DESC) {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            favourites
            siteUrl
            description
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { characters: AniListCharacter[] } }>(graphqlQuery, { search: query, perPage });
      return data.Page.characters.map(transformCharacter);
    } catch (error) {
      console.error('Error searching characters on AniList:', error);
      return [];
    }
  },
};
