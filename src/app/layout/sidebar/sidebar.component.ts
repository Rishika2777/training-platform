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
import { FacultyDetailService } from '../../features/campus/services/faculty-detail.service';
import { FacultyDetailData } from '../../features/campus/pages/faculty-detail/campus-faculty-detail.component';
import { CampusApiService } from '../../features/campus/services/campus-api.service';
import { OnInit } from '@angular/core';

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
    return userType === 'CAMPUS' && (path === '/campus/home' || path === '/campus/about');
  });

  // Static fallback data
  private readonly staticFacultyData: readonly FacultyCard[] = [
    { name: 'Akshay Sharma', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Ankitha Wilson', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Amith Deshpande', imageUrl: 'assets/images/landing-card-company.png' },
  ];

  // Faculty list from API or static fallback
  readonly faculty = signal<readonly FacultyCard[]>(this.staticFacultyData);
  loadingFaculties = signal(false);

  private readonly facultyDetailData: Record<string, FacultyDetailData> = {
    'Akshay Sharma': {
      name: 'Akshay Sharma',
      imageUrl: 'assets/images/login-news-image.png',
      designation: 'Assistant Professor',
      department: 'Department of Computer Science',
      qualifications: 'Ph.D. in [Specialization], [University Name]',
      experience: '15 years of teaching experience',
      email: 'akshay.sharma@gmail.com',
      phone: '+91 9870978541',
    },
    'Ankitha Wilson': {
      name: 'Ankitha Wilson',
      imageUrl: 'assets/images/landing-card-campus.png',
      designation: 'Assistant Professor',
      department: 'Department of Computer Science',
      qualifications: 'Ph.D. in [Specialization], [University Name]',
      experience: '12 years of teaching experience',
      email: 'ankitha.wilson@gmail.com',
      phone: '+91 9870978542',
    },
    'Amith Deshpande': {
      name: 'Amith Deshpande',
      imageUrl: 'assets/images/landing-card-company.png',
      designation: 'Assistant Professor',
      department: 'Department of Computer Science',
      qualifications: 'Ph.D. in [Specialization], [University Name]',
      experience: '10 years of teaching experience',
      email: 'amith.deshpande@gmail.com',
      phone: '+91 9870978543',
    },
  };

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
    this.loadFaculties();
    // Listen for faculty refresh events (add, delete, update)
    window.addEventListener('facultyAdded', () => {
      console.log('SidebarComponent: Received facultyAdded event, refreshing list...');
      this.loadFaculties();
    });
    window.addEventListener('facultyDeleted', () => {
      console.log('SidebarComponent: Received facultyDeleted event, refreshing list...');
      this.loadFaculties();
    });
  }

  /**
   * Load faculties from API, fallback to static data on error
   */
  loadFaculties(): void {
    console.log('SidebarComponent: ========== LOAD FACULTIES START ==========');
    console.log('SidebarComponent: Loading faculties from API...');
    this.loadingFaculties.set(true);

    this.campusApi.getAllFaculties().subscribe({
      next: (response) => {
        console.log('SidebarComponent: ✅ GET All Faculties API Success');
        console.log('SidebarComponent: API response received:', response);
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

          console.log('SidebarComponent: Using API data, count:', apiFacultyCards.length);
          console.log('SidebarComponent: Faculty names:', apiFacultyCards.map(f => f.name));
          this.faculty.set(apiFacultyCards);
        } else {
          console.log('SidebarComponent: API returned empty data, using static fallback');
          this.faculty.set(this.staticFacultyData);
        }
        console.log('SidebarComponent: ===========================================');
      },
      error: (err) => {
        console.warn('SidebarComponent: ========== GET ALL FACULTIES ERROR ==========');
        console.warn('SidebarComponent: ⚠️ GET All Faculties API Failed');
        console.warn('SidebarComponent: Error status:', err?.status);
        console.warn('SidebarComponent: Error URL:', err?.url);
        console.warn('SidebarComponent: Error message:', err?.message);
        console.warn('SidebarComponent: This is a GET API error - NOT affecting POST API');
        console.warn('SidebarComponent: Using static fallback data - page will work normally');
        console.warn('SidebarComponent: ===========================================');
        
        this.loadingFaculties.set(false);
        // Fallback to static data on error - page continues to work
        this.faculty.set(this.staticFacultyData);
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
      console.log('SidebarComponent: Fetching faculty details for ID:', faculty.id);
      
      this.campusApi.getFacultyById(faculty.id).subscribe({
        next: (response) => {
          this.loadingFaculties.set(false);
          console.log('SidebarComponent: getFacultyById API response:', response);
          
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
            
            console.log('SidebarComponent: Mapped faculty detail data:', detailData);
            this.facultyDetailService.setSelectedFaculty(detailData);
            this.modalService.openModal('faculty-detail');
          } else {
            console.warn('SidebarComponent: API response not successful or no data');
            // Fallback to static data if API returns no data
            const detailData = this.facultyDetailData[faculty.name];
            if (detailData) {
              this.facultyDetailService.setSelectedFaculty(detailData);
              this.modalService.openModal('faculty-detail');
            }
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
          // Fallback to static data on error
          const detailData = this.facultyDetailData[faculty.name];
          if (detailData) {
            this.facultyDetailService.setSelectedFaculty(detailData);
            this.modalService.openModal('faculty-detail');
          } else {
            this.notifications.error('Failed to load faculty details');
          }
        },
      });
    } else {
      // Fallback to static data if no ID
      console.warn('SidebarComponent: Faculty has no ID, using static data');
      const detailData = this.facultyDetailData[faculty.name];
      if (detailData) {
        this.facultyDetailService.setSelectedFaculty(detailData);
        this.modalService.openModal('faculty-detail');
      }
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
    void this.router.navigateByUrl(item.route);
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


