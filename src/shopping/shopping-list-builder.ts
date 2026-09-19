import type { FavoriteStore } from '../favorites/favorite-store.ts';
import type { DrinkFilterMatcher } from '../filters/drink-filter-matcher.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { IngredientCatalog } from '../ingredients/ingredient-catalog.ts';
import type { Drink, IngredientInventoryItem, ShoppingListItem } from '../types.ts';

interface ShoppingListBuilderOptions {
  formatter: DrinkTextFormatter;
  favoriteStore: FavoriteStore;
  filterMatcher: DrinkFilterMatcher;
  ingredientCatalog: IngredientCatalog;
}

/** Builds the shopping list: required ingredients missing for the drinks marked as favorites. */
export class ShoppingListBuilder {
  private readonly formatter: DrinkTextFormatter;
  private readonly favoriteStore: FavoriteStore;
  private readonly filterMatcher: DrinkFilterMatcher;
  private readonly ingredientCatalog: IngredientCatalog;

  constructor({ formatter, favoriteStore, filterMatcher, ingredientCatalog }: ShoppingListBuilderOptions) {
    this.formatter = formatter;
    this.favoriteStore = favoriteStore;
    this.filterMatcher = filterMatcher;
    this.ingredientCatalog = ingredientCatalog;
  }

  listFavoriteDrinks(drinks: Drink[]): Drink[] {
    const favorites = this.favoriteStore.readFavorites();
    return drinks.filter((drink) => favorites.has(this.formatter.getDrinkSlug(drink)));
  }

  listMissingIngredients(drinks: Drink[], relatedDrinkSets: Drink[][] = []): ShoppingListItem[] {
    const ingredientsByAlias = this.indexIngredientsByAlias(drinks, relatedDrinkSets);
    const itemsByKey = new Map<string, ShoppingListItem>();

    for (const drink of this.listFavoriteDrinks(drinks)) {
      for (const ingredient of this.filterMatcher.getMissingIngredients(drink)) {
        const key = this.formatter.getIngredientKey(ingredient.name);
        if (!key) continue;

        const catalogItem = ingredientsByAlias.get(key);
        const item = itemsByKey.get(key) ?? {
          key,
          recipeKey: ingredient.key ?? catalogItem?.recipeKey ?? key,
          name: ingredient.name,
          aliasKeys: catalogItem?.aliasKeys ?? [key],
          drinkNames: [],
        };

        if (!item.drinkNames.includes(drink.name)) item.drinkNames.push(drink.name);
        itemsByKey.set(key, item);
      }
    }

    return [...itemsByKey.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );
  }

  /** Every catalog ingredient, reachable by its name key in any supported language. */
  indexIngredientsByAlias(drinks: Drink[], relatedDrinkSets: Drink[][] = []): Map<string, IngredientInventoryItem> {
    const ingredientsByAlias = new Map<string, IngredientInventoryItem>();

    for (const ingredient of this.ingredientCatalog.listIngredients(drinks, relatedDrinkSets)) {
      for (const alias of ingredient.aliasKeys) {
        if (!ingredientsByAlias.has(alias)) ingredientsByAlias.set(alias, ingredient);
      }
    }

    return ingredientsByAlias;
  }
}
