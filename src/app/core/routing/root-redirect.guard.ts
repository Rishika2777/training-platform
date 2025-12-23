import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { RoleService } from '../rbac/role.service';

export const rootRedirectGuard: CanMatchFn = () => {
  const roles = inject(RoleService);
  const router = inject(Router);
  if (!roles.isAuthenticated()) {
    return true;
  }
  return router.parseUrl(roles.getHomeRouteForUser());
};


