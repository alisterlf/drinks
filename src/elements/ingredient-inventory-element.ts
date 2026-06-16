import type { DrinksApp } from '../app/drinks-app.ts';
import type { IngredientInventoryItem } from '../types.ts';

interface IngredientInventoryGroup {
  id: string;
  labelKey: string;
  ingredientKeys: string[];
}

interface RenderedIngredientInventoryGroup extends IngredientInventoryGroup {
  ingredients: IngredientInventoryItem[];
}

const INGREDIENT_GROUPS: IngredientInventoryGroup[] = [
  {
    id: 'spirits',
    labelKey: 'ingredientGroupSpirits',
    ingredientKeys: [
      'aged rum',
      'blackstrap rum',
      'bourbon',
      'cachaca',
      'cognac',
      'gin',
      'irish whiskey',
      'rum',
      'rye whiskey',
      'tequila',
      'vodka',
      'vodka citron',
      'white rum',
    ],
  },
  {
    id: 'liqueurs',
    labelKey: 'ingredientGroupLiqueurs',
    ingredientKeys: [
      'amaretto',
      'aperol',
      'campari',
      'coffee liqueur',
      'cointreau',
      'cynar',
      'fernet',
      'grand marnier',
      'peach schnapps',
    ],
  },
  {
    id: 'wine',
    labelKey: 'ingredientGroupWine',
    ingredientKeys: ['champagne', 'dry vermouth', 'prosecco', 'red wine', 'vermouth rosso'],
  },
  {
    id: 'mixers',
    labelKey: 'ingredientGroupMixers',
    ingredientKeys: [
      'cola',
      'coffee beans',
      'ginger beer',
      'hot coffee',
      'espresso',
      'soda water',
      'tomato juice',
      'water',
    ],
  },
  {
    id: 'fruit',
    labelKey: 'ingredientGroupFruit',
    ingredientKeys: [
      'cherry',
      'cranberry juice',
      'lemon',
      'lemon juice',
      'lime',
      'lime juice',
      'orange',
      'orange juice',
      'pineapple',
      'pineapple juice',
    ],
  },
  {
    id: 'sweeteners',
    labelKey: 'ingredientGroupSweeteners',
    ingredientKeys: [
      'demerara sugar syrup',
      'honey syrup',
      'powdered sugar',
      'raw honey',
      'simple syrup',
      'sugar',
      'sugar cube',
    ],
  },
  {
    id: 'herbs-spices',
    labelKey: 'ingredientGroupHerbsSpices',
    ingredientKeys: [
      'angostura bitters',
      'basil',
      'mint',
      'tabasco',
      'celery',
      'salt',
      'pepper',
      'worcestershire sauce',
    ],
  },
  {
    id: 'dairy-eggs',
    labelKey: 'ingredientGroupDairyEggs',
    ingredientKeys: ['coconut cream', 'cream', 'egg white'],
  },
  {
    id: 'other',
    labelKey: 'ingredientGroupOther',
    ingredientKeys: ['olive'],
  },
];

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
        const item = app.document.createElement('p');
        item.className = 'ingredient-inventory-empty';
        item.textContent = app.translations.translate('noIngredients');
        list.replaceChildren(item);
        return;
      }

      const fragment = app.document.createDocumentFragment();
      for (const group of this.groupIngredients(filteredIngredients)) {
        fragment.append(this.createIngredientGroup(group));
      }

      list.replaceChildren(fragment);
    }

    groupIngredients(ingredients: IngredientInventoryItem[]): RenderedIngredientInventoryGroup[] {
      const ingredientsByGroupId = new Map<string, IngredientInventoryItem[]>();

      for (const ingredient of ingredients) {
        const group = this.getIngredientGroup(ingredient);
        const groupIngredients = ingredientsByGroupId.get(group.id) ?? [];
        groupIngredients.push(ingredient);
        ingredientsByGroupId.set(group.id, groupIngredients);
      }

      return INGREDIENT_GROUPS.map((group) => ({
        ...group,
        ingredients: ingredientsByGroupId.get(group.id) ?? [],
      })).filter((group) => group.ingredients.length > 0);
    }

    getIngredientGroup(ingredient: IngredientInventoryItem): IngredientInventoryGroup {
      return (
        INGREDIENT_GROUPS.find((group) =>
          group.ingredientKeys.some((ingredientKey) => this.ingredientMatchesKey(ingredient, ingredientKey)),
        ) ?? INGREDIENT_GROUPS[INGREDIENT_GROUPS.length - 1]
      );
    }

    ingredientMatchesKey(ingredient: IngredientInventoryItem, ingredientKey: string): boolean {
      const normalizedKey = app.formatter.getIngredientKey(ingredientKey);
      return ingredient.key === normalizedKey || ingredient.aliasKeys.includes(normalizedKey);
    }

    createIngredientGroup(group: RenderedIngredientInventoryGroup): HTMLElement {
      const section = app.document.createElement('section');
      section.className = 'ingredient-inventory-group';
      section.setAttribute('aria-labelledby', `ingredient-group-${group.id}`);

      const heading = app.document.createElement('h3');
      heading.id = `ingredient-group-${group.id}`;
      heading.className = 'ingredient-inventory-group-title';
      heading.textContent = app.translations.translate(group.labelKey);

      const groupList = app.document.createElement('ul');
      groupList.className = 'ingredient-inventory-group-list';
      for (const ingredient of group.ingredients) {
        groupList.append(this.createIngredientItem(ingredient));
      }

      section.append(heading, groupList);
      return section;
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
