import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MangaChapterImages } from '@/types/manga';
import { mangadexApi } from '@/services/mangadexApi';
import { ContentWarning } from '@/components/ContentWarning';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Maximize2, BookMarked } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { applySeasonalTheme } from '@/lib/seasonalTheme';

const MangaReader = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  
  const [images, setImages] = useState<MangaChapterImages | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageQuality, setImageQuality] = useState<'data' | 'dataSaver'>('data');
  const [readingMode, setReadingMode] = useState<'single' | 'continuous'>('continuous');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [contentRating, setContentRating] = useState<string>('');

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();
  }, []);

  useEffect(() => {
    if (!chapterId) return;

    const loadChapter = async () => {
      setIsLoading(true);
      try {
        const chapterImages = await mangadexApi.getChapterImages(chapterId);
        setImages(chapterImages);
        
        // Warning is shown on manga detail page, so accept by default here
        setWarningAccepted(true);
        
        // Load saved progress
        const saved = localStorage.getItem(`chapter_progress_${chapterId}`);
        if (saved) {
          setCurrentPage(parseInt(saved, 10));
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChapter();
  }, [chapterId]);

  // Save reading progress
  useEffect(() => {
    if (chapterId && currentPage > 0) {
      localStorage.setItem(`chapter_progress_${chapterId}`, currentPage.toString());
    }
  }, [chapterId, currentPage]);

  const getImageUrl = (index: number) => {
    if (!images) return '';
    const imageArray = imageQuality === 'data' ? images.chapter.data : images.chapter.dataSaver;
    const fileName = imageArray[index];
    return `${images.baseUrl}/${imageQuality}/${images.chapter.hash}/${fileName}`;
  };

  const goToNextPage = useCallback(() => {
    if (images && currentPage < images.chapter.data.length - 1) {
      setCurrentPage(prev => prev + 1);
      if (readingMode === 'single') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [images, currentPage, readingMode]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      if (readingMode === 'single') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentPage, readingMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Failed to load chapter</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = images.chapter.data.length;

  return (
    <div className="min-h-screen bg-black">
      {/* Reader Controls */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-white text-sm">
              Page {currentPage + 1} / {totalPages}
            </span>

            <Select value={imageQuality} onValueChange={(value: 'data' | 'dataSaver') => setImageQuality(value)}>
              <SelectTrigger className="w-[140px] bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data">High Quality</SelectItem>
                <SelectItem value="dataSaver">Data Saver</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white/80"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white/80"
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Content - Continuous Scroll */}
      <div className="pt-16 pb-20" style={{ scrollSnapType: 'y mandatory', overflowY: 'scroll', height: '100vh' }}>
        {readingMode === 'continuous' ? (
          <div className="max-w-4xl mx-auto px-4 py-8">
            {Array.from({ length: totalPages }).map((_, index) => (
              <div 
                key={index} 
                id={`page-${index}`}
                className="relative mb-2"
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-10">
                  {index + 1} / {totalPages}
                </div>
                <img
                  src={getImageUrl(index)}
                  alt={`Page ${index + 1}`}
                  className="w-full h-auto"
                  style={{ transform: `scale(${zoom / 100})` }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <img
              src={getImageUrl(currentPage)}
              alt={`Page ${currentPage + 1}`}
              className="w-full h-auto"
              style={{ transform: `scale(${zoom / 100})` }}
              loading="lazy"
            />
            {/* Navigation Buttons for Single Page Mode */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              <Button
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Page Thumbnails */}
      <div className="fixed right-4 top-20 bottom-4 w-24 hidden lg:block">
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentPage(index);
                  const pageElement = document.getElementById(`page-${index}`);
                  if (pageElement) {
                    pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`w-full aspect-[2/3] rounded overflow-hidden border-2 transition-all ${
                  currentPage === index
                    ? 'border-primary scale-105'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <img
                  src={getImageUrl(index)}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MangaReader;
