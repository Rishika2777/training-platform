import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../config/app.constants';
import { StorageService } from '../storage/storage.service';
import { UserData } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly storage = inject(StorageService);

  private readonly tokenSignal = signal<string | null>(this.storage.get(STORAGE_KEYS.AUTH_TOKEN));
  private readonly refreshTokenSignal = signal<string | null>(
    this.storage.get(STORAGE_KEYS.REFRESH_TOKEN),
  );
  private readonly userSignal = signal<UserData | null>(this.storage.get(STORAGE_KEYS.USER_DATA));

  readonly token = computed(() => this.tokenSignal());
  readonly refreshToken = computed(() => this.refreshTokenSignal());
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

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


