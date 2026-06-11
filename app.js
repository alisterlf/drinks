const DATA_URL_BY_LANGUAGE = {
  en: 'drinks.json',
  'pt-BR': 'drinks.pt-BR.json',
};

const FAVORITES_KEY = 'drinks.favorites';
const LANGUAGE_KEY = 'drinks.language';
const LANGUAGE_CHANGE_EVENT = 'drinks:language-change';
const FAVORITES_CHANGE_EVENT = 'drinks:favorites-change';
const FILTER_CHANGE_EVENT = 'drinks:filter-change';

const filterState = {
  favoritesOnly: false,
  category: 'all',
};

const FILTER_DEFINITIONS = [
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

const UI_COPY = {
  en: {
    brand: 'Drinks',
    languageLabel: 'Language',
    indexEyebrow: 'Cocktail index',
    indexTitle: 'My drinks.',
    allDrinks: 'All drinks',
    detailEyebrow: 'Cocktail details',
    ingredientsTitle: 'Ingredients',
    methodTitle: 'Method',
    garnishTitle: 'Garnish',
    openIba: 'Open IBA page',
    backAll: 'Back to all drinks',
    notFound: 'Drink not found.',
    loadError: 'Could not load drinks data. Start a local web server and open this page through http://localhost.',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    filtersTitle: 'Filters',
    filterAll: 'All',
    filterFavorites: 'Only favorites',
    filterVodka: 'Vodka',
    filterGin: 'Gin',
    filterRum: 'Rum',
    filterWhiskey: 'Whiskey',
    filterTequila: 'Tequila',
    filterCampari: 'Campari',
    filterSparkling: 'Sparkling',
    filterCitrus: 'Citrus',
    filterCoffee: 'Coffee',
    noResults: 'No drinks match these filters.',
  },
  'pt-BR': {
    brand: 'Drinks',
    languageLabel: 'Idioma',
    indexEyebrow: 'Índice de coquetéis',
    indexTitle: 'Meus coquetéis.',
    allDrinks: 'Todos os drinks',
    detailEyebrow: 'Detalhes do coquetel',
    ingredientsTitle: 'Ingredientes',
    methodTitle: 'Modo de preparo',
    garnishTitle: 'Guarnição',
    openIba: 'Abrir página da IBA',
    backAll: 'Voltar para todos os drinks',
    notFound: 'Coquetel não encontrado.',
    loadError: 'Não foi possível carregar os dados. Inicie um servidor local e abra esta página por http://localhost.',
    addFavorite: 'Adicionar aos favoritos',
    removeFavorite: 'Remover dos favoritos',
    filtersTitle: 'Filtros',
    filterAll: 'Todos',
    filterFavorites: 'Só favoritos',
    filterVodka: 'Vodka',
    filterGin: 'Gin',
    filterRum: 'Rum',
    filterWhiskey: 'Whiskey',
    filterTequila: 'Tequila',
    filterCampari: 'Campari',
    filterSparkling: 'Espumantes',
    filterCitrus: 'Cítricos',
    filterCoffee: 'Café',
    noResults: 'Nenhum drink combina com esses filtros.',
  },
};

const drinksCache = new Map();

setupLanguageControls();
applyI18n(document);

class DrinkFilters extends HTMLElement {
  connectedCallback() {
    this.handleLanguageChange = () => this.render();
    this.handleFavoritesChange = () => this.updateFavoriteFilterButton();
    window.addEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.addEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
  }

  render() {
    const template = getTemplate('drink-filters-template');
    const content = template.content.cloneNode(true);
    const favoritesButton = content.querySelector('[data-favorites-filter]');
    const options = content.querySelector('[data-filter-options]');

    applyI18n(content);
    favoritesButton.addEventListener('click', () => {
      filterState.favoritesOnly = !filterState.favoritesOnly;
      this.render();
      dispatchFilterChange();
    });

    for (const filter of FILTER_DEFINITIONS) {
      options.append(createFilterOption(filter));
    }

    this.replaceChildren(content);
    this.updateFavoriteFilterButton();
    this.updateCategoryButtons();
  }

  updateFavoriteFilterButton() {
    const button = this.querySelector('[data-favorites-filter]');
    if (!button) return;

    button.setAttribute('aria-pressed', String(filterState.favoritesOnly));
    button.querySelector('[aria-hidden="true"]').textContent = filterState.favoritesOnly ? '\u2764\uFE0F' : '\u2661';
  }

  updateCategoryButtons() {
    for (const button of this.querySelectorAll('[data-filter-id]')) {
      button.setAttribute('aria-pressed', String(button.dataset.filterId === filterState.category));
    }
  }
}

class DrinkGrid extends HTMLElement {
  connectedCallback() {
    this.handleLanguageChange = () => this.loadAndRender();
    this.handleFavoritesChange = () => this.loadAndRender();
    this.handleFilterChange = () => this.loadAndRender();
    window.addEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.addEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
    window.addEventListener(FILTER_CHANGE_EVENT, this.handleFilterChange);
    this.loadAndRender();
  }

  disconnectedCallback() {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
    window.removeEventListener(FILTER_CHANGE_EVENT, this.handleFilterChange);
  }

  async loadAndRender() {
    try {
      const drinks = await loadDrinks();
      this.render(drinks);
    } catch (error) {
      renderError(this, t('loadError'));
      console.error(error);
    }
  }

  render(drinks) {
    const template = getTemplate('drink-card-template');
    const fragment = document.createDocumentFragment();
    const filteredDrinks = applyDrinkFilters(drinks);

    if (filteredDrinks.length === 0) {
      renderError(this, t('noResults'));
      return;
    }

    for (const drink of filteredDrinks) {
      const card = template.content.firstElementChild.cloneNode(true);
      const link = card.querySelector('.drink-card-link');
      const image = card.querySelector('img');
      const favoriteButton = card.querySelector('[data-favorite-button]');

      link.href = `drink.html?drink=${encodeURIComponent(slugFromDrink(drink))}`;
      image.src = drink.photo;
      image.alt = drink.name;
      card.querySelector('h2').textContent = drink.name;
      card.querySelector('.ingredient-legend').textContent = ingredientLegend(drink.ingredients);
      setupFavoriteButton(favoriteButton, drink);
      fragment.append(card);
    }

    this.replaceChildren(fragment);
  }

  updateFavoriteButtons() {
    for (const button of this.querySelectorAll('[data-favorite-button]')) {
      updateFavoriteButton(button, button.dataset.slug);
    }
  }
}

class DrinkDetail extends HTMLElement {
  connectedCallback() {
    this.handleLanguageChange = () => this.loadAndRender();
    this.handleFavoritesChange = () => this.updateFavoriteButton();
    window.addEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.addEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
    this.loadAndRender();
  }

  disconnectedCallback() {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, this.handleLanguageChange);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, this.handleFavoritesChange);
  }

  async loadAndRender() {
    try {
      const drinks = await loadDrinks();
      this.render(drinks);
    } catch (error) {
      renderError(this, t('loadError'));
      console.error(error);
    }
  }

  render(drinks) {
    const selectedSlug = new URLSearchParams(window.location.search).get('drink');
    const drink = drinks.find((item) => slugFromDrink(item) === selectedSlug);

    if (!drink) {
      document.title = t('notFound');
      renderError(this, t('notFound'));
      return;
    }

    const template = getTemplate('drink-detail-template');
    const content = template.content.cloneNode(true);
    const image = content.querySelector('.detail-hero img');
    const ibaLink = content.querySelector('.iba-link');
    const ingredientList = content.querySelector('.ingredient-list');
    const favoriteButton = content.querySelector('[data-favorite-button]');

    applyI18n(content);
    document.title = `${drink.name} | IBA Drinks`;
    image.src = drink.photo;
    image.alt = drink.name;
    content.querySelector('.detail-title').textContent = drink.name;
    content.querySelector('.detail-summary').textContent = ingredientLegend(drink.ingredients);
    content.querySelector('.method-text').textContent = drink.method;
    content.querySelector('.garnish-text').textContent = drink.garnish;
    ibaLink.href = drink.ibaLink;

    for (const ingredient of drink.ingredients) {
      ingredientList.append(createIngredientItem(ingredient));
    }

    setupFavoriteButton(favoriteButton, drink);
    this.replaceChildren(content);
  }

  updateFavoriteButton() {
    const button = this.querySelector('[data-favorite-button]');
    if (button) updateFavoriteButton(button, button.dataset.slug);
  }
}

