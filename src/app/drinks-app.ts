import type { AppEvents, AppServices, ElementDefinition } from '../types.ts';

interface DrinksAppOptions {
  documentRoot: Document;
  eventTarget: Window;
  customElementsRegistry: CustomElementRegistry;
  services: AppServices;
  events: AppEvents;
  customEventConstructor: typeof CustomEvent;
  elementDefinitions: ElementDefinition[];
}

export class DrinksApp {
  readonly document: Document;
  readonly eventTarget: Window;
  readonly customElements: CustomElementRegistry;
  readonly events: AppEvents;
  readonly CustomEvent: typeof CustomEvent;
  readonly BaseHTMLElement: typeof HTMLElement;
  readonly URLSearchParamsConstructor: typeof URLSearchParams;
  readonly favoriteButtons: AppServices['favoriteButtons'];
  readonly favoriteStore: AppServices['favoriteStore'];
  readonly filterDefinitions: AppServices['filterDefinitions'];
  readonly filterMatcher: AppServices['filterMatcher'];
  readonly filterState: AppServices['filterState'];
  readonly formatter: AppServices['formatter'];
  readonly ingredientCatalog: AppServices['ingredientCatalog'];
  readonly ingredientStore: AppServices['ingredientStore'];
  readonly languageSelectors: AppServices['languageSelectors'];
  readonly languageService: AppServices['languageService'];
  readonly logger: AppServices['logger'];
  readonly repository: AppServices['repository'];
  readonly templates: AppServices['templates'];
  readonly translations: AppServices['translations'];
  elementDefinitions: ElementDefinition[];

  constructor({
    documentRoot,
    eventTarget,
    customElementsRegistry,
    services,
    events,
    customEventConstructor,
    elementDefinitions,
  }: DrinksAppOptions) {
    this.document = documentRoot;
    this.eventTarget = eventTarget;
    this.customElements = customElementsRegistry;
    this.events = events;
    this.CustomEvent = customEventConstructor;
    this.elementDefinitions = elementDefinitions;
    this.BaseHTMLElement = services.BaseHTMLElement;
    this.URLSearchParamsConstructor = services.URLSearchParamsConstructor;
    this.favoriteButtons = services.favoriteButtons;
    this.favoriteStore = services.favoriteStore;
    this.filterDefinitions = services.filterDefinitions;
    this.filterMatcher = services.filterMatcher;
    this.filterState = services.filterState;
    this.formatter = services.formatter;
    this.ingredientCatalog = services.ingredientCatalog;
    this.ingredientStore = services.ingredientStore;
    this.languageSelectors = services.languageSelectors;
    this.languageService = services.languageService;
    this.logger = services.logger;
    this.repository = services.repository;
    this.templates = services.templates;
    this.translations = services.translations;
  }

  start(): void {
    this.document.documentElement.lang = this.languageService.currentLanguage;
    this.languageSelectors.bind(this.document);
    this.translate(this.document);
    this.defineCustomElements();
  }

  defineCustomElements(): void {
    for (const { tagName, elementClass } of this.elementDefinitions) {
      if (!this.customElements.get(tagName)) {
        this.customElements.define(tagName, elementClass);
      }
    }
  }

  changeLanguage(language: string): void {
    if (!this.languageService.setCurrentLanguage(language)) return;

    this.document.documentElement.lang = this.languageService.currentLanguage;
    this.languageSelectors.updateLabels(this.document);
    this.translate(this.document);
    this.dispatchEvent(this.events.languageChanged, { language: this.languageService.currentLanguage });
  }

  translate(root: ParentNode): void {
    this.translations.translatePage(root);
    this.languageSelectors.updateLabels(this.document);

    for (const button of root.querySelectorAll('[data-favorite-button]')) {
      if (button instanceof HTMLElement && button.dataset.slug) {
        this.favoriteButtons.update(button, button.dataset.slug);
      }
    }
  }

  dispatchFilterChange(): void {
    this.dispatchEvent(this.events.filtersChanged, this.filterState.toEventDetail());
  }

  dispatchIngredientsChange(): void {
    this.dispatchEvent(this.events.ingredientsChanged, {});
  }

  dispatchEvent(eventName: string, detail: unknown): void {
    this.eventTarget.dispatchEvent(new this.CustomEvent(eventName, { detail }));
  }
}
