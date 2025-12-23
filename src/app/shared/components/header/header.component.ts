import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { MenuService } from '../../../core/menu/menu.service';
import { RoleService } from '../../../core/rbac/role.service';
import { AuthService } from '../../../core/auth/auth.service';

function isSimpleHeaderRoute(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/register-options' ||
    path === '/register-campus' ||
    path === '/register-student' ||
    path === '/register-company'
  );
}

function titleFromPath(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0);
  const last = parts.at(-1) ?? 'Dashboard';
  return last.charAt(0).toUpperCase() + last.slice(1).replaceAll('-', ' ');
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class AppHeaderComponent {
  @Input() sidebarCollapsed = false;
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly menu = inject(MenuService);
  private readonly roles = inject(RoleService);
  private readonly auth = inject(AuthService);

  private readonly path = signal<string>(this.currentPath());
  readonly searchValue = signal('');
  readonly isSimpleHeader = computed(() => isSimpleHeaderRoute(this.path()));
  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());

  readonly pageTitle = computed(() => {
    const path = this.path();

    if (path.startsWith('/settings')) {
      return 'Settings';
    }

    const all = this.menu.allMenuItems();
    const exact = all.find((i) => i.route === path);
    if (exact) {
      return exact.label;
    }
    return titleFromPath(path);
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.path.set(this.currentPath()));
  }

  goHome(): void {
    void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.searchValue.set(target.value);
  }

  submitSearch(): void {
    // Placeholder hook for future search integration.
    this.noop();
  }

  refresh(): void {
    // SSR-safe: only run in browser
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  noop(): void {
    // Intentionally empty
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }

  private currentPath(): string {
    return this.router.url.split('?')[0] ?? '/';
  }
}


