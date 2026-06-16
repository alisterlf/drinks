import type { TranslationCatalog } from '../types.ts';
import type { LanguageService } from './language-service.ts';

export class TranslationService {
  private readonly languageService: LanguageService;
  private readonly translationCatalog: TranslationCatalog;
  private readonly defaultLanguage: string;

  constructor(languageService: LanguageService, translationCatalog: TranslationCatalog, defaultLanguage: string) {
    this.languageService = languageService;
    this.translationCatalog = translationCatalog;
    this.defaultLanguage = defaultLanguage;
  }

  translate(key: string, fallback = key): string {
    const currentLanguageMessages = this.translationCatalog[this.languageService.currentLanguage];
    const defaultLanguageMessages = this.translationCatalog[this.defaultLanguage];
    return currentLanguageMessages?.[key] ?? defaultLanguageMessages?.[key] ?? fallback;
  }

  translatePage(root: ParentNode): void {
    this.translateTextContent(root);
    this.translatePlaceholders(root);
  }

  translateTextContent(root: ParentNode): void {
    for (const element of root.querySelectorAll('[data-i18n]')) {
      if (element instanceof HTMLElement) {
        element.dataset.i18nDefault ??= element.textContent;
        element.textContent = this.translate(element.dataset.i18n ?? '', element.dataset.i18nDefault);
      }
    }
  }

  translatePlaceholders(root: ParentNode): void {
    for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
      if (element instanceof HTMLElement) {
        element.dataset.i18nPlaceholderDefault ??= element.getAttribute('placeholder') ?? '';
        element.setAttribute(
          'placeholder',
          this.translate(element.dataset.i18nPlaceholder ?? '', element.dataset.i18nPlaceholderDefault),
        );
      }
    }
  }
}
