import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Calendar, Users, Music, Tv, Film, PlayCircle, Clock, TrendingUp, Award, Building2, Sparkles, Info, Play } from 'lucide-react';
import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { AudioPlayer } from './AudioPlayer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchAnime } from './WatchAnime';
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<ThemeSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWatchDialog, setShowWatchDialog] = useState(false);
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

  const hasThemes = themeSongs.length > 0;
  const hasCharacters = characters.length > 0;

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
          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-xl animate-slide-up">
            <div className="absolute inset-0">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-105"
                loading="lazy"
                aria-hidden="true"
              />
            </div>
            <div className="relative bg-gradient-card backdrop-blur-xl p-4 md:p-6 lg:flex lg:gap-6">
              <div className="w-full md:w-48 mx-auto md:mx-0 mb-4 md:mb-0">
                <img
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full h-auto object-contain rounded-xl shadow-glow max-h-64 transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {anime.title_english || anime.title}
                  </h1>
                  <Button 
                    onClick={() => setShowWatchDialog(true)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
                    size="sm"
                  >
                    <Play className="h-4 w-4" />
                    Watch Now
                  </Button>
                </div>
                {anime.title_english && (
                  <p className="text-base text-muted-foreground">{anime.title}</p>
                )}
                {/* Primary Stats - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {anime.score && (
                    <div className="bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/50 rounded-lg p-2 text-center hover:from-primary/40 hover:to-accent/40 hover:border-primary transition-all">
                      <Star className="h-4 w-4 fill-primary text-primary mx-auto mb-1" />
                      <div className="font-bold text-lg text-foreground">{anime.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                  {anime.type && (
                    <div className="bg-gradient-to-br from-accent/30 to-primary/30 border border-accent/50 rounded-lg p-2 text-center hover:from-accent/40 hover:to-primary/40 hover:border-accent transition-all">
                      {anime.type === 'TV' ? <Tv className="h-4 w-4 text-accent mx-auto mb-1" /> : 
                       anime.type === 'Movie' ? <Film className="h-4 w-4 text-accent mx-auto mb-1" /> :
                       <PlayCircle className="h-4 w-4 text-accent mx-auto mb-1" />}
                      <div className="font-bold text-foreground">{anime.type}</div>
                      <div className="text-xs text-muted-foreground">Type</div>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/40 rounded-lg p-2 text-center hover:from-primary/30 hover:to-accent/30 hover:border-primary transition-all">
                      <PlayCircle className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="font-bold text-lg text-foreground">{anime.episodes}</div>
                      <div className="text-xs text-muted-foreground">Episodes</div>
                    </div>
                  )}
                  {anime.status && (
                    <div className="bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/40 rounded-lg p-2 text-center hover:from-accent/30 hover:to-primary/30 hover:border-accent transition-all">
                      <Clock className="h-4 w-4 text-accent mx-auto mb-1" />
                      <div className="font-bold text-xs text-foreground">{anime.status}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                  )}
                </div>

                {/* Airing Information - Compact */}
                {(anime.aired || anime.season || anime.year) && (
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span>Airing</span>
                    </div>
                    <div className="text-xs">
                      {anime.season && anime.year && (
                        <span className="font-medium capitalize">{anime.season} {anime.year}</span>
                      )}
                      {anime.aired?.from && (
                        <span className="ml-2">From: {new Date(anime.aired.from).toLocaleDateString()}</span>
                      )}
                      {anime.aired?.to && (
                        <span className="ml-2">To: {new Date(anime.aired.to).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Studios, Genres, Themes - Compact Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {anime.studios && anime.studios.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-accent" />
                      {anime.studios.slice(0, 3).map((studio) => (
                        <Badge key={studio.mal_id} variant="secondary" className="text-xs bg-accent/10 text-accent border-accent/20">
                          {studio.name}
                        </Badge>
                      ))}
                      {anime.studios.length > 3 && <span className="text-muted-foreground">+{anime.studios.length - 3}</span>}
                    </div>
                  )}
                  {anime.genres && anime.genres.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {anime.genres.slice(0, 4).map((genre) => (
                        <Badge key={genre.mal_id} className="text-xs bg-primary/10 text-primary border-primary/20">
                          {genre.name}
                        </Badge>
                      ))}
                      {anime.genres.length > 4 && <span className="text-muted-foreground">+{anime.genres.length - 4}</span>}
                    </div>
                  )}
                  {anime.themes && anime.themes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-accent" />
                      {anime.themes.slice(0, 3).map((theme) => (
                        <Badge key={theme.mal_id} variant="outline" className="text-xs border-accent/30 text-accent">
                          {theme.name}
                        </Badge>
                      ))}
                      {anime.themes.length > 3 && <span className="text-muted-foreground">+{anime.themes.length - 3}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="bg-card rounded-2xl shadow-md overflow-hidden animate-slide-up">
            <Tabs defaultValue="synopsis" className="w-full">
              <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 rounded-none bg-secondary/50 p-0 h-auto">
                <TabsTrigger value="synopsis" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
                  <Info className="h-4 w-4 mr-2" />
                  Synopsis
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-3">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Stats
                </TabsTrigger>
                {hasThemes && (
                  <TabsTrigger value="themes" className="rounded-none data-[state=active]:bg-secondary data-[state=active]:text-foreground py-3 lg:col-span-1">
                    <Music className="h-4 w-4 mr-2" />
                    Themes
                  </TabsTrigger>
                )}
                {hasCharacters && (
                  <TabsTrigger value="characters" className="rounded-none data-[state=active]:bg-secondary data-[state=active]:text-foreground py-3 lg:col-span-1">
                    <Users className="h-4 w-4 mr-2" />
                    Characters
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="synopsis" className="p-4 m-0 max-h-64 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {anime.synopsis || 'No synopsis available for this anime.'}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="p-4 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Ratings & Popularity
                    </h3>
                    <div className="space-y-2">
                      {anime.score && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-bold text-primary flex items-center gap-1">
                            <Star className="h-4 w-4 fill-primary" />
                            {anime.score} / 10
                          </span>
                        </div>
                      )}
                      {anime.rank && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Rank</span>
                          <span className="font-bold text-accent">#{anime.rank}</span>
                        </div>
                      )}
                      {anime.popularity && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Popularity</span>
                          <span className="font-bold text-accent">#{anime.popularity}</span>
                        </div>
                      )}
                      {anime.members && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Members</span>
                          <span className="font-bold">{anime.members.toLocaleString()}</span>
                        </div>
                      )}
                      {anime.favorites && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Favorites</span>
                          <span className="font-bold text-primary">{anime.favorites.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-accent" />
                      Additional Info
                    </h3>
                    <div className="space-y-2">
                      {anime.type && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-bold">{anime.type}</span>
                        </div>
                      )}
                      {anime.source && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Source</span>
                          <span className="font-bold capitalize">{anime.source}</span>
                        </div>
                      )}
                      {anime.rating && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Rating</span>
                          <span className="font-bold">{anime.rating}</span>
                        </div>
                      )}
                      {anime.duration && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-bold">{anime.duration}</span>
                        </div>
                      )}
                      {anime.broadcast?.string && (
                        <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-muted-foreground">Broadcast</span>
                          <span className="font-bold text-xs">{anime.broadcast.string}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {hasThemes && (
                <TabsContent value="themes" className="p-4 m-0">
                  <div className="grid gap-3">
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
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/30 to-accent/30 rounded-lg hover:from-primary/40 hover:to-accent/40 transition-all duration-200 hover:shadow-glow text-left group border border-primary/40 hover:border-primary"
                        >
                          <div className="bg-primary/20 px-2 py-1 rounded font-bold text-primary whitespace-nowrap group-hover:bg-primary/30 transition-colors text-xs">
                            {theme.type}{theme.sequence || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                              {songTitle}
                              {artists && <> by {artists}</>}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Click to play on YouTube</p>
                          </div>
                          <Music className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                </TabsContent>
              )}

              {hasCharacters && (
                <TabsContent value="characters" className="p-4 m-0 max-h-80 overflow-y-auto">
                  <div className="grid gap-3">
                    {characters.slice(0, 8).map((char) => { // Limit to top 8
                      const japaneseVA = char.voice_actors?.find(va => va.language === 'Japanese');
                      const englishVA = char.voice_actors?.find(va => va.language === 'English');
                      
                      return (
                        <div
                          key={char.character.mal_id}
                          className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 hover:from-primary/30 hover:to-accent/30 transition-all duration-200 hover:shadow-glow border border-primary/30 hover:border-primary/50"
                        >
                          <div className="flex flex-col md:flex-row md:items-start gap-3">
                            {/* Character Info */}
                            <div className="flex items-center gap-2 flex-1">
                              <img
                                src={char.character.images.jpg.image_url}
                                alt={char.character.name}
                                className="w-16 h-20 object-cover rounded shadow-md transition-transform duration-300 hover:scale-105 flex-shrink-0"
                                loading="lazy"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-foreground text-sm truncate">
                                  {char.character.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mb-1">{char.role}</p>
                                {char.favorites > 0 && (
                                  <p className="text-xs text-primary font-medium">
                                    ❤️ {char.favorites.toLocaleString()} favorites
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Voice Actors - Compact */}
                            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                              {/* Japanese VA (Sub) */}
                              {japaneseVA && (
                                <div className="flex items-center gap-2 text-left md:text-right flex-shrink-0">
                                  <img
                                    src={japaneseVA.person.images.jpg.image_url}
                                    alt={japaneseVA.person.name}
                                    className="w-12 h-16 object-cover rounded shadow-md transition-transform duration-300 hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">SUB</p>
                                    <p className="font-semibold text-foreground text-xs truncate">
                                      {japaneseVA.person.name}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* English VA (Dub) */}
                              {englishVA && (
                                <div className="flex items-center gap-2 text-left md:text-right flex-shrink-0">
                                  <img
                                    src={englishVA.person.images.jpg.image_url}
                                    alt={englishVA.person.name}
                                    className="w-12 h-16 object-cover rounded shadow-md transition-transform duration-300 hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">DUB</p>
                                    <p className="font-semibold text-foreground text-xs truncate">
                                      {englishVA.person.name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {characters.length > 8 && (
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        Showing top 8 characters. <a href={`https://myanimelist.net/anime/${anime.mal_id}/characters`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View all</a>
                      </p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
          
          {selectedSong && (
            <AudioPlayer
              song={selectedSong}
              onClose={() => setSelectedSong(null)}
            />
          )}
        </div>
      </DialogContent>
      
      <WatchAnime
        isOpen={showWatchDialog}
        onClose={() => setShowWatchDialog(false)}
        animeTitle={anime.title_english || anime.title}
        malId={anime.mal_id}
        anilistId={anime.anilist_id}
      />
    </Dialog>
  );
};