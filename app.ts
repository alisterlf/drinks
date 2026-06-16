import { DrinksApp } from './src/app/drinks-app.js';
import { APP_EVENTS, DATA_FILE_BY_LANGUAGE, DRINK_FILTER_DEFINITIONS, STORAGE_KEYS } from './src/config.js';
import { DrinkRepository } from './src/data/drink-repository.js';
import { createDrinkDetailElement } from './src/elements/drink-detail-element.js';
import { createDrinkFiltersElement } from './src/elements/drink-filters-element.js';
import { createDrinkGridElement } from './src/elements/drink-grid-element.js';
import { createIngredientInventoryElement } from './src/elements/ingredient-inventory-element.js';
import { FavoriteStore } from './src/favorites/favorite-store.js';
import { DrinkFilterMatcher } from './src/filters/drink-filter-matcher.js';
import { DrinkFilterState } from './src/filters/drink-filter-state.js';
import { DrinkTextFormatter } from './src/formatting/drink-text-formatter.js';
import { IngredientCatalog } from './src/ingredients/ingredient-catalog.js';
import { IngredientStore } from './src/ingredients/ingredient-store.js';
import { LanguageSelectorController } from './src/i18n/language-selector-controller.js';
import { LanguageService } from './src/i18n/language-service.js';
import { TranslationService } from './src/i18n/translation-service.js';
import { DEFAULT_TRANSLATION_LANGUAGE, TRANSLATION_CATALOG } from './src/i18n/translations.js';
import { BrowserStorage } from './src/storage/browser-storage.js';
import type { AppServices, ElementDefinition } from './src/types.ts';
import { FavoriteButtonPresenter } from './src/ui/favorite-button-presenter.js';
import { TemplateRenderer } from './src/ui/template-renderer.js';

const storage = new BrowserStorage(localStorage);
const languageService = new LanguageService({
  storage,
  storageKey: STORAGE_KEYS.language,
  dataFileByLanguage: DATA_FILE_BY_LANGUAGE,
  navigatorApi: navigator,
});
const translations = new TranslationService(languageService, TRANSLATION_CATALOG, DEFAULT_TRANSLATION_LANGUAGE);
const favoriteStore = new FavoriteStore(storage, STORAGE_KEYS.favorites);
const ingredientStore = new IngredientStore(storage, STORAGE_KEYS.ingredients);
const filterState = new DrinkFilterState();
const formatter = new DrinkTextFormatter(languageService);
const ingredientCatalog = new IngredientCatalog(formatter);

const languageSelectors = new LanguageSelectorController({
  documentRoot: document,
  languageService,
  translationService: translations,
  onLanguageChange: (language) => app.changeLanguage(language),
});

const services: AppServices = {
  filterDefinitions: DRINK_FILTER_DEFINITIONS,
  filterMatcher: new DrinkFilterMatcher(
    filterState,
    favoriteStore,
    ingredientStore,
    formatter,
    DRINK_FILTER_DEFINITIONS,
  ),
  filterState,
  formatter,
  ingredientCatalog,
  ingredientStore,
  repository: new DrinkRepository({
    languageService,
    dataFileByLanguage: DATA_FILE_BY_LANGUAGE,
    baseUrl: import.meta.env.BASE_URL,
    fetcher: fetch.bind(window),
  }),
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
];

app.elementDefinitions = elementDefinitions;

app.start();
