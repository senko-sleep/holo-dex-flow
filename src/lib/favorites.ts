// Favorites/Bookmarks management with localStorage
export type FavoriteType = 'anime' | 'manga' | 'character';

export interface Favorite {
  id: string;
  type: FavoriteType;
  title: string;
  imageUrl: string;
  addedAt: number;
}

class FavoritesManager {
  private storageKey = 'animedex_favorites';

  private getFavorites(): Favorite[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading favorites:', error);
      return [];
    }
  }

  private saveFavorites(favorites: Favorite[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  add(favorite: Omit<Favorite, 'addedAt'>): void {
    const favorites = this.getFavorites();
    const exists = favorites.some(f => f.id === favorite.id && f.type === favorite.type);
    
    if (!exists) {
      favorites.unshift({
        ...favorite,
        addedAt: Date.now(),
      });
      this.saveFavorites(favorites);
    }
  }

  remove(id: string, type: FavoriteType): void {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(f => !(f.id === id && f.type === type));
    this.saveFavorites(filtered);
  }

  isFavorite(id: string, type: FavoriteType): boolean {
    const favorites = this.getFavorites();
    return favorites.some(f => f.id === id && f.type === type);
  }

  getAll(): Favorite[] {
    return this.getFavorites();
  }

  getByType(type: FavoriteType): Favorite[] {
    return this.getFavorites().filter(f => f.type === type);
  }

  clear(): void {
    this.saveFavorites([]);
  }

  getCount(): number {
    return this.getFavorites().length;
  }
}

export const favorites = new FavoritesManager();
