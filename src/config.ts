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
  googleSession: 'drinks.google-session',
  shoppingSync: 'drinks.shopping-sync',
};

export const APP_EVENTS = {
  languageChanged: 'drinks:language-change',
  favoritesChanged: 'drinks:favorites-change',
  filtersChanged: 'drinks:filter-change',
  ingredientsChanged: 'drinks:ingredients-change',
} satisfies AppEvents;

/**
 * OAuth 2.0 client ID (type "Web application") used to sync the shopping list with Google Tasks.
 * Paste yours between the quotes, e.g. '1234567890-abc.apps.googleusercontent.com'.
 * Browser client IDs are public, so committing the value is safe. A `VITE_GOOGLE_CLIENT_ID`
 * entry in a local `.env` file overrides it during development. Setup steps are in the README.
 */
const DEFAULT_GOOGLE_CLIENT_ID = '823507612901-416cg0l5fod9l8onioe949i1ahl2ic84.apps.googleusercontent.com';

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

export const GOOGLE_SYNC = {
  identityScriptUrl: 'https://accounts.google.com/gsi/client',
  tasksApiUrl: 'https://tasks.googleapis.com/tasks/v1',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scopes: ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/userinfo.email'],
  taskListTitle: 'Drinks shopping',
};

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
