import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MangaChapterImages, MangaChapter } from '@/types/manga';
import { mangadexApi } from '@/services/mangadexApi';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { applySeasonalTheme } from '@/lib/seasonalTheme';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

const MangaReader = () => {
  const { chapterId, mangaId } = useParams<{ chapterId: string; mangaId?: string }>();
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
    
    try {
      const chapters = await mangadexApi.getMangaChapters(mangaId, 100, 0);
      setChapters(chapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, [mangaId]);

  useEffect(() => {
    applySeasonalTheme();
    
    if (chapterId) {
      loadChapter(chapterId);
    }
    
    if (mangaId) {
      loadChapters();
    }
  }, [chapterId, mangaId, loadChapter, loadChapters]);

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
        navigate(`/manga/read/${mangaId}/${nextChapter.id}`);
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
        navigate(`/manga/read/${mangaId}/${prevChapter.id}`);
      }
    }
  }, [currentPage, chapterId, chapters, navigate, mangaId, goToPage]);
  
  // Keyboard shortcuts
  useHotkeys('right, d', goToNextPage, { enabled: !isLoading });
  useHotkeys('left, a', goToPreviousPage, { enabled: !isLoading });
  useHotkeys('s', () => setShowSettings(prev => !prev), { enabled: !isLoading });

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

  const handleChapterSelect = (chapterId: string) => {
    navigate(`/manga/read/${mangaId}/${chapterId}`);
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
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
            <Button onClick={() => chapterId && loadChapter(chapterId)} variant="default">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = images?.chapter.data.length || 0;
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
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
                  <SelectTrigger className="bg-white/10 text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data">High Quality</SelectItem>
                    <SelectItem value="dataSaver">Data Saver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-xs">Fit Mode</label>
                <Select 
                  value={fitMode} 
                  onValueChange={(value: 'width' | 'height' | 'both') => setFitMode(value)}
                >
                  <SelectTrigger className="bg-white/10 text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Fit Screen</SelectItem>
                    <SelectItem value="width">Fit Width</SelectItem>
                    <SelectItem value="height">Fit Height</SelectItem>
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
                    <SelectTrigger className="bg-white/10 text-white border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
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

      {/* Main Reader Area - Click Zones */}
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
