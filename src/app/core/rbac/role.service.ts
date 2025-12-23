import { Injectable, inject } from '@angular/core';
import { ROLE_HIERARCHY, ROUTES, UserRole, UserType } from '../config/app.constants';
import { AuthStateService } from '../auth/auth-state.service';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly authState = inject(AuthStateService);
  getUserType(): UserType | null {
    return this.getCurrentUser()?.userType ?? null;
  }

  getCurrentUser() {
    return this.authState.user();
  }

  getUserRoles(): UserRole[] {
    const user = this.getCurrentUser();
    if (!user) {
      return [];
    }
    const roles = user.roles ?? [];
    return roles.filter((r): r is UserRole => Boolean(r));
  }

  hasRole(role: UserRole): boolean {
    return this.getUserRoles().includes(role);
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    if (roles.length === 0) {
      return true;
    }
    const userRoles = this.getUserRoles();
    return roles.some((role) => userRoles.includes(role));
  }

  hasAllRoles(roles: readonly UserRole[]): boolean {
    if (roles.length === 0) {
      return true;
    }
    const userRoles = this.getUserRoles();
    return roles.every((role) => userRoles.includes(role));
  }

  hasMinimumRole(requiredRole: UserRole): boolean {
    const userRoles = this.getUserRoles();
    if (userRoles.length === 0) {
      return false;
    }
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    return userRoles.some((role) => (ROLE_HIERARCHY[role] ?? 0) >= requiredLevel);
  }

  hasPermission(permissions: readonly string[]): boolean {
    if (permissions.length === 0) {
      return true;
    }
    const user = this.getCurrentUser();
    const userPermissions = user?.permissions ?? [];
    const userRoles = this.getUserRoles();

    return permissions.some((permission) => userRoles.includes(permission as UserRole) || userPermissions.includes(permission));
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  isAdmin(): boolean {
    return this.hasAnyRole(['ADMIN', 'SUPER_ADMIN']);
  }

  isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  /**
   * Role resolution for RBAC: checks role, then roles[0].
   * Note: backend `userType` is a separate concept and is used for UX (menu/home),
   * not for RBAC.
   */
  getPrimaryRole(): UserRole | null {
    const user = this.getCurrentUser();
    if (!user) {
      return null;
    }
    const direct = user.role ?? user.roles?.[0] ?? null;
    return direct ?? null;
  }

  getHomeRouteForUser(): string {
    // Home is driven by userType (UX), not by role.
    const userType = this.getUserType();
    if (userType === 'CAMPUS') {
      return '/campus/home';
    }
    if (userType === 'COMPANY') {
      return '/company/home';
    }
    if (userType === 'STUDENT') {
      return '/student/home';
    }

    // Fallback: admins typically have no CAMPUS/COMPANY/STUDENT userType.
    const role = this.getPrimaryRole();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return '/admin/dashboard';
    }
    return ROUTES.ROOT;
  }

  /**
   * Registration is multi-step. When token exists but profile is incomplete,
   * we allow access to `/register-(campus|student|company)` routes.
   */
  isProfileIncomplete(): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }
    // Treat missing `profileCompleted` as incomplete.
    // Backend sets `profileCompleted === true` only after completing the profile flow.
    return user.profileCompleted !== true;
  }
}



