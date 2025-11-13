import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from 'lucide-react';

export interface ThemeSongVideo {
  id: number;
  basename: string;
  filename: string;
  link: string;
  audio?: string;
  quality?: string;
  tags: string[];
}

export interface ThemeSong {
  id: number;
  type: 'OP' | 'ED';
  sequence: number;
  slug: string;
  song: {
    title: string;
    artists: Array<{
      name: string;
    }>;
  };
  videos: ThemeSongVideo[];
}

interface ThemeSongPlayerProps {
  theme: ThemeSong;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const ThemeSongPlayer = ({ 
  theme, 
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious 
}: ThemeSongPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get the best quality video with audio
  const bestVideo = theme.videos
    .filter(v => v.audio && v.quality === '1080p')
    .sort((a, b) => (b.quality || '').localeCompare(a.quality || ''))[0] || 
    theme.videos[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [theme, onNext]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error('Error playing audio:', e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!bestVideo) {
    return (
      <div className="bg-card rounded-xl p-4 shadow-lg flex items-center justify-center text-muted-foreground">
        <Music className="mr-2 h-5 w-5" />
        <span>No audio available for this theme</span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 shadow-lg">
      <audio 
        ref={audioRef} 
        src={bestVideo.audio || bestVideo.link} 
        preload="metadata"
      />
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {theme.song.title} {theme.type}{theme.sequence > 1 ? ` ${theme.sequence}` : ''}
        </h3>
        {theme.song.artists.length > 0 && (
          <p className="text-sm text-muted-foreground">
            by {theme.song.artists.map(a => a.name).join(', ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onPrevious} 
          disabled={!hasPrevious}
          className="p-2 rounded-full hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous track"
        >
          <SkipBack size={20} />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        
        <button 
          onClick={onNext} 
          disabled={!hasNext}
          className="p-2 rounded-full hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next track"
        >
          <SkipForward size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 rounded-full appearance-none bg-accent/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={toggleMute} 
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 h-1 rounded-full appearance-none bg-accent/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>
    </div>
  );
};

export default ThemeSongPlayer;
