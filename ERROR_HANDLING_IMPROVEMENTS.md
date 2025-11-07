# API Error Handling & Rate Limit Detection

## Summary
Enhanced the application to detect and display user-friendly error messages, including rate limiting from the AniList API.

## Changes Made

### 1. Enhanced Error Detection (`src/services/anilistApi.ts`)
- **Created `AniListAPIError` class** with properties:
  - `message`: Human-readable error description
  - `statusCode`: HTTP status code (429, 500, 503, etc.)
  - `isRateLimited`: Boolean flag for rate limit detection
  - `retryAfter`: Seconds to wait before retrying (from `Retry-After` header)

- **Improved `graphqlRequest` function** to detect:
  - **Rate Limiting (429)**: Extracts retry time from headers
  - **Server Errors (500)**: "AniList server error. The service may be temporarily unavailable."
  - **Service Unavailable (503)**: "AniList service is temporarily unavailable."
  - **Not Found (404)**: "Requested resource not found on AniList."
  - **Network Errors**: "Network error connecting to AniList"

### 2. User-Friendly Toast Notifications (`src/services/animeApi.ts`)
- Added toast notifications for all API errors
- **Rate Limit Errors** show:
  - Title: "⏱️ Rate Limited"
  - Description: Exact message with retry time
  - Variant: Destructive (red)
  
- **Other API Errors** show:
  - Title: "⚠️ API Error" / "⚠️ Search Error"
  - Description: Specific error message
  - Variant: Destructive (red)

### 3. Toast Configuration (`src/hooks/use-toast.ts`)
- Updated `TOAST_LIMIT` from 1 to 3 (show up to 3 toasts)
- Updated `TOAST_REMOVE_DELAY` from 1000000ms to 5000ms (5 seconds auto-dismiss)

## What Users Will See

### When Rate Limited:
```
┌─────────────────────────────────────────┐
│ ⏱️ Rate Limited                         │
│ Rate limited by AniList API. Please     │
│ wait 60 seconds before trying again.    │
└─────────────────────────────────────────┘
```

### When Server Error:
```
┌─────────────────────────────────────────┐
│ ⚠️ API Error                            │
│ AniList server error. The service may   │
│ be temporarily unavailable.             │
└─────────────────────────────────────────┘
```

### When Network Error:
```
┌─────────────────────────────────────────┐
│ ⚠️ API Error                            │
│ Network error connecting to AniList     │
└─────────────────────────────────────────┘
```

## Benefits

1. **No More Guessing**: Users see exactly what went wrong
2. **Rate Limit Awareness**: Users know when they're being rate limited and how long to wait
3. **Better UX**: Clear, actionable error messages instead of silent failures
4. **Console Logging**: Detailed errors still logged for debugging
5. **Auto-Dismiss**: Toasts automatically disappear after 5 seconds

## Testing

To test rate limiting:
1. Make many rapid requests (refresh page multiple times quickly)
2. Watch for the rate limit toast notification
3. Check browser console for detailed error logs

## Technical Details

- Error handling uses TypeScript type assertions (`as APIError`)
- Toast system already existed in the app (shadcn/ui)
- Errors are caught at the API service layer
- Original error objects preserved in console logs for debugging
