import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface WatchSource {
  name: string;
  url: string;
  isFree: boolean;
  quality?: string;
  type: 'stream' | 'download' | 'torrent';
}

interface WatchAnimeProps {
  isOpen: boolean;
  onClose: () => void;
  animeTitle: string;
  malId?: number;
  anilistId?: number;
}

export const WatchAnime = ({ isOpen, onClose, animeTitle, malId, anilistId }: WatchAnimeProps) => {
  // This is a placeholder - in a real app, you would fetch this from an API
  const watchSources: WatchSource[] = [
    {
      name: 'GogoAnime',
      url: `https://gogoanime.sk//search.html?keyword=${encodeURIComponent(animeTitle)}`,
      isFree: true,
      type: 'stream'
    },
    {
      name: '9anime',
      url: `https://9anime.to/filter?keyword=${encodeURIComponent(animeTitle)}`,
      isFree: true,
      type: 'stream'
    },
    {
      name: 'Zoro',
      url: `https://zoro.to/search?keyword=${encodeURIComponent(animeTitle)}`,
      isFree: true,
      type: 'stream'
    },
    {
      name: 'AniWave',
      url: `https://aniwave.to/filter?keyword=${encodeURIComponent(animeTitle)}`,
      isFree: true,
      type: 'stream'
    },
    {
      name: 'AniWatch',
      url: `https://aniwatch.to/search?keyword=${encodeURIComponent(animeTitle)}`,
      isFree: true,
      type: 'stream'
    }
  ];

  const handleWatchClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Watch {animeTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            External streaming and download links for {animeTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select a streaming service to watch {animeTitle}. These are third-party services and may require an account.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {watchSources.map((source) => (
              <Button
                key={source.name}
                variant="outline"
                className="justify-between group"
                onClick={() => handleWatchClick(source.url)}
              >
                <span>{source.name}</span>
                <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ))}
          </div>
          
          <div className="pt-4 text-xs text-muted-foreground">
            <p>Note: These are external links to third-party streaming services. Please ensure you're following all applicable laws and terms of service.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
