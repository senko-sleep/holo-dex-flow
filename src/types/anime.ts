export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  type?: string;            

  images: {
    jpg: {
      image_url: string;
      large_image_url?: string;
    };
  };
  score?: number;
  synopsis?: string;
  episodes?: number;
  status?: string;
  aired?: {
    from?: string;
    to?: string;
  };
  season?: string;
  year?: number;
  genres?: Array<{ mal_id: number; name: string }>;
  themes?: Array<{ mal_id: number; name: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  
  // Additional stats and info
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  source?: string;
  rating?: string;
  duration?: string;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
}

export interface AnimeCharacter {
  character: {
    mal_id: number;
    name: string;
    images: {
      jpg: {
        image_url: string;
      };
    };
  };
  role: string;
  favorites: number;
  voice_actors?: Array<{
    person: {
      mal_id: number;
      name: string;
      images: {
        jpg: {
          image_url: string;
        };
      };
    };
    language: string;
  }>;
}

export interface ThemeSong {
  id: number;
  type: 'OP' | 'ED';
  sequence: number;
  slug: string;
  song?: {
    title: string;
    artists?: Array<{
      name: string;
    }>;
  };
  anime?: {
    name: string;
    slug: string;
  };
  animethemeentries?: Array<{
    videos?: Array<{
      basename: string;
      filename: string;
      link: string;
      audio?: string;
    }>;
  }>;
}