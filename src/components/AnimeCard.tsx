import { Anime } from '@/types/anime';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  onClick: () => void;
}

export const AnimeCard = ({ anime, onClick }: AnimeCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 hover:scale-105 cursor-pointer animate-scale-in"
    >
      <div className="aspect-[2/3] relative overflow-hidden">
        <img
          src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
          alt={anime.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent opacity-90" />
        
        {anime.score && (
          <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 text-sm font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" />
            {anime.score}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-bold text-foreground text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {anime.title_english || anime.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {anime.episodes && <span>{anime.episodes} episodes</span>}
          {anime.year && <span>• {anime.year}</span>}
        </div>
      </div>
    </button>
  );
};
