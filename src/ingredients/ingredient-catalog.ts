import type { Drink, IngredientInventoryItem } from '../types.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';

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

      for (const [ingredientIndex, ingredient] of drink.ingredients.entries()) {
        const key = this.formatter.getIngredientKey(ingredient.name);
        if (!key) continue;
        const aliasKeys = this.getIngredientAliasKeys(drinkSlug, ingredientIndex, ingredient.name, relatedDrinksBySlug);

        if (!ingredientsByKey.has(key)) {
          ingredientsByKey.set(key, { key, aliasKeys, name: ingredient.name, drinkCount: 0 });
        }

        const drinkSlugs = drinkSlugsByIngredientKey.get(key) ?? new Set<string>();
        drinkSlugs.add(drinkSlug);
        drinkSlugsByIngredientKey.set(key, drinkSlugs);
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

  getIngredientAliasKeys(
    drinkSlug: string,
    ingredientIndex: number,
    ingredientName: string,
    relatedDrinksBySlug: Map<string, Drink>[],
  ): string[] {
    const aliases = new Set([this.formatter.getIngredientKey(ingredientName)]);

    for (const drinksBySlug of relatedDrinksBySlug) {
      const relatedIngredient = drinksBySlug.get(drinkSlug)?.ingredients[ingredientIndex];
      if (relatedIngredient) aliases.add(this.formatter.getIngredientKey(relatedIngredient.name));
    }

    return [...aliases].filter(Boolean);
  }
}
