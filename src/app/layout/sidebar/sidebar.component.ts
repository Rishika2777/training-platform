import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, Output, EventEmitter, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MenuService } from '../../core/menu/menu.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { RoleService } from '../../core/rbac/role.service';
import { MenuItem } from '../../core/models/menu.model';
import { UserData } from '../../core/models/user.model';
import { AuthService } from '../../core/auth/auth.service';
import { ModalService, ModalType } from '../../core/modal/modal.service';
import { FacultyDetailService } from '../../features/campus/services/faculty-detail.service';
import { DepartmentDetailService } from '../../features/campus/services/department-detail.service';
import { FacultyDetailData } from '../../features/campus/pages/faculty-detail/campus-faculty-detail.component';
import { CampusApiService } from '../../features/campus/services/campus-api.service';
import { CompanyApiService } from '../../features/company/services/company-api.service';
import { OnInit } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../core/config/app.constants';
import { catchError, of } from 'rxjs';
import { unwrapApiResponse } from '../../core/api/api-response.utils';
import { NoticeDetailData } from '../../features/campus/pages/notice-detail/campus-notice-detail.component';
import { NoticeItem } from '../../features/campus/services/campus-api.service';

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
export class SidebarComponent implements OnInit {
  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly roles = inject(RoleService);
  private readonly auth = inject(AuthService);
readonly modalService = inject(ModalService);  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly departmentDetailService = inject(DepartmentDetailService);
  private readonly campusApi = inject(CampusApiService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
readonly isStudentUser = computed(
  () => this.roles.getUserType() === 'STUDENT'
);

readonly isAdminUser = computed(() => {
  const role = this.roles.getPrimaryRole();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
});


readonly noticeModalData = computed(
  () => this.modalService.getModalData() as NoticeDetailData | null
);
readonly activeModalType = computed(
  () => this.modalService.activeModal()
);
  @Input() collapsed = false;
  /** Emitted when a menu item is clicked (e.g. to close mobile overlay). */
  @Output() menuItemClicked = new EventEmitter<void>();

  private readonly path = signal<string>(this.currentPath());
readonly editingNotice = signal<NoticeDetailData | null>(null);

  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());
  readonly menuItems = computed(() => this.menu.menuItems());
  
  // Campus data signals (for CAMPUS users)
  readonly campusName = signal<string | null>(null);
  readonly campusRank = signal<number | null>(null);
  readonly campusImageUrl = signal<string | null>(null);
  
  // Company data signals (for COMPANY users)
  readonly companyName = signal<string | null>(null);
  readonly companyRank = signal<number | null>(null);
  readonly companyImageUrl = signal<string | null>(null);

  // Department data signals (for DEPARTMENT users - department name & image for display)
  readonly departmentName = signal<string | null>(null);
  readonly departmentImageUrl = signal<string | null>(null);

selectedDepartment = signal<DepartmentCard | null>(null);
selectedDepartmentId = signal<string | null>(null);

//  ------------------------ news
readonly notices = signal<NoticeItem[]>([]);
readonly loadingNotices = signal(false);
noticePage = signal(1);
readonly noticePageSize = 3;

/** Max characters for notice description in sidebar before truncation + "Read more". */
readonly noticeDescTruncate = 60;

readonly noticeTotalPages = signal(1);

readonly noticePageNumbers = computed(() => {
  const total = this.noticeTotalPages();
  return Array.from({ length: total }, (_, i) => i + 1);
});

// --------------notice
// readonly selectedNotice = signal<NoticeDetailData | null>(null);
// readonly showNoticeModal = signal(false);


  
  // Signal to track profile updates (for reactive updates)
  readonly profileRefresh = signal<number>(0);
  
