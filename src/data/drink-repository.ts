import type { LanguageService } from '../i18n/language-service.ts';
import type {
  Drink,
  DrinkIngredient,
  DrinkRecipe,
  DrinkRecipeIngredient,
  DrinkTranslation,
  DrinkTranslationCatalog,
  LanguageFileMap,
} from '../types.ts';

interface DrinkRepositoryOptions {
  languageService: LanguageService;
  dataFile: string;
  translationFileByLanguage: LanguageFileMap;
  baseUrl: string;
  fetcher: typeof fetch;
}

const ACTION_PREFIX_BY_LANGUAGE: Record<string, Record<NonNullable<DrinkRecipeIngredient['action']>, string>> = {
  en: {
    fill: 'Fill up with ',
    top: 'Top with ',
  },
  'pt-BR': {
    fill: 'Completar com ',
    top: 'Completar com ',
  },
};

const AMOUNT_LABEL_BY_LANGUAGE: Record<string, Record<NonNullable<DrinkRecipeIngredient['amountLabel']>, string>> = {
  en: {
    few: 'Few',
  },
  'pt-BR': {
    few: 'Algumas',
  },
};

const CONNECTOR_BY_LANGUAGE: Record<string, Partial<Record<string, string>>> = {
  en: {
    dash: '',
    dashes: '',
    drop: 'of',
    drops: 'of',
    splash: 'of',
  },
  'pt-BR': {
    dash: 'de',
    dashes: 'de',
    drop: 'de',
    drops: 'de',
    gotas: 'de',
    splash: 'de',
  },
};

export class DrinkRepository {
  private readonly languageService: LanguageService;
  private readonly dataFile: string;
  private readonly translationFileByLanguage: LanguageFileMap;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private recipes?: Promise<DrinkRecipe[]>;
  private readonly translationsByLanguage = new Map<string, Promise<DrinkTranslationCatalog>>();

