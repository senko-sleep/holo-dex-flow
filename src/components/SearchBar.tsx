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
  currentSection?: 'anime' | 'manga' | 'characters'; // Current page section for context-aware filtering
}

export const SearchBar = ({ onAnimeSelect, currentSection }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [mangaResults, setMangaResults] = useState<Manga[]>([]);
  const [characterResults, setCharacterResults] = useState<Character[]>([]);
  // Use currentSection as the active filter, fallback to saved or 'all'
  const [activeFilter, setActiveFilter] = useState<'all' | 'anime' | 'manga' | 'characters'>(() => {
    if (currentSection) {
      return currentSection;
    }
    const saved = localStorage.getItem('searchFilter');
    if (saved && ['all', 'anime', 'manga', 'characters'].includes(saved)) {
      return saved as 'all' | 'anime' | 'manga' | 'characters';
    }
    return 'all';
  });
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

  // Debounced search with better error handling
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
        const searchPromises = [];
        
        // Always search for anime
        searchPromises.push(
          animeApi.searchAnime(query, 5, {}, 1, true)
            .then(anime => {
              setAnimeResults(anime);
              return anime;
            })
            .catch(error => {
              console.error('Error searching anime:', error);
              setAnimeResults([]);
              return [];
            })
        );
        
        // Search for manga if enabled
        if (activeFilter === 'all' || activeFilter === 'manga') {
          searchPromises.push(
            mangadexApi.searchManga(query, {}, 5, 0)
              .then(manga => {
                setMangaResults(manga);
                return manga;
              })
              .catch(error => {
                console.error('Error searching manga:', error);
                setMangaResults([]);
                return [];
              })
          );
        }
        
        // Search for characters if enabled
        if (activeFilter === 'all' || activeFilter === 'characters') {
          searchPromises.push(
            animeApi.searchCharacters(query, 5)
              .then(characters => {
                setCharacterResults(characters);
                return characters;
              })
              .catch(error => {
                console.error('Error searching characters:', error);
                setCharacterResults([]);
                return [];
              })
          );
        }
        
        // Wait for all searches to complete
        await Promise.all(searchPromises);
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
      // Navigate to search results and trigger anime modal with section
      navigate(`/search?q=${encodeURIComponent(anime.title)}&anime=${anime.mal_id}&section=anime`);
    }
    clearSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setAnimeResults([]);
    setMangaResults([]);
    setCharacterResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Save filter preference to localStorage
  const handleFilterChange = (filter: 'all' | 'anime' | 'manga' | 'characters') => {
    setActiveFilter(filter);
    localStorage.setItem('searchFilter', filter);
  };

  // Update filter when currentSection changes and save to localStorage
  useEffect(() => {
    if (currentSection) {
      setActiveFilter(currentSection);
      localStorage.setItem('searchFilter', currentSection);
    }
  }, [currentSection]);

  const handleSearchSubmit = () => {
    const trimmedQuery = query.trim();
    const searchParams = new URLSearchParams();
    
    if (trimmedQuery.length >= 2) {
      searchParams.set('q', trimmedQuery);
    }
    
    // Always include the active filter
    if (activeFilter && activeFilter !== 'all') {
      searchParams.set('section', activeFilter);
    }
    
    // Add any additional filters if needed
    if (activeFilter === 'anime') {
      // Add anime-specific filters if any
    } else if (activeFilter === 'manga') {
      // Add manga-specific filters if any
    }
    
    navigate(`/search?${searchParams.toString()}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };


  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search anime, manga, characters..."
          className="w-full pl-12 pr-12 h-14 bg-card/80 backdrop-blur-sm border-border/50 text-lg rounded-2xl shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-primary/20 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all"
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

      {/* Dropdown: Directly below input */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-0 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Filter Buttons - Mobile Responsive */}
          <div className="p-2 sm:p-3 border-b border-border">
            <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2">
              <Button
                size="sm"
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('all')}
                className="flex-1 text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">All</span>
                <span className="sm:hidden">All</span>
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'anime' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('anime')}
                className="flex-1 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Tv className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Anime</span>
                <span className="sm:hidden ml-1">{animeResults.length}</span>
                <span className="hidden sm:inline">({animeResults.length})</span>
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'manga' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('manga')}
                className="flex-1 text-xs sm:text-sm px-2 sm:px-3"
              >
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Manga</span>
                <span className="sm:hidden ml-1">{mangaResults.length}</span>
                <span className="hidden sm:inline">({mangaResults.length})</span>
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'characters' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('characters')}
                className="flex-1 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Characters</span>
                <span className="sm:hidden ml-1">{characterResults.length}</span>
                <span className="hidden sm:inline">({characterResults.length})</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Results - Mobile Optimized */}
          <div className="overflow-y-auto" style={{ maxHeight: 'min(400px, 60vh)' }}>
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
                        className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={anime.images.jpg.image_url}
                          alt={anime.title}
                          className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm truncate">
                            {anime.title_english || anime.title}
                          </h4>
                          <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                            {anime.score && <span className="text-primary">★ {anime.score}</span>}
                            {anime.type && <span className="hidden sm:inline">• {anime.type}</span>}
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
                        className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={manga.coverUrl}
                          alt={manga.title}
                          className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm truncate">{manga.title}</h4>
                          <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                            {manga.status && <span className="truncate">{manga.status}</span>}
                            {manga.year && <span className="hidden sm:inline">• {manga.year}</span>}
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
                        className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={character.images.jpg.image_url}
                          alt={character.name}
                          className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm truncate">{character.name}</h4>
                          {character.favorites && (
                            <div className="text-xs text-muted-foreground">
                              ❤️ {character.favorites.toLocaleString()}
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