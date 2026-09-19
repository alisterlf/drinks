import { DrinksApp } from './src/app/drinks-app.js';
import {
  APP_EVENTS,
  DRINK_DATA_FILE,
  DRINK_FILTER_DEFINITIONS,
  DRINK_TRANSLATION_FILE_BY_LANGUAGE,
  GOOGLE_CLIENT_ID,
  GOOGLE_SYNC,
  STORAGE_KEYS,
} from './src/config.js';
import { DrinkRepository } from './src/data/drink-repository.js';
import { createDrinkDetailElement } from './src/elements/drink-detail-element.js';
import { createDrinkFiltersElement } from './src/elements/drink-filters-element.js';
import { createDrinkGridElement } from './src/elements/drink-grid-element.js';
import { createIngredientInventoryElement } from './src/elements/ingredient-inventory-element.js';
import { createShoppingListElement } from './src/elements/shopping-list-element.js';
import { FavoriteStore } from './src/favorites/favorite-store.js';
import { DrinkFilterMatcher } from './src/filters/drink-filter-matcher.js';
import { DrinkFilterState } from './src/filters/drink-filter-state.js';
import { DrinkTextFormatter } from './src/formatting/drink-text-formatter.js';
import { GoogleAuthClient, type GoogleIdentityGlobal } from './src/google/google-auth-client.js';
import { GoogleTasksClient } from './src/google/google-tasks-client.js';
import { LanguageSelectorController } from './src/i18n/language-selector-controller.js';
import { LanguageService } from './src/i18n/language-service.js';
import { TranslationService } from './src/i18n/translation-service.js';
import { DEFAULT_TRANSLATION_LANGUAGE, TRANSLATION_CATALOG } from './src/i18n/translations.js';
import { IngredientCatalog } from './src/ingredients/ingredient-catalog.js';
import { IngredientStore } from './src/ingredients/ingredient-store.js';
import { ShoppingListBuilder } from './src/shopping/shopping-list-builder.js';
import { ShoppingSyncService } from './src/shopping/shopping-sync-service.js';
import { BrowserStorage } from './src/storage/browser-storage.js';
import type { AppServices, ElementDefinition } from './src/types.ts';
import { FavoriteButtonPresenter } from './src/ui/favorite-button-presenter.js';
import { TemplateRenderer } from './src/ui/template-renderer.js';

const storage = new BrowserStorage(localStorage);
const sessionStore = new BrowserStorage(sessionStorage);
const fetcher = fetch.bind(window);
const languageService = new LanguageService({
  storage,
  storageKey: STORAGE_KEYS.language,
  languageFileByLanguage: DRINK_TRANSLATION_FILE_BY_LANGUAGE,
  navigatorApi: navigator,
});
const translations = new TranslationService(languageService, TRANSLATION_CATALOG, DEFAULT_TRANSLATION_LANGUAGE);
const favoriteStore = new FavoriteStore(storage, STORAGE_KEYS.favorites);
const ingredientStore = new IngredientStore(storage, STORAGE_KEYS.ingredients);
const filterState = new DrinkFilterState({ storage, storageKey: STORAGE_KEYS.filters });
const formatter = new DrinkTextFormatter(languageService);
const ingredientCatalog = new IngredientCatalog(formatter);
const filterMatcher = new DrinkFilterMatcher(
  filterState,
  favoriteStore,
  ingredientStore,
  formatter,
  DRINK_FILTER_DEFINITIONS,
);
const repository = new DrinkRepository({
  languageService,
  dataFile: DRINK_DATA_FILE,
  translationFileByLanguage: DRINK_TRANSLATION_FILE_BY_LANGUAGE,
  baseUrl: import.meta.env.BASE_URL,
  fetcher,
});

const languageSelectors = new LanguageSelectorController({
  documentRoot: document,
  languageService,
  translationService: translations,
  onLanguageChange: (language) => app.changeLanguage(language),
});

const googleAuth = new GoogleAuthClient({
  clientId: GOOGLE_CLIENT_ID,
  scopes: GOOGLE_SYNC.scopes,
  identityScriptUrl: GOOGLE_SYNC.identityScriptUrl,
  userInfoUrl: GOOGLE_SYNC.userInfoUrl,
  storage: sessionStore,
  storageKey: STORAGE_KEYS.googleSession,
  documentRoot: document,
  globalScope: window as GoogleIdentityGlobal,
  fetcher,
});
const shoppingList = new ShoppingListBuilder({ formatter, favoriteStore, filterMatcher, ingredientCatalog });
const shoppingSync = new ShoppingSyncService({
  tasksClient: new GoogleTasksClient({
    apiUrl: GOOGLE_SYNC.tasksApiUrl,
    fetcher,
    getAccessToken: () => googleAuth.getAccessToken(),
  }),
  shoppingList,
  ingredientStore,
  repository,
  formatter,
  storage,
  storageKey: STORAGE_KEYS.shoppingSync,
  taskListTitle: GOOGLE_SYNC.taskListTitle,
});

const services: AppServices = {
  filterDefinitions: DRINK_FILTER_DEFINITIONS,
  filterMatcher,
  filterState,
  formatter,
  googleAuth,
  ingredientCatalog,
  ingredientStore,
  repository,
  favoriteButtons: new FavoriteButtonPresenter({
    favoriteStore,
    translationService: translations,
    formatter,
    eventTarget: window,
    favoritesChangedEvent: APP_EVENTS.favoritesChanged,
    customEventConstructor: CustomEvent,
  }),
  favoriteStore,
  languageSelectors,
  languageService,
  shoppingList,
  shoppingSync,
  templates: new TemplateRenderer(document),
  translations,
  BaseHTMLElement: HTMLElement,
  URLSearchParamsConstructor: URLSearchParams,
  logger: console,
};

const app = new DrinksApp({
  documentRoot: document,
  eventTarget: window,
  customElementsRegistry: customElements,
  services,
  events: APP_EVENTS,
  customEventConstructor: CustomEvent,
  elementDefinitions: [],
});

const elementDefinitions: ElementDefinition[] = [
  { tagName: 'drink-filters', elementClass: createDrinkFiltersElement(app) },
  { tagName: 'drink-grid', elementClass: createDrinkGridElement(app) },
  { tagName: 'drink-detail', elementClass: createDrinkDetailElement(app) },
  { tagName: 'ingredient-inventory', elementClass: createIngredientInventoryElement(app) },
  { tagName: 'shopping-list', elementClass: createShoppingListElement(app) },
];

app.elementDefinitions = elementDefinitions;

app.start();
