import type { FavoriteStore } from '../favorites/favorite-store.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { TranslationService } from '../i18n/translation-service.ts';
import type { Drink } from '../types.ts';

interface FavoriteButtonPresenterOptions {
  favoriteStore: FavoriteStore;
  translationService: TranslationService;
  formatter: DrinkTextFormatter;
  eventTarget: Window;
  favoritesChangedEvent: string;
  customEventConstructor: typeof CustomEvent;
}

export class FavoriteButtonPresenter {
  private readonly favoriteStore: FavoriteStore;
  private readonly translationService: TranslationService;
  private readonly formatter: DrinkTextFormatter;
  private readonly eventTarget: Window;
  private readonly favoritesChangedEvent: string;
  private readonly CustomEvent: typeof CustomEvent;

  constructor({
    favoriteStore,
    translationService,
    formatter,
    eventTarget,
    favoritesChangedEvent,
    customEventConstructor,
  }: FavoriteButtonPresenterOptions) {
    this.favoriteStore = favoriteStore;
    this.translationService = translationService;
    this.formatter = formatter;
    this.eventTarget = eventTarget;
    this.favoritesChangedEvent = favoritesChangedEvent;
    this.CustomEvent = customEventConstructor;
  }

  bind(button: HTMLElement, drink: Drink): void {
    const slug = this.formatter.getDrinkSlug(drink);
    button.dataset.slug = slug;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const favorite = this.favoriteStore.toggle(slug);
      this.eventTarget.dispatchEvent(
        new this.CustomEvent(this.favoritesChangedEvent, {
          detail: { slug, favorite },
        }),
      );
    });
    this.update(button, slug);
  }

  update(button: HTMLElement, slug: string): void {
    const favorite = this.favoriteStore.has(slug);
    const label = this.translationService.translate(favorite ? 'removeFavorite' : 'addFavorite');
    button.setAttribute('aria-pressed', String(favorite));
    button.setAttribute('aria-label', label);
    button.title = label;
    const icon = button.querySelector('span');
    if (icon) icon.textContent = favorite ? '\u2764\uFE0F' : '\u2661';
  }
}
