'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Music, Disc, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { animeApi } from '@/services/animeApi';
import { Anime, ThemeSong } from '@/types/anime';

interface Track {
  id: string;
  title: string;
  anime: string;
  type: 'OP' | 'ED' | 'Insert Song' | 'Image Song';
  number: number;
  animeImage: string;
  animeId: number;
  themeId?: number;
  artists?: Array<{ name: string }>;
  audioUrl?: string;
  videoUrl?: string;
  duration?: number;
}

interface AnimeWithTracks {
  anime: Anime;
  tracks: Track[];
}

interface MusicSearchBarProps {
  onAnimeSelect?: (anime: Anime) => void;
  onTrackSelect?: (track: Track) => void;
  currentSection?: 'anime' | 'tracks';
}

export const MusicSearchBar = ({ onAnimeSelect, onTrackSelect, currentSection }: MusicSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [trackResults, setTrackResults] = useState<AnimeWithTracks[]>([]);
  const [activeFilter, setActiveFilter] = useState<'anime' | 'tracks'>(currentSection || 'anime');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const searchContent = async () => {
      if (query.trim().length < 2) {
        setAnimeResults([]);
        setTrackResults([]);
        setIsOpen(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Search for anime
        const anime = await animeApi.searchAnime(query, 8, {}, 1, true);
        setAnimeResults(anime);
        
        // If searching for tracks, load theme songs for each anime
        if (activeFilter === 'tracks') {
          const animeWithTracks: AnimeWithTracks[] = [];
          
          // Load themes for top 3 anime results
          for (const animeItem of anime.slice(0, 3)) {
            try {
              const themes = await animeApi.getThemeSongs(animeItem.title, animeItem.mal_id);
              
              // Convert themes to tracks
              const tracks: Track[] = themes
                .map(theme => {
                  const audioUrl = animeApi.getBestAudioUrl(theme);
                  if (!audioUrl) return null;
                  
                  const videos = theme.videos || [];
                  const bestVideo = videos
                    .filter(v => v.audio || v.link)
                    .sort((a, b) => {
                      if (a.audio && !b.audio) return -1;
                      if (!a.audio && b.audio) return 1;
                      const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
                      const aQuality = a.quality ? qualityOrder[a.quality as keyof typeof qualityOrder] ?? -1 : -1;
                      const bQuality = b.quality ? qualityOrder[b.quality as keyof typeof qualityOrder] ?? -1 : -1;
                      return bQuality - aQuality;
                    })[0];
                  
                  return {
                    id: `${animeItem.mal_id}-${theme.id}-${bestVideo?.basename || bestVideo?.id || 0}`,
                    title: theme.song?.title || `${theme.type} ${theme.sequence}`,
                    anime: animeItem.title,
                    type: theme.type,
                    number: theme.sequence,
                    animeImage: animeItem.images.jpg.large_image_url || animeItem.images.jpg.image_url,
                    animeId: animeItem.mal_id,
                    themeId: theme.id,
                    artists: theme.song?.artists,
                    audioUrl: audioUrl,
                    videoUrl: bestVideo?.link,
                    duration: bestVideo?.duration
                  };
                })
                .filter((track): track is Track => track !== null);
              
              if (tracks.length > 0) {
                animeWithTracks.push({ anime: animeItem, tracks });
              }
            } catch (error) {
              console.error(`Error loading themes for ${animeItem.title}:`, error);
            }
          }
          
          setTrackResults(animeWithTracks);
        }
        
        setIsOpen(true);
      } catch (error) {
        console.error('Error searching:', error);
        setAnimeResults([]);
        setTrackResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchContent, 500);
    return () => clearTimeout(debounce);
  }, [query, activeFilter]);

  const handleAnimeClick = (anime: Anime) => {
    if (onAnimeSelect) {
      onAnimeSelect(anime);
    }
    clearSearch();
  };

  const handleTrackClick = (track: Track) => {
    if (onTrackSelect) {
      onTrackSelect(track);
    }
    clearSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setAnimeResults([]);
    setTrackResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  // Update filter when currentSection changes
  useEffect(() => {
    if (currentSection) {
      setActiveFilter(currentSection);
    }
  }, [currentSection]);

  // Count total tracks
  const totalTracks = trackResults.reduce((sum, item) => sum + item.tracks.length, 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative group w-full z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-20" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search anime for music..."
          className="relative w-full pl-12 pr-12 h-14 bg-card/80 backdrop-blur-sm border-border/50 text-lg rounded-2xl shadow-lg hover:shadow-xl focus:shadow-xl focus:shadow-primary/20 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all z-20"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Filter Buttons */}
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeFilter === 'anime' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('anime')}
                className="flex-1"
              >
                <Music className="h-4 w-4 mr-1" />
                Anime ({animeResults.length})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'tracks' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('tracks')}
                className="flex-1"
              >
                <Disc className="h-4 w-4 mr-1" />
                Tracks ({totalTracks})
              </Button>
            </div>
          </div>

          {/* Scrollable Results */}
          <div className="overflow-y-auto" style={{ maxHeight: 'min(400px, 60vh)' }}>
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Anime Results */}
                {activeFilter === 'anime' && animeResults.length > 0 && (
                  <div>
                    {animeResults.map((anime) => (
                      <button
                        key={anime.mal_id}
                        onClick={() => handleAnimeClick(anime)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <img
                          src={anime.images.jpg.image_url}
                          alt={anime.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {anime.title_english || anime.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {anime.score && <span className="text-primary">★ {anime.score}</span>}
                            {anime.type && <span>• {anime.type}</span>}
                          </div>
                        </div>
                        <Disc className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Track Results */}
                {activeFilter === 'tracks' && trackResults.length > 0 && (
                  <div>
                    {trackResults.map((animeWithTracks) => (
                      <div key={animeWithTracks.anime.mal_id} className="border-b border-border last:border-0">
                        {/* Anime Header */}
                        <div className="p-2 bg-secondary/20 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <img
                            src={animeWithTracks.anime.images.jpg.image_url}
                            alt={animeWithTracks.anime.title}
                            className="w-6 h-8 object-cover rounded"
                            loading="lazy"
                          />
                          <span className="truncate">{animeWithTracks.anime.title_english || animeWithTracks.anime.title}</span>
                        </div>
                        
                        {/* Tracks */}
                        {animeWithTracks.tracks.map((track) => (
                          <button
                            key={track.id}
                            onClick={() => handleTrackClick(track)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left group"
                          >
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Play className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{track.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                                  {track.type} {track.number}
                                </span>
                                {track.artists && track.artists.length > 0 && (
                                  <span className="truncate">• {track.artists.map(a => a.name).join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {((activeFilter === 'anime' && animeResults.length === 0) || 
                  (activeFilter === 'tracks' && trackResults.length === 0)) && 
                  !isLoading && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-2">
                      {activeFilter === 'tracks' 
                        ? 'Try a different anime title or switch to Anime filter'
                        : 'Try a different anime title'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
