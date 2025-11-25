# Webtoon Auto-Detection - Complete

## Feature Overview

The manga reader now automatically detects webtoon format and switches to infinite scroll mode for the best reading experience.

## How It Works

### Automatic Detection
When you open a manga chapter, the reader:
1. Loads manga details from the API
2. Analyzes multiple indicators to detect webtoon format
3. Automatically switches to infinite scroll mode if detected
4. Shows a toast notification confirming the switch

### Detection Criteria

The system checks multiple indicators to determine if a manga is a webtoon:

#### 1. **Format Field**
```typescript
if (manga.format?.toLowerCase().includes('webtoon')) return true;
```
- Checks the official format designation

#### 2. **Tags**
```typescript
const webtoonTags = manga.tags?.some(tag => {
  const tagName = tag.name.toLowerCase();
  return tagName.includes('webtoon') ||
         tagName.includes('long strip') ||
         tagName.includes('vertical scroll') ||
         tagName.includes('full color') ||
         tagName.includes('long strip format');
});
```
- Looks for webtoon-specific tags
- Checks for "long strip" format indicators
- Detects "full color" tag (common in webtoons)

#### 3. **Country of Origin**
```typescript
if (manga.countryOfOrigin === 'KR') return true; // Korean manhwa
if (manga.countryOfOrigin === 'CN') return true; // Chinese manhua
```
- Korean manhwa are typically webtoons
- Chinese manhua often use webtoon format

#### 4. **Title Keywords**
```typescript
const title = manga.title.toLowerCase();
if (title.includes('manhwa') || 
    title.includes('manhua') ||
    title.includes('[webtoon]') ||
    title.includes('(webtoon)')) return true;
```
- Checks for "manhwa" or "manhua" in title
- Looks for explicit webtoon markers

#### 5. **Genres**
```typescript
const webtoonGenres = manga.genres?.some(genre => {
  const genreName = genre.toLowerCase();
  return genreName.includes('webtoon');
});
```
- Checks genre list for webtoon designation

## User Experience

### When Webtoon is Detected:
1. **Automatic Switch** - Reading mode changes to "Infinite Scroll"
2. **Toast Notification** - "Webtoon detected! Switched to infinite scroll mode"
3. **Console Log** - "📱 Webtoon detected - switching to infinite scroll mode"
4. **Screen-fit Images** - Each page fills the viewport perfectly
5. **Smooth Scrolling** - Natural vertical reading experience

### Manual Override:
Users can still switch back to paged mode if they prefer:
1. Click Settings (gear icon)
2. Change "Reading Mode" to "Paged"
3. Preference is maintained for that session

## Implementation Details

### Detection Function
```typescript
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
  
  // Check country of origin
  if (manga.countryOfOrigin === 'KR') return true;
  if (manga.countryOfOrigin === 'CN') return true;
  
  // Check title for indicators
  const title = manga.title.toLowerCase();
  if (title.includes('manhwa') || 
      title.includes('manhua') ||
      title.includes('[webtoon]') ||
      title.includes('(webtoon)')) return true;
  
  // Check genres
  const webtoonGenres = manga.genres?.some(genre => {
    const genreName = genre.toLowerCase();
    return genreName.includes('webtoon');
  });
  if (webtoonGenres) return true;
  
  return false;
};
```

### Auto-Switch Logic
```typescript
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
        toast.success('Webtoon detected! Switched to infinite scroll mode', {
          duration: 3000,
        });
      }
    }
  } catch (error) {
    console.error('Error loading chapters:', error);
  }
}, [mangaId]);
```

## Detection Accuracy

### High Confidence Indicators:
- ✅ Format field = "webtoon"
- ✅ Country = KR (Korea)
- ✅ Tag = "webtoon" or "long strip"
- ✅ Title contains "[webtoon]"

### Medium Confidence Indicators:
- ⚠️ Country = CN (China) - many but not all are webtoons
- ⚠️ Tag = "full color" - common but not exclusive to webtoons
- ⚠️ Title contains "manhwa" or "manhua"

### Why Multiple Checks:
Different manga sources provide different metadata. By checking multiple indicators, we maximize detection accuracy across various providers.

## Examples

### Will Auto-Detect as Webtoon:
- **Solo Leveling** (Korean, manhwa)
- **Tower of God** (Korean, webtoon tag)
- **The Beginning After The End** (format: webtoon)
- **Omniscient Reader's Viewpoint** (KR origin)
- **Tales of Demons and Gods** (CN origin, manhua)

### Will Stay in Paged Mode:
- **One Piece** (Japanese manga)
- **Naruto** (Japanese manga)
- **Attack on Titan** (Japanese manga)
- **Berserk** (Japanese manga)

## Benefits

### For Webtoons:
- ✅ **Natural Reading** - Vertical scroll matches original format
- ✅ **No Page Breaks** - Continuous flow as intended
- ✅ **Screen-fit** - Each panel fills the screen perfectly
- ✅ **Better UX** - Matches how webtoons are meant to be read

### For Traditional Manga:
- ✅ **Page-by-Page** - Traditional reading experience
- ✅ **Click Navigation** - Easy page turning
- ✅ **Keyboard Shortcuts** - Arrow keys work as expected

## Files Modified

1. **`src/pages/MangaReader.tsx`**
   - Added `mangaDetails` state
   - Implemented `detectWebtoon()` function
   - Added auto-detection in `loadChapters()`
   - Added toast notification
   - Enhanced detection with multiple criteria

## Testing Recommendations

### Test Webtoon Detection:
1. Open a Korean manhwa (e.g., Solo Leveling)
2. Verify automatic switch to scroll mode
3. Check toast notification appears
4. Confirm smooth scrolling experience

### Test Traditional Manga:
1. Open a Japanese manga (e.g., One Piece)
2. Verify stays in paged mode
3. Check page navigation works
4. Confirm no auto-switch occurs

### Test Manual Override:
1. Open a webtoon (auto-switches to scroll)
2. Manually switch to paged mode
3. Verify it stays in paged mode
4. Check user preference is respected

## Future Enhancements

Potential improvements:
- Image dimension analysis (webtoons are typically tall/narrow)
- Machine learning-based detection
- User feedback to improve detection
- Save user preference per manga
- Provider-specific detection rules

## Summary

Successfully implemented automatic webtoon detection that:
- ✅ Analyzes multiple indicators (format, tags, origin, title, genres)
- ✅ Automatically switches to infinite scroll for webtoons
- ✅ Shows user-friendly notification
- ✅ Allows manual override
- ✅ Provides optimal reading experience for each format

The reader now intelligently adapts to the manga format for the best possible reading experience!
