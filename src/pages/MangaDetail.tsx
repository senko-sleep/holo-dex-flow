import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Manga, MangaChapter } from '@/types/manga';
import { mangadexApi } from '@/services/mangadexApi';
import { ContentWarning } from '@/components/ContentWarning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Calendar, User, Loader2 } from 'lucide-react';
import { applySeasonalTheme } from '@/lib/seasonalTheme';

const MangaDetail = () => {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);

  useEffect(() => {
    // Apply seasonal theme
    applySeasonalTheme();
  }, []);

  useEffect(() => {
    if (!mangaId) return;

    const loadMangaDetails = async () => {
      setIsLoading(true);
      try {
        const [mangaData, chaptersData] = await Promise.all([
          mangadexApi.getMangaById(mangaId),
          mangadexApi.getMangaChapters(mangaId),
        ]);
        
        setManga(mangaData);
        setChapters(chaptersData);

        // Check if content warning is needed
        const warningDismissed = localStorage.getItem('content_warning_accepted') === 'true';
        const isMature = mangaData.contentRating && 
          (mangaData.contentRating.toLowerCase().includes('erotica') ||
           mangaData.contentRating.toLowerCase().includes('pornographic') ||
           mangaData.contentRating.toLowerCase().includes('suggestive'));
        
        if (isMature && !warningDismissed) {
          setShowWarning(true);
        } else {
          setWarningAccepted(true);
        }
      } catch (error) {
        console.error('Error loading manga details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMangaDetails();
  }, [mangaId]);

  const handleChapterClick = (chapterId: string) => {
    // Store manga ID for the chapter so we can navigate back and between chapters
    if (mangaId) {
      localStorage.setItem(`chapter_manga_${chapterId}`, mangaId);
      navigate(`/reader/${chapterId}?mangaId=${mangaId}`);
    } else {
      navigate(`/reader/${chapterId}`);
    }
  };

  const handleWarningAccept = () => {
    setShowWarning(false);
    setWarningAccepted(true);
  };

  const handleWarningDecline = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading manga...</p>
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Manga not found</p>
          <Button onClick={() => navigate('/manga')}>Back to Search</Button>
        </div>
      </div>
    );
  }

  // Show content warning if needed
  if (showWarning && manga.contentRating) {
    return (
      <ContentWarning
        contentType="manga"
        rating={manga.contentRating}
        onAccept={handleWarningAccept}
        onDecline={handleWarningDecline}
      />
    );
  }

  // Don't show content until warning is accepted
  if (!warningAccepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero py-6 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80"
            onClick={() => navigate('/manga')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-[300px,1fr] gap-8">
          {/* Cover and Info */}
          <div>
            <div className="relative bg-secondary/20 rounded-xl overflow-hidden mb-4">
              <img
                src={manga.coverUrl || '/placeholder.svg'}
                alt={manga.title}
                className="w-full rounded-xl shadow-2xl"
                loading="eager"
              />
            </div>
            <div className="space-y-3">
              {manga.status && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Status: <Badge variant="secondary" className="capitalize">{manga.status}</Badge>
                  </span>
                </div>
              )}
              {manga.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Year: {manga.year}</span>
                </div>
              )}
              {manga.author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Author: {manga.author}</span>
                </div>
              )}
              {manga.artist && manga.artist !== manga.author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Artist: {manga.artist}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details and Chapters */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-4">{manga.title}</h1>
              
              {manga.tags && manga.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {manga.tags.slice(0, 10).map(tag => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {manga.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground">{manga.description}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Chapters List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Chapters ({chapters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chapters.length > 0 ? (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-2">
                      {chapters.map((chapter) => (
                        <Button
                          key={chapter.id}
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-4"
                          onClick={() => handleChapterClick(chapter.id)}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-semibold">
                              Chapter {chapter.chapter}
                              {chapter.title && `: ${chapter.title}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {chapter.scanlationGroup} • {chapter.pages} pages
                              {chapter.publishAt && (
                                <> • {new Date(chapter.publishAt).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chapters available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MangaDetail;
