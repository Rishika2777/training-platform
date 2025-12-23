import { CanMatchFn, Route, Router } from '@angular/router';
import { inject } from '@angular/core';
import { RoleService } from '../rbac/role.service';
import { NotificationService } from '../notifications/notification.service';
import { UserRole } from '../config/app.constants';

function getRequiredRoles(route: Route): UserRole[] {
  const data = route.data as { requiredRoles?: UserRole[] } | undefined;
  return data?.requiredRoles ?? [];
}

export const roleGuard: CanMatchFn = (route) => {
  const roles = inject(RoleService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const required = getRequiredRoles(route);
  if (required.length === 0) {
    return true;
  }
  if (roles.hasAnyRole(required)) {
    return true;
  }

  notifications.error('You do not have permission to access this page.');
  return router.parseUrl(roles.getHomeRouteForUser());
};


