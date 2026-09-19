import type { DrinksApp } from '../app/drinks-app.ts';
import { GoogleApiError, GoogleAuthRequiredError, GoogleSignInCancelledError } from '../google/google-errors.ts';
import type { ShoppingListItem, ShoppingSyncResult } from '../types.ts';

type SyncStatusKind = 'idle' | 'syncing' | 'success' | 'error';

interface SyncStatus {
  kind: SyncStatusKind;
  message: string;
}

export function createShoppingListElement(app: DrinksApp): CustomElementConstructor {
  return class ShoppingListElement extends app.BaseHTMLElement {
    private onLanguageChanged?: EventListener;
    private onFavoritesChanged?: EventListener;
    private onIngredientsChanged?: EventListener;
    private isSyncing = false;
    private hasAutoSynced = false;
    private status: SyncStatus = { kind: 'idle', message: '' };

    connectedCallback() {
      this.onLanguageChanged = () => this.loadAndRenderShoppingList();
      this.onFavoritesChanged = () => this.loadAndRenderShoppingList();
      this.onIngredientsChanged = () => this.loadAndRenderShoppingList();
      app.eventTarget.addEventListener(app.events.languageChanged, this.onLanguageChanged);
      app.eventTarget.addEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      app.eventTarget.addEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
      this.loadAndRenderShoppingList().then(() => this.autoSync());
    }

    disconnectedCallback() {
      if (this.onLanguageChanged)
        app.eventTarget.removeEventListener(app.events.languageChanged, this.onLanguageChanged);
      if (this.onFavoritesChanged)
        app.eventTarget.removeEventListener(app.events.favoritesChanged, this.onFavoritesChanged);
      if (this.onIngredientsChanged)
        app.eventTarget.removeEventListener(app.events.ingredientsChanged, this.onIngredientsChanged);
    }

    async loadAndRenderShoppingList(): Promise<void> {
      this.setAttribute('aria-busy', 'true');

      try {
        const [drinks, relatedDrinkSets] = await Promise.all([
          app.repository.loadDrinks(),
          app.repository.loadAllLanguageDrinks(),
        ]);
        const favoriteCount = app.shoppingList.listFavoriteDrinks(drinks).length;
        const items = app.shoppingList.listMissingIngredients(drinks, relatedDrinkSets);
        this.renderShoppingList(items, favoriteCount);
      } catch (error) {
        app.templates.renderEmptyState(this, app.translations.translate('loadError'), app.translations);
        app.logger.error(error);
      } finally {
        this.setAttribute('aria-busy', 'false');
      }
    }

    renderShoppingList(items: ShoppingListItem[], favoriteCount: number): void {
      const content = app.templates.cloneTemplateContent('shopping-list-template');
      const signInButton = content.querySelector('[data-google-sign-in]');
      const syncButton = content.querySelector('[data-google-sync]');
      const signOutButton = content.querySelector('[data-google-sign-out]');
      const summary = content.querySelector('[data-shopping-summary]');
      const list = content.querySelector('[data-shopping-items]');

      if (
        !(signInButton instanceof HTMLButtonElement) ||
        !(syncButton instanceof HTMLButtonElement) ||
        !(signOutButton instanceof HTMLButtonElement) ||
        !(summary instanceof HTMLElement) ||
        !(list instanceof HTMLElement)
      ) {
        throw new Error('Shopping list template is missing required elements.');
      }

      app.translate(content);
      signInButton.addEventListener('click', () => this.connectAndSync());
      syncButton.addEventListener('click', () => this.runSync());
      signOutButton.addEventListener('click', () => this.disconnect());
      this.renderItems(list, summary, items, favoriteCount);

      this.replaceChildren(content);
      this.updateGooglePanel();
    }

    renderItems(list: HTMLElement, summary: HTMLElement, items: ShoppingListItem[], favoriteCount: number): void {
      if (favoriteCount === 0) {
        summary.textContent = app.translations.translate('shoppingNoFavorites');
        list.hidden = true;
        return;
      }

      if (items.length === 0) {
        summary.textContent = app.translations.translate('shoppingComplete');
        list.hidden = true;
        return;
      }

      const countKey = items.length === 1 ? 'shoppingCountSingle' : 'shoppingCountPlural';
      summary.textContent = app.translations.translate(countKey).replace('{count}', String(items.length));

      const fragment = app.document.createDocumentFragment();
      for (const item of items) {
        fragment.append(this.createItem(item));
      }

      list.replaceChildren(fragment);
      list.hidden = false;
    }

    createItem(item: ShoppingListItem): HTMLElement {
      const element = app.templates.cloneTemplateElement<HTMLElement>('shopping-list-item-template');
      const input = element.querySelector('[data-shopping-bought]');
      const name = element.querySelector('[data-shopping-name]');
      const drinks = element.querySelector('[data-shopping-drinks]');

      if (!(input instanceof HTMLInputElement) || !name || !drinks) {
        throw new Error('Shopping list item template is missing required elements.');
      }

      input.setAttribute('aria-label', app.translations.translate('shoppingMarkBought').replace('{name}', item.name));
      input.addEventListener('change', () => {
        if (!input.checked) return;

        app.ingredientStore.addAll(item.aliasKeys);
        app.dispatchIngredientsChange();
      });
      name.textContent = item.name;
      drinks.textContent = app.translations
        .translate('shoppingForDrinks')
        .replace('{drinks}', app.formatter.formatList(item.drinkNames));
      return element;
    }

    updateGooglePanel(): void {
      const session = app.googleAuth.session;
      const configured = app.googleAuth.isConfigured;
      const connected = configured && session !== null;

      this.toggleElement('[data-google-not-configured]', !configured);
      this.toggleElement('[data-google-sign-in]', configured && !connected, this.isSyncing);
      this.toggleElement('[data-google-sync]', connected, this.isSyncing);
      this.toggleElement('[data-google-sign-out]', connected, this.isSyncing);

      const account = this.querySelector('[data-google-account]');
      if (account instanceof HTMLElement) {
        account.hidden = !connected;
        account.textContent = session?.email
          ? app.translations.translate('googleConnectedAs').replace('{email}', session.email)
          : app.translations.translate('googleConnected');
      }

      const status = this.querySelector('[data-sync-status]');
      if (status instanceof HTMLElement) {
        status.dataset.kind = this.status.kind;
        status.textContent = this.status.message || this.formatLastSynced();
      }
    }

    toggleElement(selector: string, visible: boolean, disabled = false): void {
      const element = this.querySelector(selector);
      if (!(element instanceof HTMLElement)) return;

      element.hidden = !visible;
      if (element instanceof HTMLButtonElement) element.disabled = disabled;
    }

    formatLastSynced(): string {
      const { lastSyncedAt } = app.shoppingSync.state;
      if (!lastSyncedAt || !app.googleAuth.session) return '';

      return app.translations.translate('lastSynced').replace('{time}', app.formatter.formatDateTime(lastSyncedAt));
    }

    async autoSync(): Promise<void> {
      if (this.hasAutoSynced || !app.googleAuth.session) return;

      this.hasAutoSynced = true;
      await this.runSync();
    }

    async connectAndSync(): Promise<void> {
      if (this.isSyncing) return;

      this.isSyncing = true;
      this.setStatus('syncing', app.translations.translate('googleConnecting'));

      try {
        await app.googleAuth.signIn();
      } catch (error) {
        this.isSyncing = false;
        const cancelled = error instanceof GoogleSignInCancelledError;
        this.setStatus(
          cancelled ? 'idle' : 'error',
          app.translations.translate(cancelled ? 'googleSignInCancelled' : 'googleSignInFailed'),
        );
        if (!cancelled) app.logger.error(error);
        return;
      }

      this.isSyncing = false;
      await this.runSync();
    }

    async runSync(): Promise<void> {
      if (this.isSyncing) return;

      this.isSyncing = true;
      this.setStatus('syncing', app.translations.translate('syncInProgress'));

      try {
        const result = await app.shoppingSync.sync();
        this.isSyncing = false;
        this.setStatus('success', this.formatSyncResult(result));
        if (result.bought > 0) app.dispatchIngredientsChange();
      } catch (error) {
        this.isSyncing = false;

        if (error instanceof GoogleAuthRequiredError || (error instanceof GoogleApiError && error.isUnauthorized)) {
          app.googleAuth.invalidateSession();
          this.setStatus('error', app.translations.translate('syncAuthRequired'));
          return;
        }

        this.setStatus('error', app.translations.translate('syncFailed'));
        app.logger.error(error);
      }
    }

    disconnect(): void {
      if (this.isSyncing) return;

      app.googleAuth.signOut();
      this.setStatus('idle', '');
    }

    setStatus(kind: SyncStatusKind, message: string): void {
      this.status = { kind, message };
      this.updateGooglePanel();
    }

    formatSyncResult(result: ShoppingSyncResult): string {
      return app.translations
        .translate('syncSuccess')
        .replace('{total}', String(result.total))
        .replace('{bought}', String(result.bought))
        .replace('{added}', String(result.added))
        .replace('{removed}', String(result.removed));
    }
  };
}
