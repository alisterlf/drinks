import type { DrinksApp } from '../app/drinks-app.ts';
import type { Drink, DrinkIngredient } from '../types.ts';

export function createDrinkDetailElement(app: DrinksApp): CustomElementConstructor {
  return class DrinkDetailElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onFavoritesChanged?: EventListener;

    connectedCallback() {
      this.onLanguageChanged = () => this.loadAndRenderDrink();
      this.onFavoritesChanged = () => this.updateFavoriteButton();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      this.loadAndRenderDrink();
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onFavoritesChanged)
        app.eventTarget.removeEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
    }

    async loadAndRenderDrink(): Promise<void> {
      this.setAttribute('aria-busy', 'true');

      try {
        const drinks = await app.repository.loadDrinks();
        this.renderDrinkDetail(drinks);
      } catch (error) {
        app.templates.renderEmptyState(this, app.translations.translate('loadError'), app.translations);
        app.logger.error(error);
      } finally {
        this.setAttribute('aria-busy', 'false');
      }
    }

    renderDrinkDetail(drinks: Drink[]): void {
      const selectedSlug = new app.URLSearchParamsConstructor(app.eventTarget.location.search).get('drink');
      const drink = drinks.find((item) => app.formatter.getDrinkSlug(item) === selectedSlug);

      if (!drink) {
        app.document.title = app.translations.translate('notFound');
        app.templates.renderEmptyState(this, app.translations.translate('notFound'), app.translations);
        return;
      }

      const content = app.templates.cloneTemplateContent('drink-detail-template');
      const image = content.querySelector('.detail-hero img');
      const ibaLink = content.querySelector('.iba-link');
      const ingredientList = content.querySelector('.ingredient-list');
      const favoriteButton = content.querySelector('[data-favorite-button]');

      if (
        !(image instanceof HTMLImageElement) ||
        !(ibaLink instanceof HTMLAnchorElement) ||
        !(ingredientList instanceof HTMLElement) ||
        !(favoriteButton instanceof HTMLElement)
      ) {
        throw new Error('Drink detail template is missing required elements.');
      }

      app.translate(content);
      app.document.title = `${drink.name} | IBA Drinks`;
      image.src = drink.photo;
      image.alt = drink.name;
      const title = content.querySelector('.detail-title');
      const summary = content.querySelector('.detail-summary');
      const method = content.querySelector('.method-text');
      const garnish = content.querySelector('.garnish-text');
      if (title) title.textContent = drink.name;
      if (summary) summary.textContent = app.formatter.formatIngredientSummary(drink.ingredients);
      if (method) method.textContent = drink.method;
      if (garnish) garnish.textContent = drink.garnish;
      ibaLink.href = drink.ibaLink;

      for (const ingredient of drink.ingredients) {
        ingredientList.append(this.createIngredientItem(ingredient));
      }

      app.favoriteButtons.bind(favoriteButton, drink);
      this.replaceChildren(content);
    }

    createIngredientItem(ingredient: DrinkIngredient): HTMLElement {
      const item = app.templates.cloneTemplateElement<HTMLElement>('ingredient-item-template');
      const text = item.querySelector('span');
      if (text) text.textContent = app.formatter.formatIngredientLine(ingredient);
      return item;
    }

    updateFavoriteButton(): void {
      const button = this.querySelector('[data-favorite-button]');
      if (button instanceof HTMLElement && button.dataset.slug) app.favoriteButtons.update(button, button.dataset.slug);
    }
  };
}
