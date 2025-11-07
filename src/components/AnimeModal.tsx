import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Star, Calendar, Users, Music, Tv, Film, PlayCircle, Clock, TrendingUp, Award, Building2, Sparkles, Info } from 'lucide-react';
import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { AudioPlayer } from './AudioPlayer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnimeModalProps {
  anime: Anime;
  onClose: () => void;
}

export const AnimeModal = ({ anime, onClose }: AnimeModalProps) => {
  const [characters, setCharacters] = useState<AnimeCharacter[]>([]);
  const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<ThemeSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
          animeApi.getThemeSongs(anime.title),
        ]);
        // Sort characters by popularity (favorites count descending)
        const sortedChars = charData.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));
        setCharacters(sortedChars);
        setThemeSongs(themeData);
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
    <div
      ref={modalRef}
      className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto animate-fade-in focus:outline-none"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8">
        <div ref={contentRef} className="max-w-6xl mx-auto relative">
          <button
            onClick={onClose}
            className="fixed top-4 right-4 bg-primary p-2 rounded-full hover:bg-primary/80 transition-all duration-200 shadow-glow hover:shadow-glow z-10 border-2 border-primary/60 hover:border-primary hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden mb-8 shadow-xl animate-slide-up">
            <div className="absolute inset-0">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-105"
                loading="lazy"
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
                  <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
                    {anime.title_english || anime.title}
                  </h1>
                  {anime.title_english && (
                    <p className="text-lg md:text-xl text-muted-foreground">{anime.title}</p>
                  )}
                </div>

                {/* Primary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {anime.score && (
                    <div className="bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/50 rounded-xl p-3 text-center hover:from-primary/40 hover:to-accent/40 hover:border-primary transition-all hover:scale-105 cursor-pointer">
                      <Star className="h-5 w-5 fill-primary text-primary mx-auto mb-1" />
                      <div className="font-bold text-xl text-foreground">{anime.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                  {anime.type && (
                    <div className="bg-gradient-to-br from-accent/30 to-primary/30 border-2 border-accent/50 rounded-xl p-3 text-center hover:from-accent/40 hover:to-primary/40 hover:border-accent transition-all hover:scale-105 cursor-pointer">
                      {anime.type === 'TV' ? <Tv className="h-5 w-5 text-accent mx-auto mb-1" /> : 
                       anime.type === 'Movie' ? <Film className="h-5 w-5 text-accent mx-auto mb-1" /> :
                       <PlayCircle className="h-5 w-5 text-accent mx-auto mb-1" />}
                      <div className="font-bold text-foreground">{anime.type}</div>
                      <div className="text-xs text-muted-foreground">Type</div>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 rounded-xl p-3 text-center hover:from-primary/30 hover:to-accent/30 hover:border-primary transition-all hover:scale-105 cursor-pointer">
                      <PlayCircle className="h-5 w-5 text-primary mx-auto mb-1" />
                      <div className="font-bold text-xl text-foreground">{anime.episodes}</div>
                      <div className="text-xs text-muted-foreground">Episodes</div>
                    </div>
                  )}
                  {anime.status && (
                    <div className="bg-gradient-to-br from-accent/20 to-primary/20 border-2 border-accent/40 rounded-xl p-3 text-center hover:from-accent/30 hover:to-primary/30 hover:border-accent transition-all hover:scale-105 cursor-pointer">
                      <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
                      <div className="font-bold text-sm text-foreground">{anime.status}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                  )}
                </div>

                {/* Airing Information */}
                {(anime.aired || anime.season || anime.year) && (
                  <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Airing Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {anime.season && anime.year && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Season:</span>
                          <span className="font-medium capitalize">{anime.season} {anime.year}</span>
                        </div>
                      )}
                      {anime.aired?.from && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-medium">{new Date(anime.aired.from).toLocaleDateString()}</span>
                        </div>
                      )}
                      {anime.aired?.to && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-medium">{new Date(anime.aired.to).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Studios */}
                {anime.studios && anime.studios.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Studios</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {anime.studios.map((studio) => (
                        <Badge key={studio.mal_id} variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          {studio.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Genres */}
                {anime.genres && anime.genres.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Genres</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {anime.genres.map((genre) => (
                        <Badge key={genre.mal_id} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                          {genre.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Themes */}
                {anime.themes && anime.themes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Themes</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {anime.themes.map((theme) => (
                        <Badge key={theme.mal_id} variant="outline" className="border-accent/30 text-accent">
                          {theme.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Synopsis & Information Tabs */}
          <div className="bg-card rounded-2xl shadow-md mb-8 overflow-hidden animate-slide-up">
            <Tabs defaultValue="synopsis" className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-none bg-secondary/50 p-0 h-auto">
                <TabsTrigger value="synopsis" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4">
                  <Info className="h-4 w-4 mr-2" />
                  Synopsis
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-4">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Statistics
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="synopsis" className="p-6 m-0">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {anime.synopsis || 'No synopsis available for this anime.'}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="p-6 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Ratings & Popularity
                    </h3>
                    <div className="space-y-3">
                      {anime.score && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-bold text-xl text-primary flex items-center gap-2">
                            <Star className="h-5 w-5 fill-primary" />
                            {anime.score} / 10
                          </span>
                        </div>
                      )}
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
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Info className="h-5 w-5 text-accent" />
                      Additional Info
                    </h3>
                    <div className="space-y-3">
                      {anime.type && (
                        <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-bold">{anime.type}</span>
                        </div>
                      )}
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
              </TabsContent>
            </Tabs>
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
              <div className="flex items-center gap-2 mb-6">
                <Music className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Theme Songs</h2>
              </div>
              <div className="grid gap-4">
                {themeSongs.map((theme) => {
                  const songTitle = theme.song?.title || 'Unknown Title';
                  const artists = theme.song?.artists?.map(a => a.name).join(', ') || '';
                  const searchQuery = `${anime.title} ${theme.type}${theme.sequence || ''} ${songTitle} ${artists}`.trim();
                  // Direct YouTube search that auto-plays first result
                  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                  
                  return (
                    <a
                      key={theme.id}
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl hover:from-primary/40 hover:to-accent/40 transition-all duration-200 hover:shadow-glow hover:scale-[1.02] text-left group border-2 border-primary/40 hover:border-primary"
                    >
                      <div className="bg-primary/20 px-3 py-2 rounded-lg font-bold text-primary whitespace-nowrap group-hover:bg-primary/30 transition-colors">
                        {theme.type}{theme.sequence || ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {songTitle}
                          {artists && <> by {artists}</>}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Click to play on YouTube</p>
                      </div>
                      <Music className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  );
                })}
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
        </div>
      </div>

      {selectedSong && (
        <AudioPlayer
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
};