import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';
import { AuthService } from '../auth/auth.service';

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error;
    
    // Handle string error response
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }
    
    // Handle object error response (API response format)
    if (payload && typeof payload === 'object') {
      const errorObj = payload as { error?: unknown; message?: unknown; statusCode?: number };
      
      // Check for 'message' field first (most common API response format)
      if (typeof errorObj.message === 'string' && errorObj.message.trim().length > 0) {
        return errorObj.message;
      }
      
      // Check for 'error' field (detailed error message from backend)
      if (typeof errorObj.error === 'string' && errorObj.error.trim().length > 0) {
        return errorObj.error;
      }
      
      // Check for nested error object
      if (errorObj.error && typeof errorObj.error === 'object') {
        const nestedError = errorObj.error as { message?: unknown };
        if (typeof nestedError.message === 'string' && nestedError.message.trim().length > 0) {
          return nestedError.message;
        }
      }
    }
    
    // Fallback to HTTP error message
    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
    
    // Default error message based on status code
    const statusMessages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized - Please login again',
      403: 'Forbidden - You do not have permission',
      404: 'Resource not found',
      409: 'Conflict - Resource already exists',
      429: 'Too many requests - Please try again later',
      500: 'Internal server error',
      502: 'Service temporarily unavailable. Please try again later or contact support.',
      503: 'Service unavailable',
    };
    
    const statusMessage = statusMessages[error.status ?? 0];
    if (statusMessage) {
      return statusMessage;
    }
    
    return `Request failed (${error.status ?? 'Unknown'})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error occurred';
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      // Check if this is a login error with emailVerified: false
      // In this case, we don't show error notification as the login component will handle it with OTP modal
      if (err instanceof HttpErrorResponse) {
        const errorResponse = err.error;
        if (errorResponse && typeof errorResponse === 'object') {
          const emailVerified = auth.extractEmailVerified(errorResponse);
          // If emailVerified is false, this is handled by login component - don't show error notification
          if (emailVerified === false && req.url.includes('/auth/login')) {
            return throwError(() => err);
          }
        }
        
        // IMPORTANT: For 401 errors on faculty API, don't clear token or redirect
        // Let the component handle the error
        if (err.status === 401 && req.url.includes('/faculty')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        
        // IMPORTANT: For 401 errors on courses API, don't clear token or redirect
        // Let the component handle the error
        if (err.status === 401 && (req.url.includes('/courses') || req.url.includes('/course'))) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        
        // IMPORTANT: For 401 errors on companies/dashboard API, don't clear token or redirect
        // Let the component handle the error
        if (err.status === 401 && (req.url.includes('/dashboard/companies') || req.url.includes('/companies'))) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        
        // IMPORTANT: For 401 errors on prospectus API, don't clear token or redirect
        // Let the component handle the error
        if (err.status === 401 && req.url.includes('/prospectus')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        
        // IMPORTANT: For ALL errors on public/landing endpoints (feedback, visit campus), don't clear token or redirect
        // These are public endpoints and should not trigger auth redirects for any error
        if (req.url.includes('/public/landing/feedback') || req.url.includes('/public/landing/visit') || req.url.includes('/public/landing')) {
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
        
        // IMPORTANT: For 401 errors on campus-related endpoints, don't clear token or redirect
        // The CampusSessionService handles automatic token refresh for active users
        // Let the component handle the error gracefully
        if (err.status === 401 && (
          req.url.includes('/campus/') || 
          req.url.includes('/dashboard/placed-students') ||
          req.url.includes('/dashboard/alumni') ||
          req.url.includes('/testimonials') ||
          req.url.includes('/research') ||
          req.url.includes('/placement-insights') ||
          req.url.includes('/alumni')
        )) {
          // Silently handle 401 errors for campus endpoints - don't show error notification
          // CampusSessionService will automatically refresh tokens for active users
          // The component will handle these errors gracefully
          console.warn('HTTP Error Interceptor: 401 error on campus endpoint, letting component handle it (CampusSessionService will refresh token if user is active):', req.url);
          return throwError(() => err);
        }
        
        // IMPORTANT: For 502/503 errors (service unavailable/not configured) on campus endpoints,
        // suppress error notification - these are infrastructure/configuration issues
        if ((err.status === 502 || err.status === 503) && (
          req.url.includes('/campus/') || 
          req.url.includes('/dashboard/placed-students') ||
          req.url.includes('/dashboard/alumni') ||
          req.url.includes('/testimonials') ||
          req.url.includes('/research') ||
          req.url.includes('/placement-insights') ||
          req.url.includes('/alumni') ||
          req.url.includes('/courses') ||
          req.url.includes('/faculty') ||
          req.url.includes('/prospectus') ||
          req.url.includes('/public/landing/visit') ||
          req.url.includes('/public/landing/feedback')
        )) {
          const errorMessage = getErrorMessage(err);
          // Suppress error notification for backend configuration issues
          if (errorMessage.includes('not configured') || errorMessage.includes('Upstream service URL')) {
            console.warn('HTTP Error Interceptor: Backend service not configured for campus endpoint, suppressing error notification:', req.url);
            return throwError(() => err);
          }
          // Suppress all 502/503 errors for these endpoints (infrastructure issues)
          console.warn('HTTP Error Interceptor: Backend service unavailable (502/503) for endpoint, suppressing error notification:', req.url);
          return throwError(() => err);
        }
        
        // IMPORTANT: Suppress "Campus not found" errors for campus endpoints
        // These are expected when viewing a new campus or when backend service is not configured
        if (req.url.includes('/campus/') || req.url.includes('/public/landing/campus/')) {
          const errorMessage = getErrorMessage(err);
          if (errorMessage.includes('Campus not found') || errorMessage.includes('campus not found')) {
            console.warn('HTTP Error Interceptor: Campus not found error, suppressing notification (expected for new campuses or configuration issues):', req.url);
            return throwError(() => err);
          }
        }
      }
      
      notifications.error(getErrorMessage(err));
      return throwError(() => err);
    }),
  );
};


