import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ApiService } from '../api/api.service';
import { AuthStateService } from '../auth/auth-state.service';
import { API_ENDPOINTS, APP_CONFIG_TOKEN, APP_CONFIG } from '../config/app.constants';
import { unwrapApiResponse } from '../api/api-response.utils';
import { NotificationService } from './notification.service';
import type { NotificationItem } from '../../shared/components/notifications-dropdown/notifications-dropdown.component';

function resolvePathParams(endpoint: string, params: Record<string, string>): string {
  let result = endpoint;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(':' + key, encodeURIComponent(value));
  }
  return result;
}

/** Backend notification response (matches Synkup_Common_BE NotificationResponse). */
export interface NotificationApiResponse {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  actorDisplayName?: string;
  actorUserId?: string;
  actorPublicId?: string;
  actorUserType?: string;
  targetType?: string;
  targetId?: string;
  targetDisplayName?: string;
  actorPublicPageUrl?: string;
  targetPublicPageUrl?: string;
}

export interface NotificationListApiResponse {
  notifications: NotificationApiResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

const DEFAULT_PROFILE_IMAGE = 'assets/images/login-news-image.png';

function formatTimeLabel(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/** Build profile URL from actorPublicId + actorUserType when backend does not provide actorPublicPageUrl. */
function buildActorProfileUrl(n: NotificationApiResponse): string | undefined {
  if (n.actorPublicPageUrl) return n.actorPublicPageUrl;
  const publicId = n.actorPublicId;
  const userType = (n.actorUserType ?? '').toUpperCase();
  if (!publicId || !userType) return undefined;
  if (userType === 'STUDENT') return `/profile/student/${publicId}`;
  if (userType === 'COMPANY') return `/profile/company/${publicId}`;
  if (userType === 'CAMPUS') return `/profile/campus/${publicId}`;
  return undefined;
}

function mapToNotificationItem(n: NotificationApiResponse): NotificationItem {
  const userName = n.actorDisplayName ?? n.title ?? 'Someone';
  const message = n.body ?? n.title ?? '';
  return {
    id: n.id,
    userName,
    message,
    timeLabel: formatTimeLabel(n.createdAt),
    profileImageUrl: DEFAULT_PROFILE_IMAGE,
    section: n.read ? 'today' : 'new',
    actorPublicPageUrl: buildActorProfileUrl(n),
    targetDisplayName: n.targetDisplayName,
    targetPublicPageUrl: n.targetPublicPageUrl,
  };
}

@Injectable({ providedIn: 'root' })
export class InAppNotificationService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(NotificationService);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;

  private readonly itemsSignal = signal<NotificationItem[]>([]);
  private readonly unreadCountSignal = signal<number>(0);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly currentPageSignal = signal<number>(0);
  private readonly totalPagesSignal = signal<number>(0);
  private readonly pageSize = 10;
  private streamAbortController: AbortController | null = null;
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  readonly notifications = this.itemsSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();
  readonly hasUnread = computed(() => this.unreadCountSignal() > 0);
  readonly loading = this.loadingSignal.asReadonly();
  readonly currentPage = this.currentPageSignal.asReadonly();
  readonly totalPages = this.totalPagesSignal.asReadonly();
  readonly hasMorePages = computed(
    () => this.currentPageSignal() < this.totalPagesSignal() - 1
  );

  /** Load first page and unread count. */
  load(userId: string | number): void {
    this.loadingSignal.set(true);
    this.api
      .get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        userId: String(userId),
        page: 0,
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          const list = unwrapApiResponse<NotificationListApiResponse>(res);
          const raw = list?.notifications ?? [];
          this.itemsSignal.set(raw.map(mapToNotificationItem));
          this.currentPageSignal.set(list?.page ?? 0);
          this.totalPagesSignal.set(list?.totalPages ?? 1);
        },
        error: () => {
          this.itemsSignal.set([]);
          this.loadingSignal.set(false);
        },
        complete: () => this.loadingSignal.set(false),
      });

    this.api
      .get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, { userId: String(userId) })
      .subscribe({
        next: (res) => {
          const val = unwrapApiResponse<number>(res);
          this.unreadCountSignal.set(typeof val === 'number' ? val : 0);
        },
        error: () => this.unreadCountSignal.set(0),
      });
  }

  /** Load next page and append to list. */
  loadMore(userId: string | number): void {
    const nextPage = this.currentPageSignal() + 1;
    if (nextPage >= this.totalPagesSignal()) return;
    this.loadingSignal.set(true);
    this.api
      .get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        userId: String(userId),
        page: nextPage,
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          const list = unwrapApiResponse<NotificationListApiResponse>(res);
          const raw = list?.notifications ?? [];
          const newItems = raw.map(mapToNotificationItem);
          this.itemsSignal.update((prev) => [...prev, ...newItems]);
          this.currentPageSignal.set(list?.page ?? nextPage);
          this.totalPagesSignal.set(list?.totalPages ?? 1);
        },
        error: () => this.loadingSignal.set(false),
        complete: () => this.loadingSignal.set(false),
      });
  }

  /** Connect to SSE stream for real-time notifications. Sends Authorization header via fetch. */
  connectStream(userId: string | number): void {
    this.disconnectStream();
    const token = this.authState.token();
    const baseUrl = (this.config.API_BASE_URL || '/api/v1').replace(/\/$/, '');
    const streamUrl = `${baseUrl}${API_ENDPOINTS.NOTIFICATIONS.STREAM}?userId=${encodeURIComponent(String(userId))}`;

    this.streamAbortController = new AbortController();
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(streamUrl, {
      method: 'GET',
      headers,
      signal: this.streamAbortController.signal,
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok || !response.body) return;
        this.streamReader = response.body.getReader();
        return this.parseSSE(this.streamReader);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn('InAppNotificationService: SSE stream error', err);
      });
  }

  private async parseSSE(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        let eventType = '';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim();
          else if (line.startsWith('data:')) data = line.slice(5).trim();
          else if (line === '' && data) {
            if (eventType === 'notification' && data) {
              try {
                const payload = JSON.parse(data) as NotificationApiResponse;
                const item = mapToNotificationItem(payload);
                let added = false;
                this.itemsSignal.update((prev) => {
                  if (prev.some((i) => i.id === item.id)) return prev;
                  added = true;
                  return [item, ...prev];
                });
                if (added) {
                  this.unreadCountSignal.update((c) => c + 1);
                  const actor = payload.actorDisplayName ?? payload.title ?? 'Someone';
                  const body = payload.body ?? payload.title ?? '';
                  const message = body ? `${actor} ${body}` : actor;
                  this.toast.info(message, 'Notification');
                }
              } catch {
                // ignore parse errors
              }
            }
            eventType = '';
            data = '';
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  disconnectStream(): void {
    if (this.streamAbortController) {
      this.streamAbortController.abort();
      this.streamAbortController = null;
    }
    if (this.streamReader) {
      this.streamReader.cancel().catch(() => undefined);
      this.streamReader = null;
    }
  }

  markAsRead(notificationId: string, userId: string | number): void {
    const endpoint = resolvePathParams(API_ENDPOINTS.NOTIFICATIONS.MARK_READ, { id: notificationId });
    this.api.patch(endpoint, {}, undefined, { userId: String(userId) }).subscribe({
      next: () => {
        this.itemsSignal.update((items) =>
          items.map((item) => (item.id === notificationId ? { ...item, section: 'today' as const } : item))
        );
        this.unreadCountSignal.update((c) => Math.max(0, c - 1));
      },
    });
  }

  markAllAsRead(userId: string | number): void {
    this.api
      .patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {}, undefined, { userId: String(userId) })
      .subscribe({
        next: () => {
          this.itemsSignal.update((items) => items.map((item) => ({ ...item, section: 'today' as const })));
          this.unreadCountSignal.set(0);
        },
      });
  }

  ngOnDestroy(): void {
    this.disconnectStream();
  }
}
