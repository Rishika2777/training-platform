import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, of, Subscription, switchMap } from 'rxjs';
import { MenuService } from '../../../core/menu/menu.service';
import { RoleService } from '../../../core/rbac/role.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { ModalService } from '../../../core/modal/modal.service';
import { LandingApiService } from '../../../features/landing/services/landing-api.service';
import { SearchResultResponse } from '../../../features/landing/models/landing.models';
import { AvatarComponent } from '../avatar/avatar.component';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';
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
import { InAppNotificationService } from '../../../core/notifications/in-app-notification.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { MyPostFeedComponent } from '../../../features/settings/modals/my-post-feed/my-post-feed.component';
import type { MenuItem } from '../../../core/models/menu.model';

const HEADER_SEARCH_MIN_LENGTH = 2;
const HEADER_SEARCH_DEBOUNCE_MS = 300;

function isSimpleHeaderRoute(path: string): boolean {
  if (path.startsWith('/register')) {
    return true;
  }
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

function isDepartmentAboutRoute(path: string): boolean {
  return path.startsWith('/department/about');
}

function isCompanyAboutRoute(path: string): boolean {
  return path.startsWith('/company/about');
}

function isStudentProfileRoute(path: string): boolean {
  return path.startsWith('/student/profile');
}

function isPublicStudentProfileRoute(path: string): boolean {
  return path.startsWith('/profile/student');
}

function isPublicCompanyProfileRoute(path: string): boolean {
  return path.startsWith('/profile/company');
}

function isPublicCampusProfileRoute(path: string): boolean {
  return path.startsWith('/profile/campus');
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
    AvatarComponent,
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
    MyPostFeedComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class AppHeaderComponent implements OnDestroy {
  @Input() sidebarCollapsed = false;
  @Input() standalone = false;
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly menu = inject(MenuService);
  private readonly roles = inject(RoleService);
  readonly isDepartmentUser = computed(() => this.roles.getUserType() === 'DEPARTMENT');
  /** Hide header home icon for admin (sidebar has Dashboard link). */
  readonly isAdminUser = computed(() => this.roles.isAdmin());

  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly landingApi = inject(LandingApiService);
  private readonly inAppNotifications = inject(InAppNotificationService);
  private readonly notify = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  readonly searchResults = signal<SearchResultResponse[]>([]);
  readonly searchLoading = signal<boolean>(false);
  readonly searchDropdownVisible = signal<boolean>(false);
  private readonly searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  readonly isCompanyAbout = computed(() => isCompanyAboutRoute(this.path()));

  private readonly path = signal<string>(this.currentPath());
  readonly searchValue = signal('');
  readonly isSimpleHeader = computed(() => isSimpleHeaderRoute(this.path()));
  readonly isCampusAbout = computed(() => isCampusAboutRoute(this.path()));
  readonly isDepartmentAbout = computed(() => isDepartmentAboutRoute(this.path()));
  readonly isStudentProfile = computed(() => isStudentProfileRoute(this.path()));
  readonly isPublicStudentProfile = computed(() => isPublicStudentProfileRoute(this.path()));
  readonly isPublicCompanyProfile = computed(() => isPublicCompanyProfileRoute(this.path()));
  readonly isPublicCampusProfile = computed(() => isPublicCampusProfileRoute(this.path()));
  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());
  readonly notificationsOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly mobileSearchOpen = signal(false);
  readonly selectedOption = signal<SettingsOption | null>(null);
  readonly selectedForm = signal<string | null>(null);
  readonly logoutConfirmOpen = signal(false);

  readonly notifications = this.inAppNotifications.notifications;
  readonly notificationUnreadCount = this.inAppNotifications.unreadCount;
  readonly hasUnreadNotifications = this.inAppNotifications.hasUnread;
  readonly notificationsLoading = this.inAppNotifications.loading;
  readonly notificationsHasMorePages = this.inAppNotifications.hasMorePages;

  readonly pageTitle = computed(() => {
    const path = this.path();
    const all = this.menu.allMenuItems();
    const exact = all.find((i: MenuItem) => i.route === path);
    if (exact) {
      return exact.label;
    }
    return titleFromPath(path);
  });

  @ViewChild('headerSearchContainer') headerSearchContainer?: ElementRef<HTMLElement>;
  @ViewChild('mobileSearchContainer') mobileSearchContainer?: ElementRef<HTMLElement>;
  @ViewChild('mobileSearchInput') mobileSearchInput?: ElementRef<HTMLInputElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = this.headerSearchContainer?.nativeElement;
    if (el && event.target instanceof Node && !el.contains(event.target)) {
      this.closeSearchDropdown();
    }
    const mobileEl = this.mobileSearchContainer?.nativeElement;
    if (this.mobileSearchOpen() && mobileEl && event.target instanceof Node && !mobileEl.contains(event.target)) {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-icon-mobile')) {
        this.closeMobileSearch();
      }
    }
  }

  constructor() {
    effect(() => {
      const user = this.authState.user();
      const userId = this.getNotificationUserIdFrom(user);
      if (userId) {
        this.inAppNotifications.load(userId);
        this.inAppNotifications.connectStream(userId);
      } else {
        this.inAppNotifications.disconnectStream();
      }
    });

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.path.set(this.currentPath());
        this.closeOptionModal();
      });

    // Close notifications when clicking outside
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(HEADER_SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (q.length < HEADER_SEARCH_MIN_LENGTH) {
            this.searchResults.set([]);
            this.searchDropdownVisible.set(false);
            return of({ success: true, data: [] as SearchResultResponse[] });
          }
          this.searchLoading.set(true);
          return this.landingApi.autosearch(q);
        }),
      )
      .subscribe({
        next: (resp) => {
          this.searchLoading.set(false);
          const list = resp?.data ?? [];
          this.searchResults.set(list);
          this.searchDropdownVisible.set(list.length > 0);
        },
        error: () => {
          this.searchLoading.set(false);
          this.searchResults.set([]);
          this.searchDropdownVisible.set(false);
        },
      });
  }

  private getNotificationUserIdFrom(user: { userId?: string | number; profileServiceId?: string; studentId?: string; campusId?: string; companyId?: string; departmentId?: string } | null): string | null {
    if (!user) return null;
    const id =
      user.profileServiceId ??
      user.studentId ??
      user.companyId ??
      user.campusId ??
      user.departmentId ??
      (user.userId != null ? String(user.userId) : null);
    if (id == null) return null;
    const value = String(id).trim();
    return value.length > 0 ? value : null;
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

  /** Logo click: go to role home when logged in, otherwise landing. Prevents sending logged-in users to landing (and then login). */
  onBrandClick(): void {
    if (this.roles.isAuthenticated()) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
    } else {
      void this.router.navigate(['/']);
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.searchValue.set(target.value);
    this.searchSubject.next(target.value);
  }

  submitSearch(): void {
    if (this.searchResults().length > 0) {
      this.selectSearchResult(this.searchResults()[0]);
    }
  }

  toggleMobileSearch(): void {
    const opening = !this.mobileSearchOpen();
    this.mobileSearchOpen.set(opening);
    if (opening) {
      setTimeout(() => this.mobileSearchInput?.nativeElement?.focus(), 100);
    }
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen.set(false);
  }

  selectSearchResult(result: SearchResultResponse): void {
    this.searchDropdownVisible.set(false);
    this.searchResults.set([]);
    this.closeMobileSearch();
    if (result.type === 'STUDENT' && result.publicId) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', result.publicId]));
      window.open(url, '_blank');
    } else if (result.type === 'COMPANY' && result.publicId) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/company', result.publicId]));
      window.open(url, '_blank');
    } else if (result.type === 'CAMPUS' && result.publicId) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/campus', result.publicId]));
      window.open(url, '_blank');
    } else if (result.routeUrl) {
      window.open(result.routeUrl, '_blank');
    }
    this.searchValue.set('');
  }

  closeSearchDropdown(): void {
    this.searchDropdownVisible.set(false);
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
    const opening = !this.notificationsOpen();
    if (opening) {
      this.closeSettings();
      const userId = this.getNotificationUserIdFrom(this.authState.user());
      if (userId != null) {
        this.inAppNotifications.markAllAsRead(userId);
      }
    }
    this.notificationsOpen.set(opening);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  onLoadMoreNotifications(): void {
    const userId = this.getNotificationUserIdFrom(this.authState.user());
    if (userId != null) {
      this.inAppNotifications.loadMore(userId);
    }
  }

  openLogoutConfirm(): void {
    this.logoutConfirmOpen.set(true);
    this.closeNotifications();
    this.closeSettings();
  }

  closeLogoutConfirm(): void {
    this.logoutConfirmOpen.set(false);
  }

  confirmLogout(): void {
    this.closeLogoutConfirm();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }

toggleSettings(event: Event): void {
  event.preventDefault();
  event.stopPropagation();

  const willOpen = !this.settingsOpen();

  // close notifications if opening settings
  this.notificationsOpen.set(false);

  this.settingsOpen.set(willOpen);
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

  onEditPostRequested(): void {
    this.closeOptionModal();
    this.modalService.openModal('create-post');
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

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.inAppNotifications.disconnectStream();
  }

  private currentPath(): string {
    return this.router.url.split('?')[0] ?? '/';
  }

}


