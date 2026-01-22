import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { MenuService } from '../../../core/menu/menu.service';
import { RoleService } from '../../../core/rbac/role.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsDropdownComponent, NotificationItem } from '../notifications-dropdown/notifications-dropdown.component';
import { SettingsDropdownComponent, SettingsOption } from '../settings-dropdown/settings-dropdown.component';
import { ModalComponent } from '../modal/modal.component';
import { EditProfileModalComponent } from '../../../features/settings/modals/edit-profile/edit-profile-modal.component';
import { ChangePasswordComponent } from '../../../features/settings/modals/change-password/change-password.component';
import { DeleteAccountComponent } from '../../../features/settings/modals/delete-account/delete-account.component';
import { ReportIssueComponent } from '../../../features/settings/modals/report-issue/report-issue.component';
import { ContactSupportComponent } from '../../../features/settings/modals/contact-support/contact-support.component';
import { FeedbackFormComponent } from '../../../features/settings/modals/feedback-form/feedback-form.component';
import { BugReportFormComponent } from '../../../features/settings/modals/bug-report-form/bug-report-form.component';
import { HelpDeskFormComponent } from '../../../features/settings/modals/help-desk-form/help-desk-form.component';

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

function isCampusAboutRoute(path: string): boolean {
  return path.startsWith('/campus/about');
}

function isStudentProfileRoute(path: string): boolean {
  return path.startsWith('/student/profile');
}

function titleFromPath(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0);
  
  // Find the last non-UUID part for the title
  // UUIDs are typically 36 characters with hyphens, or might be other ID formats
  let titlePart = 'Dashboard';
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Skip if it looks like a UUID or numeric ID
    if (!isLikelyId(part)) {
      titlePart = part;
      break;
    }
  }
  
  return titlePart.charAt(0).toUpperCase() + titlePart.slice(1).replaceAll('-', ' ');
}

/**
 * Check if a string looks like an ID (UUID, number, or other identifier)
 */
function isLikelyId(str: string): boolean {
  // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(str)) {
    return true;
  }
  
  // Check if it's a pure number
  if (/^\d+$/.test(str)) {
    return true;
  }
  
  // Check if it's a long alphanumeric string (likely an ID)
  if (str.length > 20 && /^[a-zA-Z0-9-_]+$/.test(str)) {
    return true;
  }
  
  return false;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NotificationsDropdownComponent,
    SettingsDropdownComponent,
    ModalComponent,
    EditProfileModalComponent,
    ChangePasswordComponent,
    DeleteAccountComponent,
    ReportIssueComponent,
    ContactSupportComponent,
    FeedbackFormComponent,
    BugReportFormComponent,
    HelpDeskFormComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class AppHeaderComponent {
  @Input() sidebarCollapsed = false;
  @Input() standalone = false;
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly menu = inject(MenuService);
  private readonly roles = inject(RoleService);
  private readonly auth = inject(AuthService);

  private readonly path = signal<string>(this.currentPath());
  readonly searchValue = signal('');
  readonly isSimpleHeader = computed(() => isSimpleHeaderRoute(this.path()));
  readonly isCampusAbout = computed(() => isCampusAboutRoute(this.path()));
  readonly isStudentProfile = computed(() => isStudentProfileRoute(this.path()));
  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());
  readonly notificationsOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly selectedOption = signal<SettingsOption | null>(null);
  readonly selectedForm = signal<string | null>(null);

  readonly notifications: readonly NotificationItem[] = [
    {
      id: '1',
      userName: 'Ankita Willson',
      message: ' has just posted a comment.',
      timeLabel: '4h',
      profileImageUrl: 'assets/images/login-news-image.png',
      section: 'new',
    },
    {
      id: '2',
      userName: 'Ankita Willson',
      message: ' has just posted a comment.',
      timeLabel: '4h',
      profileImageUrl: 'assets/images/login-news-image.png',
      section: 'new',
    },
    {
      id: '3',
      userName: 'Amith Deshpande',
      message: ' has posted a reel.',
      timeLabel: '8h',
      profileImageUrl: 'assets/images/landing-card-campus.png',
      section: 'today',
    },
    {
      id: '4',
      userName: 'Amith Deshpande',
      message: ' has posted a reel.',
      timeLabel: '9h',
      profileImageUrl: 'assets/images/landing-card-campus.png',
      section: 'today',
    },
  ];

  readonly pageTitle = computed(() => {
    const path = this.path();

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

    // Close notifications when clicking outside
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
  }

  private handleDocumentClick(event: Event): void {
    if (event.target instanceof HTMLElement) {
      const target = event.target;
      
      // Handle notifications dropdown
      if (this.notificationsOpen()) {
        const dropdown = target.closest('app-notifications-dropdown');
        const bellButton = target.closest('.notifications-wrapper button');
        
        if (!dropdown && !bellButton) {
          this.closeNotifications();
        }
      }
      
      // Handle settings dropdown
      if (this.settingsOpen()) {
        const dropdown = target.closest('app-settings-dropdown');
        const settingsButton = target.closest('.settings-wrapper button');
        
        if (!dropdown && !settingsButton) {
          this.closeSettings();
        }
      }
    }
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

  toggleNotifications(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationsOpen.set(!this.notificationsOpen());
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  onSeePreviousNotifications(): void {
    // TODO: Implement load more notifications
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }

  toggleSettings(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.settingsOpen.set(!this.settingsOpen());
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  handleSettingsOption(option: SettingsOption): void {
    this.selectedOption.set(option);
  }

  closeOptionModal(): void {
    this.selectedOption.set(null);
    this.selectedForm.set(null);
  }

  onReportIssueOptionSelected(option: string): void {
    this.selectedForm.set(option);
  }

  onContactSupportOptionSelected(option: string): void {
    this.selectedForm.set(option);
  }

  closeFormModal(): void {
    this.selectedForm.set(null);
    // Close the parent option modal as well
    this.selectedOption.set(null);
  }

  private currentPath(): string {
    return this.router.url.split('?')[0] ?? '/';
  }
}


