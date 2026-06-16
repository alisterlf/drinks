import type { FilterEventDetail } from '../types.ts';

export class DrinkFilterState {
  favoritesOnly: boolean;
  makeableOnly: boolean;
  selectedCategory: string;
  searchQuery: string;

  constructor() {
    this.favoritesOnly = false;
    this.makeableOnly = false;
    this.selectedCategory = 'all';
    this.searchQuery = '';
  }

  updateSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly = !this.favoritesOnly;
  }

  toggleMakeableOnly(): void {
    this.makeableOnly = !this.makeableOnly;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  toEventDetail(): FilterEventDetail {
    return {
      favoritesOnly: this.favoritesOnly,
      makeableOnly: this.makeableOnly,
      category: this.selectedCategory,
      query: this.searchQuery,
    };
  }
}
