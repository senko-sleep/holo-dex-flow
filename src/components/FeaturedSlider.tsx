import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Anime } from '@/types/anime';

interface FeaturedSliderProps {
  items: Anime[];
  onItemClick: (item: Anime) => void;
}

export const FeaturedSlider = ({ items, onItemClick }: FeaturedSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || items.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, items.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-2xl group">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentItem.images.jpg.large_image_url}
          alt={currentItem.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="max-w-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/90 backdrop-blur-sm text-lg px-4 py-1">
                {currentItem.type || 'TV'}
              </Badge>
              {currentItem.score && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold">{currentItem.score.toFixed(1)}</span>
                </div>
              )}
            </div>

            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              {currentItem.title}
            </h2>

            {currentItem.synopsis && (
              <p className="text-lg text-white/90 line-clamp-3 max-w-xl">
                {currentItem.synopsis}
              </p>
            )}

            <div className="flex items-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => onItemClick(currentItem)}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                <Play className="h-5 w-5" />
                View Details
              </Button>
              {currentItem.episodes && (
                <span className="text-white/80">{currentItem.episodes} Episodes</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'w-8 bg-primary'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