  readonly userLabel = computed(() => {
    // Depend on profileRefresh to make this reactive
    this.profileRefresh();
    
    const userType = this.roles.getUserType();
      const primaryRole = this.roles.getPrimaryRole(); 

  // ✅ ADMIN FIX
  if (primaryRole === 'ADMIN' || primaryRole === 'SUPER_ADMIN') {
    return 'Admin';
  }

  
    // For CAMPUS users, show campus name instead of email
    if (userType === 'CAMPUS') {
      const name = this.campusName();
      if (name && name.trim()) {
        return name;
      }
    }

    // For DEPARTMENT users, show department name or campus name
    if (userType === 'DEPARTMENT') {
      const deptName = this.departmentName();
      if (deptName && deptName.trim()) {
        return deptName;
      }
      const campusName = this.campusName();
      if (campusName && campusName.trim()) {
        return campusName;
      }
    }
    
    // For COMPANY users, show company name instead of email
    if (userType === 'COMPANY') {
      const name = this.companyName();
      if (name && name.trim()) {
        return name;
      }
    }
    
    // For other users, show email as before
    const user = this.auth.getCurrentUser();
    if (!user) {
      return 'Student';
    }
    
    // For students, try to get name from localStorage (stored profile data)
    if (user.userType === 'STUDENT') {
      try {
        const storedProfile = localStorage.getItem('student_profile_data');
        if (storedProfile) {
          const profileData = JSON.parse(storedProfile) as Record<string, unknown>;
          const fullName = profileData['fullName'] ?? profileData['full_name'] ?? profileData['name'];
          if (fullName && String(fullName).trim()) return String(fullName).trim();
          const firstName = (profileData['firstName'] ?? profileData['first_name']) ? String(profileData['firstName'] ?? profileData['first_name']).trim() : '';
          const lastName = (profileData['lastName'] ?? profileData['last_name']) ? String(profileData['lastName'] ?? profileData['last_name']).trim() : '';
          if (firstName || lastName) {
            const name = [firstName, lastName].filter(Boolean).join(' ').trim();
            if (name) return name;
          }
        }
      } catch (error) {
        console.warn('Failed to read student profile data from localStorage:', error);
      }
    }
    
    // Fallback to email if name not available
    return user.email ?? 'Student';
  });
  
  readonly userRank = computed(() => {
    const userType = this.roles.getUserType();
    
    // For CAMPUS users, show dynamic rank
    if (userType === 'CAMPUS') {
      const rank = this.campusRank();
      if (rank !== null) {
        return `Rank ${rank}`;
      }
      return 'Rank';
    }

    // For DEPARTMENT users, do not show rank
    if (userType === 'DEPARTMENT') {
      return '';
    }
    
    // For COMPANY users, show dynamic rank (if available)
    if (userType === 'COMPANY') {
      const rank = this.companyRank();
      if (rank !== null) {
        return `Rank ${rank}`;
      }
      return 'Rank';
    }
    
    // For other users, show static "Rank"
    return '';
  });
  
  readonly userImageUrl = computed(() => {
    this.profileRefresh(); // React to profile updates

    const userType = this.roles.getUserType();

    // For DEPARTMENT users, prefer department image if available, then fallback to campus image
    if (userType === 'DEPARTMENT') {
      const deptImage = this.departmentImageUrl();
      if (deptImage && deptImage.trim()) {
        return deptImage;
      }
      const campusImg = this.campusImageUrl();
      if (campusImg && campusImg.trim()) {
        return campusImg;
      }
    }

    // For CAMPUS users, show campus image if available
    if (userType === 'CAMPUS') {
      const imageUrl = this.campusImageUrl();
      if (imageUrl && imageUrl.trim()) {
        return imageUrl;
      }
    }

    // For COMPANY users, show company image if available
    if (userType === 'COMPANY') {
      const imageUrl = this.companyImageUrl();
      if (imageUrl && imageUrl.trim()) {
        return imageUrl;
      }
    }

    // For STUDENT users, show profile photo from localStorage
    if (userType === 'STUDENT') {
      try {
        const storedProfile = localStorage.getItem('student_profile_data');
        if (storedProfile) {
          const profileData = JSON.parse(storedProfile) as Record<string, unknown>;
          const photoUrl = profileData['profilePhotoUrl'] ?? profileData['profile_photo_url'];
          if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
            const url = photoUrl.trim();
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
          }
        }
      } catch { /* ignore */ }
    }

    return null;
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
    const isCampusOrDeptPath = path === '/campus/home' || path === '/campus/about' || path === '/department/home' || path === '/department/about';
    return (userType === 'CAMPUS' || userType === 'DEPARTMENT') && isCampusOrDeptPath;
  });

  /** Departments section: only for CAMPUS users (hidden for DEPARTMENT) */
  readonly showDepartmentsSection = computed(() => {
    const userType = this.roles.getUserType();
    const path = this.path();
    return userType === 'CAMPUS' && (path === '/campus/home' || path === '/campus/about');
  });

  // Faculty list from API (paginated: one page per request)
  readonly faculty = signal<readonly FacultyCard[]>([]);
  loadingFaculties = signal(false);
  private readonly facultyTotalPagesFromApi = signal(1);

  facultyPage = 1;
  readonly facultyPageSize = 3;

  get facultyTotalPages(): number {
    return Math.max(1, this.facultyTotalPagesFromApi());
  }

  /** Max 4 page numbers shown, then arrows only. One line. */
  get facultyPageNumbers(): number[] {
    const total = this.facultyTotalPages;
    const current = this.facultyPage;
    const maxVisible = 4;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - 1);
    const end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  /** Current page content from API (no client-side slice). */
  get displayedFaculty(): readonly FacultyCard[] {
    return this.faculty();
  }

  // Departments (API returns one page; totalPages from API)
  readonly departments = signal<readonly DepartmentCard[]>([]);
  readonly loadingDepartments = signal(false);
  readonly departmentPage = signal(1);
  readonly departmentPageSize = 3;
  private readonly departmentTotalPagesFromApi = signal(1);

  readonly departmentTotalPages = computed(() => Math.max(1, this.departmentTotalPagesFromApi()));
  readonly departmentPageNumbers = computed(() => {
    const total = this.departmentTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });
  /** Current page content from API (no client-side slice). */
  readonly displayedDepartments = computed(() => this.departments());

  ngOnInit(): void {
    // Only run in browser context (skip during SSR)
    if (!this.isBrowser) {
      return;
    }

    // Only load faculties if user is a CAMPUS or DEPARTMENT user (not admin, not student)
    const userType = this.roles.getUserType();
    const primaryRole = this.roles.getPrimaryRole();
    const isAdmin = primaryRole === 'ADMIN' || primaryRole === 'SUPER_ADMIN';
    const isCampus = userType === 'CAMPUS';
    const isDepartment = userType === 'DEPARTMENT';
    const isCompany = userType === 'COMPANY';
    const isStudent = userType === 'STUDENT';
    
    // Load campus data (name, rank, image) for CAMPUS users
    if (isCampus && !isAdmin) {
      this.loadCampusData();
      this.loadFaculties();
this.noticePage.set(1);
this.loadNotices();


      this.loadDepartments();
      // Listen for faculty refresh events (add, delete, update)
      window.addEventListener('facultyAdded', () => {
        this.loadFaculties();
      });
      window.addEventListener('facultyDeleted', () => {
        this.loadFaculties();
      });
      window.addEventListener('noticeAdded', () => {
  this.loadNotices();
});
window.addEventListener('noticeDeleted', () => {
  this.loadNotices();
});



      // Listen for department refresh events
      window.addEventListener('departmentAdded', () => {
        this.loadDepartments();
      });
      window.addEventListener('departmentDeleted', () => {
        this.loadDepartments();
      });
    }

   // Load department + campus data for DEPARTMENT users (resolve campusId from department first)
if (isDepartment && !isAdmin) {
  this.loadDepartmentUserData();

  const deptId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
  if (deptId) {
    this.selectedDepartmentId.set(deptId);
  }

  // IMPORTANT — notice load here
  this.loadNotices();

  window.addEventListener('noticeAdded', () => this.loadNotices());
  window.addEventListener('noticeDeleted', () => this.loadNotices());
}

if (isStudent && !isAdmin) {
  this.noticePage.set(1);
  this.loadNotices();

  window.addEventListener('noticeAdded', () => this.loadNotices());
  window.addEventListener('noticeDeleted', () => this.loadNotices());
}



    
    // Load company data (name, rank, image) for COMPANY users
    if (isCompany && !isAdmin) {
      this.loadCompanyData();
    }
    
    // Trigger initial profile refresh
    this.refreshProfile();
    
    // Listen for storage events (triggered by other tabs or components)
    window.addEventListener('storage', (e) => {
      if (e.key === 'student_profile_data') {
        this.refreshProfile();
      }
    });
    
    // Listen for custom profile update event (same-tab updates)
    window.addEventListener('studentProfileUpdated', () => {
      this.refreshProfile();
    });
  }
  
// --------------- on notice click
onNoticeClick(notice: NoticeItem, forceReadOnly = false): void {
  this.menuItemClicked.emit();
  if (!notice?.id) return;

  this.campusApi
    .getNoticeById(
      notice.id,
      notice.campusId,
      notice.departmentId
    )
    .subscribe({
      next: (res) => {
        if (!res?.data) return;

        // attach editable flag so destination doesn't depend on timing
        const userType = this.roles.getUserType();
        const editable = !forceReadOnly && userType !== 'STUDENT';

        // set data first so the layout can read it immediately when modal becomes visible
        this.modalService.setModalData({
          ...res.data,
          editable,
        });
        this.modalService.openModal('notice-detail');
      },
      error: (err) => {
        console.error('Notice detail load failed', err);
      }
    });
}

// onNoticeEdit(notice: NoticeDetailData): void {

//   this.showNoticeModal.set(false);

//   this.editingNotice.set(notice);

//   this.modalService.openModal('notice-board');
// }



// onNoticeModalClose(): void {
//   this.showNoticeModal.set(false);
//   this.selectedNotice.set(null);
// }


// onNoticeDelete(noticeId: string): void {

//   const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
//   const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

//   if (!campusId) {
//     console.error('Campus ID missing');
//     return;
//   }

//   this.campusApi
//     .deleteNotice(noticeId, campusId, departmentId || undefined)
//     .subscribe({
//       next: (res) => {

