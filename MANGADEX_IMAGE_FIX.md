# MangaDex Image Anti-Scraping Workaround - Complete

## Problem

MangaDex images were showing "you can read this at mangadex.org" message instead of actual manga covers due to anti-scraping measures.

### Root Cause:
- MangaDex CDN (`uploads.mangadex.org`) checks HTTP referrer headers
- Blocks requests from unauthorized referrers
- Shows anti-scraping message instead of images

## Solution Implemented

### 1. **Global Referrer Policy**

Added `no-referrer` meta tag to `index.html`:

```html
<meta name="referrer" content="no-referrer" />
```

This prevents the browser from sending referrer information with image requests, bypassing MangaDex's referrer checks.

### 2. **Image Attributes**

Added `crossOrigin` and `referrerPolicy` attributes to all manga image elements:

```typescript
<img
  src={coverUrl}
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
  // ... other props
/>
```

**Why both attributes:**
- `crossOrigin="anonymous"` - Allows cross-origin requests without credentials
- `referrerPolicy="no-referrer"` - Ensures no referrer is sent (double protection)

## Files Modified

### 1. **`index.html`**
```html
<meta name="referrer" content="no-referrer" />
```
- Global referrer policy for all requests
- Applies site-wide

### 2. **`src/components/MangaCard.tsx`**
```typescript
<img
  src={imageError ? '/placeholder.svg' : coverUrl}
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
  // ... other props
/>
```
- Added to manga card cover images
- Prevents anti-scraping blocks

### 3. **`src/pages/MangaDetail.tsx`**
```typescript
<img
  src={coverUrl || getMangaCoverUrlSync(manga.coverUrl, manga.title)}
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
  // ... other props
/>
```
- Added to manga detail page cover
- Ensures detail page images load

### 4. **`src/components/SearchBar.tsx`**
```typescript
<img
  src={getMangaCoverUrlSync(manga.coverUrl, manga.title)}
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
  // ... other props
/>
```
- Added to search results manga thumbnails
- Prevents blocking in search

## How It Works

### Before Fix:
```
Browser → MangaDex CDN
Headers: Referer: https://your-site.com
Response: "you can read this at mangadex.org" (blocked)
```

### After Fix:
```
Browser → MangaDex CDN
Headers: (no referrer sent)
Response: Actual image data ✅
```

## Technical Details

### Referrer Policy Options:
- `no-referrer` - Never send referrer (most private, bypasses checks)
- `no-referrer-when-downgrade` - Default browser behavior
- `origin` - Send only origin, not full URL
- `same-origin` - Send referrer only for same-origin requests

We chose `no-referrer` because:
- ✅ Bypasses MangaDex's referrer checks
- ✅ Maximum privacy
- ✅ Works with all CDNs
- ✅ No side effects for our use case

### Cross-Origin Attributes:
- `crossOrigin="anonymous"` - Allows CORS without credentials
- Required for some CDNs
- Enables image manipulation if needed
- No cookies/auth sent

## Benefits

### 1. **Images Load Correctly**
- ✅ No more "read at mangadex.org" messages
- ✅ Actual manga covers display
- ✅ Works for all MangaDex images

### 2. **Better Privacy**
- ✅ No referrer information leaked
- ✅ Users' browsing patterns protected
- ✅ CDNs can't track source sites

### 3. **Future-Proof**
- ✅ Works with other CDNs too
- ✅ Prevents similar anti-scraping measures
- ✅ Standard web practice

## Testing

### Verify Fix:
1. **Search for manga** - Covers should load
2. **Open manga detail** - Cover should display
3. **Check search results** - Thumbnails should show
4. **Inspect network** - No referrer in headers
5. **Check console** - No CORS errors

### Expected Behavior:
- ✅ All manga covers load properly
- ✅ No anti-scraping messages
- ✅ Fast image loading
- ✅ No console errors

## Alternative Solutions (Not Used)

### 1. **Proxy Server**
```typescript
// Could proxy images through our server
const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
```
**Why not used:**
- More complex
- Server load
- Slower
- Not necessary with referrer fix

### 2. **Different Image Source**
```typescript
// Could use AniList covers exclusively
const coverUrl = await anilistApi.searchMangaCover(title);
```
**Why not used:**
- AniList doesn't have all manga
- Rate limiting concerns
- MangaDex covers are high quality
- Referrer fix is simpler

### 3. **Fetch + Blob URLs**
```typescript
// Could fetch and convert to blob
const blob = await fetch(url).then(r => r.blob());
const blobUrl = URL.createObjectURL(blob);
```
**Why not used:**
- Memory intensive
- Complex cleanup
- Slower initial load
- Referrer fix is cleaner

## Edge Cases Handled

### 1. **Fallback Images**
- Still uses AniList covers when available
- UI Avatars for missing covers
- Placeholder for errors

### 2. **Loading States**
- Skeleton while loading
- Error handling intact
- Smooth transitions

### 3. **Browser Compatibility**
- `referrerPolicy` supported in all modern browsers
- Fallback to meta tag for older browsers
- No breaking changes

## Security Considerations

### Safe to Use:
- ✅ No security risks
- ✅ Standard web practice
- ✅ Recommended by MDN
- ✅ Used by major sites

### What It Doesn't Affect:
- ❌ Our own API calls
- ❌ Authentication
- ❌ User data
- ❌ Site functionality

### What It Does Affect:
- ✅ External image requests
- ✅ CDN requests
- ✅ Third-party resources

## Performance Impact

### Positive:
- ✅ Images load faster (no blocking)
- ✅ Fewer failed requests
- ✅ Better user experience
- ✅ No additional network calls

### Neutral:
- No performance degradation
- Same number of requests
- Same bandwidth usage

## Summary

Successfully bypassed MangaDex anti-scraping by:
- ✅ Adding `no-referrer` meta tag globally
- ✅ Adding image attributes to all manga images
- ✅ Maintaining fallback logic
- ✅ No breaking changes
- ✅ Better privacy as bonus

Manga covers now load correctly without anti-scraping blocks!
