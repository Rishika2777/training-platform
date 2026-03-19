import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';
import { ROUTES } from '../config/app.constants';

/**
 * App initializer that runs after Angular hydration in the browser.
 * This ensures authenticated routes redirect to login if no auth token exists.
 */
export function createAuthInitializer(
  platformId: object,
  router: Router,
  authState: AuthStateService
) {
  return () => {
    // Only run in browser context (after SSR hydration)
    if (!isPlatformBrowser(platformId)) {
      console.log('⚡ Auth Initializer - Skipping in SSR context');
      return Promise.resolve();
    }

    console.log('⚡ Auth Initializer - Running post-hydration auth check...');
    
    // Check if user is on a protected route
    const currentUrl = router.url;
    const isProtectedRoute = 
      currentUrl.startsWith('/student') ||
      currentUrl.startsWith('/campus') ||
      currentUrl.startsWith('/department') ||
      currentUrl.startsWith('/company') ||
      currentUrl.startsWith('/admin');
    
    if (!isProtectedRoute) {
      console.log('⚡ Auth Initializer - Not on protected route, skipping');
      return Promise.resolve();
    }
    
    // Check authentication
    const token = authState.token();
    const user = authState.user();
    
    console.log('⚡ Auth Initializer - Token exists:', Boolean(token));
    console.log('⚡ Auth Initializer - User exists:', Boolean(user));
    
    if (!token || !user) {
      console.warn('⚡ Auth Initializer - No auth found, redirecting to login');
      void router.navigateByUrl(ROUTES.LOGIN);
    } else {
      console.log('⚡ Auth Initializer - Auth validated, user can stay on protected route');
    }
    
    return Promise.resolve();
  };
}