//         if (res?.success) {
//           window.dispatchEvent(new Event('noticeDeleted'));
// this.showNoticeModal.set(false);
// this.selectedNotice.set(null);
//           this.loadNotices();
//         } else {
//           console.error('Notice delete failed', res?.error);
//         }
//       },
//       error: (err) => {
//         console.error('Delete notice failed', err);
//       }
//     });
// }


  /**
   * Refreshes the profile signal to trigger computed re-evaluation
   */
  refreshProfile(): void {
    this.profileRefresh.update(v => v + 1);
  }

  /**
   * For DEPARTMENT users: fetch department by id to get campusId, set campusId in storage,
   * then load campus data, faculties, and departments. DEPARTMENT uses campus home.
   */
  loadDepartmentUserData(): void {
    const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
    if (!departmentId || !departmentId.trim()) {
      console.warn('SidebarComponent: ❌ No departmentId found for DEPARTMENT user');
      return;
    }

    this.campusApi.getDepartmentById(departmentId.trim()).pipe(
      catchError((error) => {
        console.error('SidebarComponent: Error loading department for DEPARTMENT user:', error);
        return of(null);
      })
    ).subscribe({
      next: (dept) => {
        if (dept?.campusId) {
          this.storage.set(STORAGE_KEYS.CAMPUS_ID, dept.campusId);

          if (dept.departmentName?.trim()) {
            this.departmentName.set(dept.departmentName.trim());
          }

          // Set department image (logo) for DEPARTMENT users if available
          if (typeof dept.photoUrl === 'string' && dept.photoUrl.trim()) {
            const resolved = this.resolveDepartmentImage(dept.photoUrl);
            this.departmentImageUrl.set(resolved);
          } else {
            this.departmentImageUrl.set(null);
          }

          this.loadCampusData();
          this.loadFaculties();
          window.addEventListener('facultyAdded', () => this.loadFaculties());
          window.addEventListener('facultyDeleted', () => this.loadFaculties());
        } else {
          console.warn('SidebarComponent: Department response missing campusId');
        }
      },
    });
  }

  /**
   * Load campus data (name, rank, image) from API
   * Uses dedicated sidebar API for name and rank, and getCampusById for image
   */
  loadCampusData(): void {
    // Get campusId from storage (same as other campus APIs use)
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    
    if (!storedCampusId) {
      console.warn('SidebarComponent: ❌ No campusId found in storage, cannot load campus data');
      return;
    }
    
    // Clean campusId (remove any unwanted prefixes)
    const campusId = storedCampusId.replace(/^CAMPUS-/i, '').trim();
    
    console.log('SidebarComponent: Loading campus data - campusId:', campusId);
    
    // Fetch campus sidebar data (name and rank) using dedicated sidebar API
    this.campusApi.getCampusSidebar(campusId).pipe(
      catchError((error) => {
        console.error('SidebarComponent: Error loading campus sidebar data:', error);
        return of(null);
      })
    ).subscribe({
      next: (sidebarData) => {
        if (sidebarData) {
          // Set campus name
          if (sidebarData.campusName && sidebarData.campusName.trim()) {
            this.campusName.set(sidebarData.campusName.trim());
            console.log('SidebarComponent: ✅ Campus name loaded:', sidebarData.campusName);
          }
          
          // Set campus rank
          if (sidebarData.campusRank !== null && sidebarData.campusRank !== undefined) {
            this.campusRank.set(sidebarData.campusRank);
            console.log('SidebarComponent: ✅ Campus rank loaded:', sidebarData.campusRank);
          }
        } else {
          console.warn('SidebarComponent: ⚠️ Campus sidebar data not found');
        }
      },
      error: (error) => {
        console.error('SidebarComponent: Error in campus sidebar data subscription:', error);
      }
    });
    
    // Fetch campus image separately (sidebar API doesn't return image)
    this.campusApi.getCampusById(campusId).pipe(
      catchError((error) => {
        console.error('SidebarComponent: Error loading campus image:', error);
        return of(null);
      })
    ).subscribe({
      next: (campus) => {
        if (campus?.photoUrl && campus.photoUrl.trim()) {
          // Construct full image URL from photoUrl (API returns relative path or full URL)
          let imageUrl = campus.photoUrl.trim();
          
          // If photoUrl is already a full URL (starts with http:// or https://), use it as is
          if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            if (imageUrl.startsWith('/')) {
              // If it starts with /, it's an absolute path - construct full URL
              imageUrl = `/api/v1/files${imageUrl}`;
            } else {
              // Relative path like "campus/filename.jpg" - construct full URL
              imageUrl = `/api/v1/files/${imageUrl}`;
            }
          }
          
          this.campusImageUrl.set(imageUrl);
          console.log('SidebarComponent: ✅ Campus image URL loaded:', imageUrl);
        }
      },
      error: (error) => {
        console.error('SidebarComponent: Error loading campus image:', error);
      }
    });
  }

  /**
   * Load company data (name, rank, image) from API
   * Uses getCompanyById to fetch company information
   */
  loadCompanyData(): void {
    // Get companyId from storage (same as other company APIs use)
    const storedCompanyId = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    
    if (!storedCompanyId) {
      console.warn('SidebarComponent: ❌ No companyId found in storage, cannot load company data');
      return;
    }
    
    // Clean companyId (remove any unwanted prefixes)
    const companyId = storedCompanyId.replace(/^COMPANY-/i, '').trim();
    
    console.log('SidebarComponent: Loading company data - companyId:', companyId);
    
    // Fetch company data using getCompanyById
    this.companyApi.getCompanyById(companyId).pipe(
      catchError((error) => {
        console.error('SidebarComponent: Error loading company data:', error);
        return of(null);
      })
    ).subscribe({
      next: (companyData) => {
        if (companyData) {
          // Set company name
          if (companyData.companyName && companyData.companyName.trim()) {
            this.companyName.set(companyData.companyName.trim());
            console.log('SidebarComponent: ✅ Company name loaded:', companyData.companyName);
          }
          
          // Note: Company rank is not currently in the API response, so we'll keep it as null
          // If rank becomes available in the future, uncomment and set it here:
          // if (companyData.companyRank !== null && companyData.companyRank !== undefined) {
          //   this.companyRank.set(companyData.companyRank);
          //   console.log('SidebarComponent: ✅ Company rank loaded:', companyData.companyRank);
          // }
          
          // Set company image (logo)
          if (companyData.companyLogoUrl && companyData.companyLogoUrl.trim()) {
            // Construct full image URL from companyLogoUrl (API returns relative path or full URL)
            let imageUrl = companyData.companyLogoUrl.trim();
            
            // If companyLogoUrl is already a full URL (starts with http:// or https://), use it as is
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
              if (imageUrl.startsWith('/')) {
                // If it starts with /, it's an absolute path - construct full URL
                imageUrl = `/api/v1/files${imageUrl}`;
              } else {
                // Relative path like "company/filename.jpg" - construct full URL
                imageUrl = `/api/v1/files/${imageUrl}`;
              }
            }
            
            this.companyImageUrl.set(imageUrl);
            console.log('SidebarComponent: ✅ Company image URL loaded:', imageUrl);
          }
        } else {
          console.warn('SidebarComponent: ⚠️ Company data not found');
        }
      },
      error: (error) => {
        console.error('SidebarComponent: Error in company data subscription:', error);
      }
    });
  }

  /**
   * Load faculties from API - shows empty list if no faculties or on error
   * No static fallback - new campuses should show empty until faculties are added
   */
  loadFaculties(): void {
    if (typeof window === 'undefined') {
      this.faculty.set([]);
      return;
    }

    this.loadingFaculties.set(true);
    const page = Math.max(0, this.facultyPage - 1);

    this.campusApi.getAllFaculties(undefined, undefined, page, this.facultyPageSize).subscribe({
      next: (response) => {
        this.loadingFaculties.set(false);

        if (response?.totalPages != null) {
          this.facultyTotalPagesFromApi.set(response.totalPages);
        }

        if (response?.data && response.data.length > 0) {
          const apiFacultyCards: FacultyCard[] = response.data.map((item) => {
            let imageUrl = 'assets/images/login-news-image.png';
            if (item.photoUrl) {
              if (item.photoUrl.startsWith('http://') || item.photoUrl.startsWith('https://')) {
                imageUrl = item.photoUrl;
              } else if (item.photoUrl.startsWith('/')) {
                imageUrl = `/api/v1/files${item.photoUrl}`;
              } else {
                imageUrl = `/api/v1/files/${item.photoUrl}`;
              }
            }
            return {
              id: item.id,
              name: item.fullName || 'Unknown',
              imageUrl,
            };
          });
          this.faculty.set(apiFacultyCards);
        } else {
          this.faculty.set([]);
          if (response?.totalPages == null && response?.data?.length === 0) {
            this.facultyTotalPagesFromApi.set(1);
          }
        }
      },
      error: () => {
        this.loadingFaculties.set(false);
        this.faculty.set([]);
      },
    });
  }

