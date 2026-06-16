import type { DrinksApp } from '../app/drinks-app.ts';
import type { IngredientInventoryItem } from '../types.ts';

export function createIngredientInventoryElement(app: DrinksApp): CustomElementConstructor {
  return class IngredientInventoryElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onIngredientsChanged?: EventListener;
    private searchQuery = '';

    connectedCallback() {
      this.onLanguageChanged = () => this.loadAndRenderIngredients();
      this.onIngredientsChanged = () => this.updateIngredientCheckboxes();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
      this.loadAndRenderIngredients();
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onIngredientsChanged)
        app.eventTarget.removeEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
    }

    async loadAndRenderIngredients(): Promise<void> {
      this.setAttribute('aria-busy', 'true');

      try {
        const [drinks, relatedDrinkSets] = await Promise.all([
          app.repository.loadDrinks(),
          app.repository.loadAllLanguageDrinks(),
        ]);
        this.renderIngredients(app.ingredientCatalog.listIngredients(drinks, relatedDrinkSets));
      } catch (error) {
        app.templates.renderEmptyState(this, app.translations.translate('loadError'), app.translations);
        app.logger.error(error);
      } finally {
        this.setAttribute('aria-busy', 'false');
      }
    }

    renderIngredients(ingredients: IngredientInventoryItem[]): void {
      const content = app.templates.cloneTemplateContent('ingredient-inventory-template');
      const searchInput = content.querySelector('[data-ingredient-search]');

      if (!(searchInput instanceof HTMLInputElement)) {
        throw new Error('Ingredient inventory template is missing required elements.');
      }

      app.translate(content);
      searchInput.value = this.searchQuery;
      searchInput.addEventListener('input', (event) => {
        this.searchQuery = (event.currentTarget as HTMLInputElement).value;
        const list = this.querySelector('[data-ingredient-list]');
        if (list instanceof HTMLElement) this.renderIngredientList(list, ingredients);
      });

      this.replaceChildren(content);
      const list = this.querySelector('[data-ingredient-list]');
      if (list instanceof HTMLElement) this.renderIngredientList(list, ingredients);
    }

    renderIngredientList(list: HTMLElement, ingredients: IngredientInventoryItem[]): void {
      const query = app.formatter.normalizeSearchText(this.searchQuery).trim();
      const filteredIngredients = query
        ? ingredients.filter((ingredient) => app.formatter.normalizeSearchText(ingredient.name).includes(query))
        : ingredients;

      if (filteredIngredients.length === 0) {
        const item = app.document.createElement('li');
        item.className = 'ingredient-inventory-empty';
        item.textContent = app.translations.translate('noIngredients');
        list.replaceChildren(item);
        return;
      }

      const fragment = app.document.createDocumentFragment();
      for (const ingredient of filteredIngredients) {
        fragment.append(this.createIngredientItem(ingredient));
      }

      list.replaceChildren(fragment);
    }

    createIngredientItem(ingredient: IngredientInventoryItem): HTMLElement {
      const item = app.templates.cloneTemplateElement<HTMLElement>('ingredient-inventory-item-template');
      const input = item.querySelector('[data-ingredient-toggle]');
      const name = item.querySelector('[data-ingredient-name]');
      const count = item.querySelector('[data-ingredient-count]');

      if (!(input instanceof HTMLInputElement) || !name || !count) {
        throw new Error('Ingredient item template is missing required elements.');
      }

      input.dataset.ingredientKeys = JSON.stringify(ingredient.aliasKeys);
      input.checked = app.ingredientStore.hasAny(ingredient.aliasKeys);
      input.addEventListener('change', () => {
        app.ingredientStore.toggleAll(ingredient.aliasKeys);
        app.dispatchIngredientsChange();
      });
      name.textContent = ingredient.name;
      count.textContent = this.formatDrinkCount(ingredient.drinkCount);
      return item;
    }

    updateIngredientCheckboxes(): void {
      for (const input of this.querySelectorAll('[data-ingredient-toggle]')) {
        if (input instanceof HTMLInputElement) {
          input.checked = app.ingredientStore.hasAny(this.getInputIngredientKeys(input));
        }
      }
    }

    getInputIngredientKeys(input: HTMLInputElement): string[] {
      try {
        const value = JSON.parse(input.dataset.ingredientKeys ?? '[]');
        return Array.isArray(value) ? value.filter((item: unknown) => typeof item === 'string') : [];
      } catch {
        return [];
      }
    }

    formatDrinkCount(count: number): string {
      const key = count === 1 ? 'ingredientDrinkCountSingle' : 'ingredientDrinkCountPlural';
      return app.translations.translate(key).replace('{count}', String(count));
    }
  };
}
