import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { animeApi } from '@/services/animeApi';
import { Anime } from '@/types/anime';

interface SearchBarProps {
  onAnimeSelect: (anime: Anime) => void;
}

export const SearchBar = ({ onAnimeSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime, manga, characters..."
          className="pl-12 pr-12 h-14 bg-card border-border text-lg rounded-xl shadow-card focus:ring-2 focus:ring-primary transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && results && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-card overflow-hidden z-[100] animate-slide-up">
          <div className="max-h-96 overflow-y-auto">
            {results.map((anime) => (
              <button
                key={anime.mal_id}
                onClick={() => handleSelect(anime)}
                className="w-full flex items-center gap-4 p-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <img
                  src={anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-16 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {anime.title_english || anime.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {anime.score && (
                      <span className="text-primary font-medium">★ {anime.score}</span>
                    )}
                    {anime.episodes && <span>• {anime.episodes} eps</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && isLoading && (
        <div className="absolute top-full mt-2 w-full bg-card/95 backdrop-blur-md border border-border rounded-xl p-4 text-center text-muted-foreground animate-fade-in z-[100]">
          Searching...
        </div>
      )}
    </div>
  );
};
