# Sectioned Progressive Loading Implementation

## Overview
Implemented progressive/sectioned loading to improve perceived performance and user experience. Content loads in priority order: Anime → Manga → Characters.

## Changes Made

### 1. **Index Page** (`src/pages/Index.tsx`)

#### Loading States:
```typescript
const [isLoadingAnime, setIsLoadingAnime] = useState(true);
const [isLoadingManga, setIsLoadingManga] = useState(true);
const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
```

#### Loading Sequence:
```
1. 📺 Section 1: Anime (Priority)
   - Top Anime (24 items)
   - Seasonal Anime (12 items)
   - Featured Anime (10 items)
   ↓ (Anime visible immediately)
   
2. 📚 Section 2: Manga
   - Hottest Manga (24 items)
   ↓ (Manga visible after anime)
   
3. 👥 Section 3: Characters (Future)
   - Top Characters
   ↓ (Characters visible last)
```

### 2. **Vite Proxy Configuration** (`vite.config.ts`)

Added AniList proxy to fix CORS issues in development:

```typescript
"/api/anilist": {
  target: "https://graphql.anilist.co",
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/anilist/, ""),
}
```

### 3. **AniList API** (`src/services/anilistApi.ts`)

Uses proxy in development, direct URL in production:

```typescript
const ANILIST_API_URL = import.meta.env.DEV 
  ? '/api/anilist'  // Development: Use Vite proxy
  : 'https://graphql.anilist.co';  // Production: Direct + CORS proxies
```

## Benefits

### 1. **Instant Content Display**
- Anime appears immediately (highest priority)
- Users can start browsing while manga loads
- No waiting for all content

### 2. **Better Perceived Performance**
- Page feels faster
- Progressive enhancement
- Smooth loading experience

### 3. **Reduced Load on APIs**
- Requests spread over time
- Less likely to hit rate limits
- Better resource utilization

### 4. **Improved UX**
- Loading indicators per section
- Clear visual feedback
- Users see content ASAP

## Loading Timeline

```
Time    Section          Status
────────────────────────────────────
0s      Anime            🔄 Loading...
1-2s    Anime            ✅ Loaded & Visible
        Manga            🔄 Loading...
3-4s    Manga            ✅ Loaded & Visible
        Characters       🔄 Loading... (future)
5-6s    Characters       ✅ Loaded & Visible (future)
```

## Console Output

```
📺 Section 1: Loading anime data...
✅ Anime loaded: { topAnime: 24, seasonalAnime: 12, featuredAnime: 10 }
📚 Section 2: Loading manga data...
✅ Manga loaded: 24
👥 Section 3: Loading characters... (future)
✅ Characters loaded: 50 (future)
```

## Implementation Details

### Sequential Loading:
```typescript
const loadContent = async () => {
  setIsLoadingAnime(true);
  
  try {
    // Section 1: Anime (parallel within section)
    const [top, seasonal, featured] = await Promise.all([
      animeApi.getTopAnime(1, 24),
      animeApi.getCurrentSeasonAnime(),
      animeApi.getTopAnime(1, 10),
    ]);
    
    setTopAnime(top);
    setSeasonalAnime(seasonal);
    setFeaturedAnime(featured);
    setIsLoadingAnime(false); // ← Anime visible now
    
    // Section 2: Manga (starts after anime)
    const manga = await mangadexApi.searchManga(...);
    setHottestManga(manga);
    setIsLoadingManga(false); // ← Manga visible now
    
  } catch (error) {
    console.error('Error loading content:', error);
  }
};
```

### Conditional Rendering:
```tsx
{/* Anime Section */}
{isLoadingAnime ? (
  <LoadingGrid count={12} />
) : (
  <AnimeGrid items={seasonalAnime} />
)}

{/* Manga Section */}
{isLoadingManga ? (
  <LoadingGrid count={24} />
) : (
  <MangaGrid items={hottestManga} />
)}
```

## CORS Fix for Development

### Problem:
- Direct fetch to `https://graphql.anilist.co` blocked by CORS
- CORS proxies don't handle POST requests well
- Authorization headers cause preflight failures

### Solution:
- Use Vite dev server proxy for development
- Proxy handles CORS headers automatically
- Production uses CORS proxy fallbacks

### Configuration:
```typescript
// vite.config.ts
proxy: {
  "/api/anilist": {
    target: "https://graphql.anilist.co",
    changeOrigin: true,
  }
}

// anilistApi.ts
const ANILIST_API_URL = import.meta.env.DEV 
  ? '/api/anilist'  // ← Proxied
  : 'https://graphql.anilist.co';  // ← Direct
```

## Future Enhancements

### 1. **Add Characters Section**
```typescript
// Section 3: Characters
const characters = await animeApi.getTopCharacters(1, 50);
setTopCharacters(characters);
setIsLoadingCharacters(false);
```

### 2. **Priority Queuing**
```typescript
// High priority for visible content
await withQueue(anilistQueue, fetchAnime, priority: 10);

// Low priority for below-fold content
await withQueue(anilistQueue, fetchCharacters, priority: 1);
```

### 3. **Intersection Observer**
```typescript
// Load characters only when scrolled into view
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadCharacters();
    }
  });
  observer.observe(charactersSection);
}, []);
```

### 4. **Skeleton Loaders**
Replace `LoadingGrid` with more detailed skeleton screens that match actual content layout.

## Testing

### Test Sectioned Loading:
1. Open DevTools Network tab
2. Throttle to "Slow 3G"
3. Refresh page
4. Observe:
   - Anime loads first
   - Manga loads second
   - Each section visible immediately after loading

### Test CORS Proxy:
1. Run `npm run dev`
2. Check console for "→ AniList Request" logs
3. Verify no CORS errors
4. Check Network tab shows `/api/anilist` requests

## Status: ✅ IMPLEMENTED

- ✅ Sectioned loading (Anime → Manga)
- ✅ Vite proxy for development
- ✅ CORS fixes
- ✅ Console logging for debugging
- ⏳ Characters section (future)
- ⏳ Intersection Observer (future)

## Files Modified

- ✅ `src/pages/Index.tsx` - Sectioned loading
- ✅ `vite.config.ts` - AniList proxy
- ✅ `src/services/anilistApi.ts` - Proxy URL switching
- ✅ `src/lib/corsProxy.ts` - Header cleaning
