import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Star, Calendar, Users, Music } from 'lucide-react';
import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { AudioPlayer } from './AudioPlayer';

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
        const [charData, themeData] = await Promise.all([
          animeApi.getAnimeCharacters(anime.mal_id),
          animeApi.getThemeSongs(anime.title),
        ]);
        // Sort characters by popularity (favorites count descending)
        const sortedChars = charData.sort((a, b) => b.favorites - a.favorites);
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
            className="fixed top-4 right-4 bg-card p-2 rounded-full hover:bg-secondary transition-colors duration-200 shadow-md z-10"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
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
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
                  {anime.title_english || anime.title}
                </h1>
                {anime.title_english && (
                  <p className="text-lg md:text-xl text-muted-foreground mb-4">{anime.title}</p>
                )}
                
                <div className="flex flex-wrap gap-3 mb-6">
                  {anime.score && (
                    <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full transition-colors duration-200 hover:bg-primary/30">
                      <Star className="h-5 w-5 fill-primary text-primary" />
                      <span className="font-bold text-lg">{anime.score}</span>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full transition-colors duration-200 hover:bg-secondary/80">
                      <span className="font-semibold">{anime.episodes} Episodes</span>
                    </div>
                  )}
                  {anime.year && (
                    <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full transition-colors duration-200 hover:bg-secondary/80">
                      <Calendar className="h-4 w-4" />
                      <span>{anime.year}</span>
                    </div>
                  )}
                </div>

                <p className="text-foreground leading-relaxed mb-4 line-clamp-6">
                  {anime.synopsis || 'No synopsis available.'}
                </p>

                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre) => (
                      <span
                        key={genre.mal_id}
                        className="bg-gradient-accent text-white px-3 py-1 rounded-full text-sm font-medium transition-transform duration-200 hover:scale-105"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}
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
              <div className="flex items-center gap-2 mb-6">
                <Music className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Theme Songs</h2>
              </div>
              <div className="grid gap-4">
                {themeSongs.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedSong(theme)}
                    className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-all duration-200 hover:shadow-md text-left"
                  >
                    <div className="bg-primary/20 px-3 py-2 rounded-lg font-bold text-primary whitespace-nowrap">
                      {theme.type}{theme.sequence || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {theme.song?.title || 'Unknown Title'}
                        {theme.song?.artists && theme.song.artists.length > 0 && (
                          <> by {theme.song.artists.map(a => a.name).join(', ')}</>
                        )}
                      </h3>
                    </div>
                  </button>
                ))}
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
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Characters & Voice Actors</h2>
                <span className="text-sm text-muted-foreground ml-auto">
                  Sorted by popularity
                </span>
              </div>
              <div className="grid gap-4">
                {characters.map((char) => {
                  const japaneseVA = char.voice_actors?.find(va => va.language === 'Japanese');
                  const englishVA = char.voice_actors?.find(va => va.language === 'English');
                  
                  return (
                    <div
                      key={char.character.mal_id}
                      className="bg-secondary/50 rounded-xl p-4 hover:bg-secondary/70 transition-all duration-200 hover:shadow-md"
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