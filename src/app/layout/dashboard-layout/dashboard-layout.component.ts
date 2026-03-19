import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, signal, computed, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AppHeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CampusNoticeDetailComponent, NoticeDetailData } from '../../features/campus/pages/notice-detail/campus-notice-detail.component';
import { ModalService } from '../../core/modal/modal.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { filter } from 'rxjs/operators';
// services for notice operations
import { RoleService } from '../../core/rbac/role.service';
import { CampusApiService } from '../../features/campus/services/campus-api.service';
import { StorageService } from '../../core/storage/storage.service';
import { NotificationService } from '../../core/notifications/notification.service';

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    AppHeaderComponent,
    ModalComponent,
    ButtonComponent,
    CampusNoticeDetailComponent,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly platformId = inject(PLATFORM_ID);

  // injected helper services
  private readonly roleService = inject(RoleService);
  private readonly campusApi = inject(CampusApiService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);

  readonly sidebarCollapsed = signal(false);
  readonly isMobile = signal(false);

  readonly isNoticeDetailOpen = computed(
    () => this.modalService.activeModal() === 'notice-detail'
  );
  readonly noticeDetailData = computed(
    () => this.modalService.getModalData() as NoticeDetailData | null
  );

  /** notices should be editable unless the current user is a student */
  readonly noticeEditable = computed(() => {
    const ut = this.roleService.getUserType();
    return ut !== 'STUDENT';
  });

  showDeleteNoticeModal = false;
  noticeToDeleteId: string | null = null;

  closeNoticeDetail(): void {
    this.modalService.closeModal();
  }

  /** forward an edit request to whoever can open the edit form */
  onNoticeDetailEdit(notice: NoticeDetailData): void {
    if (!notice) return;
    this.modalService.closeModal();
    window.dispatchEvent(new CustomEvent('noticeEditRequested', { detail: notice }));
  }

  /** show delete confirmation modal */
  onNoticeDetailDelete(noticeId: string): void {
    if (!noticeId) return;
    this.noticeToDeleteId = noticeId;
    this.showDeleteNoticeModal = true;
  }

  closeDeleteNoticeModal(): void {
    this.showDeleteNoticeModal = false;
    this.noticeToDeleteId = null;
  }

  confirmDeleteNotice(): void {
    if (!this.noticeToDeleteId) return;
    const noticeId = this.noticeToDeleteId;
    this.closeDeleteNoticeModal();
    this.modalService.closeModal();
    window.dispatchEvent(new CustomEvent('noticeDeleteRequested', { detail: noticeId }));
  }

  ngOnInit(): void {
    this.updateModuleTheme(this.router.url);
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => this.updateModuleTheme(this.router.url));
    if (isPlatformBrowser(this.platformId as object)) {
      this.updateMobileState();
      window.addEventListener('resize', () => this.updateMobileState());
    }
  }

  private updateModuleTheme(url: string): void {
    const path = url.split('?')[0] || '';
    this.isCompanyModule.set(path.startsWith('/company'));
    this.isCampusModule.set(path.startsWith('/campus'));
    this.isStudentModule.set(path.startsWith('/student'));
  }

  private updateMobileState(): void {
    const mobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);
    if (mobile && !wasMobile) {
      this.sidebarCollapsed.set(true);
    }
  }

  onSidebarMenuClick(): void {
    if (this.isMobile()) {
      this.sidebarCollapsed.set(true);
    }
  }

  // Check if standalone mode via query param
  private readonly standaloneParam = toSignal(
    this.route.queryParams.pipe(
      map(params => params['standalone'] === 'true')
    ),
    { initialValue: false }
  );

  readonly isStandalone = computed(() => this.standaloneParam());

  /** True when current route is under /company (for shared module theme) */
  readonly isCompanyModule = signal(false);
  /** True when current route is under /campus (same UI theme as company) */
  readonly isCampusModule = signal(false);
  /** True when current route is under /student (same UI theme as company) */
  readonly isStudentModule = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}


