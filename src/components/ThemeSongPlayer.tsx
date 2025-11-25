import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { ThemeSong } from '@/types/anime';
import { youtubeService, YouTubeSearchResult, YouTubePlayer, YouTubePlayerEvent } from '@/services/youtubeService';
import { youtubeAPIManager } from '@/lib/youtubeAPIManager';

interface ThemeSongPlayerProps {
  theme: ThemeSong;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
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
  const [youtubeResult, setYoutubeResult] = useState<YouTubeSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Search for the song on YouTube when theme changes
  useEffect(() => {
    const searchSong = async () => {
      setIsLoading(true);
      setError(null);
      setYoutubeResult(null);

      try {
        // Create search query from song title and artists
        const artistNames = theme.song.artists.map(a => a.name).join(' ');
        const query = `${theme.song.title} ${artistNames}`.trim();

        const results = await youtubeService.searchAudioTracks(query, 1);

        if (results.length > 0) {
          setYoutubeResult(results[0]);
          const durationSeconds = youtubeService.parseDuration(results[0].duration);
          setDuration(durationSeconds);
        } else {
          setError('No audio tracks found on YouTube');
        }
      } catch (err) {
        console.error('Error searching YouTube:', err);
        setError('Failed to search for audio track');
      } finally {
        setIsLoading(false);
      }
    };

    if (theme.song.title) {
      searchSong();
    }
  }, [theme.song.title, theme.song.artists]);

  const onPlayerReady = useCallback((event: YouTubePlayerEvent) => {
    if (event.target) {
      event.target.setVolume(volume * 100);
      setDuration(event.target.getDuration());
    }
  }, [volume]);

  const onPlayerStateChange = useCallback((event: YouTubePlayerEvent) => {
    if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
      onNext?.();
    }
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
  }, [onNext]);

  // Load YouTube IFrame Player API
  useEffect(() => {
    if (!youtubeResult) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initializePlayer = async () => {
      try {
        // Load YouTube API if not already loaded
        await youtubeAPIManager.loadAPI();

        if (!isMounted) return;

        // Ensure the container element exists
        if (!playerContainerRef.current) {
          console.warn('Player container not found');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initializePlayer, 1000 * retryCount);
          }
          return;
        }

        // Destroy existing player
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying previous player:', e);
          }
          playerRef.current = null;
        }

        // Create new player with timeout
        const playerPromise = new Promise<YouTubePlayer>((resolve, reject) => {
          const player = new window.YT.Player(playerContainerRef.current!, {
            height: '0', // Hidden video
            width: '0',  // Hidden video
            videoId: youtubeResult.videoId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              showinfo: 0
            },
            events: {
              onReady: (event: YouTubePlayerEvent) => {
                resolve(player);
                onPlayerReady(event);
              },
              onStateChange: onPlayerStateChange,
              onError: (event: YouTubePlayerEvent) => {
                reject(new Error(`YouTube player error: ${event.data}`));
              }
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('YouTube player initialization timeout'));
          }, 10000);
        });

        playerRef.current = await playerPromise;

      } catch (error) {
        console.error('Failed to initialize YouTube player:', error);

        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`Retrying player initialization (${retryCount}/${maxRetries})...`);
          setTimeout(initializePlayer, 2000 * retryCount);
        } else {
          setError('Failed to load audio player after multiple attempts');
        }
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player in cleanup:', e);
        }
        playerRef.current = null;
      }
    };
  }, [youtubeResult]); // Remove onPlayerReady and onPlayerStateChange from dependencies

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume * 100);
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume * 100);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
    }
  };

  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Searching for audio...</span>
      </div>
    );
  }

  if (error || !youtubeResult) {
    return (
      <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
        <Music className="mr-2 h-4 w-4" />
        <span>{error || 'No audio available'}</span>
      </div>
    );
  }

  return (
    <div className="group">
      {/* Hidden YouTube Player */}
      <div ref={playerContainerRef} className="hidden" />

      {/* Song Info */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold leading-tight text-foreground">
          {theme.song.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
            theme.type === 'OP'
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-purple-500/20 text-purple-500'
          }`}>
            {theme.type}{theme.sequence > 1 ? ` ${theme.sequence}` : ''}
          </span>
          {theme.song.artists.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {theme.song.artists.map(a => a.name).join(', ')}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {youtubeResult.channelTitle}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground w-8 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 rounded-full appearance-none bg-secondary/50 hover:bg-secondary transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
        />
        <span className="text-xs text-muted-foreground w-8">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Previous & Play/Pause */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={togglePlay}
            className="p-1.5 text-foreground hover:text-primary transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} className="fill-current" />
            ) : (
              <Play size={18} className="fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Right: Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 rounded-full appearance-none bg-secondary/50 hover:bg-secondary transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
