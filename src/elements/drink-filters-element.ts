import type { DrinksApp } from '../app/drinks-app.ts';
import type { DrinkFilterDefinition } from '../types.ts';

export function createDrinkFiltersElement(app: DrinksApp): CustomElementConstructor {
  return class DrinkFiltersElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onFavoritesChanged?: EventListener;
    private onIngredientsChanged?: EventListener;

    connectedCallback() {
      this.onLanguageChanged = () => this.renderControls();
      this.onFavoritesChanged = () => this.updateFavoritesOnlyButton();
      this.onIngredientsChanged = () => this.updateMakeableOnlyButton();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      app.eventTarget.addEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
      this.renderControls();
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onFavoritesChanged)
        app.eventTarget.removeEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      if (this.onIngredientsChanged)
        app.eventTarget.removeEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
    }

    renderControls(): void {
      const content = app.templates.cloneTemplateContent('drink-filters-template');
      const favoritesButton = content.querySelector('[data-favorites-filter]');
      const makeableButton = content.querySelector('[data-makeable-filter]');
      const searchInput = content.querySelector('[data-search-input]');
      const categoryOptions = content.querySelector('[data-filter-options]');

      if (
        !(favoritesButton instanceof HTMLButtonElement) ||
        !(makeableButton instanceof HTMLButtonElement) ||
        !(searchInput instanceof HTMLInputElement) ||
        !categoryOptions
      ) {
        throw new Error('Drink filters template is missing required elements.');
      }

      app.translate(content);
      searchInput.value = app.filterState.searchQuery;
      searchInput.addEventListener('input', (event) => {
        app.filterState.updateSearchQuery((event.currentTarget as HTMLInputElement).value);
        app.dispatchFilterChange();
      });

      favoritesButton.addEventListener('click', () => {
        app.filterState.toggleFavoritesOnly();
        this.renderControls();
        app.dispatchFilterChange();
      });

      makeableButton.addEventListener('click', () => {
        app.filterState.toggleMakeableOnly();
        this.renderControls();
        app.dispatchFilterChange();
      });

      for (const filterDefinition of app.filterDefinitions) {
        categoryOptions.append(this.createCategoryButton(filterDefinition));
      }

      this.replaceChildren(content);
      this.updateFavoritesOnlyButton();
      this.updateMakeableOnlyButton();
      this.updateCategoryButtons();
    }

    createCategoryButton(filterDefinition: DrinkFilterDefinition): HTMLButtonElement {
      const button = app.templates.cloneTemplateElement<HTMLButtonElement>('filter-option-template');
      button.dataset.filterId = filterDefinition.id;
      button.textContent = app.translations.translate(filterDefinition.labelKey);
      button.setAttribute('aria-pressed', String(app.filterState.selectedCategory === filterDefinition.id));
      button.addEventListener('click', () => {
        app.filterState.selectCategory(filterDefinition.id);
        app.dispatchFilterChange();
        this.updateCategoryButtons();
      });
      return button;
    }

    updateFavoritesOnlyButton(): void {
      const button = this.querySelector('[data-favorites-filter]');
      if (!button) return;

      button.setAttribute('aria-pressed', String(app.filterState.favoritesOnly));
      const icon = button.querySelector('[aria-hidden="true"]');
      if (icon) icon.textContent = app.filterState.favoritesOnly ? '\u2764\uFE0F' : '\u2661';
    }

    updateMakeableOnlyButton(): void {
      const button = this.querySelector('[data-makeable-filter]');
      if (!button) return;

      button.setAttribute('aria-pressed', String(app.filterState.makeableOnly));
    }

    updateCategoryButtons(): void {
      for (const button of this.querySelectorAll('[data-filter-id]')) {
        if (button instanceof HTMLElement) {
          button.setAttribute('aria-pressed', String(button.dataset.filterId === app.filterState.selectedCategory));
        }
      }
    }
  };
}
