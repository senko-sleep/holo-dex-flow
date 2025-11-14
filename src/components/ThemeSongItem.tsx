import { useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { ThemeSong, ThemeSongVideo } from '@/types/anime';

interface ThemeSongItemProps {
  theme: ThemeSong;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  className?: string;
}

export const ThemeSongItem = ({
  theme,
  isPlaying,
  onPlay,
  onPause,
  className = '',
}: ThemeSongItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const bestVideo = getBestVideo(theme.videos);
  
  if (!bestVideo) return null;

  const artistNames = theme.song.artists.map(a => a.name).join(', ');
  const themeType = `${theme.type}${theme.sequence > 1 ? ` ${theme.sequence}` : ''}`;

  return (
    <div 
      className={`group flex items-center p-3 rounded-lg hover:bg-accent/20 transition-colors ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Album Art Placeholder with Play Button */}
      <div className="relative w-12 h-12 bg-gradient-to-br from-primary/30 to-accent/30 rounded-md overflow-hidden mr-3 flex-shrink-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <Music className="w-6 h-6 text-primary" />
        </div>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity ${isHovered || isPlaying ? 'opacity-100' : 'opacity-0'}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {theme.song.title}
          </span>
          {bestVideo.quality && (
            <span className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent-foreground rounded">
              {bestVideo.quality}
            </span>
          )}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <span>{themeType}</span>
          {artistNames && <span className="mx-1">•</span>}
          <span className="truncate">{artistNames}</span>
        </div>
      </div>

      {/* Duration */}
      <div className="ml-2 text-xs text-muted-foreground">
        1:30
      </div>
    </div>
  );
};

// Helper function to get the best quality video
function getBestVideo(videos: ThemeSongVideo[]) {
  if (!videos || videos.length === 0) return null;
  
  return videos
    .filter(v => v.audio || v.link)
    .sort((a, b) => {
      // Prioritize videos with audio
      if (a.audio && !b.audio) return -1;
      if (!a.audio && b.audio) return 1;
      
      // Then sort by quality
      const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
      const aQuality = a.quality ? qualityOrder[a.quality as keyof typeof qualityOrder] ?? -1 : -1;
      const bQuality = b.quality ? qualityOrder[b.quality as keyof typeof qualityOrder] ?? -1 : -1;
      
      return bQuality - aQuality;
    })[0];
}
