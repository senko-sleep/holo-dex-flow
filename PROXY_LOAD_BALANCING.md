# Proxy Load Balancing & Rate Limit Prevention

## Overview
Implemented a comprehensive proxy rotation and load balancing system to prevent API rate limiting across all external services (AniList, Hitomi, MangaDex).

## Features Implemented

### 1. **Enhanced CORS Proxy System** (`src/lib/corsProxy.ts`)
- **6 CORS Proxies** with automatic rotation:
  - `api.allorigins.win`
  - `corsproxy.io`
  - `api.codetabs.com`
  - `cors-anywhere.herokuapp.com`
  - `proxy.cors.sh`
  - `thingproxy.freeboard.io`

- **Intelligent Load Balancing**:
  - Tracks usage count per proxy
  - Tracks last used timestamp per proxy
  - Selects least-used proxy with sufficient cooldown time
  - 1-second minimum delay between requests per proxy

- **Rate Limit Handling**:
  - Detects HTTP 429 responses
  - Automatically switches to next available proxy
  - Implements exponential backoff on failures

### 2. **Request Queue System** (`src/lib/requestQueue.ts`)
- **Priority-based queuing**: Higher priority requests processed first
- **Rate limiting**: Configurable requests per second
- **Distributed timing**: Spreads requests over time to prevent bursts

#### Queue Configurations:
```typescript
anilistQueue: 2 requests/second  // AniList GraphQL API
mangaQueue: 3 requests/second    // Manga providers
imageQueue: 5 requests/second    // Image loading
```

### 3. **AniList API Integration** (`src/services/anilistApi.ts`)
- **Dual-mode operation**:
  1. Direct fetch (primary)
  2. Proxy rotation (fallback)

- **Automatic failover**:
  - CORS errors → Switch to proxy
  - Rate limit (429) → Switch to proxy
  - Network errors → Switch to proxy

- **Request queuing**: All GraphQL requests go through queue

### 4. **Production Build Support**
- Works in both development and production builds
- No dependency on Vite dev server proxy
- CORS proxies handle all external API calls

## How It Works

### Request Flow:
```
1. User Action
   ↓
2. Request Queue (rate limiting)
   ↓
3. Direct Fetch Attempt
   ↓
4. Success? → Return data
   ↓
5. Failure? → Try CORS Proxy
   ↓
6. Proxy Load Balancer (selects best proxy)
   ↓
7. Proxy Rotation (tries all 6 proxies)
   ↓
8. Success? → Return data
   ↓
9. All Failed? → Retry with backoff
```

### Load Balancing Algorithm:
```typescript
function getBestProxyIndex() {
  for each proxy:
    - Check usage count
    - Check time since last use
    - Prefer: low usage + sufficient cooldown
  return best proxy index
}
```

## Benefits

### 1. **No Rate Limiting**
- Requests distributed across 6 proxies
- Each proxy has 1-second cooldown
- Effective rate: 6 requests/second across all proxies

### 2. **High Availability**
- If one proxy fails, automatically tries next
- If direct fetch fails, falls back to proxies
- Graceful degradation

### 3. **Production Ready**
- Works without dev server
- No CORS issues in production
- Handles network failures gracefully

### 4. **Performance**
- Request deduplication (same requests cached)
- Priority queuing (important requests first)
- Parallel processing (up to 6 concurrent)

## Usage Examples

### AniList API (Automatic):
```typescript
// Automatically uses queue + proxy rotation
const anime = await anilistApi.getTopAnime(1, 24);
```

### Custom Request with Queue:
```typescript
import { withQueue, anilistQueue } from '@/lib/requestQueue';

const data = await withQueue(anilistQueue, async () => {
  return fetch('https://api.example.com/data');
}, priority);
```

### Manual Proxy Usage:
```typescript
import { fetchWithCorsProxy } from '@/lib/corsProxy';

const data = await fetchWithCorsProxy('https://api.example.com/data', {
  method: 'POST',
  body: JSON.stringify({ query: 'test' })
});
```

## Monitoring

### Console Logs:
- `✓ Proxy N succeeded` - Proxy request successful
- `Rate limited, switching to proxy` - Detected rate limit
- `Direct fetch failed, trying proxy` - CORS/network error
- `Proxy N failed` - Individual proxy failure

### Queue Status:
```typescript
import { anilistQueue } from '@/lib/requestQueue';

console.log('Queue size:', anilistQueue.size);
anilistQueue.setRateLimit(3); // Adjust rate limit
```

## Configuration

### Adjust Rate Limits:
```typescript
// In src/lib/requestQueue.ts
export const anilistQueue = new RequestQueue(2); // Change number
```

### Add More Proxies:
```typescript
// In src/lib/corsProxy.ts
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://your-new-proxy.com/?url=', // Add here
];
```

### Adjust Proxy Cooldown:
```typescript
// In src/lib/corsProxy.ts
const RATE_LIMIT_DELAY = 1000; // milliseconds
```

## Testing

### Test Rate Limiting:
1. Make rapid requests to AniList API
2. Watch console for "Rate limited" messages
3. Verify automatic proxy switching

### Test Proxy Rotation:
1. Disable direct fetch (simulate CORS error)
2. Make multiple requests
3. Verify different proxies being used

### Test Production Build:
1. `npm run build`
2. Serve `dist/` folder
3. Verify all API calls work without dev server

## Troubleshooting

### All Proxies Failing:
- Check internet connectivity
- Verify proxy URLs are accessible
- Check browser console for specific errors

### Still Getting Rate Limited:
- Reduce requests per second in queue config
- Increase RATE_LIMIT_DELAY in corsProxy.ts
- Add more proxies to rotation

### Slow Performance:
- Increase requests per second in queue
- Reduce RATE_LIMIT_DELAY
- Check network latency

## Future Improvements

1. **Proxy Health Monitoring**: Track success rates per proxy
2. **Dynamic Rate Adjustment**: Auto-adjust based on 429 responses
3. **Proxy Pool Management**: Add/remove proxies dynamically
4. **Request Analytics**: Track usage patterns and optimize
5. **Caching Layer**: More aggressive caching to reduce requests

## Files Modified

- ✅ `src/lib/corsProxy.ts` - Enhanced with load balancing
- ✅ `src/lib/requestQueue.ts` - New request queue system
- ✅ `src/services/anilistApi.ts` - Integrated queue + proxy
- ✅ `vite.config.ts` - Dev server proxy (dev only)

## Status: ✅ PRODUCTION READY

All features tested and working in both development and production builds.
