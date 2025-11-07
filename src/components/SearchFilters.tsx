import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X } from 'lucide-react';
import { mangadexApi, MangaFilters } from '@/services/mangadexApi';
import { anilistApi } from '@/services/anilistApi';

export interface AnimeFilters {
  genres?: string[];
  tags?: string[];  // Changed from number[] to string[]
  format?: string[];
  status?: string[];
}

export interface CharacterFilters {
  role?: string[];
  sort?: string;
}

export type AllFilters = {
  section: 'anime' | 'manga' | 'characters';
  animeFilters?: AnimeFilters;
  mangaFilters?: MangaFilters;
  characterFilters?: CharacterFilters;
};

interface SearchFiltersProps {
  onFiltersChange: (filters: AllFilters) => void;
  currentFilters: MangaFilters;
  currentSection?: 'anime' | 'manga' | 'characters';
}

export const SearchFilters = ({ onFiltersChange, currentFilters, currentSection = 'manga' }: SearchFiltersProps) => {
  // Helper to load from localStorage
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Manga filters
  const [tags, setTags] = useState<Array<{ id: string; name: string; group: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => 
    loadFromStorage('filter_manga_tags', currentFilters.includedTags || [])
  );
  const [selectedStatus, setSelectedStatus] = useState<string[]>(() => 
    loadFromStorage('filter_manga_status', currentFilters.status || [])
  );
  const [selectedDemographic, setSelectedDemographic] = useState<string[]>(() => 
    loadFromStorage('filter_manga_demographic', currentFilters.publicationDemographic || [])
  );
  const [selectedRating, setSelectedRating] = useState<string[]>(() => 
    loadFromStorage('filter_manga_rating', currentFilters.contentRating || ['safe', 'suggestive'])
  );

  // Anime filters - dynamically loaded
  const [animeGenres, setAnimeGenres] = useState<string[]>([]);
  const [animeTags, setAnimeTags] = useState<Array<{ id: number; name: string; category: string }>>([]);

  // Load tags based on current section
  useEffect(() => {
    const loadData = async () => {
      if (currentSection === 'manga') {
        const fetchedTags = await mangadexApi.getTags();
        setTags(fetchedTags);
      } else if (currentSection === 'anime') {
        const [genres, tags] = await Promise.all([
          anilistApi.getGenres(),
          anilistApi.getTags()
        ]);
        setAnimeGenres(genres);
        setAnimeTags(tags);
      }
    };
    loadData();
  }, [currentSection]);

  // Manga filter options (these are standard MangaDex values)
  const statusOptions = [
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const demographicOptions = [
    { value: 'shounen', label: 'Shounen' },
    { value: 'shoujo', label: 'Shoujo' },
    { value: 'seinen', label: 'Seinen' },
    { value: 'josei', label: 'Josei' },
    { value: 'none', label: 'None' },
  ];

  const ratingOptions = [
    { value: 'safe', label: 'Safe' },
    { value: 'suggestive', label: 'Suggestive' },
    { value: 'erotica', label: 'Erotica' },
    { value: 'pornographic', label: 'Pornographic' },
  ];

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => {
      const updated = prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId];
      localStorage.setItem('filter_manga_tags', JSON.stringify(updated));
      return updated;
    });
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev => {
      const updated = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      localStorage.setItem('filter_manga_status', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDemographicToggle = (demo: string) => {
    setSelectedDemographic(prev => {
      const updated = prev.includes(demo) ? prev.filter(d => d !== demo) : [...prev, demo];
      localStorage.setItem('filter_manga_demographic', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRatingToggle = (rating: string) => {
    setSelectedRating(prev => {
      const updated = prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating];
      localStorage.setItem('filter_manga_rating', JSON.stringify(updated));
      return updated;
    });
  };

  const applyFilters = () => {
    if (currentSection === 'anime') {
      onFiltersChange({
        section: 'anime',
        animeFilters: {
          genres: selectedGenres,
          tags: selectedAnimeTags,
          format: selectedAnimeTypes,
          status: selectedAnimeStatus,
        },
      });
    } else if (currentSection === 'manga') {
      onFiltersChange({
        section: 'manga',
        mangaFilters: {
          includedTags: selectedTags,
          status: selectedStatus,
          publicationDemographic: selectedDemographic,
          contentRating: selectedRating,
          order: { relevance: 'desc' },
        },
      });
    } else if (currentSection === 'characters') {
      onFiltersChange({
        section: 'characters',
        characterFilters: {
          role: selectedCharacterRoles,
          sort: selectedCharacterSort,
        },
      });
    }
  };

  const clearFilters = () => {
    // Clear manga filters
    setSelectedTags([]);
    setSelectedStatus([]);
    setSelectedDemographic([]);
    setSelectedRating(['safe', 'suggestive']);
    localStorage.setItem('filter_manga_tags', JSON.stringify([]));
    localStorage.setItem('filter_manga_status', JSON.stringify([]));
    localStorage.setItem('filter_manga_demographic', JSON.stringify([]));
    localStorage.setItem('filter_manga_rating', JSON.stringify(['safe', 'suggestive']));
    
    // Clear anime filters
    setSelectedGenres([]);
    setSelectedAnimeTags([]);
    setSelectedAnimeTypes([]);
    setSelectedAnimeStatus([]);
    localStorage.setItem('filter_anime_genres', JSON.stringify([]));
    localStorage.setItem('filter_anime_tags', JSON.stringify([]));
    localStorage.setItem('filter_anime_types', JSON.stringify([]));
    localStorage.setItem('filter_anime_status', JSON.stringify([]));
    
    // Clear character filters
    setSelectedCharacterRoles([]);
    setSelectedCharacterSort('FAVOURITES_DESC');
    localStorage.setItem('filter_character_roles', JSON.stringify([]));
    localStorage.setItem('filter_character_sort', JSON.stringify('FAVOURITES_DESC'));
    
    // Apply cleared filters
    if (currentSection === 'anime') {
      onFiltersChange({
        section: 'anime',
        animeFilters: {},
      });
    } else if (currentSection === 'manga') {
      onFiltersChange({
        section: 'manga',
        mangaFilters: {
          contentRating: ['safe', 'suggestive'],
          order: { relevance: 'desc' },
        },
      });
    } else if (currentSection === 'characters') {
      onFiltersChange({
        section: 'characters',
        characterFilters: {
          sort: 'FAVOURITES_DESC',
        },
      });
    }
  };

  // Anime filter options (AniList standard values)
  const animeTypes = [
    { value: 'TV', label: 'TV' },
    { value: 'TV_SHORT', label: 'TV Short' },
    { value: 'MOVIE', label: 'Movie' },
    { value: 'SPECIAL', label: 'Special' },
    { value: 'OVA', label: 'OVA' },
    { value: 'ONA', label: 'ONA' },
    { value: 'MUSIC', label: 'Music' },
  ];

  const animeStatuses = [
    { value: 'FINISHED', label: 'Finished' },
    { value: 'RELEASING', label: 'Releasing' },
    { value: 'NOT_YET_RELEASED', label: 'Not Yet Released' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'HIATUS', label: 'Hiatus' },
  ];

  // Character filter options (AniList standard values)
  const characterRoles = [
    { value: 'MAIN', label: 'Main' },
    { value: 'SUPPORTING', label: 'Supporting' },
    { value: 'BACKGROUND', label: 'Background' },
  ];

  const characterSortOptions = [
    { value: 'FAVOURITES_DESC', label: 'Most Favorited' },
    { value: 'RELEVANCE', label: 'Most Relevant' },
    { value: 'ROLE', label: 'By Role' },
  ];

  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => 
    loadFromStorage('filter_anime_genres', [])
  );
  const [selectedAnimeTags, setSelectedAnimeTags] = useState<number[]>(() => 
    loadFromStorage('filter_anime_tags', [])
  );
  const [selectedAnimeTypes, setSelectedAnimeTypes] = useState<string[]>(() => 
    loadFromStorage('filter_anime_types', [])
  );
  const [selectedAnimeStatus, setSelectedAnimeStatus] = useState<string[]>(() => 
    loadFromStorage('filter_anime_status', [])
  );
  const [selectedCharacterRoles, setSelectedCharacterRoles] = useState<string[]>(() => 
    loadFromStorage('filter_character_roles', [])
  );
  const [selectedCharacterSort, setSelectedCharacterSort] = useState<string>(() => 
    loadFromStorage('filter_character_sort', 'FAVOURITES_DESC')
  );

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => {
      const updated = prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre];
      localStorage.setItem('filter_anime_genres', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnimeTagToggle = (tagId: number) => {
    setSelectedAnimeTags(prev => {
      const updated = prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId];
      localStorage.setItem('filter_anime_tags', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnimeTypeToggle = (type: string) => {
    setSelectedAnimeTypes(prev => {
      const updated = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      localStorage.setItem('filter_anime_types', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnimeStatusToggle = (status: string) => {
    setSelectedAnimeStatus(prev => {
      const updated = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      localStorage.setItem('filter_anime_status', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCharacterRoleToggle = (role: string) => {
    setSelectedCharacterRoles(prev => {
      const updated = prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role];
      localStorage.setItem('filter_character_roles', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCharacterSortChange = (sort: string) => {
    setSelectedCharacterSort(sort);
    localStorage.setItem('filter_character_sort', JSON.stringify(sort));
  };

  const activeFilterCount = currentSection === 'manga' 
    ? selectedTags.length + selectedStatus.length + selectedDemographic.length
    : currentSection === 'anime'
    ? selectedGenres.length + selectedAnimeTags.length + selectedAnimeTypes.length + selectedAnimeStatus.length
    : selectedCharacterRoles.length;

  // Group tags by category
  const tagsByGroup = tags.reduce((acc, tag) => {
    if (!acc[tag.group]) acc[tag.group] = [];
    acc[tag.group].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs md:text-sm">
          <Filter className="h-3 w-3 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Filters</span>
          <span className="sm:hidden">Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px] md:w-[540px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>
            {currentSection === 'anime' ? 'Anime Filters' : 
             currentSection === 'manga' ? 'Manga Filters' : 
             'Character Filters'}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 pr-4 mt-6 mb-20">
          <div className="space-y-6 pb-4">
            {/* ANIME FILTERS */}
            {currentSection === 'anime' && (
              <>
                {/* Genres */}
                {animeGenres.length > 0 && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {animeGenres.map(genre => (
                          <Badge
                            key={genre}
                            variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleGenreToggle(genre)}
                          >
                            {genre}
                            {selectedGenres.includes(genre) && (
                              <X className="ml-1 h-3 w-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Type */}
                <div>
                  <h3 className="font-semibold mb-3">Type</h3>
                  <div className="space-y-2">
                    {animeTypes.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`anime-type-${option.value}`}
                          checked={selectedAnimeTypes.includes(option.value)}
                          onCheckedChange={() => handleAnimeTypeToggle(option.value)}
                        />
                        <Label htmlFor={`anime-type-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div>
                  <h3 className="font-semibold mb-3">Status</h3>
                  <div className="space-y-2">
                    {animeStatuses.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`anime-status-${option.value}`}
                          checked={selectedAnimeStatus.includes(option.value)}
                          onCheckedChange={() => handleAnimeStatusToggle(option.value)}
                        />
                        <Label htmlFor={`anime-status-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {animeTags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Tags</h3>
                      {/* Group tags by category */}
                      {Array.from(new Set(animeTags.map(t => t.category))).slice(0, 5).map(category => {
                        const categoryTags = animeTags.filter(t => t.category === category).slice(0, 10);
                        return (
                          <div key={category} className="mb-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                              {category}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {categoryTags.map(tag => (
                                <Badge
                                  key={tag.id}
                                  variant={selectedAnimeTags.includes(tag.id) ? 'default' : 'outline'}
                                  className="cursor-pointer text-xs"
                                  onClick={() => handleAnimeTagToggle(tag.id)}
                                >
                                  {tag.name}
                                  {selectedAnimeTags.includes(tag.id) && (
                                    <X className="ml-1 h-3 w-3" />
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* CHARACTER FILTERS */}
            {currentSection === 'characters' && (
              <>
                {/* Role */}
                <div>
                  <h3 className="font-semibold mb-3">Character Role</h3>
                  <div className="space-y-2">
                    {characterRoles.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`char-role-${option.value}`}
                          checked={selectedCharacterRoles.includes(option.value)}
                          onCheckedChange={() => handleCharacterRoleToggle(option.value)}
                        />
                        <Label htmlFor={`char-role-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Sort By */}
                <div>
                  <h3 className="font-semibold mb-3">Sort By</h3>
                  <div className="space-y-2">
                    {characterSortOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`char-sort-${option.value}`}
                          checked={selectedCharacterSort === option.value}
                          onCheckedChange={() => handleCharacterSortChange(option.value)}
                        />
                        <Label htmlFor={`char-sort-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* MANGA FILTERS */}
            {currentSection === 'manga' && (
              <>
                {/* Status */}
                <div>
                  <h3 className="font-semibold mb-3">Publication Status</h3>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={selectedStatus.includes(option.value)}
                          onCheckedChange={() => handleStatusToggle(option.value)}
                        />
                        <Label htmlFor={`status-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Demographic */}
                <div>
                  <h3 className="font-semibold mb-3">Demographic</h3>
                  <div className="space-y-2">
                    {demographicOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`demo-${option.value}`}
                          checked={selectedDemographic.includes(option.value)}
                          onCheckedChange={() => handleDemographicToggle(option.value)}
                        />
                        <Label htmlFor={`demo-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Content Rating */}
                <div>
                  <h3 className="font-semibold mb-3">Content Rating</h3>
                  <div className="space-y-2">
                    {ratingOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`rating-${option.value}`}
                          checked={selectedRating.includes(option.value)}
                          onCheckedChange={() => handleRatingToggle(option.value)}
                        />
                        <Label htmlFor={`rating-${option.value}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                <div>
                  <h3 className="font-semibold mb-3">Tags</h3>
                  {Object.entries(tagsByGroup).slice(0, 5).map(([group, groupTags]) => (
                    <div key={group} className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                        {group}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {groupTags.slice(0, 10).map(tag => (
                          <Badge
                            key={tag.id}
                            variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleTagToggle(tag.id)}
                          >
                            {tag.name}
                            {selectedTags.includes(tag.id) && (
                              <X className="ml-1 h-3 w-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-background border-t flex gap-2 flex-shrink-0">
          <Button onClick={clearFilters} variant="outline" className="flex-1 text-xs md:text-sm">
            Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1 text-xs md:text-sm">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
