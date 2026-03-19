import { Injectable, inject } from '@angular/core';
import { STORAGE_KEYS } from '../../../core/config/app.constants';
import { RoleService } from '../../../core/rbac/role.service';
import { StorageService } from '../../../core/storage/storage.service';

export interface AdminAuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  createdAt: string;
  meta?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  private readonly storage = inject(StorageService);
  private readonly roles = inject(RoleService);
  private readonly storageKey = STORAGE_KEYS.ADMIN_AUDIT_LOG;
  private readonly maxEntries = 200;

  logAction(action: string, meta?: Record<string, unknown>): void {
    const entries = this.readEntries();
    const next: AdminAuditEntry = {
      id: this.generateId(),
      action,
      actorEmail: this.roles.getCurrentUser()?.email ?? null,
      createdAt: new Date().toISOString(),
      meta,
    };
    entries.unshift(next);
    if (entries.length > this.maxEntries) {
      entries.length = this.maxEntries;
    }
    this.storage.set(this.storageKey, JSON.stringify(entries));
  }

  getEntries(): readonly AdminAuditEntry[] {
    return this.readEntries();
  }

  private readEntries(): AdminAuditEntry[] {
    const raw = this.storage.get(this.storageKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as AdminAuditEntry[]) : [];
    } catch {
      return [];
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

