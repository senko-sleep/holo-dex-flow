// CORS proxy handler specifically for MangaDex API
// MangaDex doesn't support CORS from browser, so we need to use a proxy

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://cors-anywhere.herokuapp.com/',
  'https://proxy.cors.sh/',
  'https://thingproxy.freeboard.io/fetch/',
];

let currentProxyIndex = 0;
const proxyUsageCount = new Map<number, number>();
const proxyLastUsed = new Map<number, number>();
const RATE_LIMIT_DELAY = 1000; // 1 second between requests per proxy

/**
 * Get the best proxy to use based on usage and timing
 */
function getBestProxyIndex(): number {
  const now = Date.now();
  let bestIndex = currentProxyIndex;
  let lowestUsage = Infinity;

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const usage = proxyUsageCount.get(i) || 0;
    const lastUsed = proxyLastUsed.get(i) || 0;
    const timeSinceLastUse = now - lastUsed;

    // Prefer proxies that haven't been used recently and have low usage
    if (timeSinceLastUse > RATE_LIMIT_DELAY && usage < lowestUsage) {
      lowestUsage = usage;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Fetch with CORS proxy fallback and load balancing
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

    // Check for rate limiting
    if (response.status === 429) {
      console.warn('Rate limited on direct fetch, switching to proxy rotation');
      throw new Error('Rate limited');
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (directError) {
    // If direct fetch fails, try with CORS proxy
    console.warn('Direct fetch failed, trying CORS proxy...', directError);
    
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyIndex = (getBestProxyIndex() + i) % CORS_PROXIES.length;
      const proxyUrl = CORS_PROXIES[proxyIndex];
      
      // Check if we should wait before using this proxy
      const lastUsed = proxyLastUsed.get(proxyIndex) || 0;
      const timeSinceLastUse = Date.now() - lastUsed;
      if (timeSinceLastUse < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastUse));
      }
      
      try {
        const proxiedUrl = `${proxyUrl}${encodeURIComponent(url)}`;
        
        // Clean headers for proxy - remove problematic headers
        const cleanHeaders: Record<string, string> = {};
        if (options.headers) {
          const headers = options.headers as Record<string, string>;
          for (const [key, value] of Object.entries(headers)) {
            // Only include safe headers
            if (key.toLowerCase() === 'content-type' || key.toLowerCase() === 'accept') {
              cleanHeaders[key] = value;
            }
          }
        }
        
        const response = await fetch(proxiedUrl, {
          method: options.method || 'GET',
          mode: 'cors',
          headers: cleanHeaders,
          body: options.body,
        });

        // Update proxy usage stats
        proxyLastUsed.set(proxyIndex, Date.now());
        proxyUsageCount.set(proxyIndex, (proxyUsageCount.get(proxyIndex) || 0) + 1);

        if (response.ok) {
          // Update successful proxy index
          currentProxyIndex = proxyIndex;
          
          const data = await response.json();
          console.log(`✓ Proxy ${i + 1} (${proxyUrl}) succeeded`);
          return data;
        }

        // Handle rate limiting from proxy
        if (response.status === 429) {
          console.warn(`Proxy ${i + 1} rate limited, trying next...`);
          continue;
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
