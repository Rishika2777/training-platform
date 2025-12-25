import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROUTES } from '../config/app.constants';
import { RoleService } from '../rbac/role.service';
import { AuthStateService } from '../auth/auth-state.service';

export const authGuard: CanMatchFn = () => {
  const roles = inject(RoleService);
  const router = inject(Router);
  const authState = inject(AuthStateService);
  
  // Force a check - ensure we read the latest value
  const token = authState.token();
  const isAuthFromRole = roles.isAuthenticated();
  const isAuth = Boolean(token) || isAuthFromRole;
  
  if (isAuth) {
    return true;
  }
  return router.parseUrl(ROUTES.LOGIN);
};


