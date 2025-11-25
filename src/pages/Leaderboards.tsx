import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anime } from '@/types/anime';
import { Manga, Character } from '@/types/manga';
import { animeApi } from '@/services/animeApi';
import { mangadexApi } from '@/services/mangadexApi';
import { Navigation } from '@/components/Navigation';
import { AnimeCard } from '@/components/AnimeCard';
import { MangaCard } from '@/components/MangaCard';
import { AnimeModal } from '@/components/AnimeModal';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Tv, BookOpen, Users, Medal, Award } from 'lucide-react';
import { applySeasonalTheme, getSeasonIcon } from '@/lib/seasonalTheme';

const Leaderboards = () => {
  const navigate = useNavigate();
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [topManga, setTopManga] = useState<Manga[]>([]);
  const [topCharacters, setTopCharacters] = useState<Character[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isLoadingAnime, setIsLoadingAnime] = useState(true);
  const [isLoadingManga, setIsLoadingManga] = useState(true);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();

    const loadAnime = async () => {
      setIsLoadingAnime(true);
      try {
        // Match home page: page 1, 24 items (or 50 for leaderboards)
        const anime = await animeApi.getTopAnime(1, 50);
        console.log('Loaded top anime:', anime.length, anime);
        setTopAnime(anime);
      } catch (error) {
        console.error('Error loading top anime:', error);
      } finally {
        setIsLoadingAnime(false);
      }
    };

    const loadManga = async () => {
      setIsLoadingManga(true);
      try {
        // Match home page manga loading
        const manga = await mangadexApi.searchManga('', { 
          order: { rating: 'desc' },
          contentRating: ['safe', 'suggestive']
        }, 50, 0);
        console.log('Loaded top manga:', manga.length, manga);
        setTopManga(manga);
      } catch (error) {
        console.error('Error loading top manga:', error);
      } finally {
        setIsLoadingManga(false);
      }
    };

    const loadCharacters = async () => {
      setIsLoadingCharacters(true);
      try {
        // Use page 1, 50 characters
        const characters = await animeApi.getTopCharacters(1, 50);
        console.log('Loaded top characters:', characters.length, characters);
        setTopCharacters(characters);
      } catch (error) {
        console.error('Error loading top characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    loadAnime();
    loadManga();
    loadCharacters();
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-12 w-12 text-primary" />
            <h1 className="text-5xl md:text-6xl font-bold gradient-text">
              {getSeasonIcon()} Leaderboards
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Top rated anime, manga, and characters
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="anime" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-secondary/50 backdrop-blur-sm h-auto">
            <TabsTrigger
              value="anime"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Tv className="h-4 w-4" />
              <span className="hidden sm:inline">Top Anime</span>
            </TabsTrigger>
            <TabsTrigger
              value="manga"
              className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-3"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Top Manga</span>
            </TabsTrigger>
            <TabsTrigger
              value="characters"
              className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground py-3"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Top Characters</span>
            </TabsTrigger>
          </TabsList>

          {/* Anime Tab */}
          <TabsContent value="anime">
            {isLoadingAnime ? (
              <LoadingGrid count={50} type="card" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {topAnime.map((anime, index) => (
                  <div key={anime.mal_id} className="relative">
                    <div className="absolute -top-3 -left-3 z-10 bg-card border-2 border-primary rounded-full p-2 shadow-lg">
                      {getRankIcon(index)}
                    </div>
                    <AnimeCard anime={anime} onClick={() => setSelectedAnime(anime)} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Manga Tab */}
          <TabsContent value="manga">
            {isLoadingManga ? (
              <LoadingGrid count={50} type="card" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {topManga.map((manga, index) => (
                  <div key={manga.id} className="relative">
                    <div className="absolute -top-3 -left-3 z-10 bg-card border-2 border-accent rounded-full p-2 shadow-lg">
                      {getRankIcon(index)}
                    </div>
                    <MangaCard
                      manga={manga}
                      onClick={() => navigate(`/manga/${manga.id}`, { state: { from: '/leaderboards' } })}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters">
            {isLoadingCharacters ? (
              <LoadingGrid count={50} type="character" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {topCharacters.map((character, index) => (
                  <Card
                    key={character.mal_id}
                    className="group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:scale-105 relative"
                  >
                    <div className="absolute top-2 left-2 z-10 bg-card border-2 border-secondary rounded-full p-1.5 shadow-lg">
                      {getRankIcon(index)}
                    </div>
                    <div className="aspect-[3/4] relative overflow-hidden">
                      <img
                        src={character.images.jpg.image_url}
                        alt={character.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {character.name}
                      </h3>
                      {character.favorites && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {character.favorites.toLocaleString()} favorites
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedAnime && (
        <AnimeModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
};

export default Leaderboards;
