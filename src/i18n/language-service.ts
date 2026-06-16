import type { LanguageFileMap, StorageAdapter } from '../types.ts';

interface LanguageServiceOptions {
  storage: StorageAdapter;
  storageKey: string;
  languageFileByLanguage: LanguageFileMap;
  navigatorApi: Navigator;
}

export class LanguageService {
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;
  private readonly languageFileByLanguage: LanguageFileMap;
  private readonly navigator: Navigator;

  constructor({ storage, storageKey, languageFileByLanguage, navigatorApi }: LanguageServiceOptions) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.languageFileByLanguage = languageFileByLanguage;
    this.navigator = navigatorApi;
  }

  get currentLanguage(): string {
    const savedLanguage = this.storage.read(this.storageKey);
    if (savedLanguage && this.isSupportedLanguage(savedLanguage)) return savedLanguage;

    return this.detectBrowserLanguage();
  }

  setCurrentLanguage(language: string): boolean {
    const nextLanguage = this.isSupportedLanguage(language) ? language : 'en';
    if (nextLanguage === this.currentLanguage) return false;

    this.storage.write(this.storageKey, nextLanguage);
    return true;
  }

  isSupportedLanguage(language: string): boolean {
    return language in this.languageFileByLanguage;
  }

  detectBrowserLanguage(): string {
    if (!this.navigator) return 'en';

    const languages: readonly string[] = this.navigator.languages?.length
      ? this.navigator.languages
      : [this.navigator.language || 'en'];

    for (const language of languages) {
      if (this.isSupportedLanguage(language)) return language;

      const baseLanguage = language.toLocaleLowerCase().split('-')[0];
      if (baseLanguage === 'pt') return 'pt-BR';
      if (baseLanguage === 'en') return 'en';
    }

    return 'en';
  }
}
