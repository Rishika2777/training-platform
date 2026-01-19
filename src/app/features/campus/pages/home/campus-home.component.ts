import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
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
  
  @ViewChild(CampusProspectusComponent) prospectusComponent!: CampusProspectusComponent;
  @ViewChild(CampusPlacedStudentsComponent) placedStudentsComponent!: CampusPlacedStudentsComponent;
  @ViewChild(CampusCompaniesVisitedComponent) companiesVisitedComponent!: CampusCompaniesVisitedComponent;
  @ViewChild(CampusCourseFormComponent) courseFormComponent!: CampusCourseFormComponent;
  private readonly studentApiService = inject(StudentApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  
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
  currentBatchPage = 0; // API uses 0-indexed pagination (page=0 for first page)
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
  readonly alumniPageSize = 12; // Student API uses limit=12 (as per image)
  readonly alumniTotalPages = signal(1);
  readonly useCarouselAPI = signal(false); // Flag to switch between APIs
  private alumniInitialized = false;
  // Current Batch (student service)
  readonly loadingCurrentBatchStudents = signal(false);
  currentBatchYear = signal<string | null>(null);
  currentBatchCampusName = signal<string | null>(null);
  showBatchFilterModal = signal(false);
  campusFilterOptions = signal<readonly { label: string; value: string }[]>([]);
  selectedFilterCampus = signal<string>('');
  selectedFilterYear = signal<string>('');

  // Student's current batch from Student module
  readonly studentCurrentBatch = signal<string | null>(null);
  readonly noCurrentBatchAssigned = signal(false);
  
  // Year filter options for alumni/current batch
  readonly alumniYearOptions: readonly { label: string; value: string }[] = (() => {
    const current = new Date().getFullYear();
    const years: { label: string; value: string }[] = [];
    for (let y = current; y >= current - 5; y--) {
      years.push({ label: `${y}`, value: `${y}` });
    }
    // Ensure expected fixed years are present
    ['2022', '2023', '2024', '2025', '2026'].forEach((y) => {
      if (!years.find((opt) => opt.value === y)) {
        years.push({ label: y, value: y });
      }
    });
    return years.sort((a, b) => Number(b.value) - Number(a.value));
  })();

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
  readonly peoplePageSize = 3; // 3 students per page
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
    this.loadCompaniesVisited();
    const currentYear = new Date().getFullYear().toString();
    this.selectedAlumniYear.set(currentYear);
    this.useCarouselAPI.set(false);
    this.currentBatchYear.set(currentYear);
    const initialCampusId = this.getCampusId();
    if (initialCampusId) {
      this.alumniInitialized = true;
      this.fetchAlumniByCampusBatch(initialCampusId, currentYear);
      this.loadCurrentBatchStudents(initialCampusId, currentYear);
    }
    this.loadCampusFilterOptions();
    
    // Reset companies visited form when modal opens
    effect(() => {
      const isOpen = this.isCompaniesModalOpen();
      if (isOpen && this.companiesVisitedComponent) {
        // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
        setTimeout(() => {
          if (this.companiesVisitedComponent) {
            this.companiesVisitedComponent.resetForm();
          }
        }, 0);
      }
    });

    // Reset course form when modal opens
    effect(() => {
      const isOpen = this.isCourseFormModalOpen();
      if (isOpen && this.courseFormComponent) {
        // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
        setTimeout(() => {
          if (this.courseFormComponent) {
            this.courseFormComponent.resetForm();
          }
        }, 0);
      }
    });

    // Reset prospectus form when modal opens
    effect(() => {
      const isOpen = this.isProspectusModalOpen();
      if (isOpen) {
        // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
        setTimeout(() => {
          if (this.prospectusComponent) {
            // First reset the form to clear all old data (course, file, etc.)
            this.prospectusComponent.resetForm();
            // Then initialize with campusId after a longer delay to ensure reset completes fully
            // This sets campus name (readonly field) but form fields (course, file) remain empty
            setTimeout(() => {
              if (this.prospectusComponent) {
                this.initializeProspectusComponent();
              }
            }, 200); // Increased delay to ensure reset completes
          } else {
            console.warn('CampusHomeComponent: prospectusComponent ViewChild not available');
          }
        }, 200); // Increased timeout to ensure component is fully initialized and ViewChild is available
      }
    });

    // Reset placed students form when modal opens
    effect(() => {
      const isOpen = this.isPlacedStudentsModalOpen();
      if (isOpen && this.placedStudentsComponent) {
        // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
        setTimeout(() => {
          if (this.placedStudentsComponent) {
            this.placedStudentsComponent.resetForm();
          }
        }, 0);
      }
    });

    this.loadAnnouncements();
  }
  
  /**
   * Initialize prospectus component with campusId when modal opens
   */
  private initializeProspectusComponent(): void {
    const campusId = this.getCampusId();
    if (campusId && this.prospectusComponent) {
      // Pass campusId to prospectus component so it can load the list
      this.prospectusComponent.refreshProspectusList(campusId);
    }
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
    this.loadingPlacedStudents.set(true);
    
    const campusId = this.getCampusId();
    if (!campusId) {
      console.error('CampusHomeComponent: Campus ID not found for getPlacedStudents');
      this.loadingPlacedStudents.set(false);
      return;
    }
    
    // Use dashboard API endpoint: GET /dashboard/placed-students
    // API uses 0-indexed pagination (page=0 for first page)
    this.campusApi
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize, undefined, undefined, campusId)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading placed students:', error);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const rawItems = response.data.content || [];
            const items = rawItems.map((item) => this.mapPlacedStudentToPersonCard(item));
            
            this.placedStudents.set(items);
            const totalPages = response.data.totalPages ?? 1;
            this.placedStudentsTotalPages.set(Math.max(1, totalPages));
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
    // Get campusId from storage (same as other APIs use - set during login)
    const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    
    if (!campusId || !campusId.trim()) {
      console.error('CampusHomeComponent: ❌ Campus ID not found in storage for getCompaniesVisited');
      this.loadingCompaniesVisited.set(false);
      this.companiesVisited.set([]);
      this.companiesVisitedTotalPages.set(1);
      return;
    }
    
    // Clean campusId (remove any prefixes)
    const cleanCampusId = campusId.trim().replace(/^CAMPUS-/i, '');
    
    this.loadingCompaniesVisited.set(true);
    
    this.campusApi
      .getCompaniesVisited(this.companiesVisitedPage, this.companiesVisitedPageSize, cleanCampusId)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading companies visited:', error);
          this.loadingCompaniesVisited.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingCompaniesVisited.set(false);
          
          if (!response) {
            console.warn('CampusHomeComponent: ⚠️ Response is null or undefined');
            this.companiesVisited.set([]);
            this.companiesVisitedTotalPages.set(1);
            return;
          }
          
          if (response.success && response.data) {
            const rawItems = response.data.content || [];
            
            if (rawItems.length > 0) {
              const items = rawItems.map((item) => {
                return this.mapCompanyVisitedToCard(item);
              });
              
              this.companiesVisited.set(items);
              const totalPages = response.data.totalPages ?? 1;
              this.companiesVisitedTotalPages.set(Math.max(1, totalPages));
            } else {
              this.companiesVisited.set([]);
              const totalPages = response.data.totalPages ?? 0;
              this.companiesVisitedTotalPages.set(Math.max(1, totalPages));
            }
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response message:', response?.message);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
            console.warn('CampusHomeComponent: Full response:', JSON.stringify(response, null, 2));
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
    // Carousel component sends 1-based page numbers, convert to 0-based for API
    const apiPage = page - 1;
    const totalPages = this.companiesVisitedTotalPages();
    
    // Validate page number
    if (apiPage < 0 || apiPage >= totalPages) {
      console.warn('CampusHomeComponent: Invalid page number:', page, 'Total pages:', totalPages);
      return;
    }
    
    if (apiPage !== this.companiesVisitedPage) {
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
    // Construct full image URL from logourl or logoUrl
    // Backend may return either "logourl" or "logoUrl"
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    // Try both field names (logourl and logoUrl)
    const logoUrlValue = item.logourl || item.logoUrl;
    
    if (logoUrlValue) {
      const logoUrl = logoUrlValue.trim();
      
      // Remove trailing comma if present (sometimes API returns "url,")
      const cleanUrl = logoUrl.endsWith(',') ? logoUrl.slice(0, -1) : logoUrl;
      
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Already a full URL
        imageUrl = cleanUrl;
      } else if (cleanUrl.startsWith('/')) {
        // Absolute path, add /api/v1/files prefix
        imageUrl = `/api/v1/files${cleanUrl}`;
      } else if (cleanUrl.trim() !== '') {
        // Relative path like "company/filename.jpg", add /api/v1/files/ prefix
        imageUrl = `/api/v1/files/${cleanUrl}`;
      } else {
        console.warn('CampusHomeComponent: mapCompanyVisitedToCard - Empty logo URL for company:', item.companyName);
      }
    } else {
      console.warn('CampusHomeComponent: mapCompanyVisitedToCard - No logo URL found for company:', item.companyName);
    }
    
    const result = {
      id: item.id,
      companyName: item.companyName || 'Unknown Company',
      logoUrl: imageUrl,
    };
    return result;
  }

  // Current Batch - API Integration
  loadBatches(): void {
    this.loadingBatches.set(true);
    // This endpoint should return batches for the current campus
    this.campusApi.getAllBatches().pipe(
      map((response: BatchesResponse | null) => {
        if (response?.success && Array.isArray(response.data)) {
          // Filter and validate batch strings
          const batches = response.data
            .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
            .map(batch => batch.trim());
          return batches;
        }
        
        console.warn('CampusHomeComponent: getAllBatches - No valid batches in response');
        return [];
      }),
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading batches from getAllBatches, trying fallback:', error);
        // Fallback to getBatchesForDropdown if getAllBatches fails
        return this.campusApi.getBatchesForDropdown().pipe(
          map((batches: string[]) => {
            // Filter and validate batch strings
            const filtered = batches
              .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
              .map(batch => batch.trim());
            return filtered;
          }),
          catchError((fallbackError) => {
            console.error('CampusHomeComponent: Both batch endpoints failed:', fallbackError);
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (batches: string[]) => {
        this.loadingBatches.set(false);
        if (batches.length > 0) {
          this.batches.set(batches);

          // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            // Use student's current batch from Student module (NOT first batch)
            const studentBatch = this.studentCurrentBatch();

            if (!this.selectedBatch()) {
              if (studentBatch && batches.includes(studentBatch)) {
                // Select student's current batch
                this.selectedBatch.set(studentBatch);
                this.noCurrentBatchAssigned.set(false);
                this.loadStudentsByBatch(studentBatch);
              } else if (studentBatch && !batches.includes(studentBatch)) {
                // Student batch not in available batches
                console.warn('CampusHomeComponent: Student batch not found in available batches:', studentBatch);
                this.noCurrentBatchAssigned.set(true);
                this.selectedBatch.set(null);
              } else {
                // No student batch available
                this.noCurrentBatchAssigned.set(true);
                this.selectedBatch.set(null);
              }
            } else if (this.selectedBatch() && batches.includes(this.selectedBatch()!)) {
              // Reload students for currently selected batch if it still exists
              this.loadStudentsByBatch(this.selectedBatch()!);
            } else if (this.selectedBatch() && !batches.includes(this.selectedBatch()!)) {
              // If selected batch no longer exists, show no batch assigned
              this.noCurrentBatchAssigned.set(true);
              this.selectedBatch.set(null);
            }
          }, 0);
        } else {
          console.warn('CampusHomeComponent: No batches available - This campus may not have any students with batch information');
          this.batches.set([]);
          this.selectedBatch.set(null);
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in batches subscription:', error);
        this.loadingBatches.set(false);
        this.batches.set([]);
        this.selectedBatch.set(null);
      }
    });
  }

  loadStudentsByBatch(batch: string): void {
    if (!batch) {
      console.warn('CampusHomeComponent: loadStudentsByBatch - No batch provided');
      return;
    }
    
    this.loadingCurrentBatch.set(true);
    
    // API uses 0-indexed pagination, so pass currentBatchPage directly
    this.campusApi.getStudentsByBatch(batch, this.currentBatchPage, this.currentBatchPageSize).pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: loadStudentsByBatch - API Error:', error);
        console.error('CampusHomeComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          error: error?.error,
          url: error?.url
        });
        this.loadingCurrentBatch.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: StudentsByBatchResponse | null) => {
        this.loadingCurrentBatch.set(false);
        if (!response) {
          console.warn('CampusHomeComponent: loadStudentsByBatch - Response is null');
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          return;
        }
        
        if (response?.success && response.data) {
          const rawItems = response.data.content || [];
          
          const items = rawItems.map((item) => {
            return this.mapStudentByBatchToPersonCard(item);
          });
          this.currentBatch.set(items);
          
          // Use API's totalPages directly (API returns correct pagination info)
          const totalPages = response.data.totalPages || 1;
          this.currentBatchTotalPages.set(totalPages);
        } else {
          console.warn('CampusHomeComponent: loadStudentsByBatch - Response not successful or no data');
          console.warn('CampusHomeComponent: Response success:', response?.success);
          console.warn('CampusHomeComponent: Response data:', response?.data);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: loadStudentsByBatch - Subscription Error:', error);
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
    
    const mapped = {
      id: student.studentId || student.userId || student.id || `${name}-${student.batch || ''}`,
      name,
      subtitle,
      imageUrl,
    };
    return mapped;
  }

  onCurrentBatchPageChange(page: number): void {
    // Carousel component uses 1-indexed pages (1, 2, 3...), but API uses 0-indexed (0, 1, 2...)
    // Convert from 1-indexed to 0-indexed
    const apiPage = page - 1;
    
    if (apiPage !== this.currentBatchPage && apiPage >= 0) {
      this.currentBatchPage = apiPage;
      const selectedBatch = this.selectedBatch();
      if (selectedBatch) {
        this.loadStudentsByBatch(selectedBatch);
      }
    }
  }

  onBatchSelect(batch: string): void {
    this.selectedBatch.set(batch);
    this.currentBatchPage = 0; // Reset to first page (0-indexed) when batch changes
    this.loadStudentsByBatch(batch);
  }

  private mapPlacedStudentToPersonCard(item: {
    // API response fields from GET /dashboard/placed-students (as per API spec)
    id?: string;
    userId?: string | null;
    campusId?: string;
    courseId?: string | null;
    courseName?: string | null;
    studentName?: string;
    photoUrl?: string; // Relative path like "student/0cf39251-9301-4650-bafe-b86597396368.jpg"
    photourl?: string; // Backend may return lowercase 'photourl'
    batch?: string;
    rollNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    placementCompanyId?: string | null;
    placementCompanyName?: string | null;
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
    // Construct image URL from photoUrl or photourl (API returns relative path or full URL)
    // Backend may return 'photourl' (lowercase) or 'photoUrl' (camelCase)
    // photoUrl format: "student/0cf39251-9301-4650-bafe-b86597396368.jpg" or full URL
    // Need to construct full URL using API base URL
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    // Handle both photoUrl (camelCase) and photourl (lowercase) from backend
    const photoUrl = item.photoUrl || item.photourl;
    
    if (photoUrl) {
      // If photoUrl is already a full URL (starts with http:// or https://), use it as is
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        imageUrl = photoUrl;
      } else if (photoUrl.startsWith('/')) {
        // If it starts with /, it's an absolute path - prepend API base URL
        // Construct URL: /api/v1/files/{photoUrl} or similar based on your file serving endpoint
        // For now, try common patterns
        imageUrl = `/api/v1/files/${photoUrl.substring(1)}`; // Remove leading /
      } else {
        // Relative path like "student/filename.jpg" - construct full URL
        // Based on API, files are typically served from /api/v1/files/ endpoint
        imageUrl = `/api/v1/files/${photoUrl}`;
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

  avatarSrc(card: PersonCard): string {
    const src = (card.imageUrl || '').trim();
    return src ? src : createInitialsAvatar(card.name);
  }

  onAvatarError(card: PersonCard, event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = createInitialsAvatar(card.name);
    img.alt = `${card.name} (initials)`;
  }

  // Alumni - API Integration (Using Student API)
  loadAlumni(year?: string, useCarousel = false): void {
    const campusId = this.getCampusId();
    const selectedYear = year || this.selectedAlumniYear() || new Date().getFullYear().toString();
    
    if (!campusId) {
      console.warn('CampusHomeComponent: Cannot load alumni - missing campusId');
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
      return;
    }
    
    // Determine which API to use
    if (useCarousel) {
      // Use carousel API (GET /dashboard/alumni/carousel?limit=10)
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
      this.fetchAlumniByCampusBatch(campusId, selectedYear);
    }
  }

  private fetchAlumniByCampusBatch(campusId: string, yearOfPassing: string): void {
    this.loadingAlumni.set(true);
    
    this.studentApiService.getAlumniByCampusBatch(
      campusId,
      yearOfPassing,
      this.alumniPage,
      this.alumniPageSize
    ).pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading alumni from student API:', error);
        this.loadingAlumni.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        this.loadingAlumni.set(false);
        
        if (response?.success && response.data) {
          const items = (response.data.content || []).map((item) => this.mapStudentAlumniToPersonCard(item));
          this.alumni.set(items);
          
          // Use pagination info from API response
          const totalPages = response.data.totalPages || 1;
          this.alumniTotalPages.set(Math.max(1, totalPages));
        } else {
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
          console.warn('CampusHomeComponent: Alumni student API response not successful or no data:', response?.message);
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // ignore if view is destroyed
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in alumni student API subscription:', error);
        this.loadingAlumni.set(false);
        this.alumni.set([]);
        this.alumniTotalPages.set(1);
        try {
          this.cdr.detectChanges();
        } catch {
          // ignore if view is destroyed
        }
      }
    });
  }

  private loadCurrentBatchStudents(campusId: string, year: string): void {
    const campusName = this.currentBatchCampusName();
    if (!campusName) {
      // Attempt to fetch campus name from profile
      this.campusApi.getCampusById(campusId).subscribe({
        next: (profile) => {
          const name = profile?.campusName || profile?.campusId || null;
          if (name) {
            this.currentBatchCampusName.set(name);
            this.loadCurrentBatchStudents(campusId, year);
          }
        },
        error: () => {
          // ignore
        },
      });
      return;
    }
    this.loadingCurrentBatch.set(true);
    this.loadingCurrentBatchStudents.set(true);
    this.studentApiService
      .getCurrentBatch(campusName, year, this.currentBatchPage + 1, this.currentBatchPageSize)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading current batch students:', error);
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          try {
            this.cdr.detectChanges();
          } catch {
            // ignore
          }
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          const data = response?.data;
          const pageObj =
            data && !Array.isArray(data) && typeof data === 'object'
              ? (data as Record<string, unknown>)
              : null;
          const contentArray: unknown[] = Array.isArray(data)
            ? data
            : Array.isArray(pageObj?.['content'])
              ? (pageObj?.['content'] as unknown[])
              : [];

          if (response?.success && contentArray.length > 0) {
            const items = contentArray.map((item) =>
              this.mapCurrentBatchToPersonCard(
                item as import('../../../student/models/student.models').BatchmateResponse,
              ),
            );
            this.currentBatch.set(items);
            const totalPages = typeof pageObj?.['totalPages'] === 'number' ? pageObj['totalPages'] : 1;
            this.currentBatchTotalPages.set(Math.max(1, totalPages));
          } else {
            this.currentBatch.set([]);
            this.currentBatchTotalPages.set(1);
            console.warn('CampusHomeComponent: Current batch response empty or unsuccessful');
          }
          try {
            this.cdr.detectChanges();
          } catch {
            // ignore
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: Error in current batch subscription:', error);
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          try {
            this.cdr.detectChanges();
          } catch {
            // ignore
          }
        },
      });
  }

  private sidebarCampusName(): string | null {
    return null;
  }

  private loadCampusFilterOptions(): void {
    this.campusApi.getAllCampuses().subscribe({
      next: (campuses) => {
        if (Array.isArray(campuses)) {
          const opts = campuses
            .filter((c) => c?.campusName)
            .map((c) => ({ label: c.campusName as string, value: c.campusName as string }));
          this.campusFilterOptions.set(opts);
          if (!this.currentBatchCampusName() && opts.length > 0) {
            this.currentBatchCampusName.set(opts[0].value);
            this.selectedFilterCampus.set(opts[0].value);
          }
        }
      },
      error: () => {
        // ignore
      },
    });
  }

  openBatchFilterModal(): void {
    this.selectedFilterYear.set(this.currentBatchYear() || this.selectedAlumniYear() || '');
    this.showBatchFilterModal.set(true);
  }

  closeBatchFilterModal(): void {
    this.showBatchFilterModal.set(false);
  }

  applyBatchFilters(): void {
    const year = (this.selectedFilterYear() || this.currentBatchYear() || this.selectedAlumniYear() || '').trim();
    if (!year) {
      this.showBatchFilterModal.set(false);
      return;
    }
    this.currentBatchYear.set(year);
    this.currentBatchPage = 0;
    const campusId = this.getCampusId();
    if (campusId) {
      // Campus name will be auto-fetched in loadCurrentBatchStudents if not already set
      this.loadCurrentBatchStudents(campusId, year);
    }
    this.showBatchFilterModal.set(false);
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

  loadCurrentBatchFromFilters(): void {
    const year = this.currentBatchYear() || this.selectedAlumniYear() || new Date().getFullYear().toString();
    const campusId = this.getCampusId();
    if (!campusId) {
      return;
    }
    this.currentBatchYear.set(year);
    this.loadCurrentBatchStudents(campusId, year);
  }

  onCurrentBatchYearChange(year: string): void {
    this.currentBatchYear.set(year);
    this.currentBatchPage = 1;
    this.loadCurrentBatchFromFilters();
  }

  private mapAlumniToPersonCard(item: AlumniDashboardData): PersonCard {
    const name = item.studentName || 
                 [item.firstName, item.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    const subtitle = [item.designation, item.companyName].filter(Boolean).join(' at ') || 
                    item.yearOfPassing || 
                    '';
    const imageUrl = resolveImageUrl(item.profilePhotoUrl || item.imageUrl, name);
    
    return {
      id: item.studentId || item.userId || `${name}-${item.yearOfPassing || ''}`,
      name,
      subtitle,
      imageUrl,
    };
  }

  /**
   * Map AlumniResponse from Student API to PersonCard
   */
  private mapStudentAlumniToPersonCard(item: import('../../../student/models/student.models').AlumniResponse): PersonCard {
    const extended = item as Record<string, unknown>;
    const name =
      (extended['name'] as string) ||
      [item.firstName, item.lastName].filter(Boolean).join(' ') ||
      'Unknown';
    const subtitle =
      [item.designation, (extended['company'] as string) ?? item.companyName]
        .filter(Boolean)
        .join(' at ') ||
      (extended['graduationYear'] as string) ||
      item.yearOfPassing ||
      '';
    const imageUrl = resolveImageUrl(
      item.profilePhotoUrl || (extended['imageUrl'] as string),
      name,
    );
    
    return {
      id:
        (extended['alumniId'] as string) ||
        item.studentId ||
        item.userId ||
        `${name}-${(extended['graduationYear'] as string) || item.yearOfPassing || ''}`,
      name,
      subtitle,
      imageUrl,
    };
  }

  private mapCurrentBatchToPersonCard(item: import('../../../student/models/student.models').BatchmateResponse): PersonCard {
    const name =
      item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : item.firstName || item.lastName || 'Unknown';
    const subtitle = item.batch || item.yearOfPassing || '';
    const imageUrl = resolveImageUrl(item.profilePhotoUrl, name);
    return {
      id: item.studentId || item.userId || `${name}-${subtitle}`,
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

  /**
   * Helper method to get campusId from multiple sources
   * Priority:
   * 1. User profile profileServiceId (from auth state)
   * 2. Storage CAMPUS_ID key (fallback)
   * 3. Form value campus field (if valid ID)
   */
  private getCampusId(formValueCampus?: string): string | null {
    // Try from auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId || currentUser?.campusId;
    if (campusIdFromUser) {
      return campusIdFromUser;
    }
    
    // Try from storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    if (campusIdFromStorage) {
      return campusIdFromStorage;
    }
    
    // Try from form value if provided and is a valid ID
    if (formValueCampus && formValueCampus.trim()) {
      const trimmedCampus = formValueCampus.trim();
      // Check if it's a valid ID (not a file name)
      // MongoDB ObjectId: 24-character hex string
      if (/^[0-9a-fA-F]{24}$/.test(trimmedCampus) && !/\.\w+$/.test(trimmedCampus)) {
        return trimmedCampus;
      }
      // Numeric ID (legacy support)
      if (/^\d+$/.test(trimmedCampus) && !/\.\w+$/.test(trimmedCampus)) {
        return trimmedCampus;
      }
    }
    
    return null;
  }

  /**
   * Handle prospectus form submission
   * POST /prospectus/upload?campusId=xxx
   * Body (multipart/form-data): courseName, files[]
   */
  handleProspectusSubmit(value: ProspectusUploadFormValue): void {
    // Prevent double submission
    if (this.submittingProspectus) {
      return;
    }

    // Validate course
    if (!value.course || !value.course.trim()) {
      this.notify.error('Please select a course');
      return;
    }

    // Collect files
    const files: File[] = [];
    if (value.campusFile) {
      files.push(value.campusFile);
    }
    if (value.courseFile) {
      files.push(value.courseFile);
    }

    if (files.length === 0) {
      this.notify.error('Please select at least one prospectus file');
      return;
    }

    // Get campusId from auth state/storage
    const campusId = this.getCampusId(value.campus);
    
    if (!campusId) {
      this.notify.error('Campus ID not found. Please ensure you are logged in as a campus admin.');
      return;
    }

    // All validation passed - set submitting state and make API call
    this.submittingProspectus = true;

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    const courseName = value.course.trim();
    formData.append('courseName', courseName);
    
    // Append all files to the 'files' field (as array)
    files.forEach((file) => {
      formData.append('files', file);
    });

    this.campusApi.uploadProspectus(campusId, formData).subscribe({
      next: (response) => {
        this.submittingProspectus = false;
        
        if (response?.success) {
          const successMessage = response.message || 'Prospectus uploaded successfully';
          this.notify.success(successMessage);
          
          // Refresh prospectus list to show the newly uploaded prospectus
          // Pass campusId and courseName to ensure list loads correctly
          // Use setTimeout to ensure the backend has processed the upload and component is ready
          setTimeout(() => {
            if (this.prospectusComponent) {
              this.prospectusComponent.refreshProspectusList(campusId, courseName);
              
              // Reset form fields after successful upload so they are blank for next upload
              // Use a small delay to ensure the list refresh completes first
              setTimeout(() => {
                if (this.prospectusComponent) {
                  this.prospectusComponent.resetForm();
                  // Re-initialize with campusId to show campus name (readonly field) but keep form fields blank
                  setTimeout(() => {
                    if (this.prospectusComponent) {
                      this.initializeProspectusComponent();
                    }
                  }, 100);
                }
              }, 500);
            }
          }, 1000); // Wait 1 second for backend to process
          
          // Don't close modal immediately - let user see the uploaded prospectus and download it
          // The modal stays open so user can see the list refresh and download the file
          
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        } else {
          const errorMsg = response?.error || response?.message || 'Failed to upload prospectus';
          this.notify.error(errorMsg);
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore
          }
        }
      },
      error: (err) => {
        this.submittingProspectus = false;
        
        let errorMessage = 'Failed to upload prospectus';
        if (err?.error) {
          if (err.error.message && err.error.message !== 'null' && err.error.message.trim()) {
            errorMessage = err.error.message;
          } else if (err.error.error && err.error.error !== 'null' && err.error.error.trim()) {
            errorMessage = err.error.error;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.notify.error(errorMessage);
        
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
  }

  handleCompaniesSubmit(value: CompaniesVisitedFormValue): void {
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

    // Get campusId from storage (same as other APIs use - set during login)
    const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    
    if (!campusId || !campusId.trim()) {
      console.error('CampusHomeComponent: ❌ Campus ID not found in storage. Cannot add company visited.');
      this.submittingCompanies = false;
      this.notify.error('Campus ID not found. Please ensure you are logged in and try again.');
      return;
    }
    
    // Clean campusId (remove any prefixes)
    const cleanCampusId = campusId.trim().replace(/^CAMPUS-/i, '');

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('companyName', value.companyName.trim());
    formData.append('logo', value.companyLogo);

    this.campusApi.addCompanyVisited(cleanCampusId, formData).subscribe({
      next: (response) => {
        this.submittingCompanies = false;
        
        // If we get a response (even if null), HTTP request was successful (200)
        // Show success message and refresh the list
        if (response && response.success !== false) {
          // Response has success=true or success is undefined (treat as success for HTTP 200)
          const successMessage = response?.message || 'Company visited added successfully';
          this.notify.success(successMessage);
          
          // Reset form before closing modal
          if (this.companiesVisitedComponent) {
            this.companiesVisitedComponent.resetForm();
          }
          
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
          this.notify.success('Company visited added successfully');
          
          // Reset form before closing modal
          if (this.companiesVisitedComponent) {
            this.companiesVisitedComponent.resetForm();
          }
          
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

    this.campusApi.addPlacedStudent(formData).subscribe({
      next: (response) => {
        // Defer state changes to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingPlacedStudents = false;
          if (response?.success) {
            this.notify.success(response?.message || 'Placed student added successfully');
            // Reset form after successful submit
            if (this.placedStudentsComponent) {
              this.placedStudentsComponent.resetForm();
              this.placedStudentsComponent.reloadStudentNames();
            }
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

    // Check authentication
    const token = this.authState.token();
    
    if (!token) {
      this.submittingFaculty = false;
      this.notify.error('Authentication required. Please login again.');
      return;
    }
    
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

    try {
      this.campusApi.addCourse(request).subscribe({
      next: (response) => {
        this.submittingCourseForm = false;
        const successMessage = response?.message || 'Course added successfully';
        this.notify.success(successMessage);
        
        // Reset form before closing modal
        if (this.courseFormComponent) {
          this.courseFormComponent.resetForm();
        }
        
        this.closeModal();
        
        // Dispatch event to refresh courses list immediately
        window.dispatchEvent(new Event('courseAdded'));
        
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
  id?: string;
  name: string;
  subtitle: string;
  imageUrl: string;
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  const first = parts[0][0] || '';
  const second = parts.length > 1 ? parts[1][0] : '';
  return (first + second).toUpperCase();
}

/**
 * Create a data URL avatar with initials for cases where no photo URL is available.
 */
function createInitialsAvatar(name: string): string {
  const initials = buildInitials(name || 'A');
  const bg = '#E6F0FF';
  const fg = '#2F4A80';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="32" ry="32" fill="${bg}"/>
  <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function resolveImageUrl(value: string | undefined, name: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return createInitialsAvatar(name);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    // If already a /files/... path, keep it; otherwise prefix with /api/v1
    return trimmed.startsWith('/files') ? `/api/v1${trimmed}` : `/api/v1/files${trimmed}`;
  }
  // Treat as relative filename
  return `/api/v1/files/${trimmed}`;
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

