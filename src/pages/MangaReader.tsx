import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MangaChapterImages, MangaChapter } from '@/types/manga';
import { mangadexApi } from '@/services/mangadexApi';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Maximize2, Bookmark, BookOpen, List, Grid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { applySeasonalTheme } from '@/lib/seasonalTheme';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

type ReadingMode = 'single' | 'continuous' | 'webtoon';
type Direction = 'ltr' | 'rtl';

const POLLING_INTERVAL = 30000; // 30 seconds

const MangaReader = () => {
  const { chapterId, mangaId } = useParams<{ chapterId: string; mangaId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  
  const [images, setImages] = useState<MangaChapterImages | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [imageQuality, setImageQuality] = useState<'data' | 'dataSaver'>('data');
  const [readingMode, setReadingMode] = useState<ReadingMode>('webtoon');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [lastReadPage, setLastReadPage] = useState(0);

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
      setLastReadPage(pageToSet);
      
      // Store last read chapter
      if (mangaId) {
        localStorage.setItem(`last_read_${mangaId}`, id);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast.error('Failed to load chapter');
    } finally {
      setIsLoading(false);
    }
  }, [mangaId]);
  
  // Load available chapters
  const loadChapters = useCallback(async () => {
    if (!mangaId) return;
    
    setIsLoadingChapters(true);
    try {
      const chapters = await mangadexApi.getMangaChapters(mangaId, 100, 0);
      setChapters(chapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setIsLoadingChapters(false);
    }
  }, [mangaId]);

  // Setup intersection observer for scroll detection
  useEffect(() => {
    if (readingMode !== 'webtoon' || !images) return;
    
    const options = {
      root: scrollContainerRef.current,
      rootMargin: '0px',
      threshold: 0.5
    };
    
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageIndex = parseInt(entry.target.getAttribute('data-page-index') || '0', 10);
          if (!isNaN(pageIndex)) {
            setCurrentPage(pageIndex);
            setLastReadPage(prev => Math.max(prev, pageIndex));
            localStorage.setItem(`chapter_progress_${chapterId}`, pageIndex.toString());
          }
        }
      });
    };
    
    observerRef.current = new IntersectionObserver(handleIntersect, options);
    
    // Observe all page elements
    pageRefs.current.forEach(ref => {
      if (ref) observerRef.current?.observe(ref);
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [readingMode, images, chapterId]);
  
  // Setup polling for chapter updates
  useEffect(() => {
    if (!chapterId) return;
    
    const checkForUpdates = async () => {
      try {
        const updatedImages = await mangadexApi.getChapterImages(chapterId);
        if (updatedImages && images) {
          // Use dataSaver for comparison to match the original behavior
          if (updatedImages.chapter.dataSaver.length > images.chapter.dataSaver.length) {
            const newImages = await mangadexApi.getChapterImages(chapterId);
            if (newImages) {
              setImages(newImages);
              toast.info('New pages have been added to this chapter!');
            }
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };
    
    // Initial check
    checkForUpdates();
    
    // Setup polling
    pollIntervalRef.current = setInterval(checkForUpdates, POLLING_INTERVAL);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [chapterId, images, imageQuality]);
  
  // Initial load
  useEffect(() => {
    applySeasonalTheme();
    
    if (chapterId) {
      loadChapter(chapterId);
    }
    
    if (mangaId) {
      loadChapters();
    }
    
    // Check for initial view mode from URL
    const viewMode = searchParams.get('view');
    if (viewMode === 'single' || viewMode === 'continuous' || viewMode === 'webtoon') {
      setReadingMode(viewMode);
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [chapterId, mangaId, searchParams, loadChapter, loadChapters]);

  // Update page refs array when images change
  useEffect(() => {
    if (images) {
      pageRefs.current = pageRefs.current.slice(0, images.chapter.data.length);
    }
  }, [images]);

  // Scroll to current page when it changes
  useEffect(() => {
    if (readingMode === 'single' && pageRefs.current[currentPage]) {
      pageRefs.current[currentPage]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentPage, readingMode]);

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
    setLastReadPage(prev => Math.max(prev, newPage));
    
    if (chapterId) {
      localStorage.setItem(`chapter_progress_${chapterId}`, newPage.toString());
    }
    
    if (readingMode === 'single' && pageRefs.current[newPage]) {
      pageRefs.current[newPage]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [images, chapterId, readingMode]);

  const goToNextPage = useCallback(() => {
    if (images && currentPage < images.chapter.data.length - 1) {
      goToPage(currentPage + 1);
    } else if (chapters.length > 0 && chapterId) {
      // Go to next chapter if available
      const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
      if (currentIndex > 0) {
        const prevChapter = chapters[currentIndex - 1];
        navigate(`/manga/read/${mangaId}/${prevChapter.id}?view=${readingMode}`, { replace: true });
      }
    }
  }, [images, currentPage, chapterId, chapters, navigate, mangaId, readingMode, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    } else if (chapters.length > 0 && chapterId) {
      // Go to previous chapter if available
      const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
      if (currentIndex < chapters.length - 1) {
        const nextChapter = chapters[currentIndex + 1];
        navigate(`/manga/read/${mangaId}/${nextChapter.id}?view=${readingMode}`, { replace: true });
      }
    }
  }, [currentPage, chapterId, chapters, navigate, mangaId, readingMode, goToPage]);
  
  // Keyboard shortcuts
  useHotkeys('right, l', () => {
    if (direction === 'ltr') goToNextPage();
    else goToPreviousPage();
  }, { enabled: !isLoading }, [goToNextPage, goToPreviousPage, direction]);
  
  useHotkeys('left, h', () => {
    if (direction === 'ltr') goToPreviousPage();
    else goToNextPage();
  }, { enabled: !isLoading }, [goToNextPage, goToPreviousPage, direction]);
  
  useHotkeys('space, j', (e) => {
    e.preventDefault();
    if (readingMode === 'webtoon') {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    } else {
      goToNextPage();
    }
  }, { enabled: !isLoading }, [goToNextPage, readingMode]);
  
  useHotkeys('shift+space, k', (e) => {
    e.preventDefault();
    if (readingMode === 'webtoon') {
      window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
    } else {
      goToPreviousPage();
    }
  }, { enabled: !isLoading }, [goToPreviousPage, readingMode]);
  
  useHotkeys('f', () => toggleFullscreen(), { enabled: !isLoading });
  useHotkeys('t', () => setShowThumbnails(prev => !prev), { enabled: !isLoading });
  useHotkeys('c', () => setShowChapters(prev => !prev), { enabled: !isLoading });

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  const handleChapterSelect = (chapterId: string) => {
    navigate(`/manga/read/${mangaId}/${chapterId}?view=${readingMode}`, { replace: true });
    setShowChapters(false);
  };
  
  const handleReadingModeChange = (mode: string) => {
    if (mode === 'single' || mode === 'continuous' || mode === 'webtoon') {
      setReadingMode(mode);
      navigate(`?view=${mode}`, { replace: true });
    }
  };
  
  const handleDirectionChange = (newDirection: string) => {
    if (newDirection === 'ltr' || newDirection === 'rtl') {
      setDirection(newDirection);
    }
  };
  
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };
  
  const handleThumbnailClick = (index: number) => {
    goToPage(index);
    if (window.innerWidth < 768) {
      setShowThumbnails(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') goToNextPage();
    if (e.key === 'ArrowLeft') goToPreviousPage();
  }, [goToNextPage, goToPreviousPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-foreground">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground text-lg">Failed to load chapter</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
            <Button onClick={() => chapterId && loadChapter(chapterId)} variant="default">
              <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = images?.chapter.data.length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-foreground/5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChapters(!showChapters)}
              className={`text-foreground hover:bg-foreground/5 ${showChapters ? 'bg-foreground/10' : ''}`}
            >
              <List className="h-4 w-4 mr-2" />
              Chapters
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`text-foreground hover:bg-foreground/5 ${showThumbnails ? 'bg-foreground/10' : ''} hidden md:flex`}
            >
              <Grid className="h-4 w-4 mr-2" />
              Pages
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {currentPage + 1} / {totalPages}
              </span>
              
              <Select 
                value={readingMode} 
                onValueChange={handleReadingModeChange}
              >
                <SelectTrigger className="w-[120px] text-sm">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webtoon">Webtoon</SelectItem>
                  <SelectItem value="single">Single Page</SelectItem>
                  <SelectItem value="continuous">Continuous</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={direction} 
                onValueChange={handleDirectionChange}
              >
                <SelectTrigger className="w-[100px] text-sm">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltr">Left to Right</SelectItem>
                  <SelectItem value="rtl">Right to Left</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={imageQuality} 
                onValueChange={(value: 'data' | 'dataSaver') => setImageQuality(value)}
              >
                <SelectTrigger className="w-[120px] text-sm">
                  <SelectValue placeholder="Quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">High Quality</SelectItem>
                  <SelectItem value="dataSaver">Data Saver</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setZoom(prev => Math.max(prev - 10, 50))}
                  disabled={zoom <= 50}
                  className="text-foreground hover:bg-foreground/5"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="w-24">
                  <Slider
                    value={[zoom]}
                    min={50}
                    max={200}
                    step={10}
                    onValueChange={handleZoomChange}
                    className="h-2"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
                  disabled={zoom >= 200}
                  className="text-foreground hover:bg-foreground/5"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-foreground hover:bg-foreground/5"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Controls */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              className="text-foreground hover:bg-foreground/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={!images || currentPage === totalPages - 1}
              className="text-foreground hover:bg-foreground/5"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select 
              value={imageQuality} 
              onValueChange={(value: 'data' | 'dataSaver') => setImageQuality(value)}
            >
              <SelectTrigger className="w-[100px] text-sm h-8">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data">High Quality</SelectItem>
                <SelectItem value="dataSaver">Data Saver</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-foreground hover:bg-foreground/5 h-8 w-8"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-4 overflow-hidden relative">
        {/* Chapters Sidebar */}
        {showChapters && (
          <div className="fixed left-0 top-16 bottom-0 w-72 bg-background border-r border-border z-40 shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0"
               style={{ transform: showChapters ? 'translateX(0)' : 'translateX(-100%)' }}>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Chapters</h3>
            </div>
            <ScrollArea className="h-[calc(100%-56px)]">
              <div className="divide-y divide-border">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterSelect(chapter.id)}
                    className={`w-full text-left p-3 hover:bg-foreground/5 transition-colors ${
                      chapter.id === chapterId ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">
                        {chapter.title || `Chapter ${chapter.chapter}`}
                      </span>
                      {chapter.id === chapterId && (
                        <BookOpen className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {chapter.scanlationGroup && (
                        <span className="block truncate">{chapter.scanlationGroup}</span>
                      )}
                      {chapter.publishAt && (
                        <span className="block">
                          {new Date(chapter.publishAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Page Thumbnails */}
        {showThumbnails && (
          <div className="fixed right-0 top-16 bottom-0 w-24 bg-background border-l border-border z-40 shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0"
               style={{ transform: showThumbnails ? 'translateX(0)' : 'translateX(100%)' }}>
            <div className="p-2 border-b border-border">
              <h3 className="font-semibold text-sm text-center text-foreground">Pages</h3>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <div className="space-y-2 p-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`w-full aspect-[2/3] rounded overflow-hidden border-2 transition-all ${
                      currentPage === index
                        ? 'border-primary scale-105'
                        : index <= lastReadPage
                        ? 'border-foreground/20 hover:border-foreground/40'
                        : 'border-muted/20 hover:border-muted/40 opacity-70'
                    }`}
                  >
                    <img
                      src={getImageUrl(index)}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                      <span className="text-white text-xs font-medium">{index + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Reader Content */}
        <div 
          ref={scrollContainerRef}
          className={`h-full overflow-y-auto ${
            readingMode === 'webtoon' ? 'scroll-smooth' : ''
          }`}
          style={{
            marginLeft: showChapters ? '18rem' : '0',
            marginRight: showThumbnails ? '6rem' : '0',
            transition: 'margin 0.3s ease-in-out'
          }}
        >
          {readingMode === 'webtoon' ? (
            // Webtoon Mode (Vertical Scroll)
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-1">
              {Array.from({ length: totalPages }).map((_, index) => (
                <div 
                  key={index} 
                  ref={el => pageRefs.current[index] = el}
                  data-page-index={index}
                  className="relative"
                >
                  <img
                    src={getImageUrl(index)}
                    alt={`Page ${index + 1}`}
                    className={`w-full h-auto ${index < currentPage - 1 || index > currentPage + 1 ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                    loading={index < 3 ? 'eager' : 'lazy'}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto',
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top center'
                    }}
                  />
                  {index === currentPage && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border shadow-lg">
                      <span className="text-sm font-medium text-foreground">
                        Page {index + 1} / {totalPages}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : readingMode === 'single' ? (
            // Single Page Mode
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
              <div className="relative max-w-4xl w-full"
                   style={{
                     transform: `scale(${zoom / 100})`,
                     transformOrigin: 'center',
                     transition: 'transform 0.2s ease-in-out'
                   }}>
                <img
                  ref={el => pageRefs.current[currentPage] = el}
                  src={getImageUrl(currentPage)}
                  alt={`Page ${currentPage + 1}`}
                  className="w-full h-auto mx-auto shadow-lg rounded"
                  loading="eager"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border shadow-lg">
                  <span className="text-sm font-medium text-foreground">
                    Page {currentPage + 1} / {totalPages}
                  </span>
                </div>
              </div>
              
              {/* Navigation Overlay */}
              <div className="fixed inset-0 flex items-center justify-between px-4 pointer-events-none">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className={`p-8 pointer-events-auto ${
                    currentPage === 0 ? 'opacity-0' : 'opacity-100'
                  } transition-opacity duration-200`}
                >
                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
                    <ChevronLeft className="h-6 w-6 text-foreground" />
                  </div>
                </button>
                
                <button
                  onClick={goToNextPage}
                  disabled={!images || currentPage === totalPages - 1}
                  className={`p-8 pointer-events-auto ${
                    !images || currentPage === totalPages - 1 ? 'opacity-0' : 'opacity-100'
                  } transition-opacity duration-200`}
                >
                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
                    <ChevronRight className="h-6 w-6 text-foreground" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            // Continuous Scroll Mode
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-1">
              {Array.from({ length: totalPages }).map((_, index) => (
                <div 
                  key={index} 
                  ref={el => pageRefs.current[index] = el}
                  data-page-index={index}
                  className="relative flex justify-center mb-2"
                  style={{
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div className="relative">
                    <img
                      src={getImageUrl(index)}
                      alt={`Page ${index + 1}`}
                      className="max-w-full h-auto mx-auto shadow-lg rounded"
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center',
                        transition: 'transform 0.2s ease-in-out'
                      }}
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border shadow-lg">
                      <span className="text-sm font-medium text-foreground">
                        Page {index + 1} / {totalPages}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MangaReader;