'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { animeApi } from '@/services/animeApi';
import { Anime } from '@/types/anime';

interface SearchBarProps {
  onAnimeSelect?: (anime: Anime) => void;
}

export const SearchBar = ({ onAnimeSelect }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
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
    const searchAnime = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await animeApi.searchAnime(query);
        setResults(searchResults);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchAnime, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (anime: Anime) => {
    onAnimeSelect(anime);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
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
          {/* Scrollable Results */}
          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : results.length > 0 ? (
              results.map((anime) => (
                <button
                  key={anime.mal_id}
                  onClick={() => handleSelect(anime)}
                  className="w-full flex items-center gap-4 p-3 hover:bg-secondary/50 transition-colors text-left focus:bg-secondary/70 focus:outline-none"
                  tabIndex={0}
                >
                  <img
                    src={anime.images.jpg.image_url}
                    alt={anime.title}
                    className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">
                      {anime.title_english || anime.title}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {anime.score && (
                        <span className="text-primary font-medium">Star {anime.score}</span>
                      )}
                      {anime.episodes && <span>• {anime.episodes} eps</span>}
                      {anime.type && <span>• {anime.type}</span>}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No results found.
              </div>
            )}
            {results.length > 0 && (
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