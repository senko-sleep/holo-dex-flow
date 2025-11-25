import { Manga } from '@/types/manga';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Heart } from 'lucide-react';
import { favorites } from '@/lib/favorites';
import { useState } from 'react';
import { useMangaCover } from '@/hooks/useMangaCover';

interface MangaCardProps {
  manga: Manga;
  onClick: () => void;
}

export const MangaCard = ({ manga, onClick }: MangaCardProps) => {
  const [isFavorite, setIsFavorite] = useState(
    favorites.isFavorite(manga.id, 'manga')
  );

  const coverUrl = useMangaCover(manga.title);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isFavorite) {
      favorites.remove(manga.id, 'manga');
      setIsFavorite(false);
      return;
    }

    favorites.add({
      id: manga.id,
      type: 'manga',
      title: manga.title,
      imageUrl: coverUrl,
    });

    setIsFavorite(true);
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-glow hover:scale-110 hover:-translate-y-2 animate-scale-in border-2 border-accent/40 hover:border-accent active:scale-105"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-secondary/20">

        {/* Skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 animate-pulse" />
        )}

        {/* Cover Image */}
        <img
          src={imageError ? '/placeholder.svg' : coverUrl}
          alt={manga.title}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
            isFavorite
              ? 'bg-red-500/90 text-white scale-110'
              : 'bg-black/50 text-white hover:bg-red-500/90 hover:scale-110'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Status Badge */}
        {manga.status && (
          <Badge className="absolute top-3 left-3 capitalize bg-accent backdrop-blur-sm border-2 border-accent/60 group-hover:bg-accent/80 group-hover:border-accent transition-all">
            {manga.status}
          </Badge>
        )}

        {/* Hover Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-2 text-white text-sm mb-2">
            <BookOpen className="h-4 w-4" />
            <span>Click to read</span>
          </div>

          {manga.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {manga.tags.slice(0, 3).map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-3 bg-gradient-to-b from-accent/10 to-card/80 backdrop-blur-sm group-hover:from-accent/20 group-hover:to-accent/10 transition-all">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-foreground group-hover:text-accent transition-colors">
          {manga.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground">
          {manga.year && <span>{manga.year}</span>}
          {manga.author && (
            <>
              <span>•</span>
              <span className="truncate">{manga.author}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
