import type { TranslationService } from '../i18n/translation-service.ts';

export class TemplateRenderer {
  private readonly document: Document;

  constructor(documentRoot: Document) {
    this.document = documentRoot;
  }

  getTemplate(id: string): HTMLTemplateElement {
    const template = this.document.querySelector(`#${id}`);
    if (!(template instanceof HTMLTemplateElement)) {
      throw new Error(`Missing template: ${id}`);
    }

    return template;
  }

  cloneTemplateContent(id: string): DocumentFragment {
    return this.getTemplate(id).content.cloneNode(true) as DocumentFragment;
  }

  cloneTemplateElement<T extends Element = Element>(id: string): T {
    const element = this.getTemplate(id).content.firstElementChild;
    if (!element) {
      throw new Error(`Missing root element in template: ${id}`);
    }

    return element.cloneNode(true) as T;
  }

  renderEmptyState(target: Element, message: string, translationService: TranslationService): void {
    const template = this.document.querySelector('#empty-state-template');

    if (template instanceof HTMLTemplateElement) {
      const content = template.content.cloneNode(true) as DocumentFragment;
      const text = content.querySelector('p');
      if (text) text.textContent = message;
      translationService.translatePage(content);
      target.replaceChildren(content);
      return;
    }

    const wrapper = this.document.createElement('section');
    const text = this.document.createElement('p');
    wrapper.className = 'empty-state';
    text.textContent = message;
    wrapper.append(text);
    target.replaceChildren(wrapper);
  }
}
