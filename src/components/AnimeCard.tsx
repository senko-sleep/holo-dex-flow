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
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-glow hover:scale-110 hover:-translate-y-2 animate-scale-in border-2 border-primary/40 hover:border-primary active:scale-105"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-primary/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
        
        {/* Score badge - always visible */}
        {anime.score && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/20 backdrop-blur-sm border-2 border-yellow-400/60 group-hover:border-yellow-300 group-hover:bg-yellow-500/30 transition-all">
            <Star className="h-3 w-3 text-yellow-300 fill-yellow-300 group-hover:text-yellow-200" />
            <span className="text-yellow-100 text-xs font-bold">{anime.score.toFixed(1)}</span>
          </div>
        )}
        
        {/* Type badge */}
        <Badge className="absolute top-3 left-3 bg-primary backdrop-blur-sm border-2 border-primary/60 group-hover:bg-primary/80 group-hover:border-primary transition-all">
          {anime.type || 'TV'}
        </Badge>
        
        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-2 text-white text-sm mb-2">
            <Play className="h-4 w-4" />
            <span className="font-medium">View Details</span>
          </div>
          {anime.episodes && (
            <p className="text-xs text-white/80">{anime.episodes} episodes</p>
          )}
        </div>
      </div>
      
      <CardContent className="p-3 bg-gradient-to-b from-primary/10 to-card/80 backdrop-blur-sm group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-foreground group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground">
          {anime.year || 'N/A'}
        </p>
      </CardContent>
    </Card>
  );
};
