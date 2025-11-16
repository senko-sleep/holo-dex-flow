import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { animeApi } from '@/services/animeApi';
import { Anime, ThemeSong } from '@/types/anime';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, Play, Pause, SkipForward, SkipBack, Volume, Volume1, Volume2, VolumeX, 
  Repeat, Shuffle, Search, ListMusic, Disc, Album, Mic2, X, Loader2 
} from 'lucide-react';
import { debounce } from 'lodash';

interface Track {
  id: string;
  title: string;
  anime: string;
  type: 'OP' | 'ED' | 'Insert Song' | 'Image Song';
  number: number;
  animeImage: string;
  animeId: number;
  themeId?: number;
  artists?: Array<{ name: string }>;
  duration?: number;
  videoUrl?: string;
  audioUrl?: string;
}

interface AnimeWithThemes {
  id: number;
  title: string;
  image: string;
  themes: ThemeSong[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

const MusicPlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for tracks and playback
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // State for search and UI
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('popular');
  const [animeWithThemes, setAnimeWithThemes] = useState<AnimeWithThemes[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeWithThemes | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevTracksLength = useRef(0);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Check for auto-search from anime modal
        const state = location.state as { animeTitle?: string; animeId?: number; autoSearch?: boolean };
        
        if (state?.autoSearch && state.animeTitle) {
          setSearchQuery(state.animeTitle);
          setActiveTab('search');
          await searchThemes(state.animeTitle, state.animeId);
        } else {
          const animeList = await loadPopularAnime();
          // Load themes for the first anime by default
          if (animeList.length > 0) {
            await loadAnimeThemes(animeList[0].id, 0, animeList[0]);
          }
        }
      } catch (error) {
        console.error('Error initializing music player:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [location.state]);

  // Auto-play logic for initial search
  useEffect(() => {
    if (location.state?.autoSearch && tracks.length > 0) {
      const wasEmpty = prevTracksLength.current === 0;
      prevTracksLength.current = tracks.length;
      if (wasEmpty) {
        setCurrentTrackIndex(0);
        setIsPlaying(true);
        // Clear the auto-search state
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else {
      prevTracksLength.current = tracks.length;
    }
  }, [tracks]);

  // Load popular anime for the home tab
  const loadPopularAnime = async () => {
    try {
      const anime = await animeApi.getTopAnime(1, 10);
      const animeList = anime.map(a => ({
        id: a.mal_id,
        title: a.title,
        image: a.images.jpg.large_image_url || a.images.jpg.image_url,
        themes: [],
        isExpanded: false,
        isLoading: false
      }));
      
      setAnimeWithThemes(animeList);
      
      // Return the anime list so we can use it for loading themes
      return animeList;
    } catch (error) {
      console.error('Error loading popular anime:', error);
      return [];
    }
  };

  // Search for anime themes with autocomplete
  const [searchSuggestions, setSearchSuggestions] = useState<{id: number, title: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch search suggestions
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchSuggestions([]);
        return;
      }
      
      try {
        const results = await animeApi.searchAnime(query, 1);
        setSearchSuggestions(results.map(a => ({
          id: a.mal_id,
          title: a.title
        })));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 300),
    []
  );

  // Search for anime themes
  const searchThemes = useCallback(debounce(async (query: string, animeId?: number) => {
    if (!query.trim()) return;
    
    try {
      setIsLoading(true);
      let results: Anime[] = [];
      
      if (animeId) {
        // Direct search by ID if available
        const anime = await animeApi.getAnimeById(animeId);
        if (anime) results = [anime];
      } else {
        // Search by query - increase limit to get more results
        results = await animeApi.searchAnime(query, 1);
      }
      
      const animeList = results.map(a => ({
        id: a.mal_id,
        title: a.title,
        image: a.images.jpg.large_image_url,
        themes: [] as ThemeSong[],
        isExpanded: false,
        isLoading: true
      }));
      
      setAnimeWithThemes(animeList);
      
      // Load themes for all matching anime
      if (animeList.length > 0) {
        animeList.forEach((anime, index) => {
          loadAnimeThemes(anime.id, index);
        });
        setSelectedAnime(animeList[0]);
      }
    } catch (error) {
      console.error('Error searching themes:', error);
    } finally {
      setIsLoading(false);
    }
  }, 500), []);

  // Load themes for a specific anime
  const loadAnimeThemes = async (animeId: number, index: number, animeData?: AnimeWithThemes) => {
    try {
      setAnimeWithThemes(prev => {
        const updated = [...prev];
        if (!updated[index]) return updated; // Skip if index is out of bounds
        updated[index] = { ...updated[index], isLoading: true };
        return updated;
      });
      
      // Use passed anime data or get from state
      let anime = animeData;
      if (!anime) {
        anime = animeWithThemes[index];
      }
      
      if (!anime) {
        throw new Error('Anime not found');
      }
      
      // Pass both title and ID for better matching
      const themes = await animeApi.getThemeSongs(anime.title, animeId);
      
      const animeTitle = anime.title;
      const animeImage = anime.image;
      
      // Update the anime with its themes
      setAnimeWithThemes(prev => {
        const updated = [...prev];
        if (!updated[index]) return updated; // Skip if index is out of bounds
        
        // Only update if the anime ID matches (in case the list changed)
        if (updated[index].id === animeId) {
          updated[index] = { 
            ...updated[index], 
            themes,
            isLoading: false,
            isExpanded: true
          };
        }
        return updated;
      });
      
      // Update tracks with the new themes
      updateTracks(themes, animeId, animeTitle, animeImage);
      
      return themes;
    } catch (error) {
      console.error('Error loading anime themes:', error);
      setAnimeWithThemes(prev => {
        const updated = [...prev];
        if (updated[index] && updated[index].id === animeId) {
          updated[index] = { ...updated[index], isLoading: false };
        }
        return updated;
      });
      return [];
    }
  };

  // Update tracks list from themes
  const updateTracks = (themes: ThemeSong[], animeId: number, animeTitle: string, animeImage: string) => {
    if (!themes || themes.length === 0) return;
    
    setTracks(prevTracks => {
      // Create a map of existing tracks by ID to avoid duplicates
      const tracksMap = new Map(prevTracks.map(track => [track.id, track]));
      
      // Add or update tracks from the new themes
      themes.forEach(theme => {
        // Use the same audio selection logic as AnimeModal
        const audioUrl = animeApi.getBestAudioUrl(theme);
        
        if (audioUrl) {
          // Get the best video for additional metadata
          const videos = theme.videos || [];
          const bestVideo = videos
            .filter(v => v.audio || v.link)
            .sort((a, b) => {
              if (a.audio && !b.audio) return -1;
              if (!a.audio && b.audio) return 1;
              const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
              const aQuality = a.quality ? qualityOrder[a.quality as keyof typeof qualityOrder] ?? -1 : -1;
              const bQuality = b.quality ? qualityOrder[b.quality as keyof typeof qualityOrder] ?? -1 : -1;
              return bQuality - aQuality;
            })[0];

          const trackId = `${animeId}-${theme.id}-${bestVideo?.basename || bestVideo?.id || 0}`;
          if (!tracksMap.has(trackId)) {
            tracksMap.set(trackId, {
              id: trackId,
              title: theme.song?.title || `${theme.type} ${theme.sequence}`,
              anime: animeTitle,
              type: theme.type,
              number: theme.sequence,
              animeImage: animeImage,
              animeId: animeId,
              themeId: theme.id,
              artists: theme.song?.artists,
              videoUrl: bestVideo?.link,
              audioUrl: audioUrl,
              duration: bestVideo?.duration
            });
          }
        }
      });
      
      const newTracks = Array.from(tracksMap.values());
      return newTracks;
    });
  };

  // Filter tracks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = tracks.filter(
      track => 
        track.title.toLowerCase().includes(query) ||
        track.anime.toLowerCase().includes(query) ||
        track.artists?.some(a => a.name.toLowerCase().includes(query))
    );
    
    setFilteredTracks(filtered);
  }, [searchQuery, tracks]);

  const currentTrack = filteredTracks[currentTrackIndex] || null;

  // Handle track playback
  const playPause = useCallback(() => {
    if (!currentTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Playback error:', error);
          setIsPlaying(false);
        });
      }
    }
    
