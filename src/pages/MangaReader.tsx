import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MangaChapterImages, MangaChapter, Manga } from '@/types/manga';
import { mangadexApi } from '@/services/mangadexApi';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Settings, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { applySeasonalTheme } from '@/lib/seasonalTheme';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

const MangaReader = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [images, setImages] = useState<MangaChapterImages | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageQuality, setImageQuality] = useState<'data' | 'dataSaver'>('data');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [fitMode, setFitMode] = useState<'width' | 'height' | 'both'>('both');
  const [readingMode, setReadingMode] = useState<'paged' | 'scroll'>('paged');
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [mangaDetails, setMangaDetails] = useState<Manga | null>(null);

  // Load chapter data
  const loadChapter = useCallback(async (id: string) => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const chapterImages = await mangadexApi.getChapterImages(id);
      if (!chapterImages) {
        throw new Error('Failed to load chapter images');
      }
      
      setImages(chapterImages);
      
      // Load saved progress
      const savedPage = localStorage.getItem(`chapter_progress_${id}`);
      const pageToSet = savedPage ? Math.min(parseInt(savedPage, 10), chapterImages.chapter.data.length - 1) : 0;
      setCurrentPage(pageToSet);
      
      // Try to get mangaId from localStorage if not in URL
      const storedMangaId = localStorage.getItem(`chapter_manga_${id}`);
      if (storedMangaId) {
        setMangaId(storedMangaId);
        localStorage.setItem(`last_read_${storedMangaId}`, id);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast.error('Failed to load chapter');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load available chapters and manga details
  const loadChapters = useCallback(async () => {
    if (!mangaId) return;
    
    try {
      const [chapters, details] = await Promise.all([
        mangadexApi.getMangaChapters(mangaId, 100, 0),
        mangadexApi.getMangaById(mangaId)
      ]);
      setChapters(chapters);
      setMangaDetails(details);
      
      // Auto-detect webtoon format
      if (details) {
        const isWebtoon = detectWebtoon(details);
        if (isWebtoon) {
          setReadingMode('scroll');
          console.log('📱 Webtoon detected - switching to infinite scroll mode');
          toast.success('Webtoon detected! Switched to infinite scroll mode', {
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, [mangaId]);
  
  // Detect if manga is a webtoon
  const detectWebtoon = (manga: Manga): boolean => {
    // Check format field
    if (manga.format?.toLowerCase().includes('webtoon')) return true;
    
    // Check tags for webtoon indicators
    const webtoonTags = manga.tags?.some(tag => {
      const tagName = tag.name.toLowerCase();
      return tagName.includes('webtoon') ||
             tagName.includes('long strip') ||
             tagName.includes('vertical scroll') ||
             tagName.includes('full color') ||
             tagName.includes('long strip format');
    });
    if (webtoonTags) return true;
    
    // Check country of origin (Korean manhwa are typically webtoons)
    if (manga.countryOfOrigin === 'KR') return true;
    if (manga.countryOfOrigin === 'CN') return true; // Chinese manhua often webtoons too
    
    // Check title for common webtoon indicators
    const title = manga.title.toLowerCase();
    if (title.includes('manhwa') || 
        title.includes('manhua') ||
        title.includes('[webtoon]') ||
        title.includes('(webtoon)')) return true;
    
    // Check genres for webtoon-specific genres
    const webtoonGenres = manga.genres?.some(genre => {
      const genreName = genre.toLowerCase();
      return genreName.includes('webtoon');
    });
    if (webtoonGenres) return true;
    
    return false;
  };

  useEffect(() => {
    applySeasonalTheme();
    
    // Get mangaId from URL params if available
    const urlMangaId = searchParams.get('mangaId');
    if (urlMangaId) {
      setMangaId(urlMangaId);
    }
    
    if (chapterId) {
      loadChapter(chapterId);
    }
  }, [chapterId, searchParams, loadChapter]);

  useEffect(() => {
    if (mangaId) {
      loadChapters();
    }
  }, [mangaId, loadChapters]);

  const getImageUrl = useCallback((index: number) => {
    if (!images) return '';
    const imageArray = imageQuality === 'data' ? images.chapter.data : images.chapter.dataSaver;
    const fileName = imageArray[index];
    return `${images.baseUrl}/${imageQuality}/${images.chapter.hash}/${fileName}`;
  }, [images, imageQuality]);

  const goToPage = useCallback((page: number) => {
    if (!images) return;
    const newPage = Math.max(0, Math.min(page, images.chapter.data.length - 1));
    setCurrentPage(newPage);
    
    if (chapterId) {
      localStorage.setItem(`chapter_progress_${chapterId}`, newPage.toString());
    }
  }, [images, chapterId]);

  const goToNextPage = useCallback(() => {
    if (images && currentPage < images.chapter.data.length - 1) {
      goToPage(currentPage + 1);
    } else if (chapters.length > 0 && chapterId) {
      const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
      if (currentIndex > 0) {
        const nextChapter = chapters[currentIndex - 1];
        const url = mangaId ? `/reader/${nextChapter.id}?mangaId=${mangaId}` : `/reader/${nextChapter.id}`;
        navigate(url);
      }
    }
  }, [images, currentPage, chapterId, chapters, navigate, mangaId, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    } else if (chapters.length > 0 && chapterId) {
      const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
      if (currentIndex < chapters.length - 1) {
        const prevChapter = chapters[currentIndex + 1];
        const url = mangaId ? `/reader/${prevChapter.id}?mangaId=${mangaId}` : `/reader/${prevChapter.id}`;
        navigate(url);
      }
    }
  }, [currentPage, chapterId, chapters, navigate, mangaId, goToPage]);
  
  const totalPages = images?.chapter.data.length || 0;

  // Handle back navigation
  const handleBackClick = useCallback(() => {
    if (mangaId) {
      navigate(`/manga/${mangaId}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/manga');
    }
  }, [mangaId, navigate]);

  // Keyboard shortcuts
  useHotkeys('right, d', goToNextPage, { enabled: !isLoading });
  useHotkeys('left, a', goToPreviousPage, { enabled: !isLoading });
  useHotkeys('s', () => setShowSettings(prev => !prev), { enabled: !isLoading });
  useHotkeys('escape', handleBackClick, { enabled: !isLoading });

  // Auto-hide controls
  useEffect(() => {
    const resetHideTimer = () => {
      setShowControls(true);
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    };

    const handleMouseMove = () => resetHideTimer();
    const handleClick = () => resetHideTimer();

    resetHideTimer();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Track scroll position in infinite scroll mode
  useEffect(() => {
    if (readingMode !== 'scroll') return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const currentPageIndex = Math.floor(scrollPosition / windowHeight);
      
      if (currentPageIndex !== currentPage && currentPageIndex >= 0 && currentPageIndex < totalPages) {
        setCurrentPage(currentPageIndex);
        if (chapterId) {
          localStorage.setItem(`chapter_progress_${chapterId}`, currentPageIndex.toString());
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [readingMode, currentPage, totalPages, chapterId]);

  const handleChapterSelect = (chapterId: string) => {
    const url = mangaId ? `/reader/${chapterId}?mangaId=${mangaId}` : `/reader/${chapterId}`;
    navigate(url);
    setShowSettings(false);
  };

  const handleClickZone = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // Left third goes previous, right third goes next, middle third does nothing
    if (clickX < width * 0.33) {
      goToPreviousPage();
    } else if (clickX > width * 0.66) {
      goToNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-white">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white text-lg">Failed to load chapter</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleBackClick} variant="outline">
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
            <Button onClick={() => chapterId && loadChapter(chapterId)} variant="default">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fitClass = 
    fitMode === 'width' ? 'max-w-full h-auto' :
    fitMode === 'height' ? 'w-auto max-h-screen' :
    'max-w-full max-h-screen';

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Top Bar */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="text-white hover:bg-white/10 hover:text-red-400 transition-colors"
              title="Close reader (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <span className="text-white text-sm">
              {currentPage + 1} / {totalPages}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-white/10 p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-white text-xs">Quality</label>
                <Select 
                  value={imageQuality} 
                  onValueChange={(value: 'data' | 'dataSaver') => setImageQuality(value)}
                >
                  <SelectTrigger className="bg-black text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20">
                    <SelectItem value="data" className="text-white hover:bg-white/10">High Quality</SelectItem>
                    <SelectItem value="dataSaver" className="text-white hover:bg-white/10">Data Saver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-xs">Reading Mode</label>
                <Select 
                  value={readingMode} 
                  onValueChange={(value: 'paged' | 'scroll') => setReadingMode(value)}
                >
                  <SelectTrigger className="bg-black text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20">
                    <SelectItem value="paged" className="text-white hover:bg-white/10">Paged</SelectItem>
                    <SelectItem value="scroll" className="text-white hover:bg-white/10">Infinite Scroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-xs">Fit Mode</label>
                <Select 
                  value={fitMode} 
                  onValueChange={(value: 'width' | 'height' | 'both') => setFitMode(value)}
                >
                  <SelectTrigger className="bg-black text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20">
                    <SelectItem value="both" className="text-white hover:bg-white/10">Fit Screen</SelectItem>
                    <SelectItem value="width" className="text-white hover:bg-white/10">Fit Width</SelectItem>
                    <SelectItem value="height" className="text-white hover:bg-white/10">Fit Height</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {chapters.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <label className="text-white text-xs">Chapter</label>
                  <Select 
                    value={chapterId} 
                    onValueChange={handleChapterSelect}
                  >
                    <SelectTrigger className="bg-black text-white border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-black border-white/20">
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id} className="text-white hover:bg-white/10">
                          {chapter.title || `Chapter ${chapter.chapter}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Reader Area */}
      {readingMode === 'paged' ? (
        <div 
          ref={containerRef}
          className="flex items-center justify-center min-h-screen cursor-pointer"
          onClick={handleClickZone}
        >
          <img
            src={getImageUrl(currentPage)}
            alt={`Page ${currentPage + 1}`}
            className={`${fitClass} object-contain select-none`}
            draggable={false}
            loading="eager"
          />
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="flex flex-col items-center py-16 space-y-0"
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <img
              key={i}
              src={getImageUrl(i)}
              alt={`Page ${i + 1}`}
              className="w-full h-screen object-contain select-none"
              draggable={false}
              loading={i < 3 ? 'eager' : 'lazy'}
              style={{ minHeight: '100vh', maxHeight: '100vh' }}
            />
          ))}
        </div>
      )}

      {/* Page Counter (Bottom) */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-black/90 backdrop-blur-sm px-6 py-2 rounded-full border border-white/20">
          <span className="text-white text-sm font-medium">
            {currentPage + 1} / {totalPages}
          </span>
        </div>
      </div>

      {/* Navigation Hints */}
      <div 
        className={`fixed left-4 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none ${
          showControls && currentPage > 0 ? 'opacity-50' : 'opacity-0'
        }`}
      >
        <div className="text-white text-6xl">‹</div>
      </div>
      
      <div 
        className={`fixed right-4 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none ${
          showControls && currentPage < totalPages - 1 ? 'opacity-50' : 'opacity-0'
        }`}
      >
        <div className="text-white text-6xl">›</div>
      </div>
    </div>
  );
};

export default MangaReader;
