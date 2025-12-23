import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROUTES } from '../config/app.constants';
import { RoleService } from '../rbac/role.service';

export const authGuard: CanMatchFn = () => {
  const roles = inject(RoleService);
  const router = inject(Router);
  if (roles.isAuthenticated()) {
    return true;
  }
  return router.parseUrl(ROUTES.LOGIN);
};


