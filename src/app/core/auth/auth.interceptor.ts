import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const token = authState.token();
  
  // Skip adding Authorization header for public endpoints (feedback, visit campus, etc.)
  if (req.url.includes('/public/landing/')) {
    return next(req);
  }
  
  if (!token) {
    return next(req);
  }

  // Skip adding Authorization header if the request has a custom header that indicates
  // it should skip auth (for CORS preflight issues)
  if (req.headers.has('X-Skip-Auth')) {
    return next(req);
  }

  // Clone request and add Authorization header
  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedReq);
};


