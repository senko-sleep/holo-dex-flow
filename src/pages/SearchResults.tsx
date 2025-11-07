import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Anime } from '@/types/anime';
import { Manga, Character } from '@/types/manga';
import { animeApi } from '@/services/animeApi';
import { mangadexApi, MangaFilters } from '@/services/mangadexApi';
import { Navigation } from '@/components/Navigation';
import { SearchBar } from '@/components/SearchBar';
import { SearchFilters } from '@/components/SearchFilters';
import { AnimeCard } from '@/components/AnimeCard';
import { MangaCard } from '@/components/MangaCard';
import { AnimeModal } from '@/components/AnimeModal';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, BookOpen, Users, Grid3x3, List, SortAsc } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { applySeasonalTheme } from '@/lib/seasonalTheme';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type') || '';
  
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [mangaResults, setMangaResults] = useState<Manga[]>([]);
  const [characterResults, setCharacterResults] = useState<Character[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('anime');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [filters, setFilters] = useState<MangaFilters>({
    contentRating: ['safe', 'suggestive'],
    order: { relevance: 'desc' },
  });

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();
  }, []);

  useEffect(() => {
    if (!query) return;
    
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const [anime, manga, characters] = await Promise.all([
          animeApi.searchAnime(query),
          mangadexApi.searchManga(query, filters),
          animeApi.searchCharacters(query),
        ]);
        
        setAnimeResults(anime);
        setMangaResults(manga);
        setCharacterResults(characters);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query, filters]);

  const handleFiltersChange = (newFilters: MangaFilters) => {
    setFilters(newFilters);
  };

  const handleMangaClick = (manga: Manga) => {
    navigate(`/manga/${manga.id}`);
  };

  const handleCharacterClick = (character: Character) => {
    // Could navigate to character detail page
    console.log('Character clicked:', character);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Search Bar */}
      <div className="sticky top-16 z-40 glass border-b border-border/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <SearchBar />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Info */}
        <div className="mb-10 animate-fade-in">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 gradient-text">Search Results</h1>
            <p className="text-lg text-muted-foreground">
              Showing results for: <span className="font-semibold text-foreground px-2 py-1 bg-primary/10 rounded-lg">"{query}"</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <Tv className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{animeResults.length} Anime</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">{mangaResults.length} Manga</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{characterResults.length} Characters</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
            
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <SearchFilters onFiltersChange={handleFiltersChange} currentFilters={filters} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-secondary/50 backdrop-blur-sm h-auto">
            <TabsTrigger value="anime" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
              <Tv className="h-4 w-4" />
              <span className="hidden sm:inline">Anime</span> ({animeResults.length})
            </TabsTrigger>
            <TabsTrigger value="manga" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Manga</span> ({mangaResults.length})
            </TabsTrigger>
            <TabsTrigger value="characters" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Characters</span> ({characterResults.length})
            </TabsTrigger>
          </TabsList>

          {/* Anime Tab */}
          <TabsContent value="anime">
            {isLoading ? (
              <LoadingGrid count={12} type="card" />
            ) : animeResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {animeResults.map((anime) => (
                  <AnimeCard
                    key={anime.mal_id}
                    anime={anime}
                    onClick={() => setSelectedAnime(anime)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Tv className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No anime found for "{query}"</p>
              </div>
            )}
          </TabsContent>

          {/* Manga Tab */}
          <TabsContent value="manga">
            {isLoading ? (
              <LoadingGrid count={12} type="card" />
            ) : mangaResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {mangaResults.map((manga) => (
                  <MangaCard
                    key={manga.id}
                    manga={manga}
                    onClick={() => handleMangaClick(manga)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No manga found for "{query}"</p>
              </div>
            )}
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters">
            {isLoading ? (
              <LoadingGrid count={10} type="character" />
            ) : characterResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {character.name}
                      </h3>
                      {character.favorites && (
                        <p className="text-xs text-muted-foreground">
                          ❤️ {character.favorites.toLocaleString()} favorites
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No characters found for "{query}"</p>
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
