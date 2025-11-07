import { Anime } from '@/types/anime';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Play } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  onClick: () => void;
}

export const AnimeCard = ({ anime, onClick }: AnimeCardProps) => {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 hover:-translate-y-1 animate-scale-in border-border/50 hover:border-primary/50"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-secondary/20">
        <img
          src={anime.images.jpg.large_image_url}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Score badge - always visible */}
        {anime.score && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-yellow-500/30">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-xs font-bold">{anime.score.toFixed(1)}</span>
          </div>
        )}
        
        {/* Type badge */}
        <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm border-0">
          {anime.type || 'TV'}
        </Badge>
        
        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-2 text-white text-sm mb-2">
            <Play className="h-4 w-4" />
            <span className="font-medium">Watch Now</span>
          </div>
          {anime.episodes && (
            <p className="text-xs text-white/80">{anime.episodes} episodes</p>
          )}
        </div>
      </div>
      
      <CardContent className="p-3 bg-card/50 backdrop-blur-sm">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {anime.year || 'N/A'}
        </p>
      </CardContent>
    </Card>
  );
};
