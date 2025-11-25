# AniList Integration for Manga Covers - Complete

## Overview

Refactored manga cover service to use the centralized `anilistApi` service instead of maintaining a separate AniList implementation.

## Changes Made

### 1. **Added Manga Cover Search to anilistApi**

Added `searchMangaCover()` function to the existing `anilistApi` service:

```typescript
// src/services/anilistApi.ts
export const anilistApi = {
  // ... existing anime functions ...
  
  // Search for manga cover by title
  async searchMangaCover(title: string): Promise<string | null> {
    const cacheKey = `anilist_manga_cover:${title.toLowerCase()}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
              medium
            }
          }
        }
      }
    `;

    try {
      const data = await graphqlRequest<{ Page: { media: AniListMedia[] } }>(query, { search: title });
      
      if (data.Page?.media && data.Page.media.length > 0) {
        const manga = data.Page.media[0];
        const coverUrl = manga.coverImage.extraLarge || manga.coverImage.large || manga.coverImage.medium;
        
        if (coverUrl) {
          cache.set(cacheKey, coverUrl, 7 * 24 * 60 * 60 * 1000); // 7 days
          return coverUrl;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching manga cover from AniList:', error);
      return null;
    }
  },
};
```

### 2. **Simplified mangaCoverService**

Removed duplicate code and now uses centralized API:

**Before:**
- Custom `RequestQueue` class
- Custom `AniListMangaCover` interfaces
- Direct `fetch()` calls to AniList
- Custom rate limiting
- ~200 lines of code

**After:**
- Uses `anilistApi.searchMangaCover()`
- Simple wrapper with title variations
- Inherits rate limiting from anilistApi
- ~40 lines of code

```typescript
// src/services/mangaCoverService.ts
import { anilistApi } from './anilistApi';

async function searchAniListManga(title: string): Promise<string | null> {
  try {
    // Use the centralized anilistApi service
    const coverUrl = await anilistApi.searchMangaCover(title);
    
    if (coverUrl) {
      console.log(`✓ Found AniList cover for: ${title}`);
      return coverUrl;
    }
    
    // Try variations if first attempt fails
    const searchVariations = [
      title.replace(/\([^)]*\)/g, '').trim(),
      title.split(':')[0].trim(),
      title.split('-')[0].trim(),
    ].filter((t, i, arr) => t && t !== title && arr.indexOf(t) === i);

    for (const variation of searchVariations) {
      if (variation.length < 2) continue;
      
      const varCoverUrl = await anilistApi.searchMangaCover(variation);
      if (varCoverUrl) {
        return varCoverUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching AniList for "${title}":`, error);
    return null;
  }
}
```

## Benefits

### 1. **Code Reuse**
- ✅ Single AniList GraphQL implementation
- ✅ Shared rate limiting logic
- ✅ Shared caching infrastructure
- ✅ Shared error handling

### 2. **Maintainability**
- ✅ One place to update AniList API calls
- ✅ Consistent error handling across anime and manga
- ✅ Easier to debug and test
- ✅ Less code duplication

### 3. **Performance**
- ✅ Shared cache between anime and manga
- ✅ Centralized rate limiting prevents conflicts
- ✅ Reduced bundle size (removed duplicate code)

### 4. **Consistency**
- ✅ Same API patterns for anime and manga
- ✅ Consistent caching strategy (7 days)
- ✅ Consistent error messages
- ✅ Consistent logging format

## Architecture

### Before:
```
MangaCard
  └─> mangaCoverService
      └─> Custom AniList fetch
          └─> Custom RequestQueue
              └─> Direct GraphQL calls
```

### After:
```
MangaCard
  └─> mangaCoverService
      └─> anilistApi.searchMangaCover()
          └─> Shared graphqlRequest()
              └─> Shared rate limiting
                  └─> Shared caching
```

## Features Preserved

All original functionality maintained:
- ✅ **AniList cover search** - Works exactly the same
- ✅ **Title variations** - Still tries multiple search terms
- ✅ **Caching** - 7-day cache still active
- ✅ **Rate limiting** - Now handled by centralized service
- ✅ **UI Avatars fallback** - Still generates fallback covers
- ✅ **Error handling** - Graceful failures maintained

## Code Reduction

### Lines of Code:
- **Removed**: ~160 lines (RequestQueue, interfaces, fetch logic)
- **Added**: ~40 lines (in anilistApi)
- **Net reduction**: ~120 lines

### Files Modified:
1. **`src/services/anilistApi.ts`**
   - Added `searchMangaCover()` function
   - Reuses existing `graphqlRequest()` helper
   - Reuses existing rate limiting
   - Reuses existing cache

2. **`src/services/mangaCoverService.ts`**
   - Removed custom AniList implementation
   - Now imports and uses `anilistApi`
   - Simplified to wrapper + variations
   - Kept UI Avatars fallback logic

## Testing

### Verify Integration:
1. **Search for manga** - Covers should still load
2. **Check console** - Should see "✓ Found AniList cover for: [title]"
3. **Check network** - AniList requests should be rate-limited
4. **Check cache** - Covers should cache for 7 days
5. **Test fallback** - UI Avatars should show for missing covers

### Expected Behavior:
- ✅ Covers load from AniList
- ✅ No 429 rate limit errors
- ✅ Covers cache properly
- ✅ Fallbacks work correctly
- ✅ No duplicate requests

## Migration Notes

### No Breaking Changes:
- Public API unchanged (`getMangaCoverUrl()` works the same)
- Same caching behavior
- Same fallback logic
- Same error handling

### Internal Changes Only:
- Implementation details changed
- Now uses centralized service
- Better code organization
- Easier to maintain

## Future Enhancements

Now that manga uses centralized AniList API, we can:
- Add manga search to main search bar
- Show AniList manga ratings
- Fetch manga descriptions from AniList
- Unified anime/manga browsing
- Cross-reference anime adaptations

## Summary

Successfully integrated manga cover service with centralized `anilistApi`:
- ✅ Removed ~120 lines of duplicate code
- ✅ Reused existing AniList infrastructure
- ✅ Maintained all original functionality
- ✅ Improved maintainability
- ✅ Better code organization
- ✅ No breaking changes

The codebase is now cleaner, more maintainable, and follows DRY principles!
