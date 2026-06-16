import type { AppEvents, DrinkFilterDefinition, LanguageFileMap } from './types.ts';

export const DRINK_DATA_FILE = 'drinks.json';

export const DRINK_TRANSLATION_FILE_BY_LANGUAGE = {
  en: '',
  'pt-BR': 'drinks.pt-BR.json',
} satisfies LanguageFileMap;

export const STORAGE_KEYS = {
  favorites: 'drinks.favorites',
  filters: 'drinks.filters',
  ingredients: 'drinks.ingredients',
  language: 'drinks.language',
};

export const APP_EVENTS = {
  languageChanged: 'drinks:language-change',
  favoritesChanged: 'drinks:favorites-change',
  filtersChanged: 'drinks:filter-change',
  ingredientsChanged: 'drinks:ingredients-change',
} satisfies AppEvents;

export const DRINK_FILTER_DEFINITIONS: DrinkFilterDefinition[] = [
  { id: 'all', labelKey: 'filterAll', terms: [] },
  { id: 'vodka', labelKey: 'filterVodka', terms: ['vodka'] },
  { id: 'gin', labelKey: 'filterGin', terms: ['gin'] },
  { id: 'rum', labelKey: 'filterRum', terms: ['rum', 'ron'] },
  { id: 'whiskey', labelKey: 'filterWhiskey', terms: ['whiskey', 'bourbon', 'rye', 'centeio'] },
  { id: 'tequila', labelKey: 'filterTequila', terms: ['tequila'] },
  { id: 'campari', labelKey: 'filterCampari', terms: ['campari'] },
  { id: 'sparkling', labelKey: 'filterSparkling', terms: ['champagne', 'prosecco', 'espumante'] },
  { id: 'citrus', labelKey: 'filterCitrus', terms: ['lemon', 'lime', 'orange', 'limao', 'laranja'] },
  { id: 'coffee', labelKey: 'filterCoffee', terms: ['coffee', 'cafe', 'espresso', 'kahlua'] },
];
