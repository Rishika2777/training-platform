import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
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
import { CampusApiService, BatchesResponse, StudentsByBatchResponse, StudentByBatchData, AlumniDashboardResponse, AlumniDashboardData, AnnouncementItem, AnnouncementsResponse } from '../../services/campus-api.service';
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

  readonly companiesVisitedSlots = 3;

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 6;
  placedStudentsPage = 1;

  placedStudentsTotalPages = signal(1);

  currentBatchPageItems(): readonly PersonCard[] {
    return this.currentBatch();
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents(), this.placedStudentsPage, this.peoplePageSize);
  }

  ngOnInit(): void {
    this.loadPlacedStudents();
    this.loadBatches();
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
    console.log('CampusHomeComponent: Current page:', this.placedStudentsPage);
    console.log('CampusHomeComponent: Page size:', this.peoplePageSize);
    this.loadingPlacedStudents.set(true);
    this.studentApiService
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize)
      .pipe(
        catchError(() => {
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('CampusHomeComponent: ✅ GET PLACED STUDENTS API RESPONSE RECEIVED');
          console.log('CampusHomeComponent: Response:', response);
          console.log('CampusHomeComponent: Response success:', response?.success);
          console.log('CampusHomeComponent: Response data:', response?.data);
          console.log('CampusHomeComponent: Response content array:', response?.data?.content);
          console.log('CampusHomeComponent: Content length:', response?.data?.content?.length || 0);
          
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const rawItems = response.data.content || [];
            const items = rawItems.map((item) => this.mapPlacedStudentToPersonCard(item));
            
            this.placedStudents.set(items);
            this.placedStudentsTotalPages.set(response.data.totalPages || 1);
            
            console.log('CampusHomeComponent: ✅ Placed students list updated');
            console.log('CampusHomeComponent: Current placed students signal:', this.placedStudents());
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
          }
        },
        error: () => {
          this.loadingPlacedStudents.set(false);
        },
      });
  }

  onPlacedStudentsPageChange(page: number): void {
    this.placedStudentsPage = page;
    this.loadPlacedStudents();
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
    firstName?: string;
    lastName?: string;
    studentName?: string;
    profilePhotoUrl?: string;
    batch?: string;
    companyName?: string;
    placementCompanyId?: string;
    designation?: string;
  }): PersonCard {
    // Use studentName if available, otherwise fall back to firstName + lastName
    const name = item.studentName || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    // Try companyName first, then placementCompanyId as fallback
    const company = item.companyName || item.placementCompanyId || '';
    const subtitle = [item.batch, company].filter(Boolean).join(' ') || '';
    const result = {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
    return result;
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
    this.closeModal();
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
    if (!value.companyLogo || !value.companyName.trim()) {
      this.submittingCompanies = false;
      return;
    }

    this.submittingCompanies = true;

    // Convert file to base64
    this.convertFileToBase64(value.companyLogo)
      .then((base64Logo) => {
        const request = {
          companyLogo: base64Logo,
          companyName: value.companyName.trim(),
        };

        this.campusApi.addCompanyVisited(request).subscribe({
          next: () => {
            this.submittingCompanies = false;
            this.notify.success('Company visited added successfully');
            this.closeModal();
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Failed to add company visited';
            this.submittingCompanies = false;
            this.notify.error(errorMessage);
            try {
              this.cdr.detectChanges();
            } catch {
              // Ignore
            }
          },
        });
      })
      .catch(() => {
        setTimeout(() => {
          this.submittingCompanies = false;
          this.cdr.detectChanges();
        }, 0);
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
    
    this.submittingPlacedStudents = true;

    // Convert File to base64 string
    this.convertFileToBase64(value.studentPhoto)
      .then((photoBase64) => {
        console.log('CampusHomeComponent: ✅ File conversion completed');
        console.log('CampusHomeComponent: Photo base64 length:', photoBase64?.length || 0);
        
        const request = {
          studentName: value.studentName,
          photo: photoBase64 || '',
          courseId: value.course,
          batch: value.batch,
          placementCompanyId: value.placementCompany,
          designation: value.designation,
          sector: value.sector,
        };

        console.log('CampusHomeComponent: ========== CALLING ADD PLACED STUDENT API ==========');
        console.log('CampusHomeComponent: Request payload:', {
          studentName: request.studentName,
          courseId: request.courseId,
          batch: request.batch,
          placementCompanyId: request.placementCompanyId,
          designation: request.designation,
          sector: request.sector,
          photoLength: request.photo.length
        });
        console.log('CampusHomeComponent: ⚠️ This should appear in Network tab as POST /dashboard/students/placed');

        this.campusApi.addPlacedStudent(request).subscribe({
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
                // Reset to page 1 to see the newest students first
                this.placedStudentsPage = 1;
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
      })
      .catch(() => {
        // Defer state change to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingPlacedStudents = false;
          this.cdr.detectChanges();
        }, 0);
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

    // Prepare professional information JSON (without file references)
    // API expects arrays for designation, department, specialization, yearsOfExperience, and qualifications
    const professionalInformation = value.professionalInfo.map((info) => {
      // Parse yearsOfExperience - handle ranges like "1-5", "6-10", "11-15", "16+"
      const yearsExp = info.yearsOfExperience.trim();
      let yearsExpNum = 0;
      
      if (yearsExp) {
        // Handle range values like "1-5", "6-10", etc.
        if (yearsExp.includes('-')) {
          const parts = yearsExp.split('-');
          if (parts.length === 2) {
            // Take the maximum value from the range
            const max = parseInt(parts[1].trim(), 10);
            yearsExpNum = isNaN(max) ? 0 : max;
          }
        } else if (yearsExp.endsWith('+')) {
          // Handle "16+" - take the minimum value
          const min = parseInt(yearsExp.replace('+', '').trim(), 10);
          yearsExpNum = isNaN(min) ? 0 : min;
        } else {
          // Direct number
          const num = parseInt(yearsExp, 10);
          yearsExpNum = isNaN(num) ? 0 : num;
        }
      }
      
      // Parse yearsOfExperience - ensure it's a valid number
      const yearsExpArray = yearsExpNum > 0 ? [yearsExpNum] : [];
      
      // Parse qualifications - split by comma or newline if multiple, otherwise single item array
      const qualificationsStr = info.qualifications.trim();
      const qualificationsArray = qualificationsStr
        ? qualificationsStr.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
        : [];
      
      // Ensure all arrays have at least one value (backend might require non-empty arrays)
      const designationArray = info.designation.trim() ? [info.designation.trim()] : [];
      const departmentArray = info.department.trim() ? [info.department.trim()] : [];
      const specializationArray = info.specialization.trim()
        ? info.specialization.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0)
        : [];
      
      return {
        designation: designationArray,
        department: departmentArray,
        specialization: specializationArray,
        yearsOfExperience: yearsExpArray,
        qualifications: qualificationsArray,
        // Note: certificates will be added as files separately in FormData
        certificates: [], // Empty array - files will be added separately
      };
    });

    // According to Swagger and Thunder: professionalInformation should be a SINGLE OBJECT
    // Backend expects only ONE professionalInformation entry (not merged/multiple)
    // If user has multiple entries, we'll use only the FIRST one (as per backend limitation)
    let professionalInformationObj: {
      designation: string[];
      department: string[];
      specialization: string[];
      yearsOfExperience: number[];
      qualifications: string[];
      certificates?: string[]; // For file URLs if needed
    };

    if (professionalInformation.length === 0) {
      // Empty object if no professional info
      professionalInformationObj = {
        designation: [],
        department: [],
        specialization: [],
        yearsOfExperience: [],
        qualifications: [],
        certificates: [],
      };
    } else {
      if (professionalInformation.length > 1) {
        this.notify.warn('Only the first professional information entry will be saved.');
      }
      professionalInformationObj = professionalInformation[0];
    }

    // Prepare request data (JSON format - like Thunder/Postman)
    const requestData = {
      basicInformation,
      professionalInformation: professionalInformationObj
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
          
          let errorMessage = 'Failed to add faculty';
          if (err?.status === 401) {
            errorMessage = 'Unauthorized: Your session has expired. Please login again.';
          } else if (err?.status === 403) {
            errorMessage = 'Forbidden: You do not have permission to add faculty.';
          } else if (err?.status === 500) {
            // Handle 500 Internal Server Error
            if (err?.error?.error) {
              errorMessage = err.error.error;
            } else if (err?.error?.message) {
              errorMessage = err.error.message;
            } else {
              errorMessage = 'Server error: An internal error occurred. Please check the request data and try again.';
            }
          } else if (err?.status === 502) {
            errorMessage = 'Service temporarily unavailable. Please check your connection and try again.';
          } else if (err?.status === 0) {
            errorMessage = 'Network error: Unable to connect to server.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          if (err?.error?.errors && typeof err.error.errors === 'object') {
            const validationErrors = Object.entries(err.error.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            errorMessage = validationErrors || errorMessage;
          }
          
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
    if (!value.courseName.trim() || !value.courseDuration.trim() || !value.seatsAvailable.trim() || !value.description.trim()) {
      this.submittingCourseForm = false;
      return;
    }

    this.submittingCourseForm = true;

    const request = {
      courseName: value.courseName.trim(),
      courseDuration: value.courseDuration.trim(),
      seatsAvailable: value.seatsAvailable.trim(),
      description: value.description.trim(),
    };

    this.campusApi.addCourse(request).subscribe({
      next: () => {
        this.submittingCourseForm = false;
        this.notify.success('Course added successfully');
        this.closeModal();
        try {
          this.cdr.detectChanges();
        } catch {
          // Component might be destroyed, ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to add course';
        this.submittingCourseForm = false;
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
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

function totalPages(totalItems: number, pageSize: number): number {
  const safeSize = Math.max(1, pageSize);
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / safeSize));
}

function slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
  const safeSize = Math.max(1, pageSize);
  const total = totalPages(items.length, safeSize);
  const safePage = Math.max(1, Math.min(total, page));
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}


