import type { DrinksApp } from './app/drinks-app.ts';
import type { DrinkRepository } from './data/drink-repository.ts';
import type { FavoriteStore } from './favorites/favorite-store.ts';
import type { DrinkFilterMatcher } from './filters/drink-filter-matcher.ts';
import type { DrinkFilterState } from './filters/drink-filter-state.ts';
import type { DrinkTextFormatter } from './formatting/drink-text-formatter.ts';
import type { LanguageSelectorController } from './i18n/language-selector-controller.ts';
import type { LanguageService } from './i18n/language-service.ts';
import type { TranslationService } from './i18n/translation-service.ts';
import type { IngredientCatalog } from './ingredients/ingredient-catalog.ts';
import type { IngredientStore } from './ingredients/ingredient-store.ts';
import type { FavoriteButtonPresenter } from './ui/favorite-button-presenter.ts';
import type { TemplateRenderer } from './ui/template-renderer.ts';

export interface DrinkIngredient {
  key?: string;
  name: string;
  note?: string;
  optional?: boolean;
  prefix?: string;
  quantity?: number | string | null;
  substitutions?: DrinkIngredientSubstitution[];
  unit?: string;
}

export interface DrinkIngredientSubstitution {
  key: string;
  name: string;
}

export interface Drink {
  name: string;
  photo: string;
  ibaLink: string;
  videoLink: string;
  method: string;
  garnish: string;
  ingredients: DrinkIngredient[];
  garnishIngredients?: DrinkIngredient[];
}

export interface DrinkRecipeIngredient {
  key: string;
  name: string;
  action?: 'fill' | 'top';
  amountLabel?: 'few';
  maxQuantity?: number;
  note?: string;
  optional?: boolean;
  quantity?: number;
  substitutions?: DrinkIngredientSubstitution[];
  unit?: string;
}

export interface DrinkRecipe {
  slug: string;
  name: string;
  photo: string;
  ibaLink: string;
  videoLink: string;
  method: string;
  garnish: string;
  ingredients: DrinkRecipeIngredient[];
  garnishIngredients?: DrinkRecipeIngredient[];
}

export interface DrinkIngredientTranslation {
  name: string;
  note?: string;
  substitutions?: Record<string, DrinkIngredientSubstitutionTranslation>;
}

export interface DrinkIngredientSubstitutionTranslation {
  name: string;
}

export interface DrinkTranslation {
  name: string;
  method: string;
  garnish: string;
  ingredients: Record<string, DrinkIngredientTranslation>;
  garnishIngredients?: Record<string, DrinkIngredientTranslation>;
}

export interface DrinkTranslationCatalog {
  [slug: string]: DrinkTranslation;
}

export interface DrinkFilterDefinition {
  id: string;
  labelKey: string;
  terms: string[];
}

export interface IngredientInventoryItem {
  key: string;
  aliasKeys: string[];
  name: string;
  drinkCount: number;
}

export interface FilterEventDetail {
  favoritesOnly: boolean;
  makeableOnly: boolean;
  missingOnly: boolean;
  category: string;
  query: string;
}

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

export interface Logger {
  error(value: unknown): void;
}

export interface AppEvents {
  languageChanged: string;
  favoritesChanged: string;
  filtersChanged: string;
  ingredientsChanged: string;
}

export interface ElementDefinition {
  tagName: string;
  elementClass: CustomElementConstructor;
}

export interface TranslationCatalog {
  [language: string]: Record<string, string>;
}

export interface LanguageFileMap {
  [language: string]: string;
}

export interface AppElementFactory {
  (app: DrinksApp): CustomElementConstructor;
}

export interface AppServices {
  BaseHTMLElement: typeof HTMLElement;
  URLSearchParamsConstructor: typeof URLSearchParams;
  favoriteButtons: FavoriteButtonPresenter;
  favoriteStore: FavoriteStore;
  filterDefinitions: DrinkFilterDefinition[];
  filterMatcher: DrinkFilterMatcher;
  filterState: DrinkFilterState;
  formatter: DrinkTextFormatter;
  ingredientCatalog: IngredientCatalog;
  ingredientStore: IngredientStore;
  languageSelectors: LanguageSelectorController;
  languageService: LanguageService;
  logger: Logger;
  repository: DrinkRepository;
  templates: TemplateRenderer;
  translations: TranslationService;
}