  constructor({ languageService, dataFile, translationFileByLanguage, baseUrl, fetcher }: DrinkRepositoryOptions) {
    this.languageService = languageService;
    this.dataFile = dataFile;
    this.translationFileByLanguage = translationFileByLanguage;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async loadDrinks(): Promise<Drink[]> {
    return this.loadDrinksForLanguage(this.languageService.currentLanguage);
  }

  async loadAllLanguageDrinks(): Promise<Drink[][]> {
    return Promise.all(
      Object.keys(this.translationFileByLanguage).map((language) => this.loadDrinksForLanguage(language)),
    );
  }

  async loadDrinksForLanguage(language: string): Promise<Drink[]> {
    const [recipes, translations] = await Promise.all([this.loadRecipes(), this.loadTranslations(language)]);
    return recipes.map((recipe) => this.localizeDrink(recipe, translations[recipe.slug], language));
  }

  async loadRecipes(): Promise<DrinkRecipe[]> {
    if (!this.recipes) {
      this.recipes = this.fetchJson<DrinkRecipe[]>(this.getDataUrl(this.dataFile)).catch((error) => {
        this.recipes = undefined;
        throw error;
      });
    }

    return this.recipes;
  }

  async loadTranslations(language: string): Promise<DrinkTranslationCatalog> {
    const translationFile = this.translationFileByLanguage[language];
    if (!translationFile) return {};

    if (!this.translationsByLanguage.has(language)) {
      const request = this.fetchJson<DrinkTranslationCatalog>(this.getDataUrl(translationFile)).catch((error) => {
        this.translationsByLanguage.delete(language);
        throw error;
      });
      this.translationsByLanguage.set(language, request);
    }

    return this.translationsByLanguage.get(language)!;
  }

  getDataUrl(dataFile: string): string {
    return `${this.baseUrl}${dataFile}`;
  }

  async fetchJson<T>(dataUrl: string): Promise<T> {
    const response = await this.fetcher(dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${dataUrl}: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private localizeDrink(recipe: DrinkRecipe, translation: DrinkTranslation | undefined, language: string): Drink {
    return {
      name: translation?.name ?? recipe.name,
      photo: recipe.photo,
      ibaLink: recipe.ibaLink,
      videoLink: recipe.videoLink,
      method: translation?.method ?? recipe.method,
      garnish: translation?.garnish ?? recipe.garnish,
      ingredients: recipe.ingredients.map((ingredient) =>
        this.localizeIngredient(ingredient, translation?.ingredients[ingredient.key], language),
      ),
      garnishIngredients: recipe.garnishIngredients?.map((ingredient) =>
        this.localizeIngredient(ingredient, translation?.garnishIngredients?.[ingredient.key], language),
      ),
    };
  }

  private localizeIngredient(
    ingredient: DrinkRecipeIngredient,
    translation: DrinkTranslation['ingredients'][string] | undefined,
    language: string,
  ): DrinkIngredient {
    const localizedIngredient: DrinkIngredient = {
      key: ingredient.key,
      name: translation?.name ?? ingredient.name,
    };

    const note = translation?.note ?? ingredient.note;
    if (note) localizedIngredient.note = note;
    if (ingredient.optional) localizedIngredient.optional = true;
    if (ingredient.substitutions?.length) {
      localizedIngredient.substitutions = ingredient.substitutions.map((substitution) => ({
        key: substitution.key,
        name: translation?.substitutions?.[substitution.key]?.name ?? substitution.name,
      }));
    }

    const amount = this.localizeAmount(ingredient, language);
    return { ...localizedIngredient, ...amount };
  }

  private localizeAmount(ingredient: DrinkRecipeIngredient, language: string): Partial<DrinkIngredient> {
    if (ingredient.action) {
      return { prefix: this.actionPrefix(ingredient.action, language) };
    }

    if (ingredient.amountLabel && ingredient.unit) {
      const unit = this.localizeUnit(ingredient.unit, language, ingredient.quantity);
      const connector = this.connectorForUnit(unit, language);
      const prefix = [this.amountLabel(ingredient.amountLabel, language, unit), unit, connector]
        .filter(Boolean)
        .join(' ');
      return { prefix: `${prefix} ` };
    }

    if (ingredient.unit === 'splash' && ingredient.quantity === 1) {
      return { prefix: language === 'pt-BR' ? 'Um splash de ' : 'A splash of ' };
    }

    if (ingredient.quantity !== undefined && ingredient.maxQuantity !== undefined) {
      const quantity = `${ingredient.quantity}/${ingredient.maxQuantity}`;
      const unit = ingredient.unit ? this.localizeUnit(ingredient.unit, language, ingredient.maxQuantity) : undefined;
      return unit ? { quantity, unit } : { quantity };
    }

    if (ingredient.quantity !== undefined) {
      const unit = ingredient.unit ? this.localizeUnit(ingredient.unit, language, ingredient.quantity) : undefined;
      return unit ? { quantity: ingredient.quantity, unit } : { quantity: ingredient.quantity };
    }

    return {};
  }

  private localizeUnit(unit: string, language: string, quantity: number | undefined): string {
    if (language !== 'pt-BR') return unit;

    if (unit === 'bar spoons') return 'colheres bailarinas';
    if (unit === 'drops') return 'gotas';
    if (unit === 'pcs') return 'unid.';
    if (unit === 'teaspoon') return 'colher de chá';
    if (unit === 'teaspoons' || unit === 'tsp') return quantity === 1 ? 'colher de chá' : 'colheres de chá';

    return unit;
  }

  private actionPrefix(action: NonNullable<DrinkRecipeIngredient['action']>, language: string): string {
    return ACTION_PREFIX_BY_LANGUAGE[language]?.[action] ?? ACTION_PREFIX_BY_LANGUAGE.en[action];
  }

  private amountLabel(
    label: NonNullable<DrinkRecipeIngredient['amountLabel']>,
    language: string,
    unit: string,
  ): string {
    if (language === 'pt-BR' && label === 'few' && unit === 'dashes') return 'Alguns';

    return AMOUNT_LABEL_BY_LANGUAGE[language]?.[label] ?? AMOUNT_LABEL_BY_LANGUAGE.en[label];
  }

  private connectorForUnit(unit: string, language: string): string {
    return CONNECTOR_BY_LANGUAGE[language]?.[unit] ?? CONNECTOR_BY_LANGUAGE.en[unit] ?? '';
  }
}
