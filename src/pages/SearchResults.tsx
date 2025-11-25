import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Anime } from '@/types/anime';
import { Manga, Character } from '@/types/manga';
import { animeApi } from '@/services/animeApi';
import { mangadexApi, MangaFilters } from '@/services/mangadexApi';
import { Navigation } from '@/components/Navigation';
import { SearchBar } from '@/components/SearchBar';
import { SearchFilters, AllFilters, AnimeFilters, CharacterFilters } from '@/components/SearchFilters';
import { AnimeCard } from '@/components/AnimeCard';
import { MangaCard } from '@/components/MangaCard';
import { AnimeModal } from '@/components/AnimeModal';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, BookOpen, Users, SortAsc, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { applySeasonalTheme } from '@/lib/seasonalTheme';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type') || '';
  const sectionParam = searchParams.get('section') as 'anime' | 'manga' | 'characters' | null;
  
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [mangaResults, setMangaResults] = useState<Manga[]>([]);
  const [characterResults, setCharacterResults] = useState<Character[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);
  // Load saved tab from localStorage or URL param
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (sectionParam && ['anime', 'manga', 'characters'].includes(sectionParam)) {
      return sectionParam;
    }
    const saved = localStorage.getItem('searchResultsTab');
    return saved && ['anime', 'manga', 'characters'].includes(saved) ? saved : 'anime';
  });
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [mangaFilters, setMangaFilters] = useState<MangaFilters>({
    contentRating: ['safe', 'suggestive'],
    order: { relevance: 'desc' },
  });
  const [animeFilters, setAnimeFilters] = useState<AnimeFilters>({});
  const [characterFilters, setCharacterFilters] = useState<CharacterFilters>({});
  const PER_PAGE = 50;

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();
  }, []);

  // Reset page when filters or query changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [query, mangaFilters, animeFilters, characterFilters]);

  useEffect(() => {
    const performSearch = async () => {
      // Reset results when starting a new search (page 1)
      if (page === 1) {
        setIsLoading(true);
        setAnimeResults([]);
        setMangaResults([]);
        setCharacterResults([]);
      } else {
        setIsLoadingMore(true);
      }
      
      try {
        // Check if we have anime filters
        const hasAnimeFilters = animeFilters && (
          (animeFilters.genres && animeFilters.genres.length > 0) ||
          (animeFilters.tags && animeFilters.tags.length > 0) ||
          (animeFilters.format && animeFilters.format.length > 0) ||
          (animeFilters.status && animeFilters.status.length > 0)
        );
        
        // Check if we have character filters
        const hasCharacterFilters = characterFilters && (
          (characterFilters.role && characterFilters.role.length > 0) ||
          characterFilters.sort
        );
        
        // Check if we have a valid query
        const hasQuery = query && query.trim().length > 0;
        
        // Always pass filters to API calls
        const [anime, manga, characters] = await Promise.all([
          // Anime: use searchAnime if query OR filters exist, otherwise getTopAnime
          (hasQuery || hasAnimeFilters)
            ? animeApi.searchAnime(query || '', PER_PAGE, animeFilters, page) 
            : animeApi.getTopAnime(page, PER_PAGE, animeFilters),
          // Manga: always search (empty query works with filters)
          query 
            ? mangadexApi.searchManga(query, mangaFilters, PER_PAGE, (page - 1) * PER_PAGE) 
            : mangadexApi.searchManga('', { ...mangaFilters, order: { rating: 'desc' } }, PER_PAGE, (page - 1) * PER_PAGE),
          // Characters: use searchCharacters if query OR filters exist, otherwise getTopCharacters
          (hasQuery || hasCharacterFilters)
            ? animeApi.searchCharacters(query || '', PER_PAGE, characterFilters, page) 
            : animeApi.getTopCharacters(page, PER_PAGE, characterFilters),
        ]);
        
        // Append results for pagination, or replace for new search
        if (page === 1) {
          setAnimeResults(anime);
          setMangaResults(manga);
          setCharacterResults(characters);
        } else {
          setAnimeResults(prev => [...prev, ...anime]);
          setMangaResults(prev => [...prev, ...manga]);
          setCharacterResults(prev => [...prev, ...characters]);
        }
        
        // Check if we have more results
        setHasMore(anime.length === PER_PAGE || manga.length === PER_PAGE || characters.length === PER_PAGE);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    performSearch();
  }, [query, mangaFilters, animeFilters, characterFilters, page]);

  const handleFiltersChange = (filters: AllFilters) => {
    console.log('Filters applied:', filters);
    
    if (filters.section === 'anime' && filters.animeFilters !== undefined) {
      setAnimeFilters(filters.animeFilters);
      // Page reset will happen via useEffect dependency
    } else if (filters.section === 'manga' && filters.mangaFilters !== undefined) {
      setMangaFilters(filters.mangaFilters);
      // Page reset will happen via useEffect dependency
    } else if (filters.section === 'characters' && filters.characterFilters !== undefined) {
      setCharacterFilters(filters.characterFilters);
      // Page reset will happen via useEffect dependency
    }
  };

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, isLoadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore]);

  const handleMangaClick = (manga: Manga) => {
    navigate(`/manga/${manga.id}`, { state: { from: window.location.pathname + window.location.search } });
  };

  const handleCharacterClick = (character: Character) => {
    // Could navigate to character detail page
    console.log('Character clicked:', character);
  };

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('q');
    newParams.delete('type'); // Clear type filter if present
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Search Bar */}
      <div className="sticky top-16 z-40 glass border-b border-border/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <SearchBar currentSection={activeTab as 'anime' | 'manga' | 'characters'} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Info */}
        <div className="mb-6 md:mb-10 animate-fade-in">
          <div className="mb-4 md:mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 gradient-text">
              {query ? 'Search Results' : 'Browse All'}
            </h1>
            {query && (
              <p className="text-base md:text-lg text-muted-foreground">
                Showing results for: 
                <span className="font-semibold text-foreground px-2 py-1 bg-primary/10 rounded-lg inline-flex items-center gap-2 ml-2">
                  "{query}"
                  <button
                    onClick={clearSearch}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-primary/10"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </p>
            )}
          </div>
          
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] md:w-[180px] text-xs md:text-sm">
                <SortAsc className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
            
            <SearchFilters onFiltersChange={handleFiltersChange} currentFilters={mangaFilters} currentSection={activeTab as 'anime' | 'manga' | 'characters'} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          localStorage.setItem('searchResultsTab', value);
          // Update URL with section parameter
          const newParams = new URLSearchParams(searchParams);
          newParams.set('section', value);
          navigate(`/search?${newParams.toString()}`, { replace: true });
        }} className="w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 lg:mb-8 p-1 bg-secondary/50 backdrop-blur-sm h-auto">
            <TabsTrigger value="anime" className="gap-1 md:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 md:py-3 text-xs md:text-sm">
              <Tv className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Anime</span>
              <span className="sm:hidden">({animeResults.length})</span>
              <span className="hidden sm:inline">({animeResults.length})</span>
            </TabsTrigger>
            <TabsTrigger value="manga" className="gap-1 md:gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-2 md:py-3 text-xs md:text-sm">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Manga</span>
              <span className="sm:hidden">({mangaResults.length})</span>
              <span className="hidden sm:inline">({mangaResults.length})</span>
            </TabsTrigger>
            <TabsTrigger value="characters" className="gap-1 md:gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground py-2 md:py-3 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Characters</span>
              <span className="sm:hidden">({characterResults.length})</span>
              <span className="hidden sm:inline">({characterResults.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Anime Tab */}
          <TabsContent value="anime">
            {isLoading ? (
              <LoadingGrid count={12} type="card" />
            ) : animeResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                  {animeResults.map((anime) => (
                    <AnimeCard
                      key={anime.mal_id}
                      anime={anime}
                      onClick={() => setSelectedAnime(anime)}
                    />
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-20 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more...</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 md:py-12 text-muted-foreground">
                <Tv className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base">{query ? `No anime found for "${query}"` : 'No anime available'}</p>
              </div>
            )}
          </TabsContent>

          {/* Manga Tab */}
          <TabsContent value="manga">
            {isLoading ? (
              <LoadingGrid count={12} type="card" />
            ) : mangaResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                  {mangaResults.map((manga) => (
                    <MangaCard
                      key={manga.id}
                      manga={manga}
                      onClick={() => handleMangaClick(manga)}
                    />
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-20 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more...</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 md:py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base">{query ? `No manga found for "${query}"` : 'No manga available'}</p>
              </div>
            )}
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters">
            {isLoading ? (
              <LoadingGrid count={10} type="character" />
            ) : characterResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                  {characterResults.map((character) => (
                    <Card
                      key={character.mal_id}
                      className="group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:scale-105"
                      onClick={() => handleCharacterClick(character)}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <img
                          src={character.images.jpg.image_url}
                          alt={character.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                      <CardContent className="p-2 md:p-3">
                        <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1">
                          {character.name}
                        </h3>
                        {character.favorites && (
                          <p className="text-xs text-muted-foreground">
                            ❤️ {character.favorites.toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-20 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more...</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 md:py-12 text-muted-foreground">
                <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base">{query ? `No characters found for "${query}"` : 'No characters available'}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedAnime && (
        <AnimeModal
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
        />
      )}
    </div>
  );
};

export default SearchResults;