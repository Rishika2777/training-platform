import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageKey } from '../config/app.constants';
import { MenuConfig } from '../models/menu.model';
import { UserData } from '../models/user.model';
import { STORAGE_KEYS } from '../config/app.constants';

interface StorageSchema {
  [STORAGE_KEYS.AUTH_TOKEN]: string;
  [STORAGE_KEYS.REFRESH_TOKEN]: string;
  [STORAGE_KEYS.USER_DATA]: UserData;
  [STORAGE_KEYS.MENU_CONFIG]: MenuConfig;
  [STORAGE_KEYS.COMPANY_ID]: string;
  [STORAGE_KEYS.CAMPUS_ID]: string;
  [STORAGE_KEYS.STUDENT_ID]: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly memory = new Map<string, string>();

  get<K extends StorageKey>(key: K): StorageSchema[K] | null {
    const raw = this.getRaw(key);
    if (raw === null) {
      return null;
    }
    return this.parse<K>(key, raw);
  }

  set<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    this.setRaw(key, this.serialize(value));
  }

  remove<K extends StorageKey>(key: K): void {
    if (this.isBrowser) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // fall back to in-memory
      }
    }
    this.memory.delete(key);
  }

  clearAll(): void {
    if (this.isBrowser) {
      try {
        window.localStorage.clear();
        this.memory.clear();
        return;
      } catch {
        // fall back to in-memory
      }
    }
    this.memory.clear();
  }

  private getRaw(key: StorageKey): string | null {
    if (this.isBrowser) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // fall back to in-memory
      }
    }
    return this.memory.get(key) ?? null;
  }

  private setRaw(key: StorageKey, value: string): void {
    if (this.isBrowser) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // fall back to in-memory
      }
    }
    this.memory.set(key, value);
  }

  private serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  private parse<K extends StorageKey>(key: K, raw: string): StorageSchema[K] {
    // String keys
    if (
      key === STORAGE_KEYS.AUTH_TOKEN ||
      key === STORAGE_KEYS.REFRESH_TOKEN ||
      key === STORAGE_KEYS.COMPANY_ID ||
      key === STORAGE_KEYS.CAMPUS_ID ||
      key === STORAGE_KEYS.STUDENT_ID
    ) {
      return raw as StorageSchema[K];
    }

    // JSON keys
    return JSON.parse(raw) as StorageSchema[K];
  }
}


