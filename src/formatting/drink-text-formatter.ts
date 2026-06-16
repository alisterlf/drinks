import type { LanguageService } from '../i18n/language-service.ts';
import type { Drink, DrinkIngredient } from '../types.ts';

const OPTIONAL_LABEL_BY_LANGUAGE: Record<string, string> = {
  en: 'optional',
  'pt-BR': 'opcional',
};

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

  getIngredientOptionNames(ingredient: DrinkIngredient): string[] {
    return [ingredient.name, ...(ingredient.substitutions?.map((substitution) => substitution.name) ?? [])];
  }

  formatIngredientSummary(ingredients: DrinkIngredient[]): string {
    const names = ingredients.map((ingredient) => {
      if (ingredient.prefix) {
        return `${ingredient.prefix}${this.formatIngredientName(ingredient)}`.toLocaleLowerCase(
          this.languageService.currentLanguage,
        );
      }

      return this.formatIngredientName(ingredient);
    });

    return this.formatList(names);
  }

  formatIngredientLine(ingredient: DrinkIngredient): string {
    const name = this.formatIngredientName(ingredient);
    if (ingredient.prefix) return `${ingredient.prefix}${name}`;

    const amount = this.formatIngredientAmount(ingredient);
    return amount ? `${amount} ${name}` : name;
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

  formatAlternativeList(items: string[]): string {
    return this.formatDisjunction(items);
  }

  getDrinkSlug(drink: Drink): string {
    return drink.ibaLink.replace(/\/$/, '').split('/').pop() ?? '';
  }

  private formatIngredientName(ingredient: DrinkIngredient): string {
    const notes = [];
    const name = this.formatDisjunction(this.getIngredientOptionNames(ingredient));

    if (ingredient.optional) notes.push(this.optionalLabel);
    if (ingredient.note) notes.push(ingredient.note);

    return notes.length > 0 ? `${name} (${notes.join(', ')})` : name;
  }

  private get optionalLabel(): string {
    return OPTIONAL_LABEL_BY_LANGUAGE[this.languageService.currentLanguage] ?? OPTIONAL_LABEL_BY_LANGUAGE.en;
  }

  private formatDisjunction(items: string[]): string {
    if (items.length === 0) return '';

    try {
      return new Intl.ListFormat(this.languageService.currentLanguage, {
        style: 'long',
        type: 'disjunction',
      }).format(items);
    } catch {
      const conjunction = this.languageService.currentLanguage === 'pt-BR' ? 'ou' : 'or';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

      return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
    }
  }
}
