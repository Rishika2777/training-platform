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
          console.warn('httpErrorInterceptor: 401 on faculty API - NOT clearing token, NOT redirecting');
          console.warn('httpErrorInterceptor: URL:', req.url);
          console.warn('httpErrorInterceptor: Letting component handle error');
          notifications.error(getErrorMessage(err));
          return throwError(() => err);
        }
      }
      
      notifications.error(getErrorMessage(err));
      return throwError(() => err);
    }),
  );
};


