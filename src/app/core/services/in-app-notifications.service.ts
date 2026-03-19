import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN } from '../config/app.constants';
import { ApiService } from '../api/api.service';
import { unwrapApiResponse } from '../api/api-response.utils';

/** Raw notification item from the list API */
export interface NotificationListDto {
  id?: string;
  _id?: string;
  notificationId?: string;
  message?: string;
  body?: string;
  content?: string;
  text?: string;
  userName?: string;
  senderName?: string;
  actorName?: string;
  createdByName?: string;
  title?: string;
  profileImageUrl?: string;
  actorImageUrl?: string;
  imageUrl?: string;
  createdAt?: string;
  timestamp?: string;
  time?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Paged response structure for GET /notifications */
export interface NotificationListResponse {
  content?: NotificationListDto[];
  notifications?: NotificationListDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

export type InAppNotificationStreamEventType = 'connected' | 'notification' | 'heartbeat' | 'disconnected';

export interface InAppNotificationStreamEvent {
  type: InAppNotificationStreamEventType;
  payload: unknown;
}

const RECONNECT_DELAY_MS = 3000;

@Injectable({ providedIn: 'root' })
export class InAppNotificationsService {
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.API_BASE_URL;
  private readonly api = inject(ApiService);

  /**
   * Fetch paginated list of notifications for the given userId (newest first).
   * GET /notifications?userId=&page=0&size=20
   */
  listNotifications(
    userId: string,
    page = 0,
    size = 20,
  ): Observable<NotificationListDto[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.NOTIFICATIONS.LIST, { userId, page, size })
      .pipe(
        map((raw) => {
          const unwrapped = unwrapApiResponse<NotificationListResponse | NotificationListDto[]>(raw);
          if (Array.isArray(unwrapped)) {
            return unwrapped;
          }
          const resp = unwrapped as NotificationListResponse | null | undefined;
          return resp?.notifications ?? resp?.content ?? [];
        }),
      );
  }

  /**
   * Connect to SSE stream. Emits:
   * - connected: browser onopen or server "connected" event → update UI status
   * - notification: new notification → update list, badge, optional toast
   * - heartbeat: keepalive → optional reset heartbeat timer
   * - disconnected: onerror → update UI, reconnect is scheduled automatically
   *
   * Reconnect: on error we close EventSource and retry after RECONNECT_DELAY_MS.
   * Unsubscribe to stop stream and cancel reconnect.
   */
  connectStream(userId: string): Observable<InAppNotificationStreamEvent> {
    return new Observable<InAppNotificationStreamEvent>((subscriber) => {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        subscriber.complete();
        return;
      }

      const endpoint = API_ENDPOINTS.NOTIFICATIONS.STREAM;
      const url = `${this.buildUrl(endpoint)}?userId=${encodeURIComponent(userId)}`;

      let eventSource: EventSource | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

      function clearReconnect(): void {
        if (reconnectTimer !== null) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      }

      function connect(): void {
        clearReconnect();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource(url);

        // 1. Browser-level connected
        eventSource.onopen = () => {
          subscriber.next({ type: 'connected', payload: null });
        };

        // 2. Server confirmation event
        eventSource.addEventListener('connected', (event: Event) => {
          const messageEvent = event as MessageEvent;
          subscriber.next({ type: 'connected', payload: parsePayload(messageEvent.data) });
        });

        // 3. Main event: new notification
        eventSource.addEventListener('notification', (event: Event) => {
          const messageEvent = event as MessageEvent;
          subscriber.next({ type: 'notification', payload: parsePayload(messageEvent.data) });
        });

        // 4. Heartbeat (optional keepalive)
        eventSource.addEventListener('heartbeat', () => {
          subscriber.next({ type: 'heartbeat', payload: null });
        });

        // 5. Disconnect / error → close and schedule reconnect
        eventSource.onerror = () => {
          subscriber.next({ type: 'disconnected', payload: null });
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          clearReconnect();
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, RECONNECT_DELAY_MS);
        };
      }

      connect();

      return () => {
        clearReconnect();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    });
  }

  private buildUrl(endpoint: string): string {
    const base = (this.baseUrl ?? '').trim();
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return normalized + path;
  }
}

function parsePayload(raw: unknown): unknown {
  if (typeof raw !== 'string') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
