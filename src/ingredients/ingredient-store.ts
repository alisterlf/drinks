import type { StorageAdapter } from '../types.ts';

export class IngredientStore {
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;

  constructor(storage: StorageAdapter, storageKey: string) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  has(ingredientKey: string): boolean {
    return this.readIngredients().has(ingredientKey);
  }

  hasAny(ingredientKeys: string[]): boolean {
    const ingredients = this.readIngredients();
    return ingredientKeys.some((ingredientKey) => ingredients.has(ingredientKey));
  }

  toggleAll(ingredientKeys: string[]): boolean {
    const ingredients = this.readIngredients();
    const shouldAdd = !ingredientKeys.some((ingredientKey) => ingredients.has(ingredientKey));

    for (const ingredientKey of ingredientKeys) {
      if (shouldAdd) {
        ingredients.add(ingredientKey);
      } else {
        ingredients.delete(ingredientKey);
      }
    }

    this.saveIngredients(ingredients);
    return shouldAdd;
  }

  toggle(ingredientKey: string): boolean {
    const ingredients = this.readIngredients();

    if (ingredients.has(ingredientKey)) {
      ingredients.delete(ingredientKey);
    } else {
      ingredients.add(ingredientKey);
    }

    this.saveIngredients(ingredients);
    return ingredients.has(ingredientKey);
  }

  readIngredients(): Set<string> {
    const value = this.storage.read(this.storageKey);
    if (!value) return new Set();

    try {
      return new Set(JSON.parse(value).filter((item: unknown) => typeof item === 'string'));
    } catch {
      return new Set();
    }
  }

  saveIngredients(ingredients: Set<string>): void {
    this.storage.write(this.storageKey, JSON.stringify([...ingredients]));
  }
}
