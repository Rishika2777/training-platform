import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, computed, inject, signal, PLATFORM_ID } from '@angular/core';
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
import { FacultyDetailData } from '../../features/campus/pages/faculty-detail/campus-faculty-detail.component';
import { CampusApiService } from '../../features/campus/services/campus-api.service';
import { OnInit } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../core/config/app.constants';
import { catchError, of } from 'rxjs';

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
  private readonly modalService = inject(ModalService);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly campusApi = inject(CampusApiService);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() collapsed = false;

  private readonly path = signal<string>(this.currentPath());

  readonly isAuthenticated = computed(() => this.roles.isAuthenticated());
  readonly menuItems = computed(() => this.menu.menuItems());
  
  // Campus data signals (for CAMPUS users)
  readonly campusName = signal<string | null>(null);
  readonly campusRank = signal<number | null>(null);
  readonly campusImageUrl = signal<string | null>(null);
  
  // Signal to track profile updates (for reactive updates)
  readonly profileRefresh = signal<number>(0);
  
  readonly userLabel = computed(() => {
    // Depend on profileRefresh to make this reactive
    this.profileRefresh();
    
    const userType = this.roles.getUserType();
    
    // For CAMPUS users, show campus name instead of email
    if (userType === 'CAMPUS') {
      const name = this.campusName();
      if (name && name.trim()) {
        return name;
      }
    }
    
    // For other users, show email as before
    const user = this.auth.getCurrentUser();
    if (!user) {
      return 'Student';
    }
    
    // For students, try to get firstName and lastName from localStorage (stored profile data)
    if (user.userType === 'STUDENT') {
      try {
        const storedProfile = localStorage.getItem('student_profile_data');
        if (storedProfile) {
          const profileData = JSON.parse(storedProfile) as Record<string, unknown>;
          const firstName = profileData['firstName'] ? String(profileData['firstName']).trim() : '';
          const lastName = profileData['lastName'] ? String(profileData['lastName']).trim() : '';
          
          if (firstName || lastName) {
            const fullName = [firstName, lastName].filter(Boolean).join(' ');
            if (fullName) {
              return fullName;
            }
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
    
    // For other users, show static "Rank"
    return 'Rank';
  });
  
  readonly userImageUrl = computed(() => {
    const userType = this.roles.getUserType();
    
    // For CAMPUS users, show campus image if available
    if (userType === 'CAMPUS') {
      const imageUrl = this.campusImageUrl();
      if (imageUrl && imageUrl.trim()) {
        return imageUrl;
      }
    }
    
    // For other users or if no image, return null (will show initials)
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
    return userType === 'CAMPUS' && (path === '/campus/home' || path === '/campus/about');
  });

  // Faculty list from API (no static fallback - show empty if no faculties)
  readonly faculty = signal<readonly FacultyCard[]>([]);
  loadingFaculties = signal(false);

  facultyPage = 1;
  readonly facultyPageSize = 3;

  get facultyTotalPages(): number {
    return Math.max(1, Math.ceil(this.faculty().length / this.facultyPageSize));
  }

  get facultyPageNumbers(): number[] {
    return Array.from({ length: this.facultyTotalPages }, (_, i) => i + 1);
  }

  get displayedFaculty(): readonly FacultyCard[] {
    const start = (this.facultyPage - 1) * this.facultyPageSize;
    return this.faculty().slice(start, start + this.facultyPageSize);
  }

  ngOnInit(): void {
    // Only run in browser context (skip during SSR)
    if (!this.isBrowser) {
      return;
    }

    // Only load faculties if user is a CAMPUS user (not admin, not student)
    const userType = this.roles.getUserType();
    const primaryRole = this.roles.getPrimaryRole();
    const isAdmin = primaryRole === 'ADMIN' || primaryRole === 'SUPER_ADMIN';
    const isCampus = userType === 'CAMPUS';
    
    // Load campus data (name, rank, image) for CAMPUS users
    if (isCampus && !isAdmin) {
      this.loadCampusData();
      this.loadFaculties();
      // Listen for faculty refresh events (add, delete, update)
      window.addEventListener('facultyAdded', () => {
        this.loadFaculties();
      });
      window.addEventListener('facultyDeleted', () => {
        this.loadFaculties();
      });
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
  
  /**
   * Refreshes the profile signal to trigger computed re-evaluation
   */
  refreshProfile(): void {
    this.profileRefresh.update(v => v + 1);
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
   * Load faculties from API - shows empty list if no faculties or on error
   * No static fallback - new campuses should show empty until faculties are added
   */
  loadFaculties(): void {
    // Skip loading during SSR or if window is not available
    if (typeof window === 'undefined') {
      this.faculty.set([]);
      return;
    }

    this.loadingFaculties.set(true);

    this.campusApi.getAllFaculties().subscribe({
      next: (response) => {
        this.loadingFaculties.set(false);

        if (response?.data && response.data.length > 0) {
          // Convert API data to FacultyCard format
          const apiFacultyCards: FacultyCard[] = response.data.map((item) => {
            // Construct full image URL from photoUrl (API returns relative path or full URL)
            let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
            
            if (item.photoUrl) {
              // If photoUrl is already a full URL (starts with http:// or https://), use it as is
              if (item.photoUrl.startsWith('http://') || item.photoUrl.startsWith('https://')) {
                imageUrl = item.photoUrl;
              } else if (item.photoUrl.startsWith('/')) {
                // If it starts with /, it's an absolute path - construct full URL
                imageUrl = `/api/v1/files${item.photoUrl}`;
              } else {
                // Relative path like "faculty/filename.jpg" - construct full URL
                imageUrl = `/api/v1/files/${item.photoUrl}`;
              }
            }
            
            return {
              id: item.id, // Store ID for fetching details
              name: item.fullName || 'Unknown',
              imageUrl: imageUrl,
            };
          });

          this.faculty.set(apiFacultyCards);
        } else {
          // No faculties found - show empty list (correct for new campuses)
          this.faculty.set([]);
        }
      },
      error: () => {
        this.loadingFaculties.set(false);
        // Show empty list on error - no static fallback
        // New campuses should show empty until faculties are added
        this.faculty.set([]);
      },
    });
  }

  onFacultyPageChange(page: number): void {
    this.facultyPage = page;
  }

  onAddFacultyClick(): void {
    this.modalService.openModal('faculty');
  }

  onFacultyClick(faculty: FacultyCard): void {
    // If faculty has ID, fetch from API using getFacultyById; otherwise use static data as fallback
    if (faculty.id) {
      this.loadingFaculties.set(true);
      
      this.campusApi.getFacultyById(faculty.id).subscribe({
        next: (response) => {
          this.loadingFaculties.set(false);
          
          if (response?.success && response.data) {
            const basicInfo = response.data.basicInformation;
            const professionalInfo = response.data.professionalInformation;
            
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
    
    // Build URL with IDs for campus about
    if (item.id === 'campus-about') {
      const campusId = user.campusId || user.profileServiceId || user.userId;
      const userId = user.userId;
      
      
      if (campusId && userId) {
        fullUrl = `${window.location.origin}/campus/about/${campusId}/${userId}?standalone=true`;
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


