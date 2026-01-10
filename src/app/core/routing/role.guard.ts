import { CanMatchFn, Route, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RoleService } from '../rbac/role.service';
import { NotificationService } from '../notifications/notification.service';
import { UserRole } from '../config/app.constants';

function getRequiredRoles(route: Route): UserRole[] {
  const data = route.data as { requiredRoles?: UserRole[] } | undefined;
  return data?.requiredRoles ?? [];
}

export const roleGuard: CanMatchFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  // CRITICAL: During SSR, we cannot check roles from localStorage, so we allow the request
  // The actual role check will happen when the page hydrates in the browser
  if (!isBrowser) {
    console.log('🛡️ ROLE GUARD - Running in SSR context, allowing access (will check on browser hydration)');
    return true;
  }
  
  const roles = inject(RoleService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const required = getRequiredRoles(route);
  console.log('🛡️ ROLE GUARD - Required roles:', required);
  
  if (required.length === 0) {
    console.log('✅ ROLE GUARD - No roles required, allowing access');
    return true;
  }
  
  const userRoles = roles.getUserRoles();
  const currentUser = roles.getCurrentUser();
  console.log('🛡️ ROLE GUARD - Current user:', currentUser);
  console.log('🛡️ ROLE GUARD - User roles:', userRoles);
  console.log('🛡️ ROLE GUARD - Checking if user has any of required roles:', required);
  
  if (roles.hasAnyRole(required)) {
    console.log('✅ ROLE GUARD - User has required role, allowing access');
    return true;
  }

  console.warn('❌ ROLE GUARD - User does not have required role');
  console.warn('❌ ROLE GUARD - Required:', required, 'User has:', userRoles);
  notifications.error('You do not have permission to access this page.');
  return router.parseUrl(roles.getHomeRouteForUser());
};


