import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import { ThemeSong } from '@/types/anime';
import { Slider } from '@/components/ui/slider';
import { animeApi } from '@/services/animeApi';

interface AudioPlayerProps {
  song: ThemeSong;
  onClose: () => void;
}

export const AudioPlayer = ({ song, onClose }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get the best audio URL using the same API as AnimeModal
  const audioUrl = animeApi.getBestAudioUrl(song);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50 animate-slide-up">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-muted-foreground">Audio not available for this theme</p>
          <button onClick={onClose} className="hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-card backdrop-blur-xl border-t border-border p-4 z-50 shadow-glow animate-slide-up">
      <div className="max-w-4xl mx-auto">
        <audio ref={audioRef} src={audioUrl} />
        
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {song.song?.title || 'Unknown Title'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {song.anime?.name || ''} - {song.type}{song.sequence}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="bg-primary hover:bg-primary/90 text-white p-3 rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-3 w-64">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="w-24"
              />
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
