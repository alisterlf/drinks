import type { DrinksApp } from './app/drinks-app.ts';
import type { DrinkRepository } from './data/drink-repository.ts';
import type { FavoriteStore } from './favorites/favorite-store.ts';
import type { DrinkFilterMatcher } from './filters/drink-filter-matcher.ts';
import type { DrinkFilterState } from './filters/drink-filter-state.ts';
import type { DrinkTextFormatter } from './formatting/drink-text-formatter.ts';
import type { GoogleAuthClient } from './google/google-auth-client.ts';
import type { LanguageSelectorController } from './i18n/language-selector-controller.ts';
import type { LanguageService } from './i18n/language-service.ts';
import type { TranslationService } from './i18n/translation-service.ts';
import type { IngredientCatalog } from './ingredients/ingredient-catalog.ts';
import type { IngredientStore } from './ingredients/ingredient-store.ts';
import type { ShoppingListBuilder } from './shopping/shopping-list-builder.ts';
import type { ShoppingSyncService } from './shopping/shopping-sync-service.ts';
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
  videoLink?: string;
  method: string;
  methodNote?: string;
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
  videoLink?: string;
  method: string;
  methodNote?: string;
  garnish?: string;
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
  methodNote?: string;
  garnish?: string;
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
  recipeKey: string;
  aliasKeys: string[];
  name: string;
  drinkCount: number;
}

export interface ShoppingListItem {
  key: string;
  recipeKey: string;
  name: string;
  aliasKeys: string[];
  drinkNames: string[];
}

export interface GoogleSession {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTask {
  id: string;
  title?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
}

export interface GoogleTaskFields {
  title: string;
  notes?: string;
}

export interface ShoppingSyncState {
  taskListId?: string;
  lastSyncedAt?: number;
}

export interface ShoppingSyncResult {
  total: number;
  added: number;
  updated: number;
  removed: number;
  bought: number;
  syncedAt: number;
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
  googleAuth: GoogleAuthClient;
  ingredientCatalog: IngredientCatalog;
  ingredientStore: IngredientStore;
  languageSelectors: LanguageSelectorController;
  languageService: LanguageService;
  logger: Logger;
  repository: DrinkRepository;
  shoppingList: ShoppingListBuilder;
  shoppingSync: ShoppingSyncService;
  templates: TemplateRenderer;
  translations: TranslationService;
}
