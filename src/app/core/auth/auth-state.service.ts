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
    this.setTokens(null, null);
    this.setUser(null);
  }
}