    setIsPlaying(!isPlaying);
  }, [currentTrack, isPlaying]);

  // Handle next track
  const nextTrack = useCallback(() => {
    if (filteredTracks.length === 0) return;
    
    if (isShuffle) {
      setCurrentTrackIndex(Math.floor(Math.random() * filteredTracks.length));
    } else {
      setCurrentTrackIndex(prev => (prev + 1) % filteredTracks.length);
    }
    setIsPlaying(true);
  }, [filteredTracks.length, isShuffle]);

  // Handle previous track
  const previousTrack = useCallback(() => {
    if (filteredTracks.length === 0) return;
    setCurrentTrackIndex(prev => (prev - 1 + filteredTracks.length) % filteredTracks.length);
    setIsPlaying(true);
  }, [filteredTracks.length]);

  // Handle volume changes
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      if (newVolume > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Select a track to play
  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < filteredTracks.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      
      // Auto-scroll to the selected track in the list
      const trackElement = document.getElementById(`track-${index}`);
      trackElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [filteredTracks.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playPause();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) nextTrack();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) previousTrack();
          break;
        case 'KeyM':
          toggleMute();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playPause, nextTrack, previousTrack, toggleMute]);
  
  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        nextTrack();
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isRepeat, nextTrack]);
  
  // Format time in MM:SS format
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Handle seek on progress bar click
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos)); // Ensure between 0 and 1
    const newTime = pos * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      
      // Resume playback if it was playing
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  };
  
  // Handle volume change
  const handleVolumeClick = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      } else if (volume === 0) {
        // If volume was 0, set to 50%
        const newVolume = 50;
        audioRef.current.volume = newVolume / 100;
        setVolume(newVolume);
      } else {
        // Toggle mute
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12 text-center animate-fade-in">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Music className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              <h1 className="text-4xl md:text-6xl font-bold gradient-text">
                Music Player
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground">
              Anime openings, endings, and full OSTs
            </p>
          </div>
          
          {/* Search Bar with Autocomplete */}
          <div className="max-w-2xl mx-auto mt-6 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search anime, songs, or artists..."
                className="pl-10 pr-10 py-6 text-base rounded-full shadow-lg focus-visible:ring-2 focus-visible:ring-primary/50"
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  fetchSuggestions(query);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    searchThemes(searchQuery);
                    setActiveTab('search');
                    setShowSuggestions(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchSuggestions([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              
              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {searchSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="px-4 py-2 hover:bg-secondary/50 cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(suggestion.title);
                        searchThemes(suggestion.title);
                        setActiveTab('search');
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button 
              className="mt-4 rounded-full px-6 py-5 text-base font-medium"
              onClick={() => {
                if (searchQuery.trim()) {
                  searchThemes(searchQuery);
                  setActiveTab('search');
                  setShowSuggestions(false);
                }
              }}
              disabled={!searchQuery.trim()}
            >
              <Search className="h-5 w-5 mr-2" />
              Search Music
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 max-w-2xl mx-auto">
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              <span>Popular</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Search</span>
              {activeTab === 'search' && searchQuery && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                  {animeWithThemes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="playlist" className="flex items-center gap-2">
              <Disc className="h-4 w-4" />
              <span>Now Playing</span>
              {tracks.length > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                  {tracks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Popular Tab */}
          <TabsContent value="popular" className="mt-0">
            {isLoading ? (
              <LoadingGrid count={6} type="card" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {animeWithThemes.map((anime, index) => (
                  <Card key={anime.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[3/4] relative group">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <Button 
                          className="w-full"
                          onClick={() => {
                            setSelectedAnime(anime);
                            if (!anime.isExpanded) {
                              loadAnimeThemes(anime.id, index);
                            } else {
                              updateTracks(anime.themes, anime.id, anime.title, anime.image);
                            }
                            setActiveTab('search');
                          }}
                        >
                          View Tracks
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2">{anime.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {anime.themes.length} {anime.themes.length === 1 ? 'track' : 'tracks'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : animeWithThemes.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No results found</h3>
                <p className="text-muted-foreground mt-2">
                  Try searching for an anime title, song, or artist
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {animeWithThemes.map((anime, index) => (
                  <Card key={anime.id} className="overflow-hidden">
                    <div 
                      className="p-4 bg-gradient-to-r from-primary/5 to-background cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => {
                        setAnimeWithThemes(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], isExpanded: !updated[index].isExpanded };
                          return updated;
                        });
                        
                        if (!anime.isExpanded && anime.themes.length === 0) {
                          loadAnimeThemes(anime.id, index);
                        } else if (anime.isExpanded) {
                          updateTracks(anime.themes, anime.id, anime.title, anime.image);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img 
                            src={anime.image} 
                            alt={anime.title} 
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{anime.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {anime.themes.length} {anime.themes.length === 1 ? 'track' : 'tracks'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {anime.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : anime.isExpanded ? (
                            <X className="h-5 w-5" />
                          ) : (
                            <span className="text-muted-foreground">Show Tracks</span>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {anime.isExpanded && (
                      <div className="border-t bg-secondary/10">
                        {anime.themes.length > 0 ? (
                          <div className="divide-y">
                            {anime.themes.map((theme, themeIndex) => {
                              const videos = theme.videos || [];
                              return (
                                <div key={theme.id} className="p-4 hover:bg-secondary/20 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">
                                        {theme.song?.title || `${theme.type} ${theme.sequence}`}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {theme.type} {theme.sequence}
                                      </div>
                                      {theme.song?.artists && theme.song.artists.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                          <Mic2 className="h-3 w-3" />
                                          {theme.song.artists.map(a => a.name).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const trackIndex = tracks.findIndex(
                                          t => t.themeId === theme.id && t.animeId === anime.id
                                        );
                                        if (trackIndex >= 0) {
                                          selectTrack(trackIndex);
                                          setActiveTab('playlist');
                                        }
                                      }}
                                    >
                                      Play
                                    </Button>
                                  </div>
                                  
                                  {videos.length > 0 && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {videos.slice(0, 2).map((video, videoIndex) => (
                                        <div 
                                          key={video.id || videoIndex}
                                          className="text-xs p-2 bg-secondary/30 rounded text-muted-foreground truncate"
                                          title={video.filename || `Video ${videoIndex + 1}`}
                                        >
                                          {video.filename || `Video ${videoIndex + 1}`}
                                          {video.quality && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]">
                                              {video.quality}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {videos.length > 2 && (
                                        <div className="text-xs text-muted-foreground text-center py-2">
                                          +{videos.length - 2} more versions
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : anime.isLoading ? (
                          <div className="p-8 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            No theme songs found for this anime.
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Playlist Tab */}
          <TabsContent value="playlist" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Now Playing */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                    {currentTrack ? (
                      <>
                        <img
                          src={currentTrack.animeImage}
                          alt={currentTrack.anime}
                          className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-primary rounded-full text-sm font-bold">
                              {currentTrack.type} {currentTrack.number}
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                            {currentTrack.title}
                          </h2>
                          <p className="text-lg md:text-xl text-white/80">{currentTrack.anime}</p>
                          {currentTrack.artists && currentTrack.artists.length > 0 && (
                            <p className="text-sm text-white/60 mt-1">
                              by {currentTrack.artists.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-white/70 text-lg">No track selected</p>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Progress Bar */}
                    {currentTrack && (
                      <div className="space-y-1">
                        <div 
                          className="h-2 bg-secondary rounded-full overflow-hidden cursor-pointer"
                          onClick={handleSeek}
                        >
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsShuffle(!isShuffle)}
                        className={isShuffle ? 'text-primary' : ''}
                        title="Shuffle"
                      >
                        <Shuffle className="h-5 w-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={previousTrack}
                        disabled={tracks.length === 0}
                        title="Previous"
                      >
                        <SkipBack className="h-6 w-6" />
                      </Button>

                      <Button
                        size="icon"
                        className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
                        onClick={playPause}
                        disabled={tracks.length === 0}
                        title={isPlaying ? 'Pause' : 'Play'}
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
                        title="Next"
                      >
                        <SkipForward className="h-6 w-6" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRepeat(!isRepeat)}
                        className={isRepeat ? 'text-primary' : ''}
                        title={isRepeat ? 'Disable repeat' : 'Enable repeat'}
                      >
                        <Repeat className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Volume Controls */}
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleVolumeClick}
                        title={isMuted ? 'Unmute' : volume === 0 ? 'Unmute' : 'Mute'}
                        className="relative group"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-5 w-5" />
                        ) : volume < 30 ? (
                          <Volume className="h-5 w-5" />
                        ) : volume < 70 ? (
                          <Volume1 className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {isMuted ? 'Unmute' : volume}%
                        </span>
                      </Button>
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-10 text-right">
                        {isMuted ? 0 : volume}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Playlist */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Now Playing</h3>
                        <span className="text-sm text-muted-foreground">
                          {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
                        </span>
                      </div>
                      {searchQuery && (
                        <div className="mt-2">
                          <Input
                            placeholder="Filter tracks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                      {filteredTracks.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          {searchQuery ? 'No matching tracks found' : 'No tracks in playlist'}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredTracks.map((track, index) => {
                            const isActive = index === currentTrackIndex;
                            return (
                              <div
                                id={`track-${index}`}
                                key={track.id}
                                onClick={() => selectTrack(index)}
                                className={`p-3 cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-secondary/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-10 h-10 flex-shrink-0">
                                    <img
                                      src={track.animeImage}
                                      alt={track.anime}
                                      className="w-full h-full object-cover rounded"
                                    />
                                    {isActive && isPlaying && (
                                      <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                                        <div className="flex items-center gap-0.5">
                                          <span className="w-1 h-2 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                                          <span className="w-1 h-3 bg-primary animate-pulse ml-0.5" style={{ animationDelay: '200ms' }} />
                                          <span className="w-1 h-4 bg-primary animate-pulse ml-0.5" style={{ animationDelay: '400ms' }} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                      {track.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {track.anime} • {track.type} {track.number}
                                    </div>
                                  </div>
                                  {track.duration && (
                                    <div className="text-xs text-muted-foreground ml-2">
                                      {formatTime(track.duration)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl || currentTrack?.videoUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          if (isRepeat) {
            audioRef.current?.play().catch(console.error);
          } else {
            nextTrack();
          }
        }}
        onError={(e) => {
          console.error('Audio error:', e);
          // Try next track on error
          nextTrack();
        }}
      />
    </div>
  );
};

export default MusicPlayer;