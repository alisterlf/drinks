import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { Drink, IngredientInventoryItem } from '../types.ts';

export class IngredientCatalog {
  private readonly formatter: DrinkTextFormatter;

  constructor(formatter: DrinkTextFormatter) {
    this.formatter = formatter;
  }

  listIngredients(drinks: Drink[], relatedDrinkSets: Drink[][] = []): IngredientInventoryItem[] {
    const ingredientsByKey = new Map<string, IngredientInventoryItem>();
    const drinkSlugsByIngredientKey = new Map<string, Set<string>>();
    const relatedDrinksBySlug = relatedDrinkSets.map((relatedDrinks) => this.mapDrinksBySlug(relatedDrinks));

    for (const drink of drinks) {
      const drinkSlug = this.formatter.getDrinkSlug(drink);

      for (const [ingredientIndex, ingredient] of this.getInventoryIngredients(drink).entries()) {
        const optionRecipeKeys = this.getIngredientOptionRecipeKeys(ingredient);

        for (const [optionIndex, ingredientName] of this.formatter.getIngredientOptionNames(ingredient).entries()) {
          const key = this.formatter.getIngredientKey(ingredientName);
          if (!key) continue;
          const recipeKey = optionRecipeKeys[optionIndex] || key;
          const aliasKeys = this.getIngredientAliasKeys(
            drinkSlug,
            ingredientIndex,
            optionIndex,
            ingredientName,
            relatedDrinksBySlug,
          );

          if (!ingredientsByKey.has(key)) {
            ingredientsByKey.set(key, { key, recipeKey, aliasKeys, name: ingredientName, drinkCount: 0 });
          }

          const drinkSlugs = drinkSlugsByIngredientKey.get(key) ?? new Set<string>();
          drinkSlugs.add(drinkSlug);
          drinkSlugsByIngredientKey.set(key, drinkSlugs);
        }
      }
    }

    for (const [key, drinkSlugs] of drinkSlugsByIngredientKey) {
      const ingredient = ingredientsByKey.get(key);
      if (ingredient) ingredient.drinkCount = drinkSlugs.size;
    }

    return [...ingredientsByKey.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );
  }

  mapDrinksBySlug(drinks: Drink[]): Map<string, Drink> {
    return new Map(drinks.map((drink) => [this.formatter.getDrinkSlug(drink), drink]));
  }

  getInventoryIngredients(drink: Drink) {
    return [...drink.ingredients, ...(drink.garnishIngredients ?? [])];
  }

  getIngredientOptionRecipeKeys(ingredient: Drink['ingredients'][number]): string[] {
    return [ingredient.key ?? '', ...(ingredient.substitutions?.map((substitution) => substitution.key) ?? [])];
  }

  getIngredientAliasKeys(
    drinkSlug: string,
    ingredientIndex: number,
    optionIndex: number,
    ingredientName: string,
    relatedDrinksBySlug: Map<string, Drink>[],
  ): string[] {
    const aliases = new Set([this.formatter.getIngredientKey(ingredientName)]);

    for (const drinksBySlug of relatedDrinksBySlug) {
      const relatedDrink = drinksBySlug.get(drinkSlug);
      const relatedIngredient = relatedDrink ? this.getInventoryIngredients(relatedDrink)[ingredientIndex] : undefined;
      if (relatedIngredient) {
        const relatedIngredientName = this.formatter.getIngredientOptionNames(relatedIngredient)[optionIndex];
        if (relatedIngredientName) aliases.add(this.formatter.getIngredientKey(relatedIngredientName));
      }
    }

    return [...aliases].filter(Boolean);
  }
}
