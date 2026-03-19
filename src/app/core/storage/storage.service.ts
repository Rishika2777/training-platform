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
  [STORAGE_KEYS.DEPARTMENT_ID]: string;
  [STORAGE_KEYS.STUDENT_ID]: string;
  [STORAGE_KEYS.ADMIN_AUDIT_LOG]: string;
  [STORAGE_KEYS.REGISTRATION_DRAFT]: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly memory = new Map<string, string>();

  get<K extends StorageKey>(key: K): StorageSchema[K] | null {
    const raw = this.getRaw(key);
    if (raw === null) {
      // Debug logging for auth-related keys
      if (key === STORAGE_KEYS.AUTH_TOKEN || key === STORAGE_KEYS.USER_DATA) {
        console.debug(`Storage.get(${key}): raw value is null`);
      }
      return null;
    }
    const parsed = this.parse<K>(key, raw);
    // Debug logging for auth-related keys
    if (key === STORAGE_KEYS.AUTH_TOKEN || key === STORAGE_KEYS.USER_DATA) {
      console.debug(`Storage.get(${key}): parsed value`, parsed ? 'exists' : 'null');
    }
    return parsed;
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
        const value = window.localStorage.getItem(key);
        // Debug logging for auth-related keys
        if (key === STORAGE_KEYS.AUTH_TOKEN || key === STORAGE_KEYS.USER_DATA) {
          console.debug(`Storage.getRaw(${key}):`, value ? 'exists' : 'null', `(isBrowser: ${this.isBrowser})`);
        }
        return value;
      } catch (error) {
        console.error(`Storage.getRaw(${key}) error:`, error);
        // fall back to in-memory
      }
    } else {
      // Not in browser (SSR context)
      if (key === STORAGE_KEYS.AUTH_TOKEN || key === STORAGE_KEYS.USER_DATA) {
        console.warn(`Storage.getRaw(${key}): NOT IN BROWSER CONTEXT - cannot access localStorage`);
      }
    }
    return this.memory.get(key) ?? null;
  }

  private setRaw(key: StorageKey, value: string): void {
    if (this.isBrowser) {
      try {
        window.localStorage.setItem(key, value);
        // Debug logging for auth-related keys
        if (key === STORAGE_KEYS.AUTH_TOKEN || key === STORAGE_KEYS.USER_DATA) {
          console.debug(`Storage.setRaw(${key}): saved to localStorage`);
        }
        return;
      } catch (error) {
        console.error(`Storage.setRaw(${key}) error:`, error);
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
      key === STORAGE_KEYS.DEPARTMENT_ID ||
      key === STORAGE_KEYS.STUDENT_ID ||
      key === STORAGE_KEYS.ADMIN_AUDIT_LOG ||
      key === STORAGE_KEYS.REGISTRATION_DRAFT
    ) {
      return raw as StorageSchema[K];
    }

    // JSON keys
    return JSON.parse(raw) as StorageSchema[K];
  }
}


