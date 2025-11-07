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

interface SearchFiltersProps {
  onFiltersChange: (filters: MangaFilters) => void;
  currentFilters: MangaFilters;
}

export const SearchFilters = ({ onFiltersChange, currentFilters }: SearchFiltersProps) => {
  const [tags, setTags] = useState<Array<{ id: string; name: string; group: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentFilters.includedTags || []);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(currentFilters.status || []);
  const [selectedDemographic, setSelectedDemographic] = useState<string[]>(currentFilters.publicationDemographic || []);
  const [selectedRating, setSelectedRating] = useState<string[]>(currentFilters.contentRating || ['safe', 'suggestive']);

  useEffect(() => {
    const loadTags = async () => {
      const fetchedTags = await mangadexApi.getTags();
      setTags(fetchedTags);
    };
    loadTags();
  }, []);

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
  ];

  const ratingOptions = [
    { value: 'safe', label: 'Safe' },
    { value: 'suggestive', label: 'Suggestive' },
    { value: 'erotica', label: 'Erotica' },
    { value: 'pornographic', label: 'Pornographic' },
  ];

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleDemographicToggle = (demo: string) => {
    setSelectedDemographic(prev => 
      prev.includes(demo) ? prev.filter(d => d !== demo) : [...prev, demo]
    );
  };

  const handleRatingToggle = (rating: string) => {
    setSelectedRating(prev => 
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    );
  };

  const applyFilters = () => {
    onFiltersChange({
      includedTags: selectedTags,
      status: selectedStatus,
      publicationDemographic: selectedDemographic,
      contentRating: selectedRating,
      order: { relevance: 'desc' },
    });
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedStatus([]);
    setSelectedDemographic([]);
    setSelectedRating(['safe', 'suggestive']);
    onFiltersChange({
      contentRating: ['safe', 'suggestive'],
      order: { relevance: 'desc' },
    });
  };

  const activeFilterCount = selectedTags.length + selectedStatus.length + selectedDemographic.length;

  // Group tags by category
  const tagsByGroup = tags.reduce((acc, tag) => {
    if (!acc[tag.group]) acc[tag.group] = [];
    acc[tag.group].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Search Filters</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <div className="space-y-6">
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
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t flex gap-2">
          <Button onClick={clearFilters} variant="outline" className="flex-1">
            Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
