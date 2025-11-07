export interface Manga {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  status?: string;
  year?: number;
  contentRating?: string;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  author?: string;
  artist?: string;
}

export interface MangaChapter {
  id: string;
  chapter: string;
  title: string;
  volume?: string;
  translatedLanguage: string;
  pages: number;
  publishAt: string;
  scanlationGroup: string;
}

export interface MangaChapterImages {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
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
