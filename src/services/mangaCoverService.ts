import { cache } from '@/lib/cache';
import { anilistApi } from './anilistApi';

// Generate fallback avatar URL
function generateFallbackCover(title: string): string {
  const words = title.trim().split(/\s+/);
  const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash).toString(16).substring(0, 6).padEnd(6, '0');

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=300&bold=true&format=png`;
}

// Search AniList for manga cover
async function searchAniListManga(title: string): Promise<string | null> {
  try {
    const direct = await anilistApi.searchMangaCover(title);
    if (direct) {
      console.log(`✓ Found AniList cover: ${title}`);
      return direct;
    }

    const variations = [
      title.replace(/\([^)]*\)/g, '').trim(),
      title.split(':')[0].trim(),
      title.split('-')[0].trim(),
      title.replace(/[^\w\s]/g, '').trim()
    ].filter((v, i, arr) => v && v !== title && arr.indexOf(v) === i);

    for (const v of variations) {
      if (v.length < 2) continue;
      const res = await anilistApi.searchMangaCover(v);
      if (res) {
        console.log(`✓ Found AniList cover for "${title}" via "${v}"`);
        return res;
      }
    }

    console.log(`✗ No AniList cover found: ${title}`);
    return null;
  } catch (err) {
    console.error(`Error searching AniList for "${title}":`, err);
    return null;
  }
}

/**
 * Get manga cover (AniList prioritized)
 */
export async function getMangaCoverUrl(originalCoverUrl: string, title: string): Promise<string> {
  // 1. Always prioritize AniList high-res covers
  const ani = await searchAniListManga(title);
  if (ani) return ani;

  // 2. Use provider's cover only if it exists AND isn't placeholder
  if (originalCoverUrl && !originalCoverUrl.includes('placeholder')) {
    return originalCoverUrl;
  }

  // 3. Final fallback
  return generateFallbackCover(title);
}

/**
 * Synchronous fallback only (never calls AniList)
 */
export function getMangaCoverUrlSync(originalCoverUrl: string, title: string): string {
  if (originalCoverUrl && !originalCoverUrl.includes('placeholder')) {
    return originalCoverUrl;
  }
  return generateFallbackCover(title);
}

/**
 * Preload AniList covers for smoother UI
 */
export async function preloadMangaCovers(
  mangaList: Array<{ title: string; coverUrl: string }>
): Promise<void> {
  const tasks = mangaList.map(m => searchAniListManga(m.title));
  await Promise.allSettled(tasks);
}
