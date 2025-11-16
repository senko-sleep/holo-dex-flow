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
  const [filteredCharacters, setFilteredCharacters] = useState<AnimeCharacter[]>([]);
  const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
  const [filteredThemeSongs, setFilteredThemeSongs] = useState<ThemeSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [characterSearchQuery, setCharacterSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<ThemeSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudios, setExpandedStudios] = useState(false);
  const [expandedGenres, setExpandedGenres] = useState(false);
  const [expandedThemes, setExpandedThemes] = useState(false);
  const [currentThemePage, setCurrentThemePage] = useState(0);
  const themesPerPage = 2;
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

  // Filter characters based on search query
  useEffect(() => {
    if (!characterSearchQuery.trim()) {
      // Show all characters
      setFilteredCharacters(characters);
    } else {
      const query = characterSearchQuery.toLowerCase();
      const filtered = characters.filter(char =>
        char.character.name.toLowerCase().includes(query) ||
        (char.voice_actors && char.voice_actors.some(va =>
          va.person.name.toLowerCase().includes(query)
        ))
      );
      setFilteredCharacters(filtered);
    }
  }, [characterSearchQuery, characters]);

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
          <div className="relative rounded-2xl overflow-hidden mb-6 animate-slide-up">
            <div className="absolute inset-0">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-105"
                loading="lazy"
                aria-hidden="true"
              />
            </div>
            <div className="relative bg-gradient-to-br from-secondary/30 to-secondary/10 backdrop-blur-sm border border-secondary/50 p-4 md:p-5 lg:flex lg:gap-6 shadow-md min-h-auto">
              {/* Image - Left Side */}
              <div className="w-full md:w-48 mx-auto md:mx-0 mb-4 md:mb-0 flex-shrink-0">
                <img
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full h-auto object-contain rounded-lg shadow-glow max-h-64 transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Summary Card - Right Side */}
              <div className="flex-1 space-y-3">
                {/* Title */}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-1">
                    {anime.title_english || anime.title}
                  </h1>
                  {anime.title_english && (
                    <p className="text-xs text-muted-foreground">{anime.title}</p>
                  )}
                </div>

                {/* Quick Stats Table - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {anime.score && (
                    <div className="bg-secondary/20 rounded p-2 text-center">
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="font-bold text-sm text-foreground">{anime.score}</div>
                    </div>
                  )}
                  {anime.type && (
                    <div className="bg-secondary/20 rounded p-2 text-center">
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="font-bold text-xs text-foreground">{anime.type}</div>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="bg-secondary/20 rounded p-2 text-center">
                      <div className="text-xs text-muted-foreground">Episodes</div>
                      <div className="font-bold text-sm text-foreground">{anime.episodes}</div>
                    </div>
                  )}
                  {anime.status && (
                    <div className="bg-secondary/20 rounded p-2 text-center">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-bold text-xs text-foreground">{anime.status}</div>
                    </div>
                  )}
                </div>

                {/* About/Synopsis */}
                {anime.synopsis && (
                  <div className="bg-secondary/10 rounded p-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">About</div>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                      {anime.synopsis}
                    </p>
                  </div>
                )}

                {/* Studios & Genres - Side by Side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Studios - Left */}
                  {anime.studios && anime.studios.length > 0 && (
                    <div className="bg-secondary/10 rounded p-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">Studios</div>
                      <div className="flex flex-wrap gap-1">
                        {(expandedStudios ? anime.studios : anime.studios.slice(0, 3)).map((studio) => (
                          <Badge key={studio.mal_id} variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs">
                            {studio.name}
                          </Badge>
                        ))}
                        {anime.studios.length > 3 && (
                          <button
                            onClick={() => setExpandedStudios(!expandedStudios)}
                            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            {expandedStudios ? '−' : `+${anime.studios.length - 3}`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Genres - Right */}
                  {anime.genres && anime.genres.length > 0 && (
                    <div className="bg-secondary/10 rounded p-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">Genres</div>
                      <div className="flex flex-wrap gap-1">
                        {(expandedGenres ? anime.genres : anime.genres.slice(0, 3)).map((genre) => (
                          <Badge key={genre.mal_id} className="bg-primary/10 text-primary border-primary/20 text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                        {anime.genres.length > 3 && (
                          <button
                            onClick={() => setExpandedGenres(!expandedGenres)}
                            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            {expandedGenres ? '−' : `+${anime.genres.length - 3}`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Themes - Full Width */}
                {anime.themes && anime.themes.length > 0 && (
                  <div className="bg-secondary/10 rounded p-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">Themes</div>
                    <div className="flex flex-wrap gap-1">
                      {(expandedThemes ? anime.themes : anime.themes.slice(0, 5)).map((theme) => (
                        <Badge key={theme.mal_id} variant="outline" className="border-accent/30 text-accent text-xs">
                          {theme.name}
                        </Badge>
                      ))}
                      {anime.themes.length > 5 && (
                        <button
                          onClick={() => setExpandedThemes(!expandedThemes)}
                          className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                          {expandedThemes ? '−' : `+${anime.themes.length - 5}`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Ratings & Popularity Section */}
                <div className="bg-secondary/10 rounded p-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Ratings & Popularity</div>
                  <div className="grid grid-cols-2 gap-2">
                    {anime.rank && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Rank</div>
                        <div className="font-bold text-sm text-accent">#{anime.rank}</div>
                      </div>
                    )}
                    {anime.popularity && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Popularity</div>
                        <div className="font-bold text-sm text-accent">#{anime.popularity}</div>
                      </div>
                    )}
                    {anime.members && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Members</div>
                        <div className="font-bold text-sm">{anime.members.toLocaleString()}</div>
                      </div>
                    )}
                    {anime.favorites && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Favorites</div>
                        <div className="font-bold text-sm text-primary">{anime.favorites.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="bg-secondary/10 rounded p-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Additional Info</div>
                  <div className="grid grid-cols-2 gap-2">
                    {anime.source && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Source</div>
                        <div className="font-bold text-sm capitalize">{anime.source}</div>
                      </div>
                    )}
                    {anime.rating && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Rating</div>
                        <div className="font-bold text-sm">{anime.rating}</div>
                      </div>
                    )}
                    {anime.duration && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-bold text-sm">{anime.duration}</div>
                      </div>
                    )}
                    {anime.season && (
                      <div className="bg-secondary/20 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">Season</div>
                        <div className="font-bold text-sm capitalize">{anime.season}{anime.year ? ` ${anime.year}` : ''}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Songs Section */}
          {isLoading ? (
            <div className="mb-8 animate-pulse">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="h-5 w-5 bg-secondary rounded-full" />
                </div>
                <div className="h-7 w-32 bg-secondary rounded" />
              </div>
              <div className="grid gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-secondary/50 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="mb-8 p-6 bg-gradient-to-r from-secondary/30 to-secondary/10 backdrop-blur-sm border border-secondary/50 rounded-xl text-center text-destructive">
              {error}
            </div>
          ) : themeSongs.length > 0 ? (
            <div className="mb-6 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Theme Songs</h2>
                    <p className="text-xs text-muted-foreground">
                      {themeSongs.length} {themeSongs.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
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
              </div>
              
              {(() => {
                const organizedThemes = filteredThemeSongs.reduce((acc, theme) => {
                  const season = theme.sequence || 1;
                  const seasonKey = `Season ${season}`;
                  if (!acc[seasonKey]) acc[seasonKey] = { ops: [], eds: [] };
                  if (theme.type === 'OP') acc[seasonKey].ops.push(theme);
                  else acc[seasonKey].eds.push(theme);
                  return acc;
                }, {} as Record<string, { ops: ThemeSong[], eds: ThemeSong[] }>);

                const seasons = Object.keys(organizedThemes).sort();
                const startIdx = currentThemePage * themesPerPage;
                const endIdx = startIdx + themesPerPage;
                const paginatedSeasons = seasons.slice(startIdx, endIdx);
                const totalPages = Math.ceil(seasons.length / themesPerPage);

                return (
                  <>
                    <div className="space-y-4">
                      {paginatedSeasons.map((season) => (
                        <div key={season} className="bg-secondary/5 rounded-lg p-4 border border-secondary/20">
                          <h3 className="font-semibold text-sm mb-3 text-primary">{season}</h3>
                          <div className="space-y-3">
                            {organizedThemes[season].ops.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Openings</p>
                                <div className="space-y-2">
                                  {organizedThemes[season].ops.map((theme) => (
                                    <div key={theme.id} className="bg-gradient-to-r from-secondary/30 to-secondary/10 hover:from-secondary/40 hover:to-secondary/20 backdrop-blur-sm border border-secondary/50 rounded-lg p-3 transition-all duration-200 hover:shadow-md">
                                      <ThemeSongPlayer
                                        theme={theme}
                                        onNext={() => {}}
                                        onPrevious={() => {}}
                                        hasNext={false}
                                        hasPrevious={false}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {organizedThemes[season].eds.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Endings</p>
                                <div className="space-y-2">
                                  {organizedThemes[season].eds.map((theme) => (
                                    <div key={theme.id} className="bg-gradient-to-r from-secondary/30 to-secondary/10 hover:from-secondary/40 hover:to-secondary/20 backdrop-blur-sm border border-secondary/50 rounded-lg p-3 transition-all duration-200 hover:shadow-md">
                                      <ThemeSongPlayer
                                        theme={theme}
                                        onNext={() => {}}
                                        onPrevious={() => {}}
                                        hasNext={false}
                                        hasPrevious={false}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setCurrentThemePage(Math.max(0, currentThemePage - 1))}
                          disabled={currentThemePage === 0}
                          className="px-3 py-1 text-sm rounded-lg bg-secondary/20 hover:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Previous
                        </button>
                        <span className="text-xs text-muted-foreground">
                          Page {currentThemePage + 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentThemePage(Math.min(totalPages - 1, currentThemePage + 1))}
                          disabled={currentThemePage === totalPages - 1}
                          className="px-3 py-1 text-sm rounded-lg bg-secondary/20 hover:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    )}

                    {filteredThemeSongs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No songs found matching "{searchQuery}"
                      </div>
                    )}
                  </>
                );
              })()}

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
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  View full OST with lyrics and more details <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Characters Section */}
          {isLoading ? (
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="h-5 w-5 bg-secondary rounded-full" />
                </div>
                <div className="h-7 w-48 bg-secondary rounded" />
              </div>
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-secondary/50 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error ? null : characters.length > 0 ? (
            <div className="mb-8 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Characters & Voice Actors</h2>
                    <p className="text-xs text-muted-foreground">
                      {characterSearchQuery ? `${filteredCharacters.length} results` : 'Most popular characters'}
                    </p>
                  </div>
                </div>
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={characterSearchQuery}
                    onChange={(e) => setCharacterSearchQuery(e.target.value)}
                    placeholder="Search characters..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid gap-4">
                {filteredCharacters.map((char) => {
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
                {filteredCharacters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No characters found matching "{characterSearchQuery}"
                  </div>
                )}
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