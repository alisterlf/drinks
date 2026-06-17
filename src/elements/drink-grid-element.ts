import type { DrinksApp } from '../app/drinks-app.ts';
import type { Drink } from '../types.ts';

export function createDrinkGridElement(app: DrinksApp): CustomElementConstructor {
  return class DrinkGridElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onFavoritesChanged?: EventListener;
    private onFiltersChanged?: EventListener;
    private onIngredientsChanged?: EventListener;

    connectedCallback() {
      this.onLanguageChanged = () => this.loadAndRenderDrinks();
      this.onFavoritesChanged = () => this.loadAndRenderDrinks();
      this.onFiltersChanged = () => this.loadAndRenderDrinks();
      this.onIngredientsChanged = () => this.loadAndRenderDrinks();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      app.eventTarget.addEventListener(app.events.filtersChanged, this.onFiltersChanged);
      app.eventTarget.addEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
      this.loadAndRenderDrinks();
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onFavoritesChanged)
        app.eventTarget.removeEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      if (this.onFiltersChanged) app.eventTarget.removeEventListener(app.events.filtersChanged, this.onFiltersChanged);
      if (this.onIngredientsChanged)
        app.eventTarget.removeEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
    }

    async loadAndRenderDrinks(): Promise<void> {
      this.setAttribute('aria-busy', 'true');

      try {
        const drinks = await app.repository.loadDrinks();
        this.renderDrinkCards(drinks);
      } catch (error) {
        app.templates.renderEmptyState(this, app.translations.translate('loadError'), app.translations);
        app.logger.error(error);
      } finally {
        this.setAttribute('aria-busy', 'false');
      }
    }

    renderDrinkCards(drinks: Drink[]): void {
      const fragment = app.document.createDocumentFragment();
      const filteredDrinks = app.filterMatcher.filterDrinks(drinks);
      this.updateDrinkCount(filteredDrinks.length);

      if (filteredDrinks.length === 0) {
        app.templates.renderEmptyState(this, app.translations.translate('noResults'), app.translations);
        return;
      }

      for (const drink of filteredDrinks) {
        fragment.append(this.createDrinkCard(drink));
      }

      this.replaceChildren(fragment);
    }

    createDrinkCard(drink: Drink): HTMLElement {
      const card = app.templates.cloneTemplateElement<HTMLElement>('drink-card-template');
      const link = card.querySelector('.drink-card-link');
      const image = card.querySelector('img');
      const favoriteButton = card.querySelector('[data-favorite-button]');

      if (
        !(link instanceof HTMLAnchorElement) ||
        !(image instanceof HTMLImageElement) ||
        !(favoriteButton instanceof HTMLElement)
      ) {
        throw new Error('Drink card template is missing required elements.');
      }

      link.href = `drink.html?drink=${encodeURIComponent(app.formatter.getDrinkSlug(drink))}`;
      image.src = drink.photo;
      image.alt = drink.name;
      const title = card.querySelector('h2');
      const ingredientLegend = card.querySelector('.ingredient-legend');
      if (title) title.textContent = drink.name;
      if (ingredientLegend)
        ingredientLegend.textContent = app.formatter.formatIngredientSummary(drink.ingredients, {
          includeNotes: false,
        });
      app.favoriteButtons.bind(favoriteButton, drink);
      return card;
    }

    updateDrinkCount(count: number): void {
      const countElement = app.document.querySelector('[data-drink-count]');
      if (!countElement) return;

      const key = count === 1 ? 'drinkCountSingle' : 'drinkCountPlural';
      countElement.textContent = app.translations.translate(key).replace('{count}', String(count));
    }
  };
}