loadNotices(): void {

  const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
  // const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

  if (!campusId) {
    console.warn('Campus ID missing → notices load skipped');
    return;
  }

  this.loadingNotices.set(true);

  this.campusApi
    .getAllNotices(
      this.noticePage() - 1,
      this.noticePageSize,
      campusId,
    )
    .subscribe({
      next: (res) => {

        this.loadingNotices.set(false);

        if (!res || !res.data) {
          this.notices.set([]);
          this.noticeTotalPages.set(1);
          return;
        }

        this.notices.set(res.data.content || []);
        this.noticeTotalPages.set(res.data.totalPages || 1);
      },

      error: (err) => {
        console.error('Notice load failed', err);
        this.loadingNotices.set(false);
        this.notices.set([]);
      }
    });
}



  onFacultyPageChange(page: number): void {
    if (page < 1 || page > this.facultyTotalPages) return;
    this.facultyPage = page;
    this.loadFaculties();
  }

  onNoticePageChange(page: number): void {
  if (page < 1 || page > this.noticeTotalPages()) return;

  this.noticePage.set(page);

  // reload API for that page
  this.loadNotices();
}




  onAddFacultyClick(): void {
    this.modalService.setModalData({ mode: 'add' });
    this.modalService.openModal('faculty');
  }
  private getCampusId(): string | null {
  return this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
}

