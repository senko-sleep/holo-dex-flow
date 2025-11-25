import { useState, useEffect } from 'react';
import { getMangaCoverUrl } from '@/services/mangaCoverService';

/**
 * Custom hook to fetch AniList manga covers
 * @param title - Manga title to search on AniList
 * @param delay - Optional delay in ms to stagger requests (default: random 0-400ms)
 * @returns coverUrl - The fetched cover URL (starts with placeholder)
 */
export function useMangaCover(title: string, delay?: number) {
  const [coverUrl, setCoverUrl] = useState('/placeholder.svg');

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(
      async () => {
        try {
          const url = await getMangaCoverUrl('', title);
          if (mounted) setCoverUrl(url);
        } catch (err) {
          console.warn(`Failed to load manga cover for ${title}`, err);

          if (mounted) {
            const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              title.substring(0, 2)
            )}&background=random&size=300`;
            setCoverUrl(fallback);
          }
        }
      },
      delay ?? Math.random() * 400
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [title, delay]);

  return coverUrl;
}
