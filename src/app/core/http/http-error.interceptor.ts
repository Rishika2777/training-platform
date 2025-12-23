import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error;
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }
    if (payload && typeof payload === 'object') {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }
    }
    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
    return `Request failed (${error.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((err: unknown) => {
      notifications.error(getErrorMessage(err));
      return throwError(() => err);
    }),
  );
};