private resolveDepartmentImage(photoUrl?: string): string {
  const trimmed = (photoUrl || '').trim();

  if (!trimmed) {
    return 'assets/images/login-news-image.png';
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `/api/v1/files${trimmed}`;
  }

  return `/api/v1/files/${trimmed}`;
}



  // Departments methods
loadDepartments(): void {
  const campusId = this.getCampusId();

  if (!campusId) {
    console.warn('Sidebar: Campus ID missing');
    this.departments.set([]);
    return;
  }

  // Only show loading on initial load to avoid UI flicker when changing pages
  if (this.departments().length === 0) {
    this.loadingDepartments.set(true);
  }

  this.campusApi
    .getDepartments(campusId, this.departmentPage() - 1, this.departmentPageSize)
    .subscribe({
      next: (response: unknown) => {
        this.loadingDepartments.set(false);

        const res = response as {
          data?: { content?: unknown[]; totalPages?: number };
        };

        const content = Array.isArray(res?.data?.content)
          ? res.data.content
          : [];
        const totalPages = typeof res?.data?.totalPages === 'number' ? res.data.totalPages : 1;
        this.departmentTotalPagesFromApi.set(totalPages);

        const mapped: DepartmentCard[] = content.map((item) => {
          const d = item as {
            id?: string;
            _id?: string;
            departmentId?: string;
            departmentName?: string;
            photoUrl?: string;
          };

          return {
            // Prefer Mongo id for detail endpoints, fallback to departmentId.
            id: d._id || d.id || d.departmentId || '',
            name: d.departmentName || '',
            imageUrl: this.resolveDepartmentImage(d.photoUrl),
          };
        });

        this.departments.set(mapped);
      },

      error: (err: unknown) => {
        console.error('Sidebar: department load failed', err);
        this.loadingDepartments.set(false);
        this.departments.set([]);
      },
    });
}


// ------------------- delete department ---------------
deleteDepartment(departmentId: string): void {
  const campusEmail = this.auth.getCurrentUser()?.email;

  if (!campusEmail) {
    console.error('Campus email missing');
    this.notifications.error('Campus email missing');
    return;
  }

  this.campusApi.deleteDepartment(departmentId, campusEmail).subscribe({
    next: (res) => {
      //  FIX: null safety added
      if (res && res.success) {
        this.notifications.success(res.message || 'Department deleted successfully');
        this.loadDepartments(); // refresh list
      } else {
        this.notifications.error(res?.message || 'Delete failed');
      }
    },
    error: () => {
      this.notifications.error('Failed to delete department');
    }
  });
}

// ----------------------- get department by email ---------------------

getDepartmentFromEmail(): void {
  const email = this.auth.getCurrentUser()?.email;

  if (!email) return;

  this.campusApi.getDepartmentByEmail(email).subscribe({
    next: (res) => {
      if (res && res.success && res.data) {
        console.log('Department ID:', res.data.departmentId);

        // use id to fetch department details
        this.campusApi.getDepartmentById(res.data.departmentId).subscribe();
      }
    },
    error: () => {
      console.error('Failed to fetch department by email');
    }
  });
}





  onDepartmentPageChange(page: number): void {
    const total = this.departmentTotalPages();
    if (page < 1 || page > total) return;
    this.departmentPage.set(page);
    this.loadDepartments();
  }

  onAddDepartmentClick(): void {
    this.modalService.openModal('add-department');
  }

  onDepartmentClick(dept: DepartmentCard): void {
    this.menuItemClicked.emit();
    const departmentId = dept.id;
    if (!departmentId) {
      this.notifications.error('Department ID missing');
      return;
    }

    this.campusApi.getDepartmentById(departmentId).subscribe({
      next: (res) => {
        if (!res) {
          this.notifications.error('Department details not found');
          return;
        }

        this.departmentDetailService.setSelectedDepartment({
          id: res.id,
          name: res.departmentName,
          imageUrl: this.resolveDepartmentImage(res.photoUrl),
          email: res.email || 'Not available',
          phone: res.phone || 'Not available',
          about: res.aboutDepartment || 'Department details not available',
        });
        this.modalService.openModal('department-detail' as ModalType);
      },
      error: (err) => {
        console.error('Department detail API error:', err);
        this.notifications.error('Failed to load department details');
      },
    });
  }

