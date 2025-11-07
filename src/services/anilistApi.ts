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

interface SearchVariables {
  search?: string;
  page: number;
  perPage: number;
  genre_in?: string[];
  tag_in?: string[];
  format_in?: string[];
  status_in?: string[];
  [key: string]: unknown;
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

// Custom error class for API errors
class AniListAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimited: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AniListAPIError';
  }
}

// GraphQL query helper
async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  await delay(100); // Small delay to avoid overwhelming the API
  
  try {
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

    // Check for rate limiting (429 Too Many Requests)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
      const errorMessage = `Rate limited by AniList API. Please wait ${retrySeconds} seconds before trying again.`;
      console.error(errorMessage);
      throw new AniListAPIError(errorMessage, 429, true, retrySeconds);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AniList API error:', response.status, errorText);
      
      let errorMessage = `AniList API error (${response.status})`;
      if (response.status === 500) {
        errorMessage = 'AniList server error. The service may be temporarily unavailable.';
      } else if (response.status === 503) {
        errorMessage = 'AniList service is temporarily unavailable. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = 'Requested resource not found on AniList.';
      }
      
      throw new AniListAPIError(errorMessage, response.status);
    }

    const json = await response.json();
    
    if (json.errors) {
      console.error('GraphQL errors:', json.errors);
      const errorMessage = json.errors[0]?.message || 'Unknown GraphQL error';
      throw new AniListAPIError(`AniList API: ${errorMessage}`);
    }

    return json.data;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    // Re-throw AniListAPIError as-is, wrap other errors
    if (error instanceof AniListAPIError) {
      throw error;
    }
    throw new AniListAPIError(
      error instanceof Error ? error.message : 'Network error connecting to AniList'
    );
  }
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
  // Get top anime with optional filters
  async getTopAnime(
    page = 1, 
    perPage = 24,
    filters?: {
      genres?: string[];
      tags?: (string | number)[];
      format?: string[];
      status?: string[];
    }
  ): Promise<TransformedAnime[]> {
    const cacheKey = `anilist_top_anime_v4_${page}_${perPage}_${JSON.stringify(filters)}`;
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($page: Int, $perPage: Int, $genre_in: [String], $tag_in: [String], $format_in: [MediaFormat], $status_in: [MediaStatus], $source_in: [MediaSource]) {
        Page(page: $page, perPage: $perPage) {
          media(
            sort: [SCORE_DESC, POPULARITY_DESC], 
            type: ANIME, 
            isAdult: false, 
            genre_in: $genre_in, 
            tag_in: $tag_in, 
            format_in: $format_in, 
            status_in: $status_in,
            source_in: $source_in
          ) {
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
      }
    `;

    try {
      const variables = {
        page,
        perPage,
        genre_in: filters?.genres?.length ? filters.genres : undefined,
        tag_in: filters?.tags?.length ? filters.tags.map(String) : undefined,
        format_in: filters?.format?.length ? filters.format : undefined,
        status_in: filters?.status?.length ? filters.status : undefined,
        source_in: ['MANGA', 'LIGHT_NOVEL'] // Only show anime based on manga or light novels
      };
      
      console.log('Fetching top anime with variables:', variables);
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(query, variables);
      console.log('Received top anime data:', data.Page.media.length, 'items');
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
    const cacheKey = `anilist_seasonal_anime_v4_${perPage}`; // v4 to bust old cache
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    
    let season = 'WINTER';
    if (month >= 3 && month <= 5) season = 'SPRING';
    else if (month >= 6 && month <= 8) season = 'SUMMER';
    else if (month >= 9 && month <= 11) season = 'FALL';

    const query = `
      query ($season: MediaSeason, $year: Int, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
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
      console.log('Fetching seasonal anime:', { season, year, perPage });
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(query, { season, year, perPage });
      console.log('Received seasonal anime data:', data.Page.media.length, 'items');
      const result = data.Page.media.map(transformAnime);
      cache.set(cacheKey, result, 30 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error fetching seasonal anime from AniList:', error);
      return [];
    }
  },

  // Search anime with filters
  async searchAnime(
    query: string, 
    perPage = 20,
    filters?: {
      genres?: string[];
      tags?: (string | number)[];
      format?: string[];
      status?: string[];
    },
    page = 1
  ): Promise<TransformedAnime[]> {
    // Allow search with just filters (no query)
    const hasFilters = filters && (
      (filters.genres && filters.genres.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.format && filters.format.length > 0) ||
      (filters.status && filters.status.length > 0)
    );
    // Return empty if no query AND no filters
    if (!query?.trim() && !hasFilters) return [];

    const cacheKey = `anilist_search_v5_${query}_${page}_${perPage}_${JSON.stringify(filters)}`;
    const cached = cache.get<TransformedAnime[]>(cacheKey);
    if (cached) return cached;

    const graphqlQuery = `
      query ($search: String, $page: Int, $perPage: Int, $genre_in: [String], $tag_in: [String], $format_in: [MediaFormat], $status_in: [MediaStatus]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(
            search: $search, 
            type: ANIME, 
            isAdult: true, 
            sort: ${query?.trim() ? 'SEARCH_MATCH' : 'POPULARITY_DESC'}, 
            genre_in: $genre_in, 
            tag_in: $tag_in, 
            format_in: $format_in, 
            status_in: $status_in
          ) {
            id
            idMal
            title {
              romaji
              english
              native
              userPreferred
            }
            coverImage {
              large
              medium
              extraLarge
              color
            }
            bannerImage
            format
            episodes
            status
            averageScore
            meanScore
            popularity
            favourites
            description(asHtml: false)
            season
            seasonYear
            seasonInt
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
            genres
            synonyms
            studios(isMain: true) {
              nodes {
                id
                name
              }
            }
            source
            siteUrl
            isAdult
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            trailer {
              id
              site
              thumbnail
            }
          }
        }
      }
    `;

    try {
      const variables: SearchVariables = { 
        search: query?.trim() || undefined, 
        page,
        perPage,
        genre_in: filters?.genres?.length ? filters.genres : undefined,
        tag_in: filters?.tags?.length ? filters.tags.map(String) : undefined,
        format_in: filters?.format?.length ? filters.format : undefined,
        status_in: filters?.status?.length ? filters.status : undefined
      };
      
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(graphqlQuery, variables);
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

  // Get top characters with optional filters
  async getTopCharacters(
    page = 1, 
    perPage = 50,
    filters?: {
      role?: string[];
      sort?: string;
    }
  ): Promise<TransformedCharacter[]> {
    const sortValue = filters?.sort || 'FAVOURITES_DESC';
    const cacheKey = `anilist_top_characters_v3_${page}_${perPage}_${JSON.stringify(filters)}`;
    const cached = cache.get<TransformedCharacter[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($page: Int, $perPage: Int, $sort: [CharacterSort]) {
        Page(page: $page, perPage: $perPage) {
          characters(sort: $sort) {
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
      const sortArray = [sortValue];
      const data = await graphqlRequest<{ Page: { characters: AniListCharacter[] } }>(query, { 
        page, 
        perPage,
        sort: sortArray
      });
      const result = data.Page.characters.map(transformCharacter);
      cache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    } catch (error) {
      console.error('Error fetching top characters from AniList:', error);
      return [];
    }
  },

  // Search characters with filters
  async searchCharacters(
    query: string, 
    perPage = 10,
    filters?: {
      role?: string[];
      sort?: string;
    },
    page = 1
  ): Promise<TransformedCharacter[]> {
    // Allow search with just filters (no query)
    const hasFilters = filters && (
      (filters.role && filters.role.length > 0) ||
      filters.sort
    );
    // Return empty if no query AND no filters
    if (!query?.trim() && !hasFilters) return [];

    const sortValue = filters?.sort || 'FAVOURITES_DESC';
    const graphqlQuery = `
      query ($search: String, $page: Int, $perPage: Int, $sort: [CharacterSort]) {
        Page(page: $page, perPage: $perPage) {
          characters(search: $search, sort: $sort) {
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
      const sortArray = [sortValue];
      const data = await graphqlRequest<{ Page: { characters: AniListCharacter[] } }>(graphqlQuery, { 
        search: query?.trim() || undefined, 
        page,
        perPage,
        sort: sortArray
      });
      return data.Page.characters.map(transformCharacter);
    } catch (error) {
      console.error('Error searching characters on AniList:', error);
      return [];
    }
  },

  // Get available genres from AniList
  async getGenres(): Promise<string[]> {
    const cacheKey = 'anilist_genres';
    const cached = cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query {
        GenreCollection
      }
    `;

    try {
      const data = await graphqlRequest<{ GenreCollection: string[] }>(query);
      const genres = data.GenreCollection || [];
      cache.set(cacheKey, genres, 24 * 60 * 60 * 1000); // Cache for 24 hours
      return genres;
    } catch (error) {
      console.error('Error fetching genres from AniList:', error);
      // Return fallback genres
      return [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
        'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
        'Thriller', 'Mecha', 'Music', 'Psychological'
      ];
    }
  },

  // Get available tags from AniList
  async getTags(): Promise<Array<{ id: number; name: string; category: string }>> {
    const cacheKey = 'anilist_tags';
    const cached = cache.get<Array<{ id: number; name: string; category: string }>>(cacheKey);
    if (cached) return cached;

    const query = `
      query {
        MediaTagCollection {
          id
          name
          category
          isAdult
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ MediaTagCollection: Array<{ id: number; name: string; category: string; isAdult: boolean }> }>(query);
      // Filter out adult tags
      const tags = (data.MediaTagCollection || [])
        .filter(tag => !tag.isAdult)
        .map(tag => ({
          id: tag.id,
          name: tag.name,
          category: tag.category || 'Other'
        }));
      cache.set(cacheKey, tags, 24 * 60 * 60 * 1000); // Cache for 24 hours
      return tags;
    } catch (error) {
      console.error('Error fetching tags from AniList:', error);
      return [];
    }
  },
};
