import { Manga } from '@/types/manga';
import { useMangaCover } from '@/hooks/useMangaCover';

interface MangaSearchResultProps {
  manga: Manga;
  onClick: () => void;
}

export const MangaSearchResult = ({ manga, onClick }: MangaSearchResultProps) => {
  const coverUrl = useMangaCover(manga.title);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-secondary/50 transition-colors text-left"
    >
      <img
        src={coverUrl}
        alt={manga.title}
        className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded flex-shrink-0"
        loading="lazy"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-xs sm:text-sm truncate">{manga.title}</h4>
        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
          {manga.year && <span>{manga.year}</span>}
          {manga.status && <span className="hidden sm:inline">• {manga.status}</span>}
        </div>
      </div>
    </button>
  );
};