onAddNoticeClick(): void {
  const userType = this.roles.getUserType();

  // CAMPUS user → normal notice
  if (userType === 'CAMPUS') {
    this.modalService.setModalData({ mode: 'add' });
    this.modalService.openModal('notice-board');
    return;
  }

  // DEPARTMENT user → departmentId ke sath notice
  if (userType === 'DEPARTMENT') {
    const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

    if (!departmentId) {
      this.notifications.error('Department ID missing');
      return;
    }

    // department context ke sath modal open
    this.modalService.setModalData({ mode: 'add' });
    this.modalService.openModal('notice-board');
  }
}



  onFacultyClick(faculty: FacultyCard): void {
    this.menuItemClicked.emit();
    // If faculty has ID, fetch from API using getFacultyById; otherwise use static data as fallback
    if (faculty.id) {
      this.loadingFaculties.set(true);
      
      this.campusApi.getFacultyById(faculty.id).subscribe({
        next: (response) => {
          this.loadingFaculties.set(false);
          
          const profile = unwrapApiResponse<Record<string, unknown>>(response);
          if (profile) {
            const basicInfo = profile['basicInformation'] as {
              id?: string;
              fullName?: string;
              email?: string;
              phoneNumber?: string;
              photoUrl?: string;
            } | undefined;
            const professionalInfo = profile['professionalInformation'] as {
              designationDisplay?: string[];
              designation?: string[];
              department?: string[];
              qualifications?: string[];
              yearsOfExperience?: number[];
              experienceDisplay?: string[];
            } | undefined;
            
            // Construct full image URL
            let imageUrl = 'assets/images/login-news-image.png';
            if (basicInfo?.photoUrl) {
              if (basicInfo.photoUrl.startsWith('http://') || basicInfo.photoUrl.startsWith('https://')) {
                imageUrl = basicInfo.photoUrl;
              } else if (basicInfo.photoUrl.startsWith('/')) {
                imageUrl = `/api/v1/files${basicInfo.photoUrl}`;
              } else {
                imageUrl = `/api/v1/files/${basicInfo.photoUrl}`;
              }
            }
            
            // Handle designation as array (use display values if available, otherwise enum values)
            const designationStr = professionalInfo?.designationDisplay 
              ? professionalInfo.designationDisplay.join(', ')
              : (professionalInfo?.designation 
                  ? professionalInfo.designation.join(', ')
                  : 'Not specified');
            
            // Handle department as array
            const departmentStr = professionalInfo?.department
              ? professionalInfo.department.join(', ')
              : 'Not specified';
            
            // Handle qualifications as array
            const qualificationsStr = professionalInfo?.qualifications 
              ? professionalInfo.qualifications.join(', ')
              : 'Not specified';
            
            // Handle years of experience (array of numbers)
            const experienceStr = professionalInfo?.yearsOfExperience && professionalInfo.yearsOfExperience.length > 0
              ? `${professionalInfo.yearsOfExperience[0]} years of experience`
              : (professionalInfo?.experienceDisplay && professionalInfo.experienceDisplay.length > 0
                  ? professionalInfo.experienceDisplay[0]
                  : 'Not specified');
            
            const detailData: FacultyDetailData = {
              id: basicInfo?.id || faculty.id, // Include ID for delete operation
              name: basicInfo?.fullName || faculty.name,
              imageUrl: imageUrl,
              designation: designationStr,
              department: departmentStr,
              qualifications: qualificationsStr,
              experience: experienceStr,
              email: basicInfo?.email || 'Not available',
              phone: basicInfo?.phoneNumber || 'Not available',
            };
            
            this.facultyDetailService.setSelectedFaculty(detailData);
            this.modalService.openModal('faculty-detail');
          } else {
            // No data from API - show error
            this.notifications.error('Faculty details not available');
          }
        },
        error: (err) => {
          this.loadingFaculties.set(false);
          console.error('SidebarComponent: Failed to load faculty by ID:', err);
          console.error('SidebarComponent: Error details:', {
            status: err?.status,
            message: err?.message,
            error: err?.error
          });
          // Show error - no static fallback
          this.notifications.error('Failed to load faculty details');
        },
      });
    } else {
      // No faculty ID - cannot load details
      this.notifications.error('Faculty ID not available');
    }
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
    this.menuItemClicked.emit();
    if (item.route === '#') {
      const modalType = this.getModalTypeForMenuItem(item.id);
      if (modalType) {
        this.modalService.openModal(modalType);
        return;
      }
      this.notifications.info('This action is not yet implemented.');
      return;
    }
    // Check if it's an external URL
    if (item.route.startsWith('http://') || item.route.startsWith('https://')) {
      window.open(item.route, '_blank', 'noopener,noreferrer');
      return;
    }
    // Check if it should open in new tab with dynamic IDs
    if (item.openInNewTab) {
      // IMPORTANT: Verify authentication with server before opening new tab
      this.verifyAuthAndOpenNewTab(item);
      return;
    }
    void this.router.navigateByUrl(item.route);
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }

  /**
   * Verify authentication with /auth/me API before opening new tab.
   * This ensures token is valid and session hasn't expired.
   */
  private verifyAuthAndOpenNewTab(item: MenuItem): void {
    // For student profile, use getCurrentUser() which has studentId from login
    // /auth/me doesn't return studentId, so we need to use the stored user data
    if (item.id === 'student-profile') {
      const currentUser = this.auth.getCurrentUser();
      if (currentUser && currentUser.studentId && currentUser.userId) {
        // Use current user data which has studentId from login response
        this.openNewTabWithUser(item, currentUser);
        return;
      } else {
        // If no studentId in current user, try /auth/me as fallback
        console.warn('⚠️ No studentId in current user, trying /auth/me...');
      }
    }
    
    // Call /auth/me to validate current session (silently, no notification)
    this.auth.me().subscribe({
      next: (user) => {
        
        if (!user) {
          console.error('❌ No user data returned from /auth/me');
          this.notifications.error('Authentication failed. Please login again.');
          void this.router.navigateByUrl('/login');
          return;
        }
        
        // For student profile, merge studentId from current user if /auth/me doesn't have it
        if (item.id === 'student-profile') {
          const currentUser = this.auth.getCurrentUser();
          if (currentUser?.studentId && !user.studentId) {
            user = { ...user, studentId: currentUser.studentId };
          }
        }
        
        // Authentication successful, proceed to open new tab
        this.openNewTabWithUser(item, user);
      },
      error: (error) => {
        console.error('❌ Authentication verification failed:', error);
        this.notifications.error('Session expired. Please login again.');
        // Clear auth and redirect to login
        this.auth.logout().subscribe({
          next: () => void this.router.navigateByUrl('/login'),
          error: () => void this.router.navigateByUrl('/login'),
        });
      }
    });
  }

  /**
   * Open new tab after authentication has been verified
   */
  private openNewTabWithUser(item: MenuItem, user: UserData): void {
    let fullUrl = `${window.location.origin}${item.route}`;
    
    // Build URL with IDs for student profile
    if (item.id === 'student-profile') {
      // Use studentId from user data (should be present for STUDENT userType)
      const studentId = user.studentId;
      const userId = user.userId;
      
      console.log('🔗 Building student profile URL:', { studentId, userId, user });
      
      if (studentId && userId) {
        fullUrl = `${window.location.origin}/student/profile/${studentId}/${userId}?standalone=true`;
      } else {
        console.error('❌ Student ID or User ID not found:', { studentId, userId, user });
        this.notifications.error('Student ID or User ID not found. Please ensure your profile is complete.');
        return;
      }
    }
    
    // Build URL with IDs for campus/department about
    if (item.id === 'campus-about') {
      const campusId = user.campusId || user.profileServiceId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null || user.userId;
      const userId = user.userId;
      const basePath = user.userType === 'DEPARTMENT' ? '/department' : '/campus';
      
      if (campusId && userId) {
        fullUrl = `${window.location.origin}${basePath}/about/${campusId}/${userId}?standalone=true`;
      } else {
        console.error('❌ Campus ID or User ID not found:', { campusId, userId, user });
        this.notifications.error('Campus ID or User ID not found');
        return;
      }
    }
    
    // Build URL with IDs for company about
    if (item.id === 'company-about') {
      const companyId = user.companyId || user.profileServiceId || user.userId;
      const userId = user.userId;
      
      
      if (companyId && userId) {
        fullUrl = `${window.location.origin}/company/about/${companyId}/${userId}?standalone=true`;
      } else {
        console.error('❌ Company ID or User ID not found:', { companyId, userId, user });
        this.notifications.error('Company ID or User ID not found');
        return;
      }
    }
    
    // Open the new tab
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }

  private getModalTypeForMenuItem(menuId: string): ModalType {
    const modalMap: Record<string, ModalType> = {
      'campus-prospectus': 'prospectus-upload',
      'campus-courses': 'courses',
      'student-resume': 'resume-upload',
      'student-career-checkin': 'career-checkin',
      'student-learning-pathway': 'learning-pathway',
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
  id?: string;
  name: string;
  imageUrl: string;
}



interface DepartmentCard {
  id: string;
  name: string;
  imageUrl: string;
}


