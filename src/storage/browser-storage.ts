import type { StorageAdapter } from '../types.ts';

export class BrowserStorage implements StorageAdapter {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  write(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // The app still works without persistence when storage is unavailable.
    }
  }
}
