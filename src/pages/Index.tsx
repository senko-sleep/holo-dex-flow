import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anime } from '@/types/anime';
import { Manga } from '@/types/manga';
import { animeApi } from '@/services/animeApi';
import { mangadexApi } from '@/services/mangadexApi';
import { Navigation } from '@/components/Navigation';
import { FeaturedSlider } from '@/components/FeaturedSlider';
import { QuickAccess } from '@/components/QuickAccess';
import { AnimeCard } from '@/components/AnimeCard';
import { MangaCard } from '@/components/MangaCard';
import { AnimeModal } from '@/components/AnimeModal';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import { applySeasonalTheme, getSeasonIcon, getSeasonName, getThemeDescription } from '@/lib/seasonalTheme';
import { imageLoader } from '@/lib/progressiveLoader';

const Index = () => {
  const navigate = useNavigate();
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Anime[]>([]);
  const [featuredAnime, setFeaturedAnime] = useState<Anime[]>([]);
  const [hottestManga, setHottestManga] = useState<Manga[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isLoadingAnime, setIsLoadingAnime] = useState(true);
  const [isLoadingManga, setIsLoadingManga] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Get current season with year
  const getCurrentSeasonWithYear = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    
    let season = '';
    if (month >= 0 && month <= 2) season = 'Winter';
    else if (month >= 3 && month <= 5) season = 'Spring';
    else if (month >= 6 && month <= 8) season = 'Summer';
    else season = 'Fall';
    
    return `${season} ${year}`;
  };

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();

    const loadContent = async () => {
      const startTime = performance.now();
      
      try {
        // INSTANT: Load lightweight metadata first (no images)
        console.log('⚡ INSTANT: Loading metadata...');
        
        // Load anime and manga metadata in parallel
        const [animeResults, mangaResults] = await Promise.all([
          // Anime metadata (fast)
          Promise.all([
            animeApi.getTopAnime(1, 24),
            animeApi.getCurrentSeasonAnime(),
            animeApi.getTopAnime(1, 10),
          ]),
          // Manga metadata (fast)
          mangadexApi.searchManga('', { order: { followedCount: 'desc' } }, 24, 0),
        ]);
        
        const [top, seasonal, featured] = animeResults;
        const manga = mangaResults;
        
        // Show content INSTANTLY with placeholder images
        setTopAnime(top);
        setSeasonalAnime(seasonal);
        setFeaturedAnime(featured);
        setHottestManga(manga);
        setIsLoadingAnime(false);
        setIsLoadingManga(false);
        
        const metadataTime = performance.now() - startTime;
        console.log(`✅ INSTANT: Content visible in ${metadataTime.toFixed(0)}ms`);
        console.log(`   - Anime: ${top.length + seasonal.length + featured.length} items`);
        console.log(`   - Manga: ${manga.length} items`);
        
        // BACKGROUND: Progressively load images one at a time
        console.log('🖼️ BACKGROUND: Loading images progressively...');
        
        // Collect all image URLs
        const animeImages = [
          ...top.map(a => a.images.jpg.image_url),
          ...seasonal.map(a => a.images.jpg.image_url),
          ...featured.map(a => a.images.jpg.image_url),
        ].filter(Boolean);
        
        const mangaImages = manga
          .map(m => m.coverUrl)
          .filter(Boolean);
        
        const allImages = [...animeImages, ...mangaImages];
        let loaded = 0;
        
        // Load images progressively (3 at a time)
        imageLoader.setMaxConcurrent(3);
        
        allImages.forEach((url, index) => {
          imageLoader.enqueue(
            url,
            () => {
              loaded++;
              const progress = Math.round((loaded / allImages.length) * 100);
              setLoadingProgress(progress);
              
              if (loaded === allImages.length) {
                const totalTime = performance.now() - startTime;
                console.log(`✅ All images loaded in ${totalTime.toFixed(0)}ms`);
              }
            },
            allImages.length - index // Higher priority for visible images
          );
        });
        
      } catch (error) {
        console.error('Error loading content:', error);
        setIsLoadingAnime(false);
        setIsLoadingManga(false);
      }
    };

    loadContent();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle progress bar for image loading */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-secondary/20">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}
      
      <Navigation />
      
      {/* Featured Slider */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoadingAnime ? (
          <div className="w-full h-[500px] md:h-[600px] bg-secondary/20 rounded-2xl animate-pulse" />
        ) : (
          <FeaturedSlider items={featuredAnime} onItemClick={setSelectedAnime} />
        )}
      </div>

      {/* Quick Access */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <QuickAccess />
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Current Season */}
        <section className="mb-20 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold gradient-text">{getCurrentSeasonWithYear()}</h2>
              <p className="text-sm text-muted-foreground">Discover the hottest anime airing now</p>
              <p className="text-xs text-primary mt-1 font-medium">Theme: {getSeasonIcon()} {getSeasonName()} - {getThemeDescription()}</p>
            </div>
          </div>
          {isLoadingAnime ? (
            <LoadingGrid count={12} type="card" />
          ) : seasonalAnime && seasonalAnime.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {seasonalAnime.map((anime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => setSelectedAnime(anime)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No seasonal anime found. Please check your connection and try refreshing.</p>
            </div>
          )}
        </section>

        {/* Hottest Manga */}
        <section className="mb-20 animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-destructive/10 rounded-xl">
              <Flame className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Hottest Manga</h2>
              <p className="text-sm text-muted-foreground">Top rated manga you can't miss</p>
            </div>
          </div>
          {isLoadingManga ? (
            <LoadingGrid count={24} type="card" />
          ) : hottestManga && hottestManga.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {hottestManga.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  onClick={() => navigate(`/manga/${manga.id}`, { state: { from: '/' } })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No manga found. Please check your connection and try refreshing.</p>
            </div>
          )}
        </section>

        {/* Top Rated */}
        <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-accent/10 rounded-xl">
              <TrendingUp className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Top Rated Anime</h2>
              <p className="text-sm text-muted-foreground">The best anime ever created</p>
            </div>
          </div>
          {isLoadingAnime ? (
            <LoadingGrid count={24} type="card" />
          ) : topAnime && topAnime.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {topAnime.map((anime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => setSelectedAnime(anime)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No top anime found. Please check your connection and try refreshing.</p>
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
