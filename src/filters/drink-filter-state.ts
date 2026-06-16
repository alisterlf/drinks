import type { FilterEventDetail, StorageAdapter } from '../types.ts';

export type InventoryFilterMode = 'all' | 'makeable' | 'missing';

interface DrinkFilterStateOptions {
  storage: StorageAdapter;
  storageKey: string;
}

interface StoredDrinkFilterState {
  inventoryFilterMode?: InventoryFilterMode;
}

export class DrinkFilterState {
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;

  favoritesOnly: boolean;
  makeableOnly: boolean;
  missingOnly: boolean;
  selectedCategory: string;
  searchQuery: string;

  constructor({ storage, storageKey }: DrinkFilterStateOptions) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.favoritesOnly = false;
    this.makeableOnly = false;
    this.missingOnly = false;
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.restoreStoredState();
  }

  updateSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly = !this.favoritesOnly;
  }

  toggleMakeableOnly(): void {
    this.selectInventoryFilter(this.makeableOnly ? 'all' : 'makeable');
  }

  toggleMissingOnly(): void {
    this.selectInventoryFilter(this.missingOnly ? 'all' : 'missing');
  }

  selectInventoryFilter(mode: InventoryFilterMode): void {
    this.makeableOnly = mode === 'makeable';
    this.missingOnly = mode === 'missing';
    this.saveStoredState();
  }

  get inventoryFilterMode(): InventoryFilterMode {
    if (this.makeableOnly) return 'makeable';
    if (this.missingOnly) return 'missing';
    return 'all';
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  toEventDetail(): FilterEventDetail {
    return {
      favoritesOnly: this.favoritesOnly,
      makeableOnly: this.makeableOnly,
      missingOnly: this.missingOnly,
      category: this.selectedCategory,
      query: this.searchQuery,
    };
  }

  restoreStoredState(): void {
    const value = this.storage.read(this.storageKey);
    if (!value) return;

    try {
      const state = JSON.parse(value) as StoredDrinkFilterState;
      if (this.isInventoryFilterMode(state.inventoryFilterMode)) {
        this.selectInventoryFilter(state.inventoryFilterMode);
      }
    } catch {
      // The default filter state is used when persisted state is invalid.
    }
  }

  saveStoredState(): void {
    this.storage.write(
      this.storageKey,
      JSON.stringify({
        inventoryFilterMode: this.inventoryFilterMode,
      } satisfies StoredDrinkFilterState),
    );
  }

  isInventoryFilterMode(value: unknown): value is InventoryFilterMode {
    return value === 'all' || value === 'makeable' || value === 'missing';
  }
}
