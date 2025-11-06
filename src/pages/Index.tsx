import { useEffect, useState } from 'react';
import { Anime } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { SearchBar } from '@/components/SearchBar';
import { AnimeCard } from '@/components/AnimeCard';
import { AnimeModal } from '@/components/AnimeModal';
import { Sparkles, TrendingUp } from 'lucide-react';

const Index = () => {
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnime = async () => {
      setIsLoading(true);
      try {
        const [top, seasonal] = await Promise.all([
          animeApi.getTopAnime(1, 24),
          animeApi.getCurrentSeasonAnime(),
        ]);
        setTopAnime(top);
        setSeasonalAnime(seasonal);
      } catch (error) {
        console.error('Error loading anime:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnime();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-hero py-16 px-4 mb-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] animate-pulse"></div>
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white animate-fade-in">
            AnimeDex<span className="text-accent">+</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 animate-slide-up">
            Discover, explore, and enjoy the world of anime
          </p>
          <SearchBar onAnimeSelect={setSelectedAnime} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-12">
        {/* Current Season */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Current Season</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {seasonalAnime.map((anime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => setSelectedAnime(anime)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Top Rated */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Top Rated Anime</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {topAnime.map((anime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => setSelectedAnime(anime)}
                />
              ))}
            </div>
          )}
        </section>
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

export default Index;
