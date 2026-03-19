import { Injectable, inject, signal } from '@angular/core';
import { AuthService, RegistrationDraft } from '../../../core/auth/auth.service';
import { StorageService } from '../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../core/config/app.constants';

@Injectable({ providedIn: 'root' })
export class RegistrationStateService {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly draftState = signal<RegistrationDraft | null>(null);

  setDraft(draft: RegistrationDraft): void {
    this.draftState.set(draft);
    this.auth.setRegistrationData(draft);
    this.storage.set(STORAGE_KEYS.REGISTRATION_DRAFT, JSON.stringify(draft));
  }

  getDraft(): RegistrationDraft | null {
    const inMemory = this.draftState() ?? this.auth.getRegistrationData();
    if (inMemory) {
      return inMemory;
    }
    const raw = this.storage.get(STORAGE_KEYS.REGISTRATION_DRAFT);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as RegistrationDraft;
      this.draftState.set(parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    this.draftState.set(null);
    this.storage.remove(STORAGE_KEYS.REGISTRATION_DRAFT);
  }
}
