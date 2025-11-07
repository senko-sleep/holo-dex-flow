import { useEffect, useState, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { animeApi } from '@/services/animeApi';
import { Anime, ThemeSong } from '@/types/anime';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Shuffle } from 'lucide-react';

interface Track {
  title: string;
  anime: string;
  type: 'OP' | 'ED';
  number: number;
  animeImage: string;
  animeId: number;
}

const MusicPlayer = () => {
  const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadMusic = async () => {
      setIsLoading(true);
      try {
        const anime = await animeApi.getTopAnime(1, 20);
        setPopularAnime(anime);

        // Extract theme songs from anime
        const allTracks: Track[] = [];
        for (const item of anime) {
          const details = await animeApi.getAnimeById(item.mal_id);
          if (details?.theme) {
            details.theme.openings?.forEach((op, index) => {
              allTracks.push({
                title: op,
                anime: item.title,
                type: 'OP',
                number: index + 1,
                animeImage: item.images.jpg.large_image_url,
                animeId: item.mal_id,
              });
            });
            details.theme.endings?.forEach((ed, index) => {
              allTracks.push({
                title: ed,
                anime: item.title,
                type: 'ED',
                number: index + 1,
                animeImage: item.images.jpg.large_image_url,
                animeId: item.mal_id,
              });
            });
          }
        }
        setTracks(allTracks);
      } catch (error) {
        console.error('Error loading music:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMusic();
  }, []);

  const currentTrack = tracks[currentTrackIndex];

  const playPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    if (isShuffle) {
      setCurrentTrackIndex(Math.floor(Math.random() * tracks.length));
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
    setIsPlaying(true);
  };

  const previousTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="h-12 w-12 text-primary" />
            <h1 className="text-5xl md:text-6xl font-bold gradient-text">
              Music Player
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Anime openings and endings
          </p>
        </div>

        {isLoading ? (
          <LoadingGrid count={12} type="card" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Now Playing */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                  {currentTrack && (
                    <img
                      src={currentTrack.animeImage}
                      alt={currentTrack.anime}
                      className="w-full h-full object-cover opacity-50"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    {currentTrack ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-primary rounded-full text-sm font-bold">
                            {currentTrack.type} {currentTrack.number}
                          </span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {currentTrack.title}
                        </h2>
                        <p className="text-xl text-white/80">{currentTrack.anime}</p>
                      </>
                    ) : (
                      <p className="text-white text-xl">No track selected</p>
                    )}
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={isShuffle ? 'text-primary' : ''}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={previousTrack}
                      disabled={tracks.length === 0}
                    >
                      <SkipBack className="h-6 w-6" />
                    </Button>

                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
                      onClick={playPause}
                      disabled={tracks.length === 0}
                    >
                      {isPlaying ? (
                        <Pause className="h-7 w-7" />
                      ) : (
                        <Play className="h-7 w-7 ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextTrack}
                      disabled={tracks.length === 0}
                    >
                      <SkipForward className="h-6 w-6" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={isRepeat ? 'text-primary' : ''}
                    >
                      <Repeat className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {isMuted ? 0 : volume}%
                    </span>
                  </div>

                  {/* Note about audio */}
                  <div className="text-center text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg">
                    Note: Audio playback requires external sources. Theme song information is displayed from the anime database.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Playlist */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold mb-4">Playlist ({tracks.length} tracks)</h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {tracks.map((track, index) => (
                      <button
                        key={index}
                        onClick={() => selectTrack(index)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          index === currentTrackIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold w-8">
                            {index === currentTrackIndex && isPlaying ? (
                              <Music className="h-4 w-4 animate-pulse" />
                            ) : (
                              `#${index + 1}`
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">
                              {track.title}
                            </div>
                            <div className="text-xs opacity-80 truncate">
                              {track.anime} - {track.type} {track.number}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Hidden audio element for future integration */}
      <audio
        ref={audioRef}
        onEnded={() => {
          if (isRepeat) {
            audioRef.current?.play();
          } else {
            nextTrack();
          }
        }}
      />
    </div>
  );
};

export default MusicPlayer;
