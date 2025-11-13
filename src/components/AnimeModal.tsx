import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Calendar, Users, Music, Tv, Film, PlayCircle, Clock, TrendingUp, Award, Building2, Sparkles, Info, Search } from 'lucide-react';
import { ThemeSongPlayer } from './ThemeSongPlayer';
import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { AudioPlayer } from './AudioPlayer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AnimeModalProps {
  anime: Anime;
  onClose: () => void;
}

export const AnimeModal = ({ anime, onClose }: AnimeModalProps) => {
  const [characters, setCharacters] = useState<AnimeCharacter[]>([]);
  const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
  const [filteredThemeSongs, setFilteredThemeSongs] = useState<ThemeSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<ThemeSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Filter theme songs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredThemeSongs(themeSongs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = themeSongs.filter(song => 
        song.song.title.toLowerCase().includes(query) ||
        (song.song.artists && song.song.artists.some(artist => 
          artist.name.toLowerCase().includes(query)
        ))
      );
      setFilteredThemeSongs(filtered);
    }
  }, [searchQuery, themeSongs]);
  
  // Initialize filtered theme songs when themeSongs changes
  useEffect(() => {
    setFilteredThemeSongs(themeSongs);
  }, [themeSongs]);

  // Handle ESC key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle click outside to close
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleKeyDown, handleClickOutside]);

  // Focus modal on mount for better accessibility
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use anilist_id if available, otherwise fall back to mal_id
        const animeId = anime.anilist_id || anime.mal_id;
        const [charData, themeData] = await Promise.all([
          animeApi.getAnimeCharacters(animeId),
          animeApi.getThemeSongs(anime.title, anime.mal_id), // Pass MAL ID for better matching
        ]);
        // Sort characters by popularity (favorites count descending)
        const sortedChars = charData.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));
        setCharacters(sortedChars);
        
        // Filter out themes without any playable media
        const playableThemes = themeData.filter(theme => 
          theme.videos && theme.videos.length > 0 && 
          (theme.videos.some(v => v.audio) || theme.videos.some(v => v.link))
        );
        
        setThemeSongs(playableThemes);
      } catch (error) {
        console.error('Error fetching anime details:', error);
        setError('Failed to load additional details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [anime]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{anime.title_english || anime.title}</DialogTitle>
          <DialogDescription>Anime details and information</DialogDescription>
        </DialogHeader>
        
        <div className="px-4 py-8 md:px-6 lg:px-8" ref={contentRef}>
          {/* Hero Section with Synopsis and Statistics */}
          <div className="relative rounded-2xl overflow-hidden mb-8 shadow-xl animate-slide-up">
            <div className="absolute inset-0">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-105"
                loading="lazy"
                aria-hidden="true"
              />
            </div>
            <div className="relative bg-gradient-card backdrop-blur-xl p-6 md:p-8 lg:flex lg:gap-8">
              <div className="w-full md:w-64 mx-auto md:mx-0 mb-6 md:mb-0">
                <img
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full h-auto object-contain rounded-xl shadow-glow max-h-96 transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    {anime.title_english || anime.title}
                  </h1>
                  {anime.title_english && (
                    <p className="text-lg text-muted-foreground">{anime.title}</p>
                  )}
                </div>
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {anime.score && (
                    <div className="bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/50 rounded-xl p-3 text-center hover:from-primary/40 hover:to-accent/40 hover:border-primary transition-all">
                      <Star className="h-5 w-5 fill-primary text-primary mx-auto mb-1" />
                      <div className="font-bold text-xl text-foreground">{anime.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                  {anime.type && (
                    <div className="bg-gradient-to-br from-accent/30 to-primary/30 border-2 border-accent/50 rounded-xl p-3 text-center hover:from-accent/40 hover:to-primary/40 hover:border-accent transition-all">
                      {anime.type === 'TV' ? <Tv className="h-5 w-5 text-accent mx-auto mb-1" /> : 
                       anime.type === 'Movie' ? <Film className="h-5 w-5 text-accent mx-auto mb-1" /> :
                       <PlayCircle className="h-5 w-5 text-accent mx-auto mb-1" />}
                      <div className="font-bold text-foreground">{anime.type}</div>
                      <div className="text-xs text-muted-foreground">Type</div>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 rounded-xl p-3 text-center hover:from-primary/30 hover:to-accent/30 hover:border-primary transition-all">
                      <PlayCircle className="h-5 w-5 text-primary mx-auto mb-1" />
                      <div className="font-bold text-xl text-foreground">{anime.episodes}</div>
                      <div className="text-xs text-muted-foreground">Episodes</div>
                    </div>
                  )}
                  {anime.status && (
                    <div className="bg-gradient-to-br from-accent/20 to-primary/20 border-2 border-accent/40 rounded-xl p-3 text-center hover:from-accent/30 hover:to-primary/30 hover:border-accent transition-all">
                      <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
                      <div className="font-bold text-sm text-foreground">{anime.status}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                <div className="bg-secondary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <h2 className="text-xl font-semibold">Synopsis</h2>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {anime.synopsis || 'No synopsis available for this anime.'}
                    </p>
                  </div>
                </div>

                {/* Airing Information */}
                {(anime.aired || anime.season || anime.year || anime.broadcast) && (
                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-bold">Airing Information</h3>
                    </div>
                    
                    {/* Next Episode Countdown */}
                    {anime.broadcast?.string && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium">Next Episode:</span>
                          </div>
                          <span className="font-semibold text-primary">
                            {anime.broadcast.string}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        {(anime.season || anime.year) && (
                          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Season</span>
                            </div>
                            <span className="font-medium text-foreground">
                              {anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)}` : 'N/A'}{anime.year ? ` ${anime.year}` : ''}
                            </span>
                          </div>
                        )}
                        
                        {anime.aired?.from && (
                          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Started Airing</span>
                            </div>
                            <span className="font-medium text-foreground">
                              {new Date(anime.aired.from).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Right Column */}
                      <div className="space-y-3">
                        {anime.aired?.to ? (
                          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Finished Airing</span>
                            </div>
                            <span className="font-medium text-foreground">
                              {new Date(anime.aired.to).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Status</span>
                            </div>
                            <span className="font-medium text-primary">
                              Currently Airing
                            </span>
                          </div>
                        )}
                        
                        {anime.broadcast?.string && (
                          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Tv className="h-4 w-4" />
                              <span>Broadcast Time</span>
                            </div>
                            <span className="font-medium text-foreground text-right">
                              {(() => {
                                const broadcastTime = new Date(anime.broadcast.string);
                                return broadcastTime.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Airing Duration */}
                    {anime.aired?.from && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        <span className="inline-flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {(() => {
                            const start = new Date(anime.aired.from);
                            const end = anime.aired.to ? new Date(anime.aired.to) : new Date();
                            const diffTime = Math.abs(end.getTime() - start.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const diffMonths = Math.ceil(diffDays / 30.44);
                            const diffYears = Math.floor(diffMonths / 12);
                            const remainingMonths = diffMonths % 12;
                            
                            let duration = '';
                            if (diffYears > 0) {
                              duration += `${diffYears} ${diffYears === 1 ? 'year' : 'years'}`;
                              if (remainingMonths > 0) {
                                duration += `, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
                              }
                            } else {
                              duration = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
                            }
                            
                            return anime.aired?.to 
                              ? `Aired for ${duration} (${anime.episodes || '?'} episodes)`
                              : `Airing for ${duration} (${anime.episodes || '?'} episodes so far)`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Row: Studios, Genres, Themes */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {anime.studios && anime.studios.length > 0 && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Building2 className="h-4 w-4 text-accent flex-shrink-0" />
                      {anime.studios.slice(0, 3).map((studio) => (
                        <Badge key={studio.mal_id} variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          {studio.name}
                        </Badge>
                      ))}
                      {anime.studios.length > 3 && <span className="text-muted-foreground">+{anime.studios.length - 3}</span>}
                    </div>
                  )}
                  {anime.genres && anime.genres.length > 0 && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      {anime.genres.slice(0, 4).map((genre) => (
                        <Badge key={genre.mal_id} className="bg-primary/10 text-primary border-primary/20">
                          {genre.name}
                        </Badge>
                      ))}
                      {anime.genres.length > 4 && <span className="text-muted-foreground">+{anime.genres.length - 4}</span>}
                    </div>
                  )}
                  {anime.themes && anime.themes.length > 0 && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Award className="h-4 w-4 text-accent flex-shrink-0" />
                      {anime.themes.slice(0, 3).map((theme) => (
                        <Badge key={theme.mal_id} variant="outline" className="border-accent/30 text-accent">
                          {theme.name}
                        </Badge>
                      ))}
                      {anime.themes.length > 3 && <span className="text-muted-foreground">+{anime.themes.length - 3}</span>}
                    </div>
                  )}
                </div>

                {/* Detailed Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Ratings & Popularity
                    </h3>
                    <div className="space-y-3">
                      {anime.rank && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Rank</span>
                          <span className="font-bold text-accent">#{anime.rank}</span>
                        </div>
                      )}
                      {anime.popularity && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Popularity</span>
                          <span className="font-bold text-accent">#{anime.popularity}</span>
                        </div>
                      )}
                      {anime.members && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Members</span>
                          <span className="font-bold">{anime.members.toLocaleString()}</span>
                        </div>
                      )}
                      {anime.favorites && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Favorites</span>
                          <span className="font-bold text-primary">{anime.favorites.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-accent" />
                      Additional Info
                    </h3>
                    <div className="space-y-3">
                      {anime.source && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Source</span>
                          <span className="font-bold capitalize">{anime.source}</span>
                        </div>
                      )}
                      {anime.rating && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Rating</span>
                          <span className="font-bold">{anime.rating}</span>
                        </div>
                      )}
                      {anime.duration && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-bold">{anime.duration}</span>
                        </div>
                      )}
                      {anime.broadcast?.string && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Broadcast</span>
                          <span className="font-bold text-sm">{anime.broadcast.string}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Songs Section */}
          {isLoading ? (
            <div className="bg-card rounded-2xl p-6 mb-8 animate-pulse">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-6 w-6 bg-secondary rounded-full" />
                <div className="h-7 w-32 bg-secondary rounded" />
              </div>
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-secondary/50 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="bg-card rounded-2xl p-6 mb-8 text-center text-destructive">
              {error}
            </div>
          ) : themeSongs.length > 0 ? (
            <div className="bg-card rounded-2xl p-6 mb-8 shadow-md animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Music className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Theme Songs</h2>
                  <span className="text-sm text-muted-foreground">
                    ({themeSongs.length} {themeSongs.length === 1 ? 'song' : 'songs'})
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                  />
                </div>
                <a 
                  href={`#music`} 
                  className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('music')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Full OST <span aria-hidden="true">→</span>
                </a>
              </div>
              
              <div className="space-y-4">
                {filteredThemeSongs.map((theme, index) => (
                  <div key={theme.id} className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        theme.type === 'OP' 
                          ? 'bg-amber-500/20 text-amber-500' 
                          : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {theme.type} {theme.sequence > 1 ? theme.sequence : ''}
                      </span>
                    </div>
                    <ThemeSongPlayer
                      theme={theme}
                      onNext={() => {
                        if (index < filteredThemeSongs.length - 1) {
                          const nextTheme = filteredThemeSongs[index + 1];
                          const nextIndex = themeSongs.findIndex(t => t.id === nextTheme.id);
                          setThemeSongs([...themeSongs]);
                          setCurrentTrackIndex(nextIndex);
                        }
                      }}
                      onPrevious={() => {
                        if (index > 0) {
                          const prevTheme = filteredThemeSongs[index - 1];
                          const prevIndex = themeSongs.findIndex(t => t.id === prevTheme.id);
                          setThemeSongs([...themeSongs]);
                          setCurrentTrackIndex(prevIndex);
                        }
                      }}
                      hasNext={index < filteredThemeSongs.length - 1}
                      hasPrevious={index > 0}
                    />
                  </div>
                ))}
                {filteredThemeSongs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No songs found matching "{searchQuery}"
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/music', { 
                      state: { 
                        animeTitle: anime.title_english || anime.title,
                        animeId: anime.mal_id,
                        autoSearch: true
                      } 
                    });
                  }}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View full OST with lyrics and more details <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Characters Section */}
          {isLoading ? (
            <div className="bg-card rounded-2xl p-6 animate-pulse">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-6 w-6 bg-secondary rounded-full" />
                <div className="h-7 w-48 bg-secondary rounded" />
              </div>
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-secondary/50 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error ? null : characters.length > 0 ? (
            <div className="bg-card rounded-2xl p-6 shadow-md animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Characters & Voice Actors</h2>
                </div>
                <span className="text-sm text-muted-foreground sm:ml-auto">
                  Most popular characters • Sub & Dub VAs
                </span>
              </div>
              <div className="grid gap-4">
                {characters.map((char) => {
                  const japaneseVA = char.voice_actors?.find(va => va.language === 'Japanese');
                  const englishVA = char.voice_actors?.find(va => va.language === 'English');
                  
                  return (
                    <div
                      key={char.character.mal_id}
                      className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4 hover:from-primary/30 hover:to-accent/30 transition-all duration-200 hover:shadow-glow border-2 border-primary/30 hover:border-primary/50 hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Character Info */}
                        <div className="flex items-center gap-3 flex-1">
                          <img
                            src={char.character.images.jpg.image_url}
                            alt={char.character.name}
                            className="w-20 h-24 object-cover rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-lg truncate">
                              {char.character.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-1">{char.role}</p>
                            {char.favorites > 0 && (
                              <p className="text-xs text-primary font-medium">
                                ❤️ {char.favorites.toLocaleString()} favorites
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Voice Actors */}
                        <div className="flex flex-col md:flex-row gap-4 md:items-center">
                          {/* Japanese VA (Sub) */}
                          {japaneseVA && (
                            <div className="flex items-center gap-3 text-left md:text-right">
                              <div className="min-w-0 order-2 md:order-1">
                                <p className="text-xs text-muted-foreground mb-1">SUB (Japanese)</p>
                                <p className="font-semibold text-foreground text-sm truncate max-w-32">
                                  {japaneseVA.person.name}
                                </p>
                                {japaneseVA.favorites && japaneseVA.favorites > 0 && (
                                  <p className="text-xs text-accent font-medium mt-1">
                                    ❤️ {japaneseVA.favorites.toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <img
                                src={japaneseVA.person.images.jpg.image_url}
                                alt={japaneseVA.person.name}
                                className="w-16 h-20 object-cover rounded-lg shadow-md order-1 md:order-2 transition-transform duration-300 hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* English VA (Dub) */}
                          {englishVA && (
                            <div className="flex items-center gap-3 text-left md:text-right">
                              <div className="min-w-0 order-2 md:order-1">
                                <p className="text-xs text-muted-foreground mb-1">DUB (English)</p>
                                <p className="font-semibold text-foreground text-sm truncate max-w-32">
                                  {englishVA.person.name}
                                </p>
                                {englishVA.favorites && englishVA.favorites > 0 && (
                                  <p className="text-xs text-accent font-medium mt-1">
                                    ❤️ {englishVA.favorites.toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <img
                                src={englishVA.person.images.jpg.image_url}
                                alt={englishVA.person.name}
                                className="w-16 h-20 object-cover rounded-lg shadow-md order-1 md:order-2 transition-transform duration-300 hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          
          {selectedSong && (
            <AudioPlayer
              song={selectedSong}
              onClose={() => setSelectedSong(null)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};