'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Tv, BookOpen, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { animeApi } from '@/services/animeApi';
import { mangadexApi } from '@/services/mangadexApi';
import { Anime } from '@/types/anime';
import { Manga, Character } from '@/types/manga';

interface SearchBarProps {
  onAnimeSelect?: (anime: Anime) => void;
}

export const SearchBar = ({ onAnimeSelect }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [mangaResults, setMangaResults] = useState<Manga[]>([]);
  const [characterResults, setCharacterResults] = useState<Character[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'anime' | 'manga' | 'characters'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // === NEW: Force update position on scroll/resize ===
  const [, forceUpdate] = useState({});
  const updatePosition = () => forceUpdate({});

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    // Initial position
    updatePosition();

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);
  // ===============================================

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const searchAll = async () => {
      if (query.trim().length < 2) {
        setAnimeResults([]);
        setMangaResults([]);
        setCharacterResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const [anime, manga, characters] = await Promise.all([
          animeApi.searchAnime(query),
          mangadexApi.searchManga(query, {}, 10, 0),
          animeApi.searchCharacters(query, 10),
        ]);
        setAnimeResults(anime.slice(0, 10));
        setMangaResults(manga.slice(0, 10));
        setCharacterResults(characters.slice(0, 10));
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setAnimeResults([]);
        setMangaResults([]);
        setCharacterResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchAll, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleAnimeClick = (anime: Anime) => {
    if (onAnimeSelect) {
      onAnimeSelect(anime);
    } else {
      // Navigate to search results and trigger anime modal
      navigate(`/search?q=${encodeURIComponent(anime.title)}&anime=${anime.mal_id}`);
    }
    clearSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setAnimeResults([]);
    setMangaResults([]);
    setCharacterResults([]);
    setIsOpen(false);
    setActiveFilter('all');
    inputRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // === Get current bounding rect safely ===
  const getRect = () => {
    return containerRef.current?.getBoundingClientRect() || { top: 0, left: 0, width: 0, bottom: 0 };
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search anime, manga, characters..."
          className="pl-12 pr-12 h-14 bg-card/80 backdrop-blur-sm border-border/50 text-lg rounded-2xl shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-primary/20 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown: Fixed but dynamically positioned */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[2147483647] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: `${getRect().bottom + 8}px`,
            left: `${getRect().left}px`,
            width: `${getRect().width}px`,
          }}
        >
          {/* Filter Buttons */}
          <div className="p-3 border-b border-border flex gap-2">
            <Button
              size="sm"
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('all')}
              className="flex-1"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'anime' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('anime')}
              className="flex-1"
            >
              <Tv className="h-4 w-4 mr-1" />
              Anime ({animeResults.length})
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'manga' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('manga')}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Manga ({mangaResults.length})
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'characters' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('characters')}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-1" />
              Characters ({characterResults.length})
            </Button>
          </div>

          {/* Scrollable Results */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Anime Results */}
                {(activeFilter === 'all' || activeFilter === 'anime') && animeResults.length > 0 && (
                  <div>
                    {activeFilter === 'all' && (
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-secondary/30">
                        ANIME
                      </div>
                    )}
                    {animeResults.map((anime) => (
                      <button
                        key={anime.mal_id}
                        onClick={() => handleAnimeClick(anime)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={anime.images.jpg.image_url}
                          alt={anime.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {anime.title_english || anime.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {anime.score && <span className="text-primary">★ {anime.score}</span>}
                            {anime.type && <span>• {anime.type}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manga Results */}
                {(activeFilter === 'all' || activeFilter === 'manga') && mangaResults.length > 0 && (
                  <div>
                    {activeFilter === 'all' && (
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-secondary/30">
                        MANGA
                      </div>
                    )}
                    {mangaResults.map((manga) => (
                      <button
                        key={manga.id}
                        onClick={() => {
                          navigate(`/manga/${manga.id}`);
                          clearSearch();
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={manga.coverUrl}
                          alt={manga.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{manga.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {manga.status && <span>{manga.status}</span>}
                            {manga.year && <span>• {manga.year}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Character Results */}
                {(activeFilter === 'all' || activeFilter === 'characters') && characterResults.length > 0 && (
                  <div>
                    {activeFilter === 'all' && (
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-secondary/30">
                        CHARACTERS
                      </div>
                    )}
                    {characterResults.map((character) => (
                      <button
                        key={character.mal_id}
                        onClick={() => {
                          // Could navigate to character page in future
                          console.log('Character clicked:', character);
                          clearSearch();
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={character.images.jpg.image_url}
                          alt={character.name}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{character.name}</h4>
                          {character.favorites && (
                            <div className="text-xs text-muted-foreground">
                              ❤️ {character.favorites.toLocaleString()} favorites
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {animeResults.length === 0 && mangaResults.length === 0 && characterResults.length === 0 && !isLoading && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-2">Try a different search term</p>
                  </div>
                )}
              </>
            )}
            {animeResults.length > 0 && (
              <button
                onClick={handleSearchSubmit}
                className="w-full p-3 text-center text-primary hover:bg-secondary/50 transition-colors border-t border-border font-medium"
              >
                View All Results →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};