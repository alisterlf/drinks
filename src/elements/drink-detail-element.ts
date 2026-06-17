import type { DrinksApp } from '../app/drinks-app.ts';
import type { Drink, DrinkIngredient } from '../types.ts';

export function createDrinkDetailElement(app: DrinksApp): CustomElementConstructor {
  return class DrinkDetailElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onFavoritesChanged?: EventListener;
    private onIngredientsChanged?: EventListener;
    private isEditingIngredients = false;

    connectedCallback() {
      this.onLanguageChanged = () => this.loadAndRenderDrink();
      this.onFavoritesChanged = () => this.updateFavoriteButton();
      this.onIngredientsChanged = () => this.loadAndRenderDrink();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      app.eventTarget.addEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
      this.loadAndRenderDrink();
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onFavoritesChanged)
        app.eventTarget.removeEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      if (this.onIngredientsChanged)
        app.eventTarget.removeEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
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
      const videoLink = content.querySelector('.video-link');
      const editIngredientsButton = content.querySelector('[data-edit-ingredients-button]');
      const ingredientList = content.querySelector('.ingredient-list');
      const notesSection = content.querySelector('[data-notes-section]');
      const notesList = content.querySelector('[data-notes-list]');
      const missingIngredientsSection = content.querySelector('[data-missing-ingredients-section]');
      const missingIngredientList = content.querySelector('[data-missing-ingredient-list]');
      const garnishSection = content.querySelector('[data-garnish-section]');
      const favoriteButton = content.querySelector('[data-favorite-button]');

      if (
        !(image instanceof HTMLImageElement) ||
        !(ibaLink instanceof HTMLAnchorElement) ||
        !(videoLink instanceof HTMLAnchorElement) ||
        !(editIngredientsButton instanceof HTMLButtonElement) ||
        !(ingredientList instanceof HTMLElement) ||
        !(notesSection instanceof HTMLElement) ||
        !(notesList instanceof HTMLElement) ||
        !(missingIngredientsSection instanceof HTMLElement) ||
        !(missingIngredientList instanceof HTMLElement) ||
        !(garnishSection instanceof HTMLElement) ||
        !(favoriteButton instanceof HTMLElement)
      ) {
        throw new Error('Drink detail template is missing required elements.');
      }

      app.translate(content);
      app.document.title = `${drink.name} | IBA Drinks`;
      image.src = drink.photo;
      image.alt = drink.name;
      const title = content.querySelector('.detail-title');
      const method = content.querySelector('.method-text');
      const garnish = content.querySelector('.garnish-text');
      if (title) title.textContent = drink.name;
      if (method) method.textContent = drink.method;
      garnishSection.hidden = drink.garnish.trim().length === 0;
      if (garnish) garnish.textContent = garnishSection.hidden ? '' : drink.garnish;
      ibaLink.href = drink.ibaLink;
      videoLink.href = drink.videoLink;
      this.bindEditIngredientsButton(editIngredientsButton);

      for (const ingredient of drink.ingredients) {
        ingredientList.append(this.createIngredientItem(ingredient));
      }

      const noteItems = this.createNoteItems(drink);
      notesSection.hidden = noteItems.length === 0;
      notesList.append(...noteItems);

      const missingIngredients = app.filterMatcher.getMissingIngredients(drink);
      missingIngredientsSection.hidden = missingIngredients.length === 0;
      for (const ingredient of missingIngredients) {
        missingIngredientList.append(this.createIngredientItem(ingredient, { showSubstitutions: true }));
      }

      app.favoriteButtons.bind(favoriteButton, drink);
      this.replaceChildren(content);
    }

    createIngredientItem(ingredient: DrinkIngredient, options: { showSubstitutions?: boolean } = {}): HTMLElement {
      const item = app.templates.cloneTemplateElement<HTMLElement>('ingredient-item-template');
      const input = item.querySelector('[data-detail-ingredient-toggle]');
      const text = item.querySelector('[data-detail-ingredient-name]');
      const substitution = item.querySelector('.ingredient-substitution');
      const ingredientKeys = this.getIngredientKeys(ingredient);

      if (!(input instanceof HTMLInputElement) || !text) {
        throw new Error('Drink detail ingredient template is missing required elements.');
      }

      input.dataset.ingredientKeys = JSON.stringify(ingredientKeys);
      input.checked = app.ingredientStore.hasAny(ingredientKeys);
      input.disabled = !this.isEditingIngredients;
      input.hidden = !this.isEditingIngredients;
      item.classList.toggle('is-editing', this.isEditingIngredients);
      input.addEventListener('change', () => {
        if (input.checked) {
          app.ingredientStore.set(ingredientKeys[0], true);
        } else {
          app.ingredientStore.removeAll(ingredientKeys);
        }

        app.dispatchIngredientsChange();
      });

      if (text) text.textContent = app.formatter.formatIngredientLine(ingredient, { includeNotes: false });
      if (substitution instanceof HTMLElement) {
        const suggestion = options.showSubstitutions ? this.formatSubstitutionSuggestion(ingredient) : '';
        substitution.textContent = suggestion;
        substitution.hidden = !suggestion;
      }
      return item;
    }

    bindEditIngredientsButton(button: HTMLButtonElement): void {
      button.textContent = app.translations.translate(
        this.isEditingIngredients ? 'doneEditingIngredients' : 'editIngredients',
      );
      button.setAttribute('aria-pressed', String(this.isEditingIngredients));
      button.addEventListener('click', () => {
        this.isEditingIngredients = !this.isEditingIngredients;
        this.loadAndRenderDrink();
      });
    }

    getIngredientKeys(ingredient: DrinkIngredient): string[] {
      return app.formatter.getIngredientOptionNames(ingredient).map((name) => app.formatter.getIngredientKey(name));
    }

    formatSubstitutionSuggestion(ingredient: DrinkIngredient): string {
      if (!ingredient.substitutions?.length) return '';

      const substitutions = app.formatter.formatAlternativeList(
        ingredient.substitutions.map((substitution) => substitution.name),
      );
      return app.translations.translate('substitutionSuggestion').replace('{substitutions}', substitutions);
    }

    createNoteItems(drink: Drink): HTMLElement[] {
      const noteIngredients = [...drink.ingredients, ...(drink.garnishIngredients ?? [])].filter(
        (ingredient) => ingredient.optional || ingredient.note,
      );
      const items = [];

      if (drink.methodNote?.trim()) {
        items.push(this.createNoteItem(drink.methodNote));
      }

      items.push(
        ...noteIngredients.map((ingredient) => {
          const ingredientName = app.formatter.formatAlternativeList(
            app.formatter.getIngredientOptionNames(ingredient),
          );
          const notes = [];

          if (ingredient.optional) notes.push(app.translations.translate('optionalIngredientNote'));
          if (ingredient.note) notes.push(ingredient.note);

          return this.createNoteItem(`${ingredientName}: ${notes.join('; ')}`);
        }),
      );

      return items;
    }

    createNoteItem(text: string): HTMLElement {
      const item = app.document.createElement('li');
      item.className = 'detail-note-item';
      item.textContent = text;
      return item;
    }

    updateFavoriteButton(): void {
      const button = this.querySelector('[data-favorite-button]');
      if (button instanceof HTMLElement && button.dataset.slug) app.favoriteButtons.update(button, button.dataset.slug);
    }
  };
}
