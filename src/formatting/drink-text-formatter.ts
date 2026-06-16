import type { LanguageService } from '../i18n/language-service.ts';
import type { Drink, DrinkIngredient } from '../types.ts';

export class DrinkTextFormatter {
  private readonly languageService: LanguageService;

  constructor(languageService: LanguageService) {
    this.languageService = languageService;
  }

  normalizeSearchText(value: unknown): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  }

  getIngredientKey(name: string): string {
    return this.normalizeSearchText(name).trim();
  }

  formatIngredientSummary(ingredients: DrinkIngredient[]): string {
    const names = ingredients.map((ingredient) => {
      if (ingredient.prefix) {
        return `${ingredient.prefix}${ingredient.name}`.toLocaleLowerCase(this.languageService.currentLanguage);
      }

      return ingredient.name;
    });

    return this.formatList(names);
  }

  formatIngredientLine(ingredient: DrinkIngredient): string {
    if (ingredient.prefix) return `${ingredient.prefix}${ingredient.name}`;

    const amount = this.formatIngredientAmount(ingredient);
    return amount ? `${amount} ${ingredient.name}` : ingredient.name;
  }

  formatIngredientAmount(ingredient: DrinkIngredient): string {
    if (ingredient.prefix) return ingredient.prefix.trim();
    if (ingredient.quantity && ingredient.unit) return `${ingredient.quantity} ${ingredient.unit}`;
    if (ingredient.quantity) return String(ingredient.quantity);

    return '';
  }

  formatList(items: string[]): string {
    if (items.length === 0) return '';

    try {
      return new Intl.ListFormat(this.languageService.currentLanguage, {
        style: 'long',
        type: 'conjunction',
      }).format(items);
    } catch {
      const conjunction = this.languageService.currentLanguage === 'pt-BR' ? 'e' : 'and';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

      return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
    }
  }

  getDrinkSlug(drink: Drink): string {
    return drink.ibaLink.replace(/\/$/, '').split('/').pop() ?? '';
  }
}