customElements.define('drink-filters', DrinkFilters);
customElements.define('drink-grid', DrinkGrid);
customElements.define('drink-detail', DrinkDetail);

async function loadDrinks() {
  const language = getLanguage();
  const dataUrl = DATA_URL_BY_LANGUAGE[language] ?? DATA_URL_BY_LANGUAGE.en;

  if (!drinksCache.has(dataUrl)) {
    drinksCache.set(dataUrl, fetchDrinks(dataUrl));
  }

  return drinksCache.get(dataUrl);
}

async function fetchDrinks(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ${dataUrl}: ${response.status}`);
  }

  return response.json();
}

function createIngredientItem(ingredient) {
  const template = getTemplate('ingredient-item-template');
  const item = template.content.firstElementChild.cloneNode(true);
  item.querySelector('span').textContent = ingredientLine(ingredient);
  return item;
}

function createFilterOption(filter) {
  const template = getTemplate('filter-option-template');
  const button = template.content.firstElementChild.cloneNode(true);
  button.dataset.filterId = filter.id;
  button.textContent = t(filter.labelKey);
  button.setAttribute('aria-pressed', String(filterState.category === filter.id));
  button.addEventListener('click', () => {
    filterState.category = filter.id;
    dispatchFilterChange();
    document.querySelector('drink-filters')?.updateCategoryButtons();
  });
  return button;
}

function dispatchFilterChange() {
  window.dispatchEvent(
    new CustomEvent(FILTER_CHANGE_EVENT, {
      detail: { ...filterState },
    }),
  );
}

function applyDrinkFilters(drinks) {
  return drinks.filter((drink) => {
    if (filterState.favoritesOnly && !isFavorite(slugFromDrink(drink))) return false;
    if (filterState.category === 'all') return true;
    return drinkMatchesFilter(drink, filterState.category);
  });
}

function drinkMatchesFilter(drink, filterId) {
  const filter = FILTER_DEFINITIONS.find((item) => item.id === filterId);
  if (!filter || filter.id === 'all') return true;

  const searchable = normalizeSearchText(drink.ingredients.map((ingredient) => ingredient.name).join(' '));
  return filter.terms.some((term) => searchable.includes(term));
}

function setupFavoriteButton(button, drink) {
  const slug = slugFromDrink(drink);
  button.dataset.slug = slug;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(slug);
  });
  updateFavoriteButton(button, slug);
}

function updateFavoriteButton(button, slug) {
  const favorite = isFavorite(slug);
  button.setAttribute('aria-pressed', String(favorite));
  button.setAttribute('aria-label', favorite ? t('removeFavorite') : t('addFavorite'));
  button.title = favorite ? t('removeFavorite') : t('addFavorite');
  button.querySelector('span').textContent = favorite ? '\u2764\uFE0F' : '\u2661';
}

function toggleFavorite(slug) {
  const favorites = getFavorites();

  if (favorites.has(slug)) {
    favorites.delete(slug);
  } else {
    favorites.add(slug);
  }

  saveFavorites(favorites);
  window.dispatchEvent(
    new CustomEvent(FAVORITES_CHANGE_EVENT, {
      detail: { slug, favorite: favorites.has(slug) },
    }),
  );
}

function isFavorite(slug) {
  return getFavorites().has(slug);
}

function getFavorites() {
  const value = readStorage(FAVORITES_KEY);
  if (!value) return new Set();

  try {
    return new Set(JSON.parse(value).filter((item) => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites) {
  writeStorage(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function setupLanguageControls() {
  document.documentElement.lang = getLanguage();

  for (const select of document.querySelectorAll('[data-language-select]')) {
    select.value = getLanguage();
    select.setAttribute('aria-label', t('languageLabel'));
    select.addEventListener('change', () => setLanguage(select.value));
  }
}

function setLanguage(language) {
  const nextLanguage = DATA_URL_BY_LANGUAGE[language] ? language : 'en';
  if (nextLanguage === getLanguage()) return;

  writeStorage(LANGUAGE_KEY, nextLanguage);
  document.documentElement.lang = nextLanguage;
  updateLanguageControls();
  applyI18n(document);
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, {
      detail: { language: nextLanguage },
    }),
  );
}

function updateLanguageControls() {
  for (const select of document.querySelectorAll('[data-language-select]')) {
    select.value = getLanguage();
    select.setAttribute('aria-label', t('languageLabel'));
  }
}

function normalizeSearchText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function getLanguage() {
  const savedLanguage = readStorage(LANGUAGE_KEY);
  if (DATA_URL_BY_LANGUAGE[savedLanguage]) return savedLanguage;
  return 'en';
}

function t(key) {
  return UI_COPY[getLanguage()]?.[key] ?? UI_COPY.en[key] ?? key;
}

function applyI18n(root) {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  updateLanguageControls();

  for (const button of root.querySelectorAll('[data-favorite-button]')) {
    if (button.dataset.slug) updateFavoriteButton(button, button.dataset.slug);
  }
}

function ingredientLegend(ingredients) {
  const names = ingredients.map((ingredient) => {
    if (ingredient.prefix) {
      return `${ingredient.prefix}${ingredient.name}`.toLocaleLowerCase(getLanguage());
    }

    return ingredient.name;
  });

  return formatList(names);
}

function formatList(items) {
  if (items.length <= 1) return items[0] ?? '';

  const conjunction = getLanguage() === 'pt-BR' ? 'e' : 'and';
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

function ingredientAmount(ingredient) {
  if (ingredient.prefix) return ingredient.prefix.trim();
  if (ingredient.quantity && ingredient.unit) return `${ingredient.quantity} ${ingredient.unit}`;
  if (ingredient.quantity) return String(ingredient.quantity);

  return '';
}

function ingredientLine(ingredient) {
  if (ingredient.prefix) return `${ingredient.prefix}${ingredient.name}`;

  const amount = ingredientAmount(ingredient);
  return amount ? `${amount} ${ingredient.name}` : ingredient.name;
}

function slugFromDrink(drink) {
  return drink.ibaLink.replace(/\/$/, '').split('/').pop();
}

function renderError(target, message) {
  const template = document.querySelector('#empty-state-template');

  if (template) {
    const content = template.content.cloneNode(true);
    content.querySelector('p').textContent = message;
    applyI18n(content);
    target.replaceChildren(content);
    return;
  }

  const wrapper = document.createElement('section');
  const text = document.createElement('p');
  wrapper.className = 'empty-state';
  text.textContent = message;
  wrapper.append(text);
  target.replaceChildren(wrapper);
}

function getTemplate(id) {
  const template = document.querySelector(`#${id}`);
  if (!template) {
    throw new Error(`Missing template: ${id}`);
  }

  return template;
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The app still works without persistence when storage is unavailable.
  }
}
