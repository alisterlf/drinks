import type { StorageAdapter } from '../types.ts';

export class FavoriteStore {
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;

  constructor(storage: StorageAdapter, storageKey: string) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  has(slug: string): boolean {
    return this.readFavorites().has(slug);
  }

  toggle(slug: string): boolean {
    const favorites = this.readFavorites();

    if (favorites.has(slug)) {
      favorites.delete(slug);
    } else {
      favorites.add(slug);
    }

    this.saveFavorites(favorites);
    return favorites.has(slug);
  }

  readFavorites(): Set<string> {
    const value = this.storage.read(this.storageKey);
    if (!value) return new Set();

    try {
      return new Set(JSON.parse(value).filter((item: unknown) => typeof item === 'string'));
    } catch {
      return new Set();
    }
  }

  saveFavorites(favorites: Set<string>): void {
    this.storage.write(this.storageKey, JSON.stringify([...favorites]));
  }
}
