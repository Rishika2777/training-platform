import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../config/app.constants';
import { StorageService } from '../storage/storage.service';
import { UserData } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly storage = inject(StorageService);

  private readonly tokenSignal = signal<string | null>(this.initToken());
  private readonly refreshTokenSignal = signal<string | null>(this.initRefreshToken());
  private readonly userSignal = signal<UserData | null>(this.initUser());

  private initToken(): string | null {
    const token = this.storage.get(STORAGE_KEYS.AUTH_TOKEN);
    console.log('🔐 AuthStateService - Initializing token signal:', token ? 'EXISTS' : 'NULL');
    return token;
  }

  private initRefreshToken(): string | null {
    const refreshToken = this.storage.get(STORAGE_KEYS.REFRESH_TOKEN);
    console.log('🔐 AuthStateService - Initializing refresh token signal:', refreshToken ? 'EXISTS' : 'NULL');
    return refreshToken;
  }

  private initUser(): UserData | null {
    const user = this.storage.get(STORAGE_KEYS.USER_DATA);
    console.log('🔐 AuthStateService - Initializing user signal:', user ? user : 'NULL');
    return user;
  }

  // Computed values that also check storage as fallback
  readonly token = computed(() => {
    const signalValue = this.tokenSignal();
    // If signal is null, try reading from storage directly (for new tab scenarios)
    if (!signalValue) {
      const storageValue = this.storage.get(STORAGE_KEYS.AUTH_TOKEN);
      if (storageValue && storageValue !== signalValue) {
        // Update signal with storage value
        this.tokenSignal.set(storageValue);
        return storageValue;
      }
    }
    return signalValue;
  });
  
  readonly refreshToken = computed(() => {
    const signalValue = this.refreshTokenSignal();
    if (!signalValue) {
      const storageValue = this.storage.get(STORAGE_KEYS.REFRESH_TOKEN);
      if (storageValue && storageValue !== signalValue) {
        this.refreshTokenSignal.set(storageValue);
        return storageValue;
      }
    }
    return signalValue;
  });
  
  readonly user = computed(() => {
    const signalValue = this.userSignal();
    if (!signalValue) {
      const storageValue = this.storage.get(STORAGE_KEYS.USER_DATA);
      if (storageValue && storageValue !== signalValue) {
        this.userSignal.set(storageValue);
        return storageValue;
      }
    }
    return signalValue;
  });
  
  readonly isAuthenticated = computed(() => Boolean(this.token()));

  setTokens(accessToken: string | null, refreshToken: string | null): void {
    this.tokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);

    if (accessToken) {
      this.storage.set(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    } else {
      this.storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    }

    if (refreshToken) {
      this.storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  setUser(user: UserData | null): void {
    this.userSignal.set(user);
    if (user) {
      this.storage.set(STORAGE_KEYS.USER_DATA, user);
    } else {
      this.storage.remove(STORAGE_KEYS.USER_DATA);
    }
  }

  clearAuth(): void {
    // Clear tokens and user data signals first
    this.tokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);
    
    // Clear ALL localStorage items (including student_profile_data, campus_id, company_id, etc.)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
        console.log('✅ All localStorage items cleared on logout');
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
        // Fallback: clear known keys individually
        this.clearKnownStorageKeys();
      }
    } else {
      // Clear memory storage if not in browser
      this.clearKnownStorageKeys();
    }
  }

  /**
   * Fallback method to clear known storage keys individually
   */
  private clearKnownStorageKeys(): void {
    // Clear all known storage keys managed by StorageService
    this.storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    this.storage.remove(STORAGE_KEYS.USER_DATA);
    this.storage.remove(STORAGE_KEYS.MENU_CONFIG);
    this.storage.remove(STORAGE_KEYS.COMPANY_ID);
    this.storage.remove(STORAGE_KEYS.CAMPUS_ID);
    this.storage.remove(STORAGE_KEYS.STUDENT_ID);
    
    // Clear custom localStorage items that are stored directly
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('student_profile_data');
      } catch (error) {
        console.warn('Failed to remove student_profile_data:', error);
      }
    }
  }
}


