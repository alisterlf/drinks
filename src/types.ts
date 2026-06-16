import type { DrinksApp } from './app/drinks-app.ts';
import type { DrinkRepository } from './data/drink-repository.ts';
import type { FavoriteStore } from './favorites/favorite-store.ts';
import type { DrinkFilterMatcher } from './filters/drink-filter-matcher.ts';
import type { DrinkFilterState } from './filters/drink-filter-state.ts';
import type { DrinkTextFormatter } from './formatting/drink-text-formatter.ts';
import type { IngredientStore } from './ingredients/ingredient-store.ts';
import type { IngredientCatalog } from './ingredients/ingredient-catalog.ts';
import type { LanguageSelectorController } from './i18n/language-selector-controller.ts';
import type { LanguageService } from './i18n/language-service.ts';
import type { TranslationService } from './i18n/translation-service.ts';
import type { FavoriteButtonPresenter } from './ui/favorite-button-presenter.ts';
import type { TemplateRenderer } from './ui/template-renderer.ts';

export interface DrinkIngredient {
  name: string;
  prefix?: string;
  quantity?: number | string | null;
  unit?: string;
}

export interface Drink {
  name: string;
  photo: string;
  ibaLink: string;
  method: string;
  garnish: string;
  ingredients: DrinkIngredient[];
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
