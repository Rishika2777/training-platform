import { CanMatchFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ROUTES, STORAGE_KEYS } from '../config/app.constants';
import { RoleService } from '../rbac/role.service';
import { AuthStateService } from '../auth/auth-state.service';
import { StorageService } from '../storage/storage.service';

export const authGuard: CanMatchFn = () => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  // CRITICAL: During SSR, we cannot check localStorage, so we allow the request
  // The actual authentication will be checked when the page hydrates in the browser
  if (!isBrowser) {
    console.log('🔒 AUTH GUARD - Running in SSR context, allowing access (will check on browser hydration)');
    return true;
  }
  
  const roles = inject(RoleService);
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const storage = inject(StorageService);
  
  console.log('🔒 AUTH GUARD - Starting authentication check (browser context)...');
  
  // Check token from signal
  const tokenFromSignal = authState.token();
  console.log('🔒 AUTH GUARD - Token from signal:', tokenFromSignal ? 'EXISTS' : 'NULL');
  
  // Also check directly from localStorage as a fallback
  // This is important for new tabs where signals might not be initialized yet
  const tokenFromStorage = storage.get(STORAGE_KEYS.AUTH_TOKEN);
  console.log('🔒 AUTH GUARD - Token from storage:', tokenFromStorage ? 'EXISTS' : 'NULL');
  
  // Check user data
  const user = authState.user();
  console.log('🔒 AUTH GUARD - User from signal:', user ? user : 'NULL');
  
  // Check role-based authentication
  const isAuthFromRole = roles.isAuthenticated();
  console.log('🔒 AUTH GUARD - Is authenticated (role service):', isAuthFromRole);
  
  // User is authenticated if any of these are true
  const isAuth = Boolean(tokenFromSignal) || Boolean(tokenFromStorage) || isAuthFromRole;
  console.log('🔒 AUTH GUARD - Final authentication result:', isAuth);
  
  if (isAuth) {
    console.log('✅ AUTH GUARD - Authentication passed, allowing access');
    return true;
  }
  
  console.warn('❌ AUTH GUARD - User not authenticated, redirecting to login');
  console.warn('❌ AUTH GUARD - Debug info:', {
    isBrowser,
    tokenFromSignal: Boolean(tokenFromSignal),
    tokenFromStorage: Boolean(tokenFromStorage),
    isAuthFromRole,
    user
  });
  return router.parseUrl(ROUTES.LOGIN);
};


