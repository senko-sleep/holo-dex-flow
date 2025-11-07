export interface MangaTag {
  id: string;
  name: string;
  type?: string;
  count?: number;
}

export interface Manga {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  bannerUrl?: string;
  status?: string;
  year?: number;
  contentRating?: string;
  tags?: MangaTag[];
  author?: string;
  artist?: string;
  chapters?: number;
  pages?: number;
  favorites?: number;
  lastUpdated?: string;
  mediaId?: string;
  scanlator?: string;
  language?: string;
  parodies?: string[];
  categories?: string[];
}

export interface MangaChapter {
  id: string;
  chapter: string | number;
  title: string;
  volume?: string | number;
  translatedLanguage: string;
  pages: number;
  publishAt?: string | number;
  scanlationGroup?: string;
  externalUrl?: string;
  timestamp?: number;
  language?: string;
}

export interface MangaChapterImagesMeta {
  quality?: string;
  totalPages?: number;
  serverUrl?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface MangaChapterImages {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
  meta?: MangaChapterImagesMeta;
}

export interface Character {
  mal_id: number;
  name: string;
  name_kanji?: string;
  nicknames?: string[];
  images: {
    jpg: {
      image_url: string;
    };
    webp?: {
      image_url: string;
    };
  };
  favorites?: number;
  about?: string;
}
