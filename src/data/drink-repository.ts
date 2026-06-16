import type { LanguageService } from '../i18n/language-service.ts';
import type { Drink, LanguageFileMap } from '../types.ts';

interface DrinkRepositoryOptions {
  languageService: LanguageService;
  dataFileByLanguage: LanguageFileMap;
  baseUrl: string;
  fetcher: typeof fetch;
}

export class DrinkRepository {
  private readonly languageService: LanguageService;
  private readonly dataFileByLanguage: LanguageFileMap;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly drinksByDataUrl = new Map<string, Promise<Drink[]>>();

  constructor({ languageService, dataFileByLanguage, baseUrl, fetcher }: DrinkRepositoryOptions) {
    this.languageService = languageService;
    this.dataFileByLanguage = dataFileByLanguage;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async loadDrinks(): Promise<Drink[]> {
    const dataUrl = this.currentDataUrl;
    return this.loadDrinksFromUrl(dataUrl);
  }

  async loadAllLanguageDrinks(): Promise<Drink[][]> {
    return Promise.all(
      Object.values(this.dataFileByLanguage).map((dataFile) => this.loadDrinksFromUrl(this.getDataUrl(dataFile))),
    );
  }

  async loadDrinksFromUrl(dataUrl: string): Promise<Drink[]> {
    if (!this.drinksByDataUrl.has(dataUrl)) {
      const request = this.fetchDrinks(dataUrl).catch((error) => {
        this.drinksByDataUrl.delete(dataUrl);
        throw error;
      });
      this.drinksByDataUrl.set(dataUrl, request);
    }

    return this.drinksByDataUrl.get(dataUrl)!;
  }

  get currentDataUrl(): string {
    return this.getDataUrl(this.languageService.currentDataFile);
  }

  getDataUrl(dataFile: string): string {
    return `${this.baseUrl}${dataFile}`;
  }

  async fetchDrinks(dataUrl: string): Promise<Drink[]> {
    const response = await this.fetcher(dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${dataUrl}: ${response.status}`);
    }

    return response.json() as Promise<Drink[]>;
  }
}
