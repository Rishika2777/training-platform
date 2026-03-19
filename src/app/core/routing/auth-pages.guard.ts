import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { RoleService } from '../rbac/role.service';

function buildUrlFromSegments(segments: UrlSegment[]): string {
  const path = segments.map((s) => s.path).join('/');
  return `/${path}`;
}

export const authPagesGuard: CanMatchFn = (_route, segments) => {
  const roles = inject(RoleService);
  const router = inject(Router);

  if (!roles.isAuthenticated()) {
    return true;
  }

  const url = buildUrlFromSegments(segments);
  const isRegisterFlow = url === '/register' || url.startsWith('/register/');
  const isLegacyProfileRegistrationRoute =
    url === '/register-campus' || url === '/register-student' || url === '/register-company';

  if ((isRegisterFlow || isLegacyProfileRegistrationRoute) && roles.isProfileIncomplete()) {
    return true;
  }

  // Legacy behavior: if already authenticated, redirect away from register pages.
  return router.parseUrl(roles.getHomeRouteForUser());
};


