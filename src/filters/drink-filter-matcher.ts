import type { FavoriteStore } from '../favorites/favorite-store.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { IngredientStore } from '../ingredients/ingredient-store.ts';
import type { Drink, DrinkFilterDefinition } from '../types.ts';
import type { DrinkFilterState } from './drink-filter-state.ts';

export class DrinkFilterMatcher {
  private readonly filterState: DrinkFilterState;
  private readonly favoriteStore: FavoriteStore;
  private readonly ingredientStore: IngredientStore;
  private readonly formatter: DrinkTextFormatter;
  private readonly filterDefinitions: DrinkFilterDefinition[];

  constructor(
    filterState: DrinkFilterState,
    favoriteStore: FavoriteStore,
    ingredientStore: IngredientStore,
    formatter: DrinkTextFormatter,
    filterDefinitions: DrinkFilterDefinition[],
  ) {
    this.filterState = filterState;
    this.favoriteStore = favoriteStore;
    this.ingredientStore = ingredientStore;
    this.formatter = formatter;
    this.filterDefinitions = filterDefinitions;
  }

  filterDrinks(drinks: Drink[]): Drink[] {
    const query = this.formatter.normalizeSearchText(this.filterState.searchQuery).trim();

    return drinks.filter((drink) => {
      const slug = this.formatter.getDrinkSlug(drink);

      if (this.filterState.favoritesOnly && !this.favoriteStore.has(slug)) return false;
      if (this.filterState.makeableOnly && !this.canMakeDrink(drink)) return false;
      if (query && !this.drinkMatchesSearchQuery(drink, query)) return false;
      if (this.filterState.selectedCategory === 'all') return true;

      return this.drinkMatchesCategory(drink, this.filterState.selectedCategory);
    });
  }

  drinkMatchesSearchQuery(drink: Drink, query: string): boolean {
    const searchableText = this.formatter.normalizeSearchText(
      [drink.name, drink.method, drink.garnish, ...drink.ingredients.map((ingredient) => ingredient.name)].join(' '),
    );
    return searchableText.includes(query);
  }

  canMakeDrink(drink: Drink): boolean {
    return drink.ingredients.every((ingredient) =>
      this.ingredientStore.has(this.formatter.getIngredientKey(ingredient.name)),
    );
  }

  drinkMatchesCategory(drink: Drink, categoryId: string): boolean {
    const filter = this.filterDefinitions.find((item) => item.id === categoryId);
    if (!filter || filter.id === 'all') return true;

    const searchableIngredients = this.formatter.normalizeSearchText(
      drink.ingredients.map((ingredient) => ingredient.name).join(' '),
    );
    return filter.terms.some((term) => searchableIngredients.includes(term));
  }
}
