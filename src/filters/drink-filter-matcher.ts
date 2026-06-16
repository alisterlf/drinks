import type { FavoriteStore } from '../favorites/favorite-store.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { IngredientStore } from '../ingredients/ingredient-store.ts';
import type { Drink, DrinkFilterDefinition } from '../types.ts';
import type { DrinkFilterState } from './drink-filter-state.ts';

const WHOLE_INGREDIENT_BY_PREPARED_INGREDIENT_KEY: Record<string, string> = {
  'lemon-juice': 'lemon',
  'lime-juice': 'lime',
  'orange-juice': 'orange',
  'pineapple-juice': 'pineapple',
};

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
      if (this.filterState.missingOnly && this.getMissingIngredients(drink).length === 0) return false;
      if (query && !this.drinkMatchesSearchQuery(drink, query)) return false;
      if (this.filterState.selectedCategory === 'all') return true;

      return this.drinkMatchesCategory(drink, this.filterState.selectedCategory);
    });
  }

  drinkMatchesSearchQuery(drink: Drink, query: string): boolean {
    const searchableText = this.formatter.normalizeSearchText(
      [
        drink.name,
        drink.method,
        drink.garnish,
        ...this.getSearchableIngredients(drink).flatMap((ingredient) =>
          this.formatter.getIngredientOptionNames(ingredient),
        ),
      ].join(' '),
    );
    return searchableText.includes(query);
  }

  canMakeDrink(drink: Drink): boolean {
    return this.getMissingIngredients(drink).length === 0;
  }

  getMissingIngredients(drink: Drink): Drink['ingredients'] {
    return drink.ingredients.filter(
      (ingredient) =>
        !ingredient.optional &&
        !this.formatter
          .getIngredientOptionNames(ingredient)
          .some((name) => this.hasRequiredIngredient(this.formatter.getIngredientKey(name))),
    );
  }

  hasRequiredIngredient(ingredientKey: string): boolean {
    return (
      this.ingredientStore.has(ingredientKey) ||
      this.ingredientStore.has(WHOLE_INGREDIENT_BY_PREPARED_INGREDIENT_KEY[ingredientKey] ?? '')
    );
  }

  drinkMatchesCategory(drink: Drink, categoryId: string): boolean {
    const filter = this.filterDefinitions.find((item) => item.id === categoryId);
    if (!filter || filter.id === 'all') return true;

    const searchableIngredients = this.formatter.normalizeSearchText(
      this.getSearchableIngredients(drink)
        .flatMap((ingredient) => this.formatter.getIngredientOptionNames(ingredient))
        .join(' '),
    );
    return filter.terms.some((term) => searchableIngredients.includes(term));
  }

  getSearchableIngredients(drink: Drink) {
    return [...drink.ingredients, ...(drink.garnishIngredients ?? [])];
  }
}
