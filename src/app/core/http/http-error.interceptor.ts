import { HttpErrorResponse, HttpInterceptorFn,HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError,of } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';
import { AuthService } from '../auth/auth.service';

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error;

    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const errorObj = payload as { error?: unknown; message?: unknown };

      if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
        return errorObj.message;
      }

      if (typeof errorObj.error === 'string' && errorObj.error.trim()) {
        return errorObj.error;
      }

      if (errorObj.error && typeof errorObj.error === 'object') {
        const nested = errorObj.error as { message?: unknown };
        if (typeof nested.message === 'string' && nested.message.trim()) {
          return nested.message;
        }
      }
    }

    return error.message || `Request failed (${error.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'A connection error occurred. Please try again.';
}

function isLandingPublicRequest(url: string): boolean {
  return (
    url.includes('/common/search/autosearch') ||
    url.includes('/public/landing/campuses/carousel') ||
    url.includes('/public/landing/companies/carousel') ||
    url.includes('/public/landing/about') ||
    url.includes('/guest/landing') ||
    url.includes('/dashboard/announcements')
  );
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: unknown) => {

      /* =========================================================
         ✅ FIX 1: EMPTY DATA (NEW COMPANY) → NO ERROR TOAST
         ========================================================= */
      if (
        err instanceof HttpErrorResponse &&
        err.status === 404 &&
        (
          req.url.includes('/clients') ||
          req.url.includes('/technologies') ||
          req.url.includes('/benefits') ||
          req.url.includes('/vision') ||
          req.url.includes('/campus') ||
          req.url.includes('/vacancies') ||
          req.url.includes('/target-campuses') ||
          req.url.includes('/key-people') ||
          req.url.includes('/promotions')
        )
      ) {
        // Empty data is expected → silently ignore
        console.warn('HTTP Interceptor: 404 empty data (expected):', req.url);
        return of(
  new HttpResponse({
    status: 200,
    body: []   // empty data
  })
);

      }

      /* =========================================================
         EXISTING LOGIC (SAFE – UNCHANGED)
         ========================================================= */
      if (err instanceof HttpErrorResponse) {
        const errorResponse = err.error;

        // Login (email not verified) – handled by component
        if (
          errorResponse &&
          typeof errorResponse === 'object' &&
          auth.extractEmailVerified(errorResponse) === false &&
          req.url.includes('/auth/login')
        ) {
          return throwError(() => err);
        }

        // Reset password – let component handle
        if (err.status === 401 && req.url.includes('/auth/reset-password')) {
          return throwError(() => err);
        }

        // 400 on register: component shows field-level message and redirects to /register
        if (err.status === 400 && req.url.includes('/auth/register')) {
          return throwError(() => err);
        }

        // IMPORTANT: For 401 errors on faculty API, don't clear token or redirect
        // Let the component handle the error
        if (err.status === 401 && req.url.includes('/faculty')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }

        // Courses APIs
        if (err.status === 401 && (req.url.includes('/courses') || req.url.includes('/course'))) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }

        // Companies / dashboard - suppress 401 errors during initialization
        // These errors occur when user data hasn't loaded yet after page refresh
        if (err.status === 401 && (req.url.includes('/dashboard/companies') || req.url.includes('/companies'))) {
          // Check if this is likely an initialization error (user data not loaded)
          // If user is not authenticated, the auth guard will handle redirect
          // Don't show error toast for company API calls during initialization
          console.warn('HTTP Interceptor: Suppressing 401 error for company API (likely initialization):', req.url);
          return throwError(() => err);
        }

        // Prospectus
        if (err.status === 401 && req.url.includes('/prospectus')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }

        // Public landing APIs
        if (req.url.includes('/public/landing/feedback') || req.url.includes('/public/landing/visit')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        if (req.url.includes('/public/landing') || req.url.includes('/guest/landing')) {
          return throwError(() => err);
        }

        // Announcements (public landing)
        if (err.status === 401 && req.url.includes('/dashboard/announcements')) {
          return throwError(() => err);
        }

        // Campus session / token refresh handled elsewhere
        if (
          err.status === 401 &&
          (
            req.url.includes('/campus/') ||
            req.url.includes('/dashboard/placed-students') ||
            req.url.includes('/dashboard/alumni') ||
            req.url.includes('/testimonials') ||
            req.url.includes('/research') ||
            req.url.includes('/placement-insights') ||
            req.url.includes('/alumni')
          )
        ) {
          return throwError(() => err);
        }

        // 502 / 503 infra issues – suppress noise
        if (
          (err.status === 502 || err.status === 503) &&
          (
            req.url.includes('/campus/') ||
            req.url.includes('/courses') ||
            req.url.includes('/faculty') ||
            req.url.includes('/prospectus') ||
            req.url.includes('/public/landing')
          )
        ) {
          return throwError(() => err);
        }

        // Campus not found (expected sometimes)
        if (
          req.url.includes('/campus/') &&
          getErrorMessage(err).toLowerCase().includes('campus not found')
        ) {
          return throwError(() => err);
        }
      }

      // Landing public read-only: avoid generic toast so page can show inline error (e.g. "Unable to load campuses")
      if (isLandingPublicRequest(req.url)) {
        return throwError(() => err);
      }

      // 401 on login endpoint → always show message (e.g. "Invalid email or password")
      if (err instanceof HttpErrorResponse && err.status === 401 && req.url.includes('/auth/login')) {
        notifications.error(getErrorMessage(err));
        return throwError(() => err);
      }

      // 401 after logout / no auth: avoid "Unauthorized" toast (user is already on login or public page)
      if (err instanceof HttpErrorResponse && err.status === 401 && !auth.isAuthenticated()) {
        return throwError(() => err);
      }

      // Other real errors → show notification
      notifications.error(getErrorMessage(err));
      return throwError(() => err);
    })
  );
};
