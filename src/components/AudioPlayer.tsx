import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { ThemeSong } from '@/types/anime';
import { Slider } from '@/components/ui/slider';
import { youtubeService, YouTubeSearchResult, YouTubePlayer, YouTubePlayerEvent } from '@/services/youtubeService';
import { youtubeAPIManager } from '@/lib/youtubeAPIManager';

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
  const [youtubeResult, setYoutubeResult] = useState<YouTubeSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Search for the song on YouTube when song changes
  useEffect(() => {
    const searchSong = async () => {
      setIsLoading(true);
      setError(null);
      setYoutubeResult(null);

      try {
        // Create search query from song title and artists
        const artistNames = song.song.artists?.map(a => a.name).join(' ') || '';
        const query = `${song.song.title || 'Unknown'} ${artistNames}`.trim();

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

    if (song.song.title) {
      searchSong();
    }
  }, [song.song.title, song.song.artists]);

  const onPlayerReady = useCallback((event: YouTubePlayerEvent) => {
    if (event.target) {
      event.target.setVolume(volume);
      setDuration(event.target.getDuration());
    }
  }, [volume]);

  const onPlayerStateChange = useCallback((event: YouTubePlayerEvent) => {
    if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
    }
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
  }, []);

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

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (value: number[]) => {
    if (playerRef.current) {
      playerRef.current.seekTo(value[0]);
      setCurrentTime(value[0]);
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
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50 animate-slide-up">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-muted-foreground">Searching for audio...</span>
          <button onClick={onClose} className="hover:text-foreground transition-colors ml-auto">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (error || !youtubeResult) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50 animate-slide-up">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-muted-foreground">{error || 'Audio not available'}</p>
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
        {/* Hidden YouTube Player */}
        <div ref={playerContainerRef} className="hidden" />

        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {song.song?.title || 'Unknown Title'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {song.anime?.name || ''} - {song.type}{song.sequence}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {youtubeResult.channelTitle}
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
