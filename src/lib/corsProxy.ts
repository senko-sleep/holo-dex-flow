// CORS proxy handler specifically for MangaDex API
// MangaDex doesn't support CORS from browser, so we need to use a proxy

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://cors-anywhere.herokuapp.com/',
];

let currentProxyIndex = 0;

/**
 * Fetch with CORS proxy fallback
 */
export async function fetchWithCorsProxy<T = unknown>(
  url: string,
  options: RequestInit = {},
  retries: number = 2
): Promise<T> {
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (directError) {
    // If direct fetch fails, try with CORS proxy
    console.warn('Direct fetch failed, trying CORS proxy...', directError);
    
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = CORS_PROXIES[(currentProxyIndex + i) % CORS_PROXIES.length];
      
      try {
        const proxiedUrl = `${proxyUrl}${encodeURIComponent(url)}`;
        const response = await fetch(proxiedUrl, {
          ...options,
          mode: 'cors',
          headers: {
            ...options.headers,
            // Remove authorization header for proxy (security)
            'Authorization': undefined,
          } as HeadersInit,
        });

        if (response.ok) {
          // Update successful proxy index
          currentProxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
          
          const data = await response.json();
          return data;
        }
      } catch (proxyError) {
        console.warn(`Proxy ${i + 1} failed:`, proxyError);
        continue;
      }
    }

    // All proxies failed
    if (retries > 0) {
      console.warn(`All proxies failed, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithCorsProxy(url, options, retries - 1);
    }

    throw new Error('All CORS proxies failed');
  }
}

/**
 * Fetch MangaDex API with automatic CORS handling
 */
export async function fetchMangaDex<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const MANGADEX_BASE_URL = 'https://api.mangadex.org';
  const url = endpoint.startsWith('http') ? endpoint : `${MANGADEX_BASE_URL}${endpoint}`;

  return fetchWithCorsProxy<T>(url, options);
}

/**
 * Check if error is CORS-related
 */
export function isCorsError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('cors') ||
      message.includes('cross-origin') ||
      message.includes('network') ||
      message.includes('failed to fetch')
    );
  }
  return false;
}
