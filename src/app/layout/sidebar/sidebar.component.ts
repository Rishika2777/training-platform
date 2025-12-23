import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MenuService } from '../../core/menu/menu.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { RoleService } from '../../core/rbac/role.service';
import { MenuItem } from '../../core/models/menu.model';
import { AuthService } from '../../core/auth/auth.service';
import { ModalService, ModalType } from '../../core/modal/modal.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[class.collapsed]': 'collapsed',
  },
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly roles = inject(RoleService);
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(ModalService);

  @Input() collapsed = false;

  private readonly path = signal<string>(this.currentPath());

  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());
  readonly menuItems = computed(() => this.menu.menuItems());
  readonly userLabel = computed(() => {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return 'Student';
    }
    return user.email ?? 'Student';
  });
  readonly sidebarTitle = computed(() => {
    const role = this.roles.getPrimaryRole();
    if (!role) {
      return 'Menu';
    }
    return `${role} Menu`;
  });

  readonly showStudentHomeFooter = computed(() => {
    const userType = this.roles.getUserType();
    const path = this.path();
    return userType === 'STUDENT' && path === '/student/home';
  });

  readonly showCampusFaculties = computed(() => {
    const userType = this.roles.getUserType();
    const path = this.path();
    return userType === 'CAMPUS' && path === '/campus/home';
  });

  readonly faculty: readonly FacultyCard[] = [
    { name: 'Akshay Sharma', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Ankitha Wilson', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Amith Deshpande', imageUrl: 'assets/images/landing-card-company.png' },
  ];

  facultyPage = 1;
  readonly facultyPageSize = 3;

  get facultyTotalPages(): number {
    return Math.max(1, Math.ceil(this.faculty.length / this.facultyPageSize));
  }

  get facultyPageNumbers(): number[] {
    return Array.from({ length: this.facultyTotalPages }, (_, i) => i + 1);
  }

  get displayedFaculty(): readonly FacultyCard[] {
    const start = (this.facultyPage - 1) * this.facultyPageSize;
    return this.faculty.slice(start, start + this.facultyPageSize);
  }

  onFacultyPageChange(page: number): void {
    this.facultyPage = page;
  }

  onAddFacultyClick(): void {
    this.modalService.openModal('faculty');
  }

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.path.set(this.currentPath()));
  }

  isActive(item: MenuItem): boolean {
    if (item.route === '#') {
      return false;
    }
    const path = this.router.url.split('?')[0] ?? '';
    return path === item.route || path.startsWith(item.route);
  }

  handleMenuClick(item: MenuItem): void {
    if (item.route === '#') {
      const modalType = this.getModalTypeForMenuItem(item.id);
      if (modalType) {
        this.modalService.openModal(modalType);
        return;
      }
      this.notifications.info('This action is not yet implemented.');
      return;
    }
    void this.router.navigateByUrl(item.route);
  }

  private getModalTypeForMenuItem(menuId: string): ModalType {
    const modalMap: Record<string, ModalType> = {
      'campus-prospectus': 'prospectus-upload',
      'campus-courses': 'courses',
      'student-resume': 'resume-upload',
      'student-career-checkin': 'career-checkin',
      'student-learning-pathway': 'learning-pathway',
      'student-dream-job-toolkit': 'dream-job-toolkit',
      'company-specialization': 'company-specialization',
      'company-vision-performance': 'company-vision-performance',
      'company-benefits': 'company-benefits',
      'company-current-vacancy': 'company-current-vacancy',
    };
    return modalMap[menuId] ?? null;
  }

  initials(label: string): string {
    const parts = label
      .split(' ')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const first = parts[0]?.[0] ?? 'S';
    const second = parts.at(-1)?.[0] ?? '';
    return (first + second).toUpperCase();
  }

  private currentPath(): string {
    return this.router.url.split('?')[0] ?? '/';
  }

  onIdeasSubmitClick(): void {
    const userType = this.roles.getUserType();
    if (userType === 'STUDENT') {
      this.modalService.openModal('ideas-submission');
    }
  }
}

interface FacultyCard {
  name: string;
  imageUrl: string;
}


