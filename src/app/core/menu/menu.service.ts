import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS, UserRole, UserType } from '../config/app.constants';
import { MenuConfig, MenuItem } from '../models/menu.model';
import { StorageService } from '../storage/storage.service';
import { RoleService } from '../rbac/role.service';

const USER_TYPE_MENU_CONFIG: Readonly<
  Record<UserType, readonly Omit<MenuItem, 'roles' | 'permissions'>[]>
> =
  {
    CAMPUS: [
      {
        id: 'campus-about',
        label: 'About campus',
        icon: 'fa-angle-double-right',
        route: '/campus/about',
        order: 1,
        module: 'campus',
      },
      {
        id: 'campus-courses',
        label: 'Courses',
        icon: 'fa-angle-double-right',
        route: '#',
        order: 2,
        module: 'campus',
      },
      {
        id: 'campus-prospectus',
        label: 'Upload Prospectus',
        icon: 'fa-upload',
        route: '#',
        order: 3,
        module: 'campus',
      },
    ],
    STUDENT: [
      {
        id: 'student-profile',
        label: 'Get to Know Me',
        icon: 'fa-angle-double-right',
        route: '/student/profile',
        order: 1,
        module: 'student',
      },
      {
        id: 'student-learning-pathway',
        label: 'Learning Pathway',
        icon: 'fa-book',
        route: '#',
        order: 2,
        module: 'student',
      },
      {
        id: 'student-resume',
        label: 'Resume',
        icon: 'fa-file-lines',
        route: '#',
        order: 3,
        module: 'student',
      },
      {
        id: 'student-dream-job-toolkit',
        label: 'Your Dream Job Toolkit',
        icon: 'fa-briefcase',
        route: '#',
        order: 4,
        module: 'student',
      },
      {
        id: 'student-career-checkin',
        label: 'Career Check-In',
        icon: 'fa-id-card',
        route: '#',
        order: 5,
        module: 'student',
      },
    ],
    COMPANY: [
      {
        id: 'company-about',
        label: 'About company',
        icon: 'fa-angle-double-right',
        route: '/company/about',
        order: 1,
        module: 'company',
      },
      {
        id: 'company-specialization',
        label: 'Specialization',
        icon: 'fa-angle-double-right',
        route: '#',
        order: 2,
        module: 'company',
      },
      {
        id: 'company-vision-performance',
        label: 'Vision & Performance',
        icon: 'fa-angle-double-right',
        route: '#',
        order: 3,
        module: 'company',
      },
      {
        id: 'company-current-vacancy',
        label: 'Current vacancy',
        icon: 'fa-angle-double-right',
        route: '#',
        order: 4,
        module: 'company',
      },
      {
        id: 'company-benefits',
        label: 'Benefits Offer',
        icon: 'fa-angle-double-right',
        route: '#',
        order: 5,
        module: 'company',
      },
    ],
  };

const ADMIN_MENU: readonly MenuItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: 'fa-home',
    route: '/admin/dashboard',
    order: 1,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: [],
  },
  {
    id: 'admin-campus',
    label: 'Campus Management',
    icon: 'fa-building',
    route: '/admin/campus',
    order: 2,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: [],
  },
  {
    id: 'admin-student',
    label: 'Student Management',
    icon: 'fa-user-graduate',
    route: '/admin/student',
    order: 3,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: [],
  },
  {
    id: 'admin-company',
    label: 'Company Management',
    icon: 'fa-briefcase',
    route: '/admin/company',
    order: 4,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: [],
  },
  {
    id: 'admin-app',
    label: 'App Management',
    icon: 'fa-cog',
    route: '/admin/app',
    order: 5,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: [],
  },
];

function roleForUserType(userType: UserType): UserRole {
  if (userType === 'CAMPUS') {
    return 'CAMPUS_ADMIN';
  }
  if (userType === 'COMPANY') {
    return 'COMPANY_ADMIN';
  }
  return 'STUDENT';
}

function buildUserTypeMenus(userType: UserType): MenuItem[] {
  const role = roleForUserType(userType);
  return USER_TYPE_MENU_CONFIG[userType].map((item) => ({
    ...item,
    roles: [role],
    permissions: [],
  }));
}

function sortByOrder(items: readonly MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly storage = inject(StorageService);
  private readonly roleService = inject(RoleService);

  private readonly configSignal = signal<MenuConfig | null>(this.storage.get(STORAGE_KEYS.MENU_CONFIG));

  readonly allMenuItems = computed<MenuItem[]>(() => {
    const role = this.roleService.getPrimaryRole();
    const userType = this.roleService.getUserType();
    const base: MenuItem[] = [];

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      base.push(...ADMIN_MENU);
    } else if (userType) {
      base.push(...buildUserTypeMenus(userType));
    }

    // Persisted menu items can extend/override base
    const persisted = this.configSignal()?.items ?? [];
    const merged = mergeMenuItems(base, persisted);
    return sortByOrder(merged);
  });

  readonly menuItems = computed<MenuItem[]>(() => this.allMenuItems().filter((i) => this.hasAccess(i)));

  /**
   * Modules can register menu items dynamically (legacy behavior).
   */
  registerMenuItem(item: Partial<MenuItem> & Pick<MenuItem, 'id' | 'label'>): void {
    const current = this.configSignal()?.items ?? [];
    const nextItem: MenuItem = {
      id: item.id,
      label: item.label,
      icon: item.icon ?? 'fa-circle',
      route: item.route ?? '#',
      order: item.order ?? 999,
      module: item.module ?? 'unknown',
      roles: item.roles ?? [],
      permissions: item.permissions ?? [],
    };

    const merged = mergeMenuItems(current, [nextItem]);
    this.saveMenuConfig(merged);
  }

  clear(): void {
    this.saveMenuConfig([]);
  }

  reset(): void {
    this.configSignal.set(null);
    this.storage.remove(STORAGE_KEYS.MENU_CONFIG);
  }

  private saveMenuConfig(items: MenuItem[]): void {
    const config: MenuConfig = {
      items,
      lastUpdated: new Date().toISOString(),
    };
    this.configSignal.set(config);
    this.storage.set(STORAGE_KEYS.MENU_CONFIG, config);
  }

  private hasAccess(item: MenuItem): boolean {
    // If no roles/permissions specified, allow (matches legacy).
    const hasRoles = item.roles.length > 0;
    const hasPermissions = item.permissions.length > 0;
    if (!hasRoles && !hasPermissions) {
      return true;
    }
    if (hasRoles && !this.roleService.hasAnyRole(item.roles)) {
      return false;
    }
    if (hasPermissions && !this.roleService.hasPermission(item.permissions)) {
      return false;
    }
    return true;
  }
}

function mergeMenuItems(a: readonly MenuItem[], b: readonly MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  for (const item of a) {
    map.set(item.id, item);
  }
  for (const item of b) {
    const prev = map.get(item.id);
    map.set(item.id, { ...(prev ?? item), ...item });
  }
  return [...map.values()];
}


