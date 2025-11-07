# Filter Fixes - Anime & Character Search

## Issues Fixed

### 1. **Anime Filters Not Working**
- **Problem**: Anime filters were not triggering searches when no query was present
- **Root Cause**: The search logic didn't check for active filters before deciding whether to search
- **Fix**: Added `hasAnimeFilters` check to determine if filters are active and use `searchAnime` when filters exist

### 2. **Character Filters Not Working**
- **Problem**: Character filters were not triggering searches when no query was present
- **Root Cause**: Same as anime - missing filter detection logic
- **Fix**: Added `hasCharacterFilters` check to determine if filters are active and use `searchCharacters` when filters exist

### 3. **Empty Query Handling**
- **Problem**: APIs were rejecting empty queries even when filters were present
- **Root Cause**: Validation logic was too strict (`query.trim()` instead of `query?.trim()`)
- **Fix**: Updated validation to use optional chaining and properly check for both query AND filters

### 4. **Anime Not Showing Any Results (CRITICAL FIX)**
- **Problem**: After initial fixes, anime stopped showing results entirely
- **Root Cause**: Relying on JavaScript truthy/falsy evaluation of empty strings was ambiguous
- **Fix**: Added explicit `hasQuery` check: `const hasQuery = query && query.trim().length > 0`
- **Impact**: Now properly distinguishes between "no query" (browse mode) and "query with content" (search mode)

## Files Modified

### 1. `src/pages/SearchResults.tsx`
- Added filter detection logic for anime and character sections
- Modified search logic to use `searchAnime`/`searchCharacters` when filters are active
- Improved `handleFiltersChange` to use strict undefined checks
- Added comments explaining the logic flow
- **CRITICAL**: Added explicit `hasQuery` variable to properly distinguish empty vs non-empty queries

### 2. `src/services/anilistApi.ts`
- Fixed `searchAnime()` to handle empty queries with filters
- Fixed `searchCharacters()` to handle empty queries with filters
- Updated validation to use `query?.trim()` instead of `query.trim()`
- Changed sort order to `SCORE_DESC` when no query is present (filters only)

### 3. `src/services/animeApi.ts`
- Updated `searchAnime()` wrapper to handle empty queries with filters
- Updated `searchCharacters()` wrapper to handle empty queries with filters
- Improved validation logic consistency

## How It Works Now

### Anime Section
1. User applies filters (genres, tags, format, status)
2. System checks if filters are active
3. If query OR filters exist → calls `searchAnime()`
4. If no query AND no filters → calls `getTopAnime()`
5. Results update automatically

### Character Section
1. User applies filters (role, sort)
2. System checks if filters are active
3. If query OR filters exist → calls `searchCharacters()`
4. If no query AND no filters → calls `getTopCharacters()`
5. Results update automatically

### Manga Section
- Already working correctly (no changes needed)

## Testing Checklist

- [x] Anime filters work without search query
- [x] Character filters work without search query
- [x] Anime filters work with search query
- [x] Character filters work with search query
- [x] Clearing filters resets to default results
- [x] Multiple filters can be combined
- [x] Pagination works with filters
- [x] Filter state persists in localStorage

## Technical Details

### Filter Detection Logic
```typescript
// Check if we have a valid query
const hasQuery = query && query.trim().length > 0;

// Anime filters
const hasAnimeFilters = animeFilters && (
  (animeFilters.genres && animeFilters.genres.length > 0) ||
  (animeFilters.tags && animeFilters.tags.length > 0) ||
  (animeFilters.format && animeFilters.format.length > 0) ||
  (animeFilters.status && animeFilters.status.length > 0)
);

// Character filters
const hasCharacterFilters = characterFilters && (
  (characterFilters.role && characterFilters.role.length > 0) ||
  characterFilters.sort
);
```

### API Call Logic
```typescript
// Anime - FIXED with explicit hasQuery check
(hasQuery || hasAnimeFilters)
  ? animeApi.searchAnime(query || '', PER_PAGE, animeFilters, page) 
  : animeApi.getTopAnime(page, PER_PAGE, animeFilters)

// Characters - FIXED with explicit hasQuery check
(hasQuery || hasCharacterFilters)
  ? animeApi.searchCharacters(query || '', PER_PAGE, characterFilters, page) 
  : animeApi.getTopCharacters(page, PER_PAGE, characterFilters)
```

## Notes

- All filter states are saved to localStorage
- Page resets automatically when filters change (via useEffect dependency)
- Empty queries with filters now sort by SCORE_DESC instead of SEARCH_MATCH
- The fix maintains backward compatibility with existing functionality
- **IMPORTANT**: The `hasQuery` variable is critical - without it, empty strings are falsy and cause incorrect API routing
- Browse mode (no query, no filters) → calls `getTopAnime()` / `getTopCharacters()`
- Search mode (query OR filters) → calls `searchAnime()` / `searchCharacters()`
