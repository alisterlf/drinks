import type { LanguageService } from './language-service.ts';
import type { TranslationService } from './translation-service.ts';

interface LanguageSelectorControllerOptions {
  documentRoot: Document;
  languageService: LanguageService;
  translationService: TranslationService;
  onLanguageChange: (language: string) => void;
}

export class LanguageSelectorController {
  private readonly document: Document;
  private readonly languageService: LanguageService;
  private readonly translationService: TranslationService;
  private readonly onLanguageChange: (language: string) => void;

  constructor({
    documentRoot,
    languageService,
    translationService,
    onLanguageChange,
  }: LanguageSelectorControllerOptions) {
    this.document = documentRoot;
    this.languageService = languageService;
    this.translationService = translationService;
    this.onLanguageChange = onLanguageChange;
  }

  bind(root: ParentNode = this.document): void {
    for (const select of root.querySelectorAll('[data-language-select]')) {
      if (select instanceof HTMLSelectElement) {
        select.value = this.languageService.currentLanguage;
        select.addEventListener('change', () => this.onLanguageChange(select.value));
      }
    }

    this.updateLabels(root);
  }

  updateLabels(root: ParentNode = this.document): void {
    for (const select of root.querySelectorAll('[data-language-select]')) {
      if (select instanceof HTMLSelectElement) {
        select.dataset.i18nAriaLabelDefault ??= select.getAttribute('aria-label') ?? '';
        select.value = this.languageService.currentLanguage;
        select.setAttribute(
          'aria-label',
          this.translationService.translate('languageLabel', select.dataset.i18nAriaLabelDefault),
        );
      }
    }
  }
}
