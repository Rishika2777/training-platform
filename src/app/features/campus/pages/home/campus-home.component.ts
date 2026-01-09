import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CampusProspectusComponent, ProspectusUploadFormValue } from '../upload-prospectus/campus-prospectus.component';
import {
  CampusCompaniesVisitedComponent,
  CompaniesVisitedFormValue,
} from '../companies-visited/campus-companies-visited.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusCoursesComponent } from '../courses/campus-courses.component';
import { CampusFacultyComponent, FacultyFormValue } from '../faculty/campus-faculty.component';
import { CampusCourseFormComponent, CourseFormValue } from '../course-form/course-form.component';
import { CampusFacultyDetailComponent } from '../faculty-detail/campus-faculty-detail.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { CampusApiService, BatchesResponse, StudentsByBatchResponse, StudentByBatchData, AlumniDashboardResponse, AlumniDashboardData, AnnouncementItem, AnnouncementsResponse, CompanyVisitedItem } from '../../services/campus-api.service';
import { FacultyDetailService } from '../../services/faculty-detail.service';
import { StudentApiService } from '../../../student/services/student-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-campus-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    DropdownComponent,
    ButtonComponent,
    CampusProspectusComponent,
    CampusCompaniesVisitedComponent,
    CampusPlacedStudentsComponent,
    CampusCoursesComponent,
    CampusFacultyComponent,
    CampusCourseFormComponent,
    CampusFacultyDetailComponent,
  ],
  templateUrl: './campus-home.component.html',
  styleUrl: './campus-home.component.css',
})
export class CampusHomeComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly authState = inject(AuthStateService);
  
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-upload');
  readonly isCompaniesModalOpen = computed(() => this.activeModal() === 'companies-visited');
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isCoursesModalOpen = computed(() => this.activeModal() === 'courses');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');
  readonly isFacultyDetailModalOpen = computed(() => this.activeModal() === 'faculty-detail');
  readonly isCourseFormModalOpen = computed(() => this.activeModal() === 'course-form');
  readonly selectedFaculty = computed(() => this.facultyDetailService.selectedFaculty());

  submittingProspectus = false;
  submittingCompanies = false;
  submittingPlacedStudents = false;
  submittingFaculty = false;
  submittingCourseForm = false;
  deletingFaculty = false;
  showDeleteFacultyModal = false;
  facultyToDeleteId: string | null = null;

  // Announcements - API Integration (for top banner)
  readonly announcements = signal<readonly AnnouncementItem[]>([]);
  readonly loadingAnnouncements = signal(false);
  currentAnnouncementIndex = 0;

  // Current Batch - API Integration
  readonly currentBatch = signal<readonly PersonCard[]>([]);
  readonly loadingCurrentBatch = signal(false);
  readonly batches = signal<string[]>([]);
  readonly loadingBatches = signal(false);
  selectedBatch = signal<string | null>(null);
  currentBatchPage = 1;
  readonly currentBatchPageSize = 6;
  readonly currentBatchTotalPages = signal(1);

  readonly placedStudents = signal<readonly PersonCard[]>([]);
  loadingPlacedStudents = signal(false);

  // Companies Visited - API Integration
  readonly companiesVisited = signal<readonly CompanyVisitedCard[]>([]);
  readonly loadingCompaniesVisited = signal(false);
  companiesVisitedPage = 0; // API uses 0-indexed pagination (page=0 for first page)
  readonly companiesVisitedPageSize = 3; // 3 companies per page (as per UI design)
  readonly companiesVisitedTotalPages = signal(1);

  // Alumni - API Integration
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingAlumni = signal(false);
  selectedAlumniYear = signal<string | null>(null);
  alumniPage = 1;
  readonly alumniPageSize = 6;
  readonly alumniTotalPages = signal(1);
  readonly useCarouselAPI = signal(false); // Flag to switch between APIs
  
  // Year filter options for alumni
  readonly alumniYearOptions: readonly { label: string; value: string }[] = [
    { label: '2022', value: '2022' },
    { label: '2023', value: '2023' },
    { label: '2024', value: '2024' },
    { label: '2025', value: '2025' },
  ];

  readonly posts: readonly FeedPost[] = [
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-institution.png',
      text:
        'Campus life isn’t just about lectures and exams—it’s about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become.',
    },
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-campus.png',
      text:
        'Campus life isn’t just about lectures and exams—it’s about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become.',
    },
  ];

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 4; // Reduced to 4 per page for better pagination visibility
  placedStudentsPage = 0; // API uses 0-indexed pagination (page=0 for first page)

  placedStudentsTotalPages = signal(1);

  currentBatchPageItems(): readonly PersonCard[] {
    return this.currentBatch();
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    // API already returns paginated data, so return the items directly
    return this.placedStudents();
  }

  ngOnInit(): void {
    this.loadPlacedStudents();
    this.loadBatches();
    this.loadCompaniesVisited();
    // Load dashboard announcements
    this.loadAnnouncements();
    // Load alumni with default year (2024) using regular API
    this.selectedAlumniYear.set('2024');
    this.useCarouselAPI.set(false);
    this.loadAlumni('2024');
  }

  // Announcements - API Integration (for top banner)
  // Uses Synkup announcements (system-wide) with fallback to campus announcements
  loadAnnouncements(): void {
    this.loadingAnnouncements.set(true);
    
    // First try Synkup announcements (system-wide)
    this.campusApi.getSynkupAnnouncements(10).pipe(
      catchError((error) => {
        console.warn('CampusHomeComponent: Synkup announcements failed, trying campus announcements:', error);
        // Fallback to campus-specific announcements
        return this.campusApi.getAnnouncements().pipe(
          catchError((fallbackError) => {
            console.error('CampusHomeComponent: Both announcement endpoints failed:', fallbackError);
            this.loadingAnnouncements.set(false);
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (response: AnnouncementsResponse | null) => {
        this.loadingAnnouncements.set(false);
        if (response?.success && Array.isArray(response.data)) {
          this.announcements.set(response.data);
          this.currentAnnouncementIndex = 0; // Reset to first announcement
          console.log('CampusHomeComponent: Announcements loaded:', response.data.length, 'items');
        } else {
          this.announcements.set([]);
          console.warn('CampusHomeComponent: Announcements response not successful or no data');
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in announcements subscription:', error);
        this.loadingAnnouncements.set(false);
        this.announcements.set([]);
      }
    });
  }

  get currentAnnouncement(): AnnouncementItem | null {
    const items = this.announcements();
    if (items.length === 0) return null;
    return items[this.currentAnnouncementIndex] || items[0] || null;
  }

  get announcementDate(): string {
    const announcement = this.currentAnnouncement;
    if (!announcement) return '';
    
    // Format date from eventDate or createdAt
    const dateStr = announcement.eventDate || announcement.createdAt;
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return '';
    }
  }

  onAnnouncementDotClick(index: number): void {
    if (index >= 0 && index < this.announcements().length) {
      this.currentAnnouncementIndex = index;
    }
  }

  getDefaultDate(): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  loadPlacedStudents(): void {
    console.log('CampusHomeComponent: ========== LOADING PLACED STUDENTS ==========');
    console.log('CampusHomeComponent: Current page (0-indexed):', this.placedStudentsPage);
    console.log('CampusHomeComponent: Page size:', this.peoplePageSize);
    this.loadingPlacedStudents.set(true);
    
    // Use dashboard API endpoint: GET /dashboard/placed-students
    // API uses 0-indexed pagination (page=0 for first page)
    this.campusApi
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading placed students:', error);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('CampusHomeComponent: ✅ GET PLACED STUDENTS API RESPONSE RECEIVED');
          console.log('CampusHomeComponent: Response:', response);
          console.log('CampusHomeComponent: Response success:', response?.success);
          console.log('CampusHomeComponent: Response message:', response?.message);
          console.log('CampusHomeComponent: Response data:', response?.data);
          console.log('CampusHomeComponent: Response content array:', response?.data?.content);
          console.log('CampusHomeComponent: Content length:', response?.data?.content?.length || 0);
          console.log('CampusHomeComponent: Total pages:', response?.data?.totalPages);
          console.log('CampusHomeComponent: Total elements:', response?.data?.totalElements);
          
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const rawItems = response.data.content || [];
            const items = rawItems.map((item) => this.mapPlacedStudentToPersonCard(item));
            
            this.placedStudents.set(items);
            const totalPages = response.data.totalPages ?? 1;
            this.placedStudentsTotalPages.set(Math.max(1, totalPages));
            
            // Log for debugging
            console.log('CampusHomeComponent: Page conversion - API page:', this.placedStudentsPage, 'Display page:', this.placedStudentsPage + 1);
            
            console.log('CampusHomeComponent: ✅ Placed students list updated');
            console.log('CampusHomeComponent: Mapped items count:', items.length);
            console.log('CampusHomeComponent: Total pages:', totalPages);
            console.log('CampusHomeComponent: Current placed students signal:', this.placedStudents());
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response message:', response?.message);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
            this.placedStudents.set([]);
            this.placedStudentsTotalPages.set(1);
          }
        },
        error: () => {
          this.loadingPlacedStudents.set(false);
          this.placedStudents.set([]);
          this.placedStudentsTotalPages.set(1);
        },
      });
  }

  onPlacedStudentsPageChange(page: number): void {
    // Carousel component uses 1-based indexing, convert to 0-based for API
    const apiPage = page - 1;
    if (apiPage !== this.placedStudentsPage && apiPage >= 0) {
      this.placedStudentsPage = apiPage;
      this.loadPlacedStudents();
    }
  }

  // Companies Visited - API Integration
  loadCompaniesVisited(): void {
    console.log('CampusHomeComponent: ========== LOADING COMPANIES VISITED ==========');
    console.log('CampusHomeComponent: Current page (0-indexed):', this.companiesVisitedPage);
    console.log('CampusHomeComponent: Page size:', this.companiesVisitedPageSize);
    
    this.loadingCompaniesVisited.set(true);
    
    this.campusApi
      .getCompaniesVisited(this.companiesVisitedPage, this.companiesVisitedPageSize)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading companies visited:', error);
          this.loadingCompaniesVisited.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('CampusHomeComponent: ✅ GET COMPANIES VISITED API RESPONSE RECEIVED');
          console.log('CampusHomeComponent: Response:', response);
          console.log('CampusHomeComponent: Response success:', response?.success);
          console.log('CampusHomeComponent: Response message:', response?.message);
          console.log('CampusHomeComponent: Response data:', response?.data);
          console.log('CampusHomeComponent: Response content array:', response?.data?.content);
          console.log('CampusHomeComponent: Content length:', response?.data?.content?.length || 0);
          console.log('CampusHomeComponent: Total pages:', response?.data?.totalPages);
          
          this.loadingCompaniesVisited.set(false);
          if (response?.success && response.data) {
            const rawItems = response.data.content || [];
            const items = rawItems.map((item) => this.mapCompanyVisitedToCard(item));
            
            this.companiesVisited.set(items);
            const totalPages = response.data.totalPages ?? 1;
            this.companiesVisitedTotalPages.set(Math.max(1, totalPages));
            
            console.log('CampusHomeComponent: ✅ Companies visited list updated');
            console.log('CampusHomeComponent: Mapped items count:', items.length);
            console.log('CampusHomeComponent: Total pages:', totalPages);
            console.log('CampusHomeComponent: Current companies visited signal:', this.companiesVisited());
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response message:', response?.message);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
            this.companiesVisited.set([]);
            this.companiesVisitedTotalPages.set(1);
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: ❌❌❌ COMPANIES VISITED SUBSCRIPTION ERROR ❌❌❌');
          console.error('CampusHomeComponent: Error object:', error);
          console.error('CampusHomeComponent: Error status:', error?.status);
          console.error('CampusHomeComponent: Error URL:', error?.url);
          console.error('CampusHomeComponent: Error message:', error?.message);
          console.error('CampusHomeComponent: Error response:', error?.error);
          
          this.loadingCompaniesVisited.set(false);
          this.companiesVisited.set([]);
          this.companiesVisitedTotalPages.set(1);
          
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Failed to load companies visited';
          this.notify.error(errorMessage);
          
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        },
      });
  }

  onCompaniesVisitedPageChange(page: number): void {
    // page can be either 0-based (from prev/next buttons) or 1-based (from page number buttons)
    // Convert to 0-based if it's 1-based (greater than 0 and less than or equal to totalPages)
    let apiPage: number;
    const totalPages = this.companiesVisitedTotalPages();
    
    if (page >= 1 && page <= totalPages) {
      // 1-based page number from UI buttons
      apiPage = page - 1;
    } else if (page >= 0 && page < totalPages) {
      // Already 0-based (from prev/next buttons)
      apiPage = page;
    } else {
      console.warn('CampusHomeComponent: Invalid page number:', page, 'Total pages:', totalPages);
      return;
    }
    
    if (apiPage !== this.companiesVisitedPage) {
      console.log('CampusHomeComponent: Changing page from', this.companiesVisitedPage, 'to', apiPage);
      this.companiesVisitedPage = apiPage;
      this.loadCompaniesVisited();
    }
  }

  getCompaniesVisitedPageNumbers(): number[] {
    const totalPages = this.companiesVisitedTotalPages();
    const maxVisiblePages = 6; // Show max 6 page numbers
    const currentPage = this.companiesVisitedPage + 1; // Convert to 1-based for display
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Show pages around current page
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onCompanyImageError(event: Event, company: CompanyVisitedCard): void {
    const img = event.target as HTMLImageElement;
    console.error('CampusHomeComponent: ❌ Image failed to load for company:', company.companyName);
    console.error('CampusHomeComponent: Failed image URL:', img.src);
    console.error('CampusHomeComponent: Company data:', company);
    
    // Set fallback image
    img.src = 'assets/images/login-news-image.png';
    img.alt = `${company.companyName} (fallback)`;
  }

  private mapCompanyVisitedToCard(item: CompanyVisitedItem): CompanyVisitedCard {
    // Construct full image URL from logourl
    // Backend returns logourl like "company/ed38e166-3f2a-45e4-8fe7-c441dd068764.jpg"
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    if (item.logourl) {
      const logourl = item.logourl.trim();
      console.log('CampusHomeComponent: mapCompanyVisitedToCard - Company:', item.companyName);
      console.log('CampusHomeComponent: mapCompanyVisitedToCard - Raw logourl:', logourl);
      
      if (logourl.startsWith('http://') || logourl.startsWith('https://')) {
        // Already a full URL
        imageUrl = logourl;
        console.log('CampusHomeComponent: Using full URL:', imageUrl);
      } else if (logourl.startsWith('/')) {
        // Absolute path, add /api/v1/files prefix
        imageUrl = `/api/v1/files${logourl}`;
        console.log('CampusHomeComponent: Constructed URL from absolute path:', imageUrl);
      } else {
        // Relative path like "company/filename.jpg", add /api/v1/files/ prefix
        imageUrl = `/api/v1/files/${logourl}`;
        console.log('CampusHomeComponent: Constructed URL from relative path:', imageUrl);
      }
    } else {
      console.warn('CampusHomeComponent: mapCompanyVisitedToCard - No logourl found for company:', item.companyName);
    }
    
    const result = {
      id: item.id,
      companyName: item.companyName || 'Unknown Company',
      logoUrl: imageUrl,
    };
    
    console.log('CampusHomeComponent: mapCompanyVisitedToCard - Final card for', result.companyName, ':', {
      id: result.id,
      companyName: result.companyName,
      logoUrl: result.logoUrl
    });
    return result;
  }

  // Current Batch - API Integration
  loadBatches(): void {
    this.loadingBatches.set(true);
    
    // Use the same endpoint as placed students form for consistency
    this.campusApi.getBatchesForDropdown().pipe(
      map((batches: string[]) => {
        // Filter and validate batch strings
        return batches
          .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
          .map(batch => batch.trim());
      }),
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading batches from getBatchesForDropdown, trying fallback:', error);
        // Fallback to getAllBatches if getBatchesForDropdown fails
        return this.campusApi.getAllBatches().pipe(
          map((response: BatchesResponse | null) => {
            if (response?.success && Array.isArray(response.data)) {
              return response.data
                .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
                .map(batch => batch.trim());
            }
            return [];
          }),
          catchError((fallbackError) => {
            console.error('CampusHomeComponent: Fallback also failed:', fallbackError);
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (batches: string[]) => {
        this.loadingBatches.set(false);
        
        if (batches.length > 0) {
          this.batches.set(batches);
          
          // Auto-select first batch if available and no batch is selected
          if (!this.selectedBatch()) {
            const firstBatch = batches[0];
            this.selectedBatch.set(firstBatch);
            this.loadStudentsByBatch(firstBatch);
          } else if (this.selectedBatch() && batches.includes(this.selectedBatch()!)) {
            // Reload students for currently selected batch if it still exists
            this.loadStudentsByBatch(this.selectedBatch()!);
          } else if (this.selectedBatch() && !batches.includes(this.selectedBatch()!)) {
            // If selected batch no longer exists, select first available
            const firstBatch = batches[0];
            this.selectedBatch.set(firstBatch);
            this.loadStudentsByBatch(firstBatch);
          }
        } else {
          this.batches.set([]);
          this.selectedBatch.set(null);
        }
        
        console.log('CampusHomeComponent: Batches loaded:', batches.length, 'items');
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in batches subscription:', error);
        this.loadingBatches.set(false);
        this.batches.set([]);
      }
    });
  }

  loadStudentsByBatch(batch: string): void {
    if (!batch) {
      return;
    }
    
    this.loadingCurrentBatch.set(true);
    
    this.campusApi.getStudentsByBatch(batch, this.currentBatchPage, this.currentBatchPageSize).pipe(
      catchError(() => {
        this.loadingCurrentBatch.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: StudentsByBatchResponse | null) => {
        this.loadingCurrentBatch.set(false);
        
        if (response?.success && response.data) {
          const rawItems = response.data.content || [];
          const items = rawItems.map((item) => this.mapStudentByBatchToPersonCard(item));
          
          this.currentBatch.set(items);
          this.currentBatchTotalPages.set(response.data.totalPages || 1);
        } else {
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
        }
      },
      error: () => {
        this.loadingCurrentBatch.set(false);
        this.currentBatch.set([]);
        this.currentBatchTotalPages.set(1);
      }
    });
  }

  private mapStudentByBatchToPersonCard(student: StudentByBatchData): PersonCard {
    const name = student.studentName || 
                 [student.firstName, student.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    const subtitle = student.batch || '';
    const imageUrl = student.profilePhotoUrl || 
                     student.imageUrl || 
                     'assets/images/login-news-image.png';
    
    return {
      name,
      subtitle,
      imageUrl,
    };
  }

  onCurrentBatchPageChange(page: number): void {
    if (page !== this.currentBatchPage && page >= 1) {
      this.currentBatchPage = page;
      const selectedBatch = this.selectedBatch();
      if (selectedBatch) {
        this.loadStudentsByBatch(selectedBatch);
      }
    }
  }

  onBatchSelect(batch: string): void {
    this.selectedBatch.set(batch);
    this.currentBatchPage = 1; // Reset to first page when batch changes
    this.loadStudentsByBatch(batch);
  }

  private mapPlacedStudentToPersonCard(item: {
    // API response fields from GET /dashboard/placed-students (as per API spec)
    id?: string;
    userId?: string | null;
    campusId?: string;
    courseId?: string | null;
    courseName?: string;
    studentName?: string;
    photoUrl?: string; // Relative path like "student/0cf39251-9301-4650-bafe-b86597396368.jpg"
    batch?: string;
    rollNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    placementCompanyId?: string | null;
    placementCompanyName?: string;
    placementDate?: string;
    designation?: string;
    sector?: string;
    createdAt?: string;
    updatedAt?: string;
    placed?: boolean;
    // Legacy fields (for backward compatibility)
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    companyName?: string;
  }): PersonCard {
    // Construct image URL from photoUrl (API returns relative path)
    // photoUrl format: "student/0cf39251-9301-4650-bafe-b86597396368.jpg"
    // Need to construct full URL using API base URL
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    if (item.photoUrl) {
      // If photoUrl is already a full URL (starts with http:// or https://), use it as is
      if (item.photoUrl.startsWith('http://') || item.photoUrl.startsWith('https://')) {
        imageUrl = item.photoUrl;
      } else if (item.photoUrl.startsWith('/')) {
        // If it starts with /, it's an absolute path - prepend API base URL
        // Construct URL: /api/v1/files/{photoUrl} or similar based on your file serving endpoint
        // For now, try common patterns
        imageUrl = `/api/v1/files/${item.photoUrl.substring(1)}`; // Remove leading /
      } else {
        // Relative path like "student/filename.jpg" - construct full URL
        // Based on API, files are typically served from /api/v1/files/ endpoint
        imageUrl = `/api/v1/files/${item.photoUrl}`;
      }
    } else if (item.profilePhotoUrl) {
      // Fallback to profilePhotoUrl for backward compatibility
      if (item.profilePhotoUrl.startsWith('http://') || item.profilePhotoUrl.startsWith('https://') || item.profilePhotoUrl.startsWith('/')) {
        imageUrl = item.profilePhotoUrl;
      } else {
        imageUrl = `/api/v1/files/${item.profilePhotoUrl}`;
      }
    }
    
    // API provides studentName directly - use it as primary source
    const name = item.studentName || 
                 (item.firstName || item.lastName ? [item.firstName, item.lastName].filter(Boolean).join(' ').trim() : null) ||
                 (item.rollNumber ? `Student ${item.rollNumber}` : null) ||
                 (item.email ? item.email.split('@')[0] : null) ||
                 'Unknown';
    
    // Build subtitle with company name and designation
    // API returns placementCompanyName and designation
    const company = item.placementCompanyName || item.companyName || '';
    const subtitleParts: string[] = [];
    if (company) subtitleParts.push(company);
    if (item.designation) subtitleParts.push(item.designation);
    // If no company/designation, show batch
    const subtitle = subtitleParts.length > 0 
      ? subtitleParts.join(' - ') 
      : (item.batch ? `Batch: ${item.batch}` : '');
    
    return {
      name,
      subtitle,
      imageUrl,
    };
  }

  alumniPageItems(): readonly PersonCard[] {
    return this.alumni();
  }

  // Alumni - API Integration (Both APIs: regular with year filter and carousel)
  loadAlumni(year?: string, useCarousel = false): void {
    this.loadingAlumni.set(true);
    
    // Determine which API to use
    if (useCarousel) {
      // Use carousel API (GET /dashboard/alumni/carousel?limit=10)
      console.log('CampusHomeComponent: loadAlumni (CAROUSEL API) called with limit: 10');
      this.campusApi.getAlumniForCarousel(10).pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading alumni from carousel API:', error);
          this.loadingAlumni.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response: AlumniDashboardResponse | null) => {
          this.loadingAlumni.set(false);
          
          if (response?.success && Array.isArray(response.data)) {
            const items = response.data.map((item) => this.mapAlumniToPersonCard(item));
            this.alumni.set(items);
            // Carousel API doesn't have pagination, so set to 1 page
            this.alumniTotalPages.set(1);
            
            console.log('CampusHomeComponent: Alumni loaded from CAROUSEL API:', items.length, 'items');
          } else {
            this.alumni.set([]);
            this.alumniTotalPages.set(1);
            console.warn('CampusHomeComponent: Alumni carousel response not successful or no data');
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: Error in alumni carousel subscription:', error);
          this.loadingAlumni.set(false);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      });
    } else {
      // Use regular alumni API with year filter (GET /dashboard/alumni?year=2024)
      const selectedYear = year || this.selectedAlumniYear() || '2024';
      console.log('CampusHomeComponent: loadAlumni (REGULAR API) called with year:', selectedYear);
      
      this.campusApi.getAlumniForDashboard(selectedYear, this.alumniPage, this.alumniPageSize).pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading alumni from regular API:', error);
          this.loadingAlumni.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response: AlumniDashboardResponse | null) => {
          this.loadingAlumni.set(false);
          
          if (response?.success && Array.isArray(response.data)) {
            const items = response.data.map((item) => this.mapAlumniToPersonCard(item));
            this.alumni.set(items);
            // Calculate total pages based on data length
            this.alumniTotalPages.set(Math.max(1, Math.ceil(items.length / this.alumniPageSize)));
            
            console.log('CampusHomeComponent: Alumni loaded from REGULAR API:', items.length, 'items for year', selectedYear);
          } else {
            this.alumni.set([]);
            this.alumniTotalPages.set(1);
            console.warn('CampusHomeComponent: Alumni regular API response not successful or no data');
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: Error in alumni regular API subscription:', error);
          this.loadingAlumni.set(false);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      });
    }
  }

  onAlumniYearChange(year: string): void {
    this.selectedAlumniYear.set(year);
    this.alumniPage = 1; // Reset to first page when year changes
    this.useCarouselAPI.set(false); // Use regular API when year is selected
    this.loadAlumni(year, false);
  }

  onAlumniPageChange(page: number): void {
    if (page !== this.alumniPage && page >= 1 && !this.useCarouselAPI()) {
      this.alumniPage = page;
      const selectedYear = this.selectedAlumniYear();
      if (selectedYear) {
        this.loadAlumni(selectedYear, false);
      }
    }
  }

  private mapAlumniToPersonCard(item: AlumniDashboardData): PersonCard {
    const name = item.studentName || 
                 [item.firstName, item.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    const subtitle = [item.designation, item.companyName].filter(Boolean).join(' at ') || 
                    item.yearOfPassing || 
                    '';
    const imageUrl = item.profilePhotoUrl || 
                    item.imageUrl || 
                    'assets/images/login-news-image.png';
    
    return {
      name,
      subtitle,
      imageUrl,
    };
  }

  closeModal(): void {
    this.modalService.closeModal();
    this.facultyDetailService.clearSelectedFaculty();
  }

  handleFacultyDetailClose(): void {
    this.facultyDetailService.clearSelectedFaculty();
    this.closeModal();
  }

  handleFacultyDeleteRequest(facultyId: string): void {
    this.facultyToDeleteId = facultyId;
    this.showDeleteFacultyModal = true;
  }

  closeDeleteFacultyModal(): void {
    this.showDeleteFacultyModal = false;
    this.facultyToDeleteId = null;
  }

  confirmDeleteFaculty(): void {
    if (!this.facultyToDeleteId || this.deletingFaculty) {
      return;
    }

    this.deletingFaculty = true;
    
    this.campusApi.deleteFaculty(this.facultyToDeleteId).subscribe({
      next: (response) => {
        this.deletingFaculty = false;
        
        if (response?.success) {
          const message = response.message || 'Faculty deleted successfully';
          this.notify.success(message);
          
          // Close both modals
          this.closeDeleteFacultyModal();
          this.closeModal();
          
          // Refresh faculty list by dispatching event (sidebar will listen)
          window.dispatchEvent(new Event('facultyAdded'));
          
          // Also trigger facultyDeleted event for any other listeners
          window.dispatchEvent(new Event('facultyDeleted'));
        } else {
          const errorMessage = response?.error || response?.message || 'Failed to delete faculty';
          this.notify.error(errorMessage);
        }
      },
      error: (err) => {
        this.deletingFaculty = false;
        
        console.error('❌ DELETE FACULTY - ERROR:', err);
        console.error('Error Status:', err?.status);
        console.error('Error Status Text:', err?.statusText);
        console.error('Error URL:', err?.url);
        console.error('Error Message:', err?.message);
        console.error('Error Response:', err?.error);
        
        let errorMessage = 'Failed to delete faculty member';
        
        if (err?.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.notify.error(errorMessage);
      },
    });
  }

  handleProspectusUploadSuccess(): void {
    this.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleProspectusSubmit(_value: ProspectusUploadFormValue): void {
    // Prospectus submission is handled by the prospectus component itself
    // This handler is just for the event binding
  }

  handleCompaniesSubmit(value: CompaniesVisitedFormValue): void {
    console.log('CampusHomeComponent: ========== COMPANIES VISITED SUBMIT CALLED ==========');
    console.log('CampusHomeComponent: Form value:', {
      companyName: value.companyName,
      hasLogo: !!value.companyLogo,
      logoName: value.companyLogo?.name || 'null'
    });

    // Validate required fields
    if (!value.companyLogo) {
      console.warn('CampusHomeComponent: Validation failed - company logo is required');
      this.submittingCompanies = false;
      this.notify.error('Please select a company logo');
      return;
    }

    if (!value.companyName.trim()) {
      console.warn('CampusHomeComponent: Validation failed - company name is required');
      this.submittingCompanies = false;
      this.notify.error('Please enter a company name');
      return;
    }

    this.submittingCompanies = true;

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('companyName', value.companyName.trim());
    formData.append('logo', value.companyLogo);

    console.log('CampusHomeComponent: ========== CALLING ADD COMPANY VISITED API ==========');
    console.log('CampusHomeComponent: FormData companyName:', formData.get('companyName'));
    console.log('CampusHomeComponent: FormData logo file:', formData.get('logo'));

    this.campusApi.addCompanyVisited(formData).subscribe({
      next: (response) => {
        console.log('CampusHomeComponent: ✅✅✅ ADD COMPANY VISITED API SUCCESS ✅✅✅');
        console.log('CampusHomeComponent: Response:', response);
        
        this.submittingCompanies = false;
        
        // If we get a response (even if null), HTTP request was successful (200)
        // Show success message and refresh the list
        if (response && response.success !== false) {
          // Response has success=true or success is undefined (treat as success for HTTP 200)
          const successMessage = response?.message || 'Company visited added successfully';
          console.log('CampusHomeComponent: Showing success message:', successMessage);
          this.notify.success(successMessage);
          this.closeModal();
          
          // Refresh the companies visited list after adding
          this.companiesVisitedPage = 0; // Reset to first page
          this.loadCompaniesVisited();
          
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        } else if (response && response.success === false) {
          // Explicit failure response
          const errorMsg = response?.error || response?.message || 'Company might not have been added';
          console.warn('CampusHomeComponent: API response success is false:', errorMsg);
          this.notify.error(errorMsg);
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore
          }
        } else {
          // Response is null but HTTP was 200 - treat as success
          console.log('CampusHomeComponent: Response is null but HTTP 200 - treating as success');
          this.notify.success('Company visited added successfully');
          this.closeModal();
          
          // Refresh the companies visited list after adding
          this.companiesVisitedPage = 0; // Reset to first page
          this.loadCompaniesVisited();
          
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore
          }
        }
      },
      error: (err) => {
        console.error('CampusHomeComponent: ❌❌❌ ADD COMPANY VISITED API ERROR ❌❌❌');
        console.error('CampusHomeComponent: Error object:', err);
        console.error('CampusHomeComponent: Error status:', err?.status);
        console.error('CampusHomeComponent: Error URL:', err?.url);
        console.error('CampusHomeComponent: Error response:', err?.error);
        console.error('CampusHomeComponent: Error message:', err?.message);
        
        this.submittingCompanies = false;
        
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to add company visited';
        this.notify.error(errorMessage);
        
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
  }

  handlePlacedStudentsSubmit(value: PlacedStudentsFormValue): void {
    console.log('CampusHomeComponent: ========== PLACED STUDENTS SUBMIT CALLED ==========');
    console.log('CampusHomeComponent: Form value:', {
      studentName: value.studentName,
      course: value.course,
      batch: value.batch,
      placementCompany: value.placementCompany,
      designation: value.designation,
      sector: value.sector,
      hasPhoto: !!value.studentPhoto,
      photoName: value.studentPhoto?.name || 'null'
    });
    
    // Validate required fields
    if (!value.studentPhoto) {
      this.notify.error('Please select a student photo');
      return;
    }

    if (!value.course || !value.course.trim()) {
      this.notify.error('Please select a course');
      return;
    }

    if (!value.placementCompany || !value.placementCompany.trim()) {
      this.notify.error('Please enter a placement company name');
      return;
    }
    
    this.submittingPlacedStudents = true;

    // Create FormData for multipart/form-data request
    // API expects: studentName, photo (file), courseName, batch, placementCompanyName, designation, sector
    const formData = new FormData();
    formData.append('studentName', value.studentName.trim());
    formData.append('photo', value.studentPhoto);
    formData.append('courseName', value.course.trim()); // Required field: courseName (not courseId)
    formData.append('batch', value.batch.trim());
    formData.append('placementCompanyName', value.placementCompany.trim()); // Required field: placementCompanyName (not placementCompanyId)
    formData.append('designation', value.designation.trim());
    formData.append('sector', value.sector.trim());

    // Optional fields - only append if they have values
    // Note: courseId and placementCompanyId are optional according to API docs

    console.log('CampusHomeComponent: ========== CALLING ADD PLACED STUDENT API ==========');
    console.log('CampusHomeComponent: FormData fields:', {
      studentName: value.studentName.trim(),
      courseName: value.course.trim(),
      batch: value.batch.trim(),
      placementCompanyName: value.placementCompany.trim(),
      designation: value.designation.trim(),
      sector: value.sector.trim(),
      photoFile: value.studentPhoto.name
    });
    console.log('CampusHomeComponent: ⚠️ This should appear in Network tab as POST /dashboard/students/placed with multipart/form-data');

    this.campusApi.addPlacedStudent(formData).subscribe({
      next: (response) => {
        console.log('CampusHomeComponent: ✅✅✅ ADD PLACED STUDENT API SUCCESS ✅✅✅');
        console.log('CampusHomeComponent: Response:', response);
        console.log('CampusHomeComponent: Response success:', response?.success);
        console.log('CampusHomeComponent: Response message:', response?.message);
        
        // Defer state changes to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingPlacedStudents = false;
          if (response?.success) {
            this.notify.success(response?.message || 'Placed student added successfully');
            this.closeModal();
            // Reset to page 0 (first page) to see the newest students first
            this.placedStudentsPage = 0;
            // Reload placed students after adding a new one
            this.loadPlacedStudents();
          } else {
            this.notify.warn(response?.message || 'Placed student might not have been added');
          }
          // Safe change detection - won't crash if component is destroyed
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
      error: (err) => {
        console.error('CampusHomeComponent: ❌❌❌ ADD PLACED STUDENT API ERROR ❌❌❌');
        console.error('CampusHomeComponent: Error status:', err?.status);
        console.error('CampusHomeComponent: Error URL:', err?.url);
        console.error('CampusHomeComponent: Error response:', err?.error);
        
        // HTTP interceptor will show error notification to user
        // Defer state change to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingPlacedStudents = false;
          // Safe change detection - won't crash if component is destroyed
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
    });
  }

  private convertFileToBase64(file: File | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,") and return just the base64 string
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      reader.readAsDataURL(file);
    });
  }

  handleFacultySubmit(value: FacultyFormValue): void {
    // Validate required fields
    if (
      !value.fullName.trim() ||
      !value.email.trim() ||
      !value.dateOfBirth.trim() ||
      !value.phoneNumber.trim()
    ) {
      this.submittingFaculty = false;
      this.notify.error('Please fill all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.email.trim())) {
      this.submittingFaculty = false;
      this.notify.error('Please enter a valid email address');
      return;
    }

    // Validate professional info
    if (!value.professionalInfo || value.professionalInfo.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Please add at least one professional information entry');
      return;
    }

    // Validate each professional info entry
    for (const info of value.professionalInfo) {
      if (
        !info.designation.trim() ||
        !info.department.trim() ||
        !info.specialization.trim() ||
        !info.yearsOfExperience.trim()
      ) {
        this.submittingFaculty = false;
        this.notify.error('Please fill all required fields in professional information');
        return;
      }
    }

    this.submittingFaculty = true;

    // Prepare basic information JSON
    // Convert date format from input (YYYY-MM-DD) to API format (YYYY-MM-DD)
    // The date input already provides YYYY-MM-DD format, but let's ensure it's correct
    let dateOfBirth = value.dateOfBirth.trim();
    
        // If date is in MM/DD/YYYY format, convert to YYYY-MM-DD
        if (dateOfBirth.includes('/')) {
          const parts = dateOfBirth.split('/');
          if (parts.length === 3) {
            dateOfBirth = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
    
    const basicInformation: {
      fullName: string;
      email: string;
      dateOfBirth: string;
      phoneNumber: string;
      photo?: File | null;
    } = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      dateOfBirth: dateOfBirth,
      phoneNumber: value.phoneNumber.trim(),
    };
    
    // Note: Photo is not included in JSON request body
    // If photo is required, backend should handle it separately or we need to use FormData

    // Prepare professional information JSON
    // According to backend API (from Swagger/Postman):
    // - designation: array of strings (e.g., ["PRINCIPAL"])
    // - department: array of strings (e.g., ["School Administration"])
    // - specialization: array of strings (e.g., ["Academic Management", "Educational Leadership"])
    // - yearsOfExperience: array of numbers (e.g., [22]) - IMPORTANT: Backend expects ARRAY!
    // - qualifications: array of strings
    // - certificates: array of strings
    let professionalInformation: {
      designation: string[];
      department: string[];
      specialization: string[];
      yearsOfExperience: number[]; // ARRAY of numbers, not single number!
      qualifications: string[];
      certificates: string[];
    }[] = [];
    
    try {
      professionalInformation = value.professionalInfo.map((info, index) => {
        // Parse qualifications - split by comma or newline if multiple, otherwise single item array
        const qualificationsStr = (info.qualifications || '').trim();
        const qualificationsArray = qualificationsStr
          ? qualificationsStr.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
          : [];
        
        // Certificates - empty array for now (files would need to be uploaded separately)
        // If certificates are provided as file names, they would be added here
        const certificatesArray: string[] = [];
        
        // Convert designation, department, specialization to arrays
        // Ensure values are trimmed and not empty
        const designationValue = (info.designation || '').trim();
        const departmentValue = (info.department || '').trim();
        const specializationValue = (info.specialization || '').trim();
        
        if (!designationValue) {
          throw new Error(`Professional info entry ${index + 1}: Designation is required`);
        }
        if (!departmentValue) {
          throw new Error(`Professional info entry ${index + 1}: Department is required`);
        }
        if (!specializationValue) {
          throw new Error(`Professional info entry ${index + 1}: Specialization is required`);
        }
        
        const designationArray = [designationValue];
        const departmentArray = [departmentValue];
        const specializationArray = [specializationValue];
        
        // Parse yearsOfExperience from string to number
        // Format could be "1-5", "6-10", "11-15", "16+", or a direct number like "10"
        let yearsOfExperienceNum = 0;
        const yearsStr = (info.yearsOfExperience || '').trim();
        if (!yearsStr) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience is required`);
        }
        
        // If it's a range like "1-5", take the midpoint or upper bound
        if (yearsStr.includes('-')) {
          const parts = yearsStr.split('-');
          if (parts.length === 2) {
            const lower = parseInt(parts[0].trim(), 10);
            const upper = parseInt(parts[1].trim(), 10);
            if (!isNaN(lower) && !isNaN(upper) && lower >= 0 && upper > 0) {
              yearsOfExperienceNum = upper; // Use upper bound
            } else {
              throw new Error(`Professional info entry ${index + 1}: Invalid years of experience range`);
            }
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else if (yearsStr.endsWith('+')) {
          // Handle "16+" format
          const num = parseInt(yearsStr.replace('+', '').trim(), 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else {
          // Direct number
          const num = parseInt(yearsStr, 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience`);
          }
        }
        
        // Validate yearsOfExperience is not zero
        if (yearsOfExperienceNum <= 0) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience must be greater than 0`);
        }
        
        // Create object with ALL fields explicitly defined
        // IMPORTANT: Backend expects yearsOfExperience as ARRAY of numbers, not single number!
        const professionalInfoObj: {
          designation: string[];
          department: string[];
          specialization: string[];
          yearsOfExperience: number[]; // Backend expects ARRAY of numbers!
          qualifications: string[];
          certificates: string[];
        } = {
          designation: designationArray,
          department: departmentArray,
          specialization: specializationArray,
          yearsOfExperience: [yearsOfExperienceNum], // Send as ARRAY: [10] not 10
          qualifications: qualificationsArray,
          certificates: certificatesArray,
        };
        
        // Debug log for each professional info entry
        console.log(`Professional Info Entry ${index + 1}:`, JSON.stringify(professionalInfoObj, null, 2));
        console.log(`Professional Info Entry ${index + 1} - All fields:`, {
          hasDesignation: !!professionalInfoObj.designation && professionalInfoObj.designation.length > 0,
          hasDepartment: !!professionalInfoObj.department && professionalInfoObj.department.length > 0,
          hasSpecialization: !!professionalInfoObj.specialization && professionalInfoObj.specialization.length > 0,
          hasYearsOfExperience: Array.isArray(professionalInfoObj.yearsOfExperience) && professionalInfoObj.yearsOfExperience.length > 0,
          hasQualifications: Array.isArray(professionalInfoObj.qualifications),
          hasCertificates: Array.isArray(professionalInfoObj.certificates),
        });
        
        return professionalInfoObj;
      });
    } catch (error) {
      this.submittingFaculty = false;
      const errorMessage = error instanceof Error ? error.message : 'Invalid professional information data';
      this.notify.error(errorMessage);
      return;
    }

    // IMPORTANT: Backend expects professionalInformation as a SINGLE OBJECT, not an array!
    // Backend expects: professionalInformation: { designation: [...], department: [...], ... }
    // NOT: professionalInformation: [{...}]
    // So we use only the FIRST entry if multiple exist
    if (professionalInformation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('At least one professional information entry is required');
      return;
    }
    
    // Use only the first professional information entry (backend expects object, not array)
    const professionalInformationObj = professionalInformation[0];
    
    // Warn if multiple entries (only first will be saved)
    if (professionalInformation.length > 1) {
      console.warn('Multiple professional information entries provided. Only the first one will be saved.');
    }

    // Validate the professional information object has all required fields
    if (!professionalInformationObj.designation || professionalInformationObj.designation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Designation is required');
      return;
    }
    if (!professionalInformationObj.department || professionalInformationObj.department.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Department is required');
      return;
    }
    if (!professionalInformationObj.specialization || professionalInformationObj.specialization.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Specialization is required');
      return;
    }
    // Validate yearsOfExperience is an array of numbers
    if (!Array.isArray(professionalInformationObj.yearsOfExperience) || professionalInformationObj.yearsOfExperience.length === 0 || !professionalInformationObj.yearsOfExperience.every((y: number) => typeof y === 'number' && y > 0)) {
      this.submittingFaculty = false;
      this.notify.error('Valid years of experience is required');
      return;
    }
    // Ensure qualifications and certificates are arrays (even if empty)
    // Backend accepts empty arrays, but let's ensure they're always arrays
    if (!Array.isArray(professionalInformationObj.qualifications)) {
      professionalInformationObj.qualifications = [];
    }
    if (!Array.isArray(professionalInformationObj.certificates)) {
      professionalInformationObj.certificates = [];
    }
    
    // Additional validation: Check for null or undefined values in arrays
    professionalInformationObj.designation = professionalInformationObj.designation.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.department = professionalInformationObj.department.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.specialization = professionalInformationObj.specialization.filter(s => s != null && s.trim() !== '');
    professionalInformationObj.qualifications = professionalInformationObj.qualifications.filter(q => q != null && q.trim() !== '');
    professionalInformationObj.certificates = professionalInformationObj.certificates.filter(c => c != null && c.trim() !== '');
    
    // Validate after filtering
    if (professionalInformationObj.designation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Designation is required and cannot be empty');
      return;
    }
    if (professionalInformationObj.department.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Department is required and cannot be empty');
      return;
    }
    if (professionalInformationObj.specialization.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Specialization is required and cannot be empty');
      return;
    }

    // Prepare request data (JSON format - EXACTLY like backend expects)
    // IMPORTANT: Backend expects professionalInformation as a SINGLE OBJECT, not an array!
    // Backend format: { basicInformation: {...}, professionalInformation: {...} }
    const requestData: {
      basicInformation: {
        fullName: string;
        email: string;
        dateOfBirth: string;
        phoneNumber: string;
      };
      professionalInformation: {
        designation: string[];
        department: string[];
        specialization: string[];
        yearsOfExperience: number[]; // Array: [22]
        qualifications: string[];
        certificates: string[];
      };
    } = {
      basicInformation: {
        fullName: basicInformation.fullName,
        email: basicInformation.email,
        dateOfBirth: basicInformation.dateOfBirth,
        phoneNumber: basicInformation.phoneNumber,
      },
      professionalInformation: professionalInformationObj,
    };

    // Debug: Log the complete request data to console
    console.log('=== FACULTY SUBMIT - COMPLETE REQUEST DATA ===');
    console.log('Basic Information:', JSON.stringify(basicInformation, null, 2));
    console.log('Professional Information (OBJECT, not array):', JSON.stringify(professionalInformationObj, null, 2));
    console.log('Complete Request Data (stringified):', JSON.stringify(requestData, null, 2));
    console.log('Professional Information Type Check:');
    console.log('  - Is professionalInformation an object?', typeof requestData.professionalInformation === 'object' && !Array.isArray(requestData.professionalInformation));
    console.log('  - designation:', requestData.professionalInformation.designation, '(isArray:', Array.isArray(requestData.professionalInformation.designation), ')');
    console.log('  - department:', requestData.professionalInformation.department, '(isArray:', Array.isArray(requestData.professionalInformation.department), ')');
    console.log('  - specialization:', requestData.professionalInformation.specialization, '(isArray:', Array.isArray(requestData.professionalInformation.specialization), ')');
    console.log('  - yearsOfExperience:', requestData.professionalInformation.yearsOfExperience, '(isArray:', Array.isArray(requestData.professionalInformation.yearsOfExperience), ')');
    console.log('  - qualifications:', requestData.professionalInformation.qualifications, '(isArray:', Array.isArray(requestData.professionalInformation.qualifications), ')');
    console.log('  - certificates:', requestData.professionalInformation.certificates, '(isArray:', Array.isArray(requestData.professionalInformation.certificates), ')');
    console.log('===========================================');

    // Check authentication
    const token = this.authState.token();
    
    if (!token) {
      this.submittingFaculty = false;
      this.notify.error('Authentication required. Please login again.');
      return;
    }
    
    // Log the exact request being sent
    console.log('🚀 SENDING REQUEST TO BACKEND 🚀');
    console.log('URL: POST /api/v1/faculty');
    console.log('Request Data (complete):', JSON.stringify(requestData, null, 2));
    
    this.campusApi.addFaculty(requestData).subscribe({
      next: (response) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          // Check if response is null (API service returned null)
          if (response === null) {
            this.submittingFaculty = false;
            this.notify.warn('Faculty might have been added, but response format was unexpected. Please refresh the page.');
            this.closeModal();
            // Still trigger refresh in case it was added
            window.dispatchEvent(new Event('facultyAdded'));
            
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
            return;
          }
          
          this.submittingFaculty = false;
          const successMessage = response?.message || 'Faculty added successfully!';
          
          this.notify.success(successMessage);
          
          // Close modal after short delay to show success message
          setTimeout(() => {
            this.closeModal();
          }, 500);

          // Trigger refresh event for sidebar
          window.dispatchEvent(new Event('facultyAdded'));

          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
      error: (err) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingFaculty = false;
          
          // Log full error for debugging
          console.error('❌❌❌ FACULTY SUBMIT - FULL ERROR DETAILS ❌❌❌');
          console.error('Error Status:', err?.status);
          console.error('Error Status Text:', err?.statusText);
          console.error('Error URL:', err?.url);
          console.error('Error Message:', err?.message);
          console.error('Error Object:', err);
          console.error('Error Error (backend response):', err?.error);
          console.error('Error Error (stringified):', JSON.stringify(err?.error, null, 2));
          
          if (err?.error) {
            console.error('=== BACKEND ERROR RESPONSE ===');
            console.error('Success:', err.error.success);
            console.error('Message:', err.error.message);
            console.error('Error:', err.error.error);
            console.error('Data:', err.error.data);
            if (err.error.errors) {
              console.error('Validation Errors:', JSON.stringify(err.error.errors, null, 2));
              // If errors is an array, log each error
              if (Array.isArray(err.error.errors)) {
                err.error.errors.forEach((validationError: unknown, index: number) => {
                  console.error(`  Validation Error ${index + 1}:`, JSON.stringify(validationError, null, 2));
                });
              } else if (typeof err.error.errors === 'object') {
                // If errors is an object (like field validation errors)
                Object.keys(err.error.errors).forEach((key) => {
                  console.error(`  Field "${key}":`, err.error.errors[key]);
                });
              }
            }
            // Try to extract more specific error information
            if (err.error.message) {
              console.error('📌 BACKEND ERROR MESSAGE:', err.error.message);
            }
            if (err.error.error) {
              console.error('📌 BACKEND ERROR DETAIL:', err.error.error);
            }
            console.error('==============================');
          }
          
          let errorMessage = 'Failed to add faculty';
          if (err?.status === 401) {
            errorMessage = 'Unauthorized: Your session has expired. Please login again.';
          } else if (err?.status === 403) {
            errorMessage = 'Forbidden: You do not have permission to add faculty.';
          } else if (err?.status === 500) {
            // Handle 500 Internal Server Error - Get detailed message
            console.error('⚠️ 500 Internal Server Error - Checking backend error response...');
            
            // Check multiple possible error formats
            if (err?.error?.message && err.error.message !== 'null' && err.error.message.trim() !== '') {
              errorMessage = `Server Error: ${err.error.message}`;
            } else if (err?.error?.error && err.error.error !== 'null' && err.error.error.trim() !== '') {
              errorMessage = `Server Error: ${err.error.error}`;
            } else if (err?.error?.errors && typeof err.error.errors === 'object') {
              const validationErrors = Object.entries(err.error.errors)
                .map(([field, messages]) => {
                  const msg = Array.isArray(messages) ? messages.join(', ') : String(messages);
                  return `${field}: ${msg}`;
                })
                .join('; ');
              errorMessage = validationErrors || 'Server error: Validation failed. Please check all fields.';
            } else {
              errorMessage = 'Server Error (500): Please check browser console (F12) for detailed error message from backend.';
            }
            
            // Also log the full error for developer
            console.error('Final Error Message for User:', errorMessage);
          } else if (err?.status === 502) {
            errorMessage = 'Service temporarily unavailable. Please check your connection and try again.';
          } else if (err?.status === 0) {
            errorMessage = 'Network error: Unable to connect to server.';
          } else if (err?.error?.message && err.error.message !== 'null') {
            errorMessage = err.error.message;
          } else if (err?.error?.error && err.error.error !== 'null') {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          // Check for validation errors again (for any status code)
          if (err?.error?.errors && typeof err.error.errors === 'object') {
            const validationErrors = Object.entries(err.error.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            if (validationErrors.trim()) {
              errorMessage = validationErrors;
            }
          }
          
          console.error('❌❌❌ END OF ERROR LOG ❌❌❌');
          
          // CRITICAL: Don't close modal, don't redirect, don't clear token
          // Just show error and let user try again
          
          this.notify.error(errorMessage);
          
          // Trigger change detection after state update
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore if component is destroyed
          }
        }, 0);
      },
    });
  }

  handleFacultyCancel(): void {
    this.closeModal();
  }

  handleCourseFormSubmit(value: CourseFormValue): void {
    try {
      console.log('CampusHomeComponent: ========== handleCourseFormSubmit CALLED ==========');
      console.log('CampusHomeComponent: Form value received:', value);
      console.log('CampusHomeComponent: Value type:', typeof value);
      console.log('CampusHomeComponent: All fields:', {
        courseName: value?.courseName,
        duration: value?.duration,
        totalSeats: value?.totalSeats,
        description: value?.description,
      });
      
      if (!value || !value.courseName || !value.duration || !value.totalSeats || !value.description) {
        console.error('CampusHomeComponent: ❌ Validation failed - value or fields are missing');
        console.error('CampusHomeComponent: Value object:', value);
        this.submittingCourseForm = false;
        this.notify.error('Please fill all required fields');
        return;
      }
      
      if (!value.courseName.trim() || !value.duration.trim() || !value.totalSeats.trim() || !value.description.trim()) {
        console.warn('CampusHomeComponent: Validation failed - empty required fields');
        this.submittingCourseForm = false;
        this.notify.error('Please fill all required fields');
        return;
      }
    } catch (error) {
      console.error('CampusHomeComponent: ❌ Error in handleCourseFormSubmit validation:', error);
      this.submittingCourseForm = false;
      this.notify.error('An error occurred while processing the form');
      return;
    }

    // Convert duration and totalSeats to numbers
    const durationNum = parseInt(value.duration.trim(), 10);
    const totalSeatsNum = parseInt(value.totalSeats.trim(), 10);

    // Validate that duration and totalSeats are valid numbers
    if (isNaN(durationNum) || durationNum <= 0) {
      console.warn('CampusHomeComponent: Validation failed - invalid duration');
      this.submittingCourseForm = false;
      this.notify.error('Duration must be a valid positive number');
      return;
    }

    if (isNaN(totalSeatsNum) || totalSeatsNum <= 0) {
      console.warn('CampusHomeComponent: Validation failed - invalid total seats');
      this.submittingCourseForm = false;
      this.notify.error('Total seats must be a valid positive number');
      return;
    }

    this.submittingCourseForm = true;

    const request = {
      courseName: value.courseName.trim(),
      duration: durationNum,
      totalSeats: totalSeatsNum,
      description: value.description.trim(),
    };

    console.log('CampusHomeComponent: ========== CALLING addCourse API ==========');
    console.log('CampusHomeComponent: Request object:', request);
    console.log('CampusHomeComponent: Auth token exists:', !!this.authState.token());
    console.log('CampusHomeComponent: Auth token value:', this.authState.token() ? '***TOKEN_EXISTS***' : 'NO_TOKEN');

    try {
      this.campusApi.addCourse(request).subscribe({
      next: (response) => {
        console.log('CampusHomeComponent: ✅ addCourse API success');
        console.log('CampusHomeComponent: Response:', response);
        this.submittingCourseForm = false;
        const successMessage = response?.message || 'Course added successfully';
        this.notify.success(successMessage);
        this.closeModal();
        try {
          this.cdr.detectChanges();
        } catch {
          // Component might be destroyed, ignore
        }
      },
      error: (err) => {
        console.error('CampusHomeComponent: ❌ addCourse API error');
        console.error('CampusHomeComponent: Error object:', err);
        console.error('CampusHomeComponent: Error status:', err?.status);
        console.error('CampusHomeComponent: Error URL:', err?.url);
        console.error('CampusHomeComponent: Error response:', err?.error);
        console.error('CampusHomeComponent: Error message:', err?.message);
        
        this.submittingCourseForm = false;
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to add course';
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
    } catch (error) {
      console.error('CampusHomeComponent: ❌ Exception in addCourse API call:', error);
      this.submittingCourseForm = false;
      this.notify.error('An error occurred while calling the API');
      try {
        this.cdr.detectChanges();
      } catch {
        // Ignore
      }
    }
  }
}

interface PersonCard {
  name: string;
  subtitle: string;
  imageUrl: string;
}

interface FeedPost {
  author: string;
  authorId: string;
  imageUrl: string;
  text: string;
}

interface CompanyVisitedCard {
  id?: string;
  companyName: string;
  logoUrl: string;
}

