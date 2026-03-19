import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, OnInit, OnDestroy, signal, ChangeDetectorRef, DestroyRef, PLATFORM_ID, ViewChild, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AppHeaderComponent } from '../../../../shared/components/header/header.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusVisitCampusComponent, VisitCampusFormValue } from '../visit-campus/campus-visit-campus.component';
import { CampusFacultyComponent, FacultyFormValue } from '../faculty/campus-faculty.component';
import { CampusFacultyDetailComponent, FacultyDetailData } from '../faculty-detail/campus-faculty-detail.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusDownloadProspectusComponent } from '../download-prospectus/campus-download-prospectus.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { FacultyDetailService } from '../../services/faculty-detail.service';
import { CampusApiService, TestimonialData, TestimonialsResponse, ResearchData, YearlyTrend, SectorBreakdownItem, GetAllFacultiesResponse, FacultyListItem, AlumniDashboardData, VisitCampusRequest, VisitCampusResponse, StudentByBatchData, StudentsByBatchResponse, Campus, PlacementInsightsResponse, AnalyticsDashboardResponse } from '../../services/campus-api.service';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { ApiResponsePlacedStudentsResponse,  PlacedStudentResponse } from '../../../student/models/student.models';
import { StudentApiService } from '../../../student/services/student-api.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { catchError, of, map, Observable } from 'rxjs';

interface PersonCard {
  id?: string;
  publicStudentId?: string;
  name: string;
  imageUrl: string;
  batch?: string;
  company?: string;
  designation?: string;
  courseName?: string; // For filtering rising stars by course
}

interface CourseCard {
  id: string;
  name: string;
  seats: number;
  duration: string;
  fullName?: string; // For course description in card bottom
}

@Component({
  selector: 'app-campus-about',
  standalone: true,
  host: {
    '[class.delete-modal-open]': 'showDeleteFacultyModal'
  },
  imports: [
    CommonModule,
    ButtonComponent,
    CarouselComponent,
    InputComponent,
    TextareaComponent,
    ModalComponent,
    AppHeaderComponent,
    CampusVisitCampusComponent,
    CampusFacultyComponent,
    CampusFacultyDetailComponent,
    CampusPlacedStudentsComponent,
    CampusDownloadProspectusComponent,
    DropdownComponent,
  ],
  templateUrl: './campus-about.component.html',
  styleUrl: './campus-about.component.css',
})
export class CampusAboutComponent implements OnInit, OnDestroy {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly commonApi = inject(CommonApiService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);
  private readonly notify = inject(NotificationService);
    internalCampusId!: string;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** True when URL path contains /department/ (about department page). */
  readonly isDepartmentContext = signal<boolean>(false);
  private readonly platformId = inject(PLATFORM_ID);
  readonly pageSize = 8;

  private getPublicCampusId(): string | null {
    const snapshot = this.route.snapshot;
  
    // 1. direct param
    if (snapshot.paramMap.has('publicCampusId')) {
      return snapshot.paramMap.get('publicCampusId');
    }
  
    // 2. parent param
    let parent = this.route.parent;
    while (parent) {
      if (parent.snapshot.paramMap.has('publicCampusId')) {
        return parent.snapshot.paramMap.get('publicCampusId');
      }
      parent = parent.parent;
    }
  
    return null;
  }

  private getPublicDepartmentId(): string | null {
  const snapshot = this.route.snapshot;

  // direct param
  if (snapshot.paramMap.has('publicDepartmentId')) {
    return snapshot.paramMap.get('publicDepartmentId');
  }

  // parent param
  let parent = this.route.parent;
  while (parent) {
    if (parent.snapshot.paramMap.has('publicDepartmentId')) {
      return parent.snapshot.paramMap.get('publicDepartmentId');
    }
    parent = parent.parent;
  }

  return null;
}

/** Year options: current year and 5 years back (6 years total) */
readonly alumniYearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const years: { label: string; value: string }[] = [];
  for (let year = currentYear; year >= currentYear - 5; year--) {
    years.push({ label: year.toString(), value: year.toString() });
  }
  return years;
});

  get isPublicProfile(): boolean {
    return !!this.getPublicCampusId();
  }


// ---------------- Recommendation (separate section) ----------------
recommendationChoice: 'yes' | 'no' | '' = '';
isSubmittingRecommendation = false;


  
  isFollowing = false;
followers = 0;
promotions = 0;
  
  // Browser check for SSR
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Route parameters (for opening in new tab)
  readonly routeCampusId = signal<string | null>(null);
  readonly routeUserId = signal<string | null>(null);
  readonly isStandalone = signal<boolean>(false);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isVisitCampusModalOpen = computed(() => this.activeModal() === 'visit-campus');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');
  readonly isFacultyDetailModalOpen = computed(() => this.activeModal() === 'faculty-detail');
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isDownloadProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-download');
  readonly selectedFaculty = computed(() => this.facultyDetailService.selectedFaculty());
  

  // -------------------- our department section -------------
readonly departments = signal<{ id: string; name: string; photoUrl?: string }[]>([]);
readonly loadingDepartments = signal(false);
readonly departmentId = signal<string | null>(null);


readonly departmentDropdownItems = computed(() => [
  { label: 'All', value: '' },
  ...this.departments().map(d => ({
    label: d.name,
    value: d.id
  }))
]);

alumniYearTouched = signal(false);
alumniYearError = signal(false);

selectedDepartment = signal<string>('');
currentPage = signal(1);
itemsPerPage = 4;

// filtered list
readonly filteredDepartments = computed(() => {
  const selectedId = this.selectedDepartment();
  if (!selectedId) return this.departments();
  return this.departments().filter(d => d.id === selectedId);
});


// pagination
readonly totalPages = computed(() =>
  Math.ceil(this.filteredDepartments().length / this.itemsPerPage)
);

readonly paginatedDepartments = computed(() => {
  const start = (this.currentPage() - 1) * this.itemsPerPage;
  return this.filteredDepartments().slice(start, start + this.itemsPerPage);
});

// dropdown select
onDepartmentSelect(dept: string) {
  this.selectedDepartment.set(dept);
  this.currentPage.set(1);
}



// pages array
readonly pagesArray = computed(() => {
  return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
});

goToPage(page: number) {
  if (page < 1 || page > this.totalPages()) return;
  this.currentPage.set(page);
}



  
  // Delete faculty modal state
  deletingFaculty = false;
  showDeleteFacultyModal = false;
  facultyToDeleteId: string | null = null;


  // Edit faculty state
  editingFacultyId: string | null = null;
  readonly isEditMode = computed(() => this.editingFacultyId !== null);
  facultyFormValue: FacultyFormValue | null = null;

  getDefaultFacultyFormValue(): FacultyFormValue {
    return {
      fullName: '',
      photo: null,
      email: '',
      dateOfBirth: '',
      phoneNumber: '',
      professionalInfo: [{ designation: '', department: '', specialization: null, yearsOfExperience: '', qualifications: '', certificates: null }],
    };
  }

  submittingVisitCampus = false;
  submittingFaculty = false;
  submittingFeedback = false;
  submittingPlacedStudents = false;

  campusFeedbackForm: {
  reviewerName: string;
  feedbackText: string;
}


= {
  reviewerName: '',
  feedbackText: ''
};

reviewerNameTouched = false;
// -------- Reviewer Name Validation ----------
isReviewerNameInvalid(): boolean {
  if (!this.reviewerNameTouched) return false;

  const name = this.campusFeedbackForm.reviewerName?.trim();
  if (!name) return true;

  const nameRegex = /^[A-Za-z ]+$/;
  return !nameRegex.test(name);
}

onReviewerNameChange(value: string): void {
  this.reviewerNameTouched = true;
  this.campusFeedbackForm.reviewerName = value;
}


  @ViewChild(CampusPlacedStudentsComponent) placedStudentsComponent!: CampusPlacedStudentsComponent;


  // Rising Stars - API Integration (Using GET /dashboard/placed-students - same as Placed Students section)
  // This fetches all placed students from the campus dashboard and displays them as rising stars
  readonly risingStars = signal<readonly PersonCard[]>([]); // Current page items (from API)
  readonly allRisingStars = signal<readonly PersonCard[]>([]); // All items (for course filtering)
  readonly loadingRisingStars = signal(false);
  risingStarsPage = 0; // API uses 0-based pagination
  readonly risingStarsPageSize = 8;
  readonly risingStarsTotalPages = signal(1);
  private useClientSidePagination = false; // Flag to switch between API pagination and client-side pagination
  
  // Course filter for Rising Stars
  readonly selectedCourseFilter = signal<string | null>(null); // null = "All Courses"
  
  // Course dropdown items for filter (from getAllCourses API)
  readonly courseFilterItems = computed(() => {
    const allCourses = [
      { label: 'All Courses', value: '' }
    ];
    
    const courses = this.courses();
    const courseItems = courses.map(course => ({
      label: course.name,
      value: course.name
    }));
    
    return [...allCourses, ...courseItems];
  });

  private readonly resetPlacedStudentsEffect = effect(() => {
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

  // Campus Insights - About Campus Content
  readonly aboutCampusText = signal<string>('');
  readonly loadingAboutCampus = signal(false);
  readonly campusWebsiteUrl = signal<string | null>(null);
  readonly contactInfo = signal<{ email?: string; phone?: string; address?: string } | null>(null);
  /** Actual campus ID from contact-info API (use for feedback, recommendation, follow, departments) */
  readonly resolvedCampusId = signal<string | null>(null);
  readonly currentCampusId = signal<string | null>(null);

  // Analytics (Overview section)
  readonly analyticsTotalStudents = signal<number>(0);
  readonly analyticsTotalFaculty = signal<number>(0);
  readonly analyticsTotalCourses = signal<number>(0);
  readonly loadingAnalytics = signal(false);
  readonly analyticsTotalCount = computed(() => {
    const s = this.analyticsTotalStudents();
    const f = this.analyticsTotalFaculty();
    const c = this.analyticsTotalCourses();
    return s + f + c;
  });

  /** Conic gradient for Total Count donut: Students (purple), Faculties (light gray), Courses (darker gray) */
  readonly totalCountDonutGradient = computed(() => {
    const s = this.analyticsTotalStudents();
    const f = this.analyticsTotalFaculty();
    const c = this.analyticsTotalCourses();
    const total = s + f + c;
    if (total === 0) return 'conic-gradient(#e0e0e0 0deg 360deg)';
    const p1 = (s / total) * 360;
    const p2 = ((s + f) / total) * 360;
    return `conic-gradient(var(--color-primary, #7c3aed) 0deg ${p1}deg, #b0b0b0 ${p1}deg ${p2}deg, #6b7280 ${p2}deg 360deg)`;
  });

  private updateDepartmentContext(): void {
    const url = this.router.url ?? '';
    this.isDepartmentContext.set(url.includes('/department/'));
  }

  ngOnInit(): void {
    this.updateDepartmentContext();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updateDepartmentContext());

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params: ParamMap) => {
  
        const publicCampusIdFromRoute = params.get('publicCampusId');
        const campusIdFromRoute = params.get('campusId');
        const userIdFromRoute = params.get('userId');
  
        console.log('Campus About Params:', {
          publicCampusIdFromRoute,
          campusIdFromRoute,
          userIdFromRoute
        });
  
        // 🔴 PUBLIC LANDING PAGE
        if (publicCampusIdFromRoute) {
          this.internalCampusId = publicCampusIdFromRoute;
          this.currentCampusId.set(publicCampusIdFromRoute);
          this.resolvedCampusId.set(null);
          this.loadAllData();
          return;
        }
  
        // 🟢 AUTHENTICATED PAGE
        if (campusIdFromRoute && userIdFromRoute) {
          this.routeCampusId.set(campusIdFromRoute);
          this.routeUserId.set(userIdFromRoute);
          this.currentCampusId.set(campusIdFromRoute);
          this.loadAllData();
          return;
        }
  
        // fallback
        this.loadAllData();
      });
  
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams: ParamMap) => {
        const standalone = queryParams.get('standalone');
        this.isStandalone.set(standalone === 'true');
      });
  
    this.facultyAddedHandler = () => {
      this.loadFaculties();
    };
  
    const storedDepartmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
if (storedDepartmentId && storedDepartmentId.trim()) {
  this.departmentId.set(storedDepartmentId.trim());
}

    if (this.isBrowser) {
      window.addEventListener('facultyAdded', this.facultyAddedHandler);
    }
  }

  private loadDepartments(): void {
  const campusId = this.getCampusId();
  if (!campusId) return;

  this.loadingDepartments.set(true);

  this.campusApi.getAllDepartmentsByCampus(campusId)
    .pipe(
      catchError(() => {
        this.loadingDepartments.set(false);
        return of(null);
      })
    )
    .subscribe({
      next: (response) => {
        this.loadingDepartments.set(false);

        const departments = response?.data ?? [];

        if (Array.isArray(departments)) {
          this.departments.set(
            departments.map((d) => {
              const dept = d as { id?: string; departmentId?: string; departmentName?: string; name?: string; photoUrl?: string; photourl?: string; imageUrl?: string };
              const photoUrl = dept.photoUrl ?? dept.photourl ?? dept.imageUrl;
              return {
                id: dept.id ?? dept.departmentId ?? '',
                name: dept.departmentName ?? dept.name ?? '',
                photoUrl: typeof photoUrl === 'string' && photoUrl.trim() ? photoUrl.trim() : undefined
              };
            })
          );
        } else {
          this.departments.set([]);
        }
      }
    });
}

  


  /**
   * Load all data for the campus about page
   * Called after route parameters are extracted
   */
  private loadAllData(): void {
    // Set initial alumni year to current year (same as dashboard)
   
    this.loadDepartments();
    this.loadAboutCampus();
    this.loadCampusWebsiteUrl(); // Load campus website URL for Read More button
    this.loadRisingStars(); // Load placed students data for Rising Stars section
    this.loadBatchesForSuccessStories(); // This will also load success stories after batches are loaded
    this.loadFaculties();
    this.loadTestimonials();
   const currentYear = new Date().getFullYear().toString();
this.selectedAlumniYear.set(currentYear);
this.loadAlumni();
    // this.loadResearch(); // Temporarily commented out - API returning 502 errors
    this.loadCourses();
    // this.loadAbout();
  // this.loadTestimonials(1);
  this.loadFollowersCount();
  this.loadPromotionsCount();

    // Analytics & Placement Insights - use campusId (AUTH: from route/storage; PUBLIC: from contact-info callback)
    const campusId = this.getCampusId();
    if (campusId && !this.getPublicCampusId()) {
      this.loadAnalytics(campusId);
      this.loadPlacementInsights(campusId);
    }
  }

private loadPromotionsCount(): void {
  const publicCampusId = this.getPublicCampusId();

 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW


  let source$: Observable<number> | null = null;

  // ---------------- PUBLIC LANDING ----------------
  if (publicCampusId) {
    source$ = this.campusApi.getGuestCampusPromotions(publicCampusId).pipe(
      map((res) => {
        if (typeof res === 'number') return res;

        if (typeof res === 'object' && res !== null) {
          if ('data' in res && typeof res.data === 'number') {
            return res.data;
          }

          if ('data' in res && typeof res.data === 'object' && res.data !== null) {
            const dataObj = res.data as { promotionCount?: number; count?: number };
            if (typeof dataObj.promotionCount === 'number') return dataObj.promotionCount;
            if (typeof dataObj.count === 'number') return dataObj.count;
          }

          if ('promotionCount' in res && typeof res.promotionCount === 'number') {
            return res.promotionCount;
          }

          if ('count' in res && typeof res.count === 'number') {
            return res.count;
          }
        }

        return 0;
      }),
      catchError(() => of(0))
    );
  }

  // ---------------- AUTH FLOW ----------------
  else {
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

    if (storedCampusId) {
      const cleanCampusId = storedCampusId.trim().replace(/^CAMPUS-/i, '');

      source$ = this.campusApi
        .getCampusPromotionsCount(
          cleanCampusId,
          departmentId ? departmentId : undefined
        )
        .pipe(
          map((count) => (typeof count === 'number' ? count : 0)),
          catchError(() => of(0))
        );
    }
  }

  // ---------------- FALLBACK ----------------
  if (!source$) {
    this.promotions = 0;
    return;
  }

  source$.subscribe({
    next: (count) => {
      this.promotions = typeof count === 'number' ? count : 0;
    },
    error: () => {
      this.promotions = 0;
    }
  });
}



private loadFollowersCount(): void {
  const publicCampusId = this.getPublicCampusId();

 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  let source$: Observable<unknown> | null = null;

  // ---------------- PUBLIC LANDING ----------------
  if (publicCampusId) {
    source$ = this.campusApi.getGuestCampusFollowers(publicCampusId);
  }

  // ---------------- AUTH FLOW ----------------
  else {
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

    if (storedCampusId) {
      const cleanCampusId = storedCampusId.trim().replace(/^CAMPUS-/i, '');

      source$ = this.campusApi.getCampusFollowersCount(
        cleanCampusId,
        departmentId ? departmentId : undefined
      );
    }
  }

  if (!source$) {
    this.followers = 0;
    return;
  }

  source$.subscribe({
    next: (res: unknown) => {
      const data = res as {
        count?: number;
        followerCount?: number;
        success?: boolean;
        data?: {
          followerCount?: number;
          count?: number;
        };
      };

      let count = 0;

      if (typeof data?.count === 'number') {
        count = data.count;
      } else if (typeof data?.followerCount === 'number') {
        count = data.followerCount;
      } else if (data?.success && data.data) {
        if (typeof data.data.followerCount === 'number') {
          count = data.data.followerCount;
        } else if (typeof data.data.count === 'number') {
          count = data.data.count;
        }
      }

      this.followers = count;
    },
    error: () => {
      this.followers = 0;
    }
  });
}





  // Store event handler reference for cleanup
  private facultyAddedHandler: (() => void) | null = null;

  ngOnDestroy(): void {
    // Remove event listener to prevent memory leaks
    if (this.isBrowser && this.facultyAddedHandler) {
      window.removeEventListener('facultyAdded', this.facultyAddedHandler);
      this.facultyAddedHandler = null;
    }
  }

  /**
   * Helper method to get campusId from multiple sources
   * Priority:
   * 1. Route parameter (for new tab scenario)
   * 2. Stored campusId from loaded campus data (most reliable)
   * 3. User profile profileServiceId (from auth state)
   * 4. Storage CAMPUS_ID key (fallback)
   */
  private getCampusId(): string | null {

    //  PUBLIC FLOW - prefer resolved campusId from contact-info (actual ID) for APIs that need it
    const publicCampusId = this.getPublicCampusId();
    if (publicCampusId) {
      const resolved = this.resolvedCampusId();
      if (resolved) {
        return resolved;
      }
      return publicCampusId;
    }
  
    //  ROUTE campusId
    const routeCampusId = this.routeCampusId();
    if (routeCampusId) {
      return routeCampusId;
    }
  
    // 🟢 STORED campusId
    const storedCampusId = this.currentCampusId();
    if (storedCampusId) {
      return storedCampusId;
    }
  
    // 🟢 USER PROFILE campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId || currentUser?.campusId;
    if (campusIdFromUser) {
      return campusIdFromUser;
    }
  
    //  STORAGE fallback
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    if (campusIdFromStorage) {
      return campusIdFromStorage;
    }
  
    console.warn('Campus ID not found anywhere');
    return null;
  }
  
loadAboutCampus(): void {
  const publicCampusId = this.getPublicCampusId();
  const campusId = this.getCampusId();
 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  console.log('loadAboutCampus - publicCampusId:', publicCampusId, 'campusId:', campusId);
  console.log('DepartmentId:', departmentId);

  let source$: Observable<unknown> | null = null;

  //  PUBLIC FLOW
  if (publicCampusId) {
    console.log('Using PUBLIC API for about campus/department:', publicCampusId);

    this.internalCampusId = publicCampusId;
    this.currentCampusId.set(publicCampusId);

    //  departmentId present ho to department about
    source$ = departmentId
      ? this.campusApi.getPublicCampusAbout(publicCampusId, departmentId)
      : this.campusApi.getPublicCampusAbout(publicCampusId);
  }

  //  AUTH FLOW
  else if (campusId) {
    console.log('Using AUTH API for about campus/department:', campusId);

    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

    if (!storedCampusId) {
      console.warn('No campusId in storage');
      this.aboutCampusText.set('');
      this.loadingAboutCampus.set(false);
      return;
    }

    const cleanCampusId = storedCampusId.replace(/^CAMPUS-/i, '').trim();

    this.internalCampusId = cleanCampusId;
    this.currentCampusId.set(cleanCampusId);

    //  departmentId present ho to department about
    source$ = departmentId
      ? this.campusApi.getAboutCampus(cleanCampusId, departmentId)
      : this.campusApi.getAboutCampus(cleanCampusId);
  }

  if (!source$) {
    console.warn('No campusId found');
    this.aboutCampusText.set('');
    this.loadingAboutCampus.set(false);
    return;
  }

  this.loadingAboutCampus.set(true);

  source$
    .pipe(
      catchError((error) => {
        console.error('Error loading about campus/department:', error);
        this.loadingAboutCampus.set(false);
        return of(null);
      })
    )
    .subscribe({
      next: (response: unknown) => {
        this.loadingAboutCampus.set(false);

        console.log('About campus/department raw response:', response);

        let aboutText = '';

        // CASE 1: plain string
        if (typeof response === 'string') {
          aboutText = response;
        }

        // CASE 2: { data: "text" }
        else if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          typeof (response as { data?: unknown }).data === 'string'
        ) {
          aboutText = (response as { data: string }).data;
        }

        // CASE 3: { content: "text" }
        else if (
          response &&
          typeof response === 'object' &&
          'content' in response &&
          typeof (response as { content?: unknown }).content === 'string'
        ) {
          aboutText = (response as { content: string }).content;
        }

        // CASE 4: { data: { content: "text" } }
        else if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          typeof (response as { data?: unknown }).data === 'object'
        ) {
          const dataObj = (response as { data?: { content?: string } }).data;
          if (dataObj?.content) {
            aboutText = dataObj.content;
          }
        }

        if (aboutText && aboutText.trim()) {
          console.log('About text found:', aboutText.substring(0, 80));
          this.aboutCampusText.set(aboutText);
        } else {
          console.warn('About campus/department empty');
          this.aboutCampusText.set('');
        }
      },
      error: (error) => {
        console.error('Subscription error:', error);
        this.loadingAboutCampus.set(false);
        this.aboutCampusText.set('');
      }
    });
}

  
  

  /**
   * Load campus website URL from API
   * Fetches campus data by campusId and extracts websiteUrl for Read More button
   * For public campus: uses contact info endpoint (accepts public campus ID)
   * For authenticated: uses getCampusById (uses actual campus ID)
   */
  loadCampusWebsiteUrl(): void {
    const publicCampusId = this.getPublicCampusId();
    const publicDepartmentId = this.getPublicDepartmentId();
    const campusId = this.getCampusId();

    if (publicCampusId) {
      // For public campus, use contact info endpoint which accepts public campus ID
      this.campusApi.getPublicCampusContactInfo(publicCampusId, publicDepartmentId ?? undefined)
        .pipe(
          catchError((error) => {
            console.error('CampusAboutComponent: Error loading public campus contact info:', error);
            return of(null);
          }),
        )
        .subscribe({
          next: (response: unknown) => {
            console.log('CampusAboutComponent: Contact info response:', response);
            
            if (!response || typeof response !== 'object') {
              console.warn('CampusAboutComponent: Invalid contact info response format');
              return;
            }

            const responseObj = response as Record<string, unknown>;
            
            // Handle both wrapped { success, data } and unwrapped data object
            let data: Record<string, unknown> = responseObj;
            if ('data' in responseObj && responseObj['data'] != null && typeof responseObj['data'] === 'object') {
              data = responseObj['data'] as Record<string, unknown>;
            }
            
            // Check all possible website URL fields in order of preference
            const websiteUrl = 
              (data['campusWebsiteUrl'] as string) ||
              (data['otherWebsiteUrl'] as string) ||
              (data['websiteUrl'] as string) ||
              (data['website'] as string) ||
              null;
            
            if (websiteUrl && typeof websiteUrl === 'string' && websiteUrl.trim()) {
              console.log('CampusAboutComponent: Found website URL:', websiteUrl);
              this.campusWebsiteUrl.set(websiteUrl.trim());
            } else {
              console.warn('CampusAboutComponent: No website URL found in contact info response');
            }

            // Store contact info for Get In Touch section (extract from data)
            const email = typeof data['email'] === 'string' ? data['email'].trim() : '';
            const phone = typeof data['phone'] === 'string' ? data['phone'].trim() : '';
            const address = typeof data['address'] === 'string' ? data['address'].trim() : '';
            this.contactInfo.set({
              email: email || undefined,
              phone: phone || undefined,
              address: address || undefined
            });

            // Store actual campusId for APIs that require it (feedback, recommendation, follow, departments)
            const campusId = typeof data['campusId'] === 'string' ? data['campusId'].trim() : '';
            if (campusId) {
              this.resolvedCampusId.set(campusId);
              this.loadDepartments();
              this.loadAnalytics(campusId);
              this.loadPlacementInsights(campusId);
            }

            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('CampusAboutComponent: Error in contact info subscription:', err);
          },
        });
    } else if (campusId) {
      // For authenticated flow, get from storage and clean it
      const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
      if (!storedCampusId) {
        console.warn('CampusAboutComponent: No stored campus ID available');
        return;
      }
      const cleanCampusId = storedCampusId.replace(/^CAMPUS-/i, '').trim();
      
      this.campusApi.getCampusById(cleanCampusId)
        .pipe(
          catchError((error) => {
            console.error('CampusAboutComponent: Error loading campus website URL:', error);
            return of(null);
          }),
        )
        .subscribe({
          next: (response: Campus | null) => {
            // Same as authenticated version - check campusWebsiteUrl first, then otherWebsiteUrl
            // Campus interface has campusWebsiteUrl and otherWebsiteUrl fields
            if (response?.campusWebsiteUrl) {
              this.campusWebsiteUrl.set(response.campusWebsiteUrl);
            } else if (response?.otherWebsiteUrl) {
              this.campusWebsiteUrl.set(response.otherWebsiteUrl);
            }
            // Store contact info for Get In Touch section (authenticated flow)
            this.contactInfo.set({
              email: response?.email?.trim() || undefined,
              phone: (response as { adminPhone?: string })?.adminPhone?.trim() || undefined,
              address: response?.campusAddress?.trim() || undefined
            });
            // Don't set to null if response is null (404 case) - keep existing value or leave empty
          },
          error: (err) => {
            console.error('CampusAboutComponent: Error in campus website URL subscription:', err);
            // Don't set to null on error - silently fail
          },
        });
    } else {
      console.warn('CampusAboutComponent: No campus ID available, cannot load campus website URL');
    }
  }

 loadRisingStars(): void {
  const publicCampusId = this.getPublicCampusId();
  const campusId = this.getCampusId();

 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  console.log('CampusAboutComponent: ========== LOADING RISING STARS (PLACED STUDENTS) ==========');
  console.log('publicCampusId:', publicCampusId, 'campusId:', campusId);
  console.log('departmentId:', departmentId);
  console.log('Current page:', this.risingStarsPage);
  console.log('Page size:', this.risingStarsPageSize);

  // ---------------- PUBLIC FLOW ----------------
  if (publicCampusId) {
    console.log('Using PUBLIC API for rising stars:', publicCampusId);

    this.useClientSidePagination = false;
    this.loadingRisingStars.set(true);

    this.campusApi.getPublicCampusRisingStars(publicCampusId).pipe(
      catchError((error) => {
        console.error('Error loading public rising stars:', error);
        this.loadingRisingStars.set(false);
        return of([]);
      })
    ).subscribe({
      next: (items: unknown[]) => {
        this.loadingRisingStars.set(false);

        if (Array.isArray(items) && items.length > 0) {
          const mappedStars = items.map((student: unknown) => {
            const s = student as Record<string, unknown>;
            return this.mapPlacedStudentToPersonCard({
              id: (s['id'] || s['studentId'] || s['userId'] || '') as string,
              userId: (s['userId'] || null) as string | null,
              campusId: (s['campusId'] || '') as string,
              courseId: (s['courseId'] || null) as string | null,
              courseName: (s['courseName'] || '') as string,
              studentName: (s['studentName'] || s['name'] || '') as string,
              photoUrl: (s['photoUrl'] || s['profilePhotoUrl'] || '') as string,
              batch: (s['batch'] || '') as string,
              designation: (s['designation'] || '') as string,
              placementCompanyName: (s['placementCompanyName'] || s['companyName'] || '') as string,
            });
          });

          const start = this.risingStarsPage * this.risingStarsPageSize;
          const end = start + this.risingStarsPageSize;

          this.risingStars.set(mappedStars.slice(start, end));
          this.risingStarsTotalPages.set(Math.max(1, Math.ceil(mappedStars.length / this.risingStarsPageSize)));
        } else {
          this.risingStars.set([]);
          this.risingStarsTotalPages.set(1);
        }
      }
    });

    return;
  }

  // ---------------- AUTH FLOW ----------------
  if (!campusId) {
    this.loadingRisingStars.set(false);
    this.risingStars.set([]);
    this.risingStarsTotalPages.set(1);
    return;
  }

  const selectedCourse = this.selectedCourseFilter();

  // client pagination
  if (selectedCourse && selectedCourse.trim() !== '') {
    this.useClientSidePagination = true;
    this.loadAllRisingStarsForFilter();
    return;
  }

  this.useClientSidePagination = false;
  this.loadingRisingStars.set(true);

  // 🔥 MAIN FIX — departmentId pass
  this.campusApi.getPlacedStudents(
    this.risingStarsPage,
    this.risingStarsPageSize,
    undefined,
    undefined,
    undefined,
    departmentId || undefined
  ).pipe(
    catchError((error) => {
      console.error('Error loading rising stars:', error);
      this.loadingRisingStars.set(false);
      return of(null);
    })
  ).subscribe({
    next: (response: ApiResponsePlacedStudentsResponse | null) => {

      this.loadingRisingStars.set(false);

      const items = unwrapApiResponse<PlacedStudentResponse[]>(response);

      if (Array.isArray(items)) {
        const mappedStars = items.map((student) =>
          this.mapPlacedStudentToPersonCard(student)
        );

        this.risingStars.set(mappedStars);

        const totalPages =
          response?.data && typeof response.data === 'object'
            ? (response.data.totalPages ?? 1)
            : 1;

        this.risingStarsTotalPages.set(Math.max(1, totalPages));
      } else {
        this.risingStars.set([]);
        this.risingStarsTotalPages.set(1);
      }
    },
    error: () => {
      this.loadingRisingStars.set(false);
      this.risingStars.set([]);
      this.risingStarsTotalPages.set(1);
    }
  });
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
    studentId?: string;
  }): PersonCard {
    // Construct image URL from photoUrl (API returns relative path)
    // photoUrl format: "student/0cf39251-9301-4650-bafe-b86597396368.jpg"
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    if (item.photoUrl) {
      const photoUrl = item.photoUrl.trim();
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        imageUrl = photoUrl;
      } else if (photoUrl.startsWith('/')) {
        imageUrl = `/api/v1/files${photoUrl}`;
      } else {
        imageUrl = `/api/v1/files/${photoUrl}`;
      }
    } else if (item.profilePhotoUrl) {
      if (item.profilePhotoUrl.startsWith('http://') || item.profilePhotoUrl.startsWith('https://') || item.profilePhotoUrl.startsWith('/')) {
        imageUrl = item.profilePhotoUrl;
      } else {
        imageUrl = `/api/v1/files/${item.profilePhotoUrl}`;
      }
    }
    
    const name = item.studentName || 
                 [item.firstName, item.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    
    const publicStudentId = (item as Record<string, unknown>)['publicStudentId'] as string | undefined;
    const id = item.id || publicStudentId || item.studentId || item.userId || '';
    return {
      id,
      publicStudentId: publicStudentId || item.id,
      name: name,
      imageUrl: imageUrl,
      batch: item.batch,
      company: item.placementCompanyName || item.companyName,
      designation: item.designation,
      courseName: item.courseName,
    };
  }

  /**
   * Load all rising stars data for client-side filtering and pagination
   */
  private loadAllRisingStarsForFilter(): void {
    this.loadingRisingStars.set(true);
    
    // Load a large batch to get all data (or load all pages)
    // Using a large limit to get all items at once
const departmentId =
  (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null;

this.campusApi.getPlacedStudents(
  0,
  1000,
  undefined,
  undefined,
  undefined,
  departmentId || undefined
)
    .pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading all rising stars:', error);
        this.loadingRisingStars.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: ApiResponsePlacedStudentsResponse | null) => {
        this.loadingRisingStars.set(false);
        
        const items = unwrapApiResponse<PlacedStudentResponse[]>(response);
        if (Array.isArray(items)) {
          const mappedStars = items.map((student) => this.mapPlacedStudentToPersonCard(student));
          
          // Store all items
          this.allRisingStars.set(mappedStars);
          
          // Apply course filter and pagination
          this.applyClientSidePagination();
        } else {
          this.allRisingStars.set([]);
          this.risingStars.set([]);
          this.risingStarsTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error loading all rising stars:', error);
        this.loadingRisingStars.set(false);
        this.allRisingStars.set([]);
        this.risingStars.set([]);
        this.risingStarsTotalPages.set(1);
      }
    });
  }

  /**
   * Apply client-side filtering and pagination
   */
  private applyClientSidePagination(): void {
    const allStars = this.allRisingStars();
    const selectedCourse = this.selectedCourseFilter();
    
    // Filter by selected course
    let filteredStars: readonly PersonCard[];
    if (!selectedCourse || selectedCourse.trim() === '') {
      filteredStars = allStars;
    } else {
      filteredStars = allStars.filter(star => 
        star.courseName && star.courseName.trim().toLowerCase() === selectedCourse.trim().toLowerCase()
      );
    }
    
    // Apply pagination - always show 8 items per page
    const start = this.risingStarsPage * this.risingStarsPageSize;
    const end = start + this.risingStarsPageSize;
    const pageItems = filteredStars.slice(start, end);
    
    // Update signals
    this.risingStars.set(pageItems);
    const totalPages = Math.max(1, Math.ceil(filteredStars.length / this.risingStarsPageSize));
    this.risingStarsTotalPages.set(totalPages);
  }

  risingStarsPageItems(): readonly PersonCard[] {
    // If using client-side pagination, items are already in risingStars
    // If using API pagination, items are already in risingStars
    return this.risingStars();
  }
  
  /**
   * Handle course filter change for Rising Stars
   */
  onRisingStarsCourseFilterChange(courseName: string): void {
    // If empty string or "All Courses", set to null
    const filterValue = courseName && courseName.trim() !== '' ? courseName.trim() : null;
    this.selectedCourseFilter.set(filterValue);
    
    // Reset to page 0 when filter changes and reload data
    this.risingStarsPage = 0;
    this.loadRisingStars();
  }

  onRisingStarsPageChange(page: number): void {
    // Carousel component uses 1-based indexing, convert to 0-based
    const apiPage = page - 1;
    if (apiPage !== this.risingStarsPage && apiPage >= 0) {
      this.risingStarsPage = apiPage;
      
      if (this.useClientSidePagination) {
        // Apply client-side pagination on already loaded data
        this.applyClientSidePagination();
      } else {
        // Load new page from API
      this.loadRisingStars();
      }
    }
  }

  // Success Stories - API Integration
  // Using GET /dashboard/students/batch (same API as Current Batch section)
  // This fetches all students from the current batch and displays them as success stories
  readonly successStories = signal<readonly PersonCard[]>([]);
  readonly loadingSuccessStories = signal(false);
  successStoryPage = 0; // API uses 0-based pagination (page=0 for first page)
  readonly successStoryPageSize = 6;
  readonly successStoriesTotalPages = signal(1);
  readonly selectedBatchForSuccessStories = signal<string | null>(null);
  readonly batches = signal<readonly string[]>([]);
  readonly loadingBatches = signal(false);

  /**
   * Load batches for success stories (uses current batch data)
   */
  loadBatchesForSuccessStories(): void {
    const publicCampusId = this.getPublicCampusId();
    const campusId = this.getCampusId();
    
    // For public profiles, skip batches (no public endpoint available)
    if (publicCampusId && !campusId) {
      this.loadingBatches.set(false);
      this.batches.set([]);
      // Skip loading success stories for public profiles
      return;
    }
    
    // Authenticated flow only
    if (!campusId) {
      this.loadingBatches.set(false);
      this.batches.set([]);
      return;
    }
    
    this.loadingBatches.set(true);
    
    // Load batches and automatically select the latest one for Success Stories
    this.campusApi.getBatchesForDropdown().pipe(
      catchError(() => {
        this.loadingBatches.set(false);
        return of([]);
      })
    ).subscribe({
      next: (batches) => {
        this.loadingBatches.set(false);
        
        if (Array.isArray(batches) && batches.length > 0) {
          const validBatches = batches
            .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
            .map(batch => batch.trim())
            .sort()
            .reverse(); // Sort descending to get latest batch first
          
          this.batches.set(validBatches);
          
          // Automatically select the latest batch for Success Stories
          if (validBatches.length > 0) {
            const latestBatch = validBatches[0];
            this.selectedBatchForSuccessStories.set(latestBatch);
            console.log('CampusAboutComponent: Auto-selected latest batch for Success Stories:', latestBatch);
          }
        } else {
          this.batches.set([]);
        }
        
        // Load success stories after batches are loaded
        this.loadSuccessStories();
      },
      error: () => {
        this.loadingBatches.set(false);
        this.batches.set([]);
        // Still try to load success stories without batch filter
        this.loadSuccessStories();
      }
    });
  }

  loadSuccessStories(): void {
    // Get the selected batch (automatically set to latest batch)
    const batch = this.selectedBatchForSuccessStories();
    
    if (!batch) {
      console.warn('CampusAboutComponent: No batch available, cannot load success stories');
      this.loadingSuccessStories.set(false);
      this.successStories.set([]);
      this.successStoriesTotalPages.set(1);
      return;
    }
    
    this.loadingSuccessStories.set(true);
    
    // Use the same API as Current Batch section: GET /dashboard/students/batch
    // This fetches all students from the current batch (same as campus dashboard Current Batch section)
    this.campusApi.getStudentsByBatch(batch, this.successStoryPage, this.successStoryPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading success stories (current batch):', error);
        console.error('CampusAboutComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          url: error?.url,
          error: error?.error
        });
        this.loadingSuccessStories.set(false);
        // Don't show error notification - suppress errors for new campuses
        return of(null);
      })
    ).subscribe({
      next: (response: StudentsByBatchResponse | null) => {
        this.loadingSuccessStories.set(false);
        
        const items = unwrapApiResponse<StudentByBatchData[]>(response);
        if (Array.isArray(items)) {
          console.log('CampusAboutComponent: Success stories loaded successfully, count:', items.length);
          // Map StudentByBatchData to PersonCard format (same as Current Batch section)
          const mappedStories = items.map((student) => this.mapStudentByBatchToPersonCard(student));
          this.successStories.set(mappedStories);
          
          const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? (response.data.totalPages ?? 1)
            : 1;
          this.successStoriesTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Success stories mapped, total:', mappedStories.length, 'pages:', totalPages);
        } else {
          console.log('CampusAboutComponent: No success stories found (empty array or unsuccessful response)');
          this.successStories.set([]);
          this.successStoriesTotalPages.set(1);
        }
      },
      error: () => {
        this.loadingSuccessStories.set(false);
        this.successStories.set([]);
        this.successStoriesTotalPages.set(1);
      }
    });
  }

  /**
   * Map StudentByBatchData to PersonCard format (same as Current Batch section)
   */
  private mapStudentByBatchToPersonCard(student: StudentByBatchData): PersonCard {
    const ext = student as Record<string, unknown>;
    const name = student.studentName ||
                 [student.firstName, student.lastName].filter(Boolean).join(' ') ||
                 'Unknown';

    // Build image URL from profilePhotoUrl or imageUrl
    let imageUrl = 'assets/images/login-news-image.png';
    const photoUrl = student.profilePhotoUrl || student.imageUrl;
    if (photoUrl) {
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        imageUrl = photoUrl;
      } else if (photoUrl.startsWith('/')) {
        imageUrl = `/api/v1/files/${photoUrl.substring(1)}`;
      } else {
        imageUrl = `/api/v1/files/${photoUrl}`;
      }
    }

    // Only use valid API identifiers - never fallback to name (invalid IDs cause 404)
    const publicStudentId = (ext['publicStudentId'] as string) || student.studentId || student.userId || student.id;
    const id = publicStudentId ? String(publicStudentId).trim() : undefined;

    return {
      id,
      publicStudentId: id,
      name,
      imageUrl,
      batch: student.batch,
    };
  }

  successStoriesPageItems(): readonly PersonCard[] {
    return this.successStories();
  }

  previousSuccessStory(): void {
    if (this.successStoryPage > 0) {
      this.successStoryPage--;
      this.loadSuccessStories(); // Will use the current selected batch
    }
  }

  nextSuccessStory(): void {
    if (this.successStoryPage < this.successStoriesTotalPages() - 1) {
      this.successStoryPage++;
      this.loadSuccessStories(); // Will use the current selected batch
    }
  }

  /**
   * Change batch filter for success stories
   */
  onSuccessStoriesBatchChange(batch: string): void {
    this.selectedBatchForSuccessStories.set(batch);
    this.successStoryPage = 0; // Reset to first page (0-based) when batch changes
    this.loadSuccessStories();
  }

  // Courses - API Integration
  // Using GET /campus/{campusId}/courses to fetch all added courses (same as Courses menu section)
  // This shows all courses that the campus has added, same as the "Courses" menu section
  readonly courses = signal<readonly CourseCard[]>([]);
  readonly loadingCourses = signal(false);
  coursePage = signal(1); // Changed to signal for carousel component
  readonly coursePageSize = 4;
  readonly coursesTotalPages = signal(1);
  
loadCourses(): void {
  const publicCampusId = this.getPublicCampusId();
  const campusId = this.getCampusId();

  //  NEW — department id from storage
 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  console.log('CampusAboutComponent: loadCourses() called - publicCampusId:', publicCampusId, 'campusId:', campusId);
  console.log('DepartmentId for courses:', departmentId);

  this.loadingCourses.set(true);

  if (!publicCampusId && !campusId) {
    console.warn('CampusAboutComponent: No campus ID found');
    this.loadingCourses.set(false);
    this.courses.set([]);
    return;
  }

  const source$ = publicCampusId
    ? this.campusApi.getPublicCampusCourses(publicCampusId, 1, 100).pipe(

        map((response: unknown) => {

          console.log('PUBLIC COURSES RAW RESPONSE:', response);

          const resObj = response as {
            data?: {
              content?: unknown[];
            } | unknown[];
          };

          const coursesArray =
            (resObj?.data as { content?: unknown[] })?.content ||
            resObj?.data ||
            response ||
            [];

          if (!Array.isArray(coursesArray)) {
            console.warn('Public courses not array:', coursesArray);
            return [];
          }

          return coursesArray.map((course: unknown) => {
            const c = course as {
              id?: string;
              courseId?: string;
              courseName?: string;
              name?: string;
              availableSeats?: number;
              totalSeats?: number;
              seats?: number;
              duration?: number;
              description?: string;
              fullName?: string;
            };

            return {
              id: c.id || c.courseId || '',
              courseName: c.courseName || c.name || '',
              availableSeats: c.availableSeats || c.seats || 0,
              totalSeats: c.totalSeats || c.seats || 0,
              duration: c.duration || 0,
              description: c.description || c.fullName || ''
            };
          });
        }),

        catchError((error: unknown) => {
          console.error('CampusAboutComponent: Public courses error:', error);
          return of([]);
        })
      )

    : campusId
      // 🔥 AUTH FLOW UPDATED — departmentId pass hoga
      ? this.campusApi.getAllCourses(undefined, departmentId || undefined)
      : null;

  if (!source$) {
    this.loadingCourses.set(false);
    this.courses.set([]);
    return;
  }

  (source$ as Observable<{
    id: string;
    courseName: string;
    availableSeats: number;
    totalSeats: number;
    duration: number;
    description: string;
  }[]>).pipe(
    catchError((error: unknown) => {
      console.error('CampusAboutComponent: Error loading courses:', error);
      this.loadingCourses.set(false);
      return of([]);
    })
  ).subscribe({
    next: (coursesData) => {
      console.log('Courses FINAL parsed:', coursesData);
      this.loadingCourses.set(false);

      if (coursesData && coursesData.length > 0) {

        const courseCards: CourseCard[] = coursesData
          .filter(course => course && course.courseName && course.id)
          .map(course => ({
            id: course.id,
            name: course.courseName,
            seats: course.availableSeats || course.totalSeats || 0,
            duration: course.duration
              ? `${course.duration} ${course.duration === 1 ? 'year' : 'years'}`
              : 'N/A',
            fullName: course.description || course.courseName,
          }));

        this.courses.set(courseCards);

        const totalPages = Math.max(1, Math.ceil(courseCards.length / this.coursePageSize));
        this.coursesTotalPages.set(totalPages);

        console.log('Courses loaded SUCCESS:', courseCards.length);
      } else {
        console.warn('No courses found');
        this.courses.set([]);
        this.coursesTotalPages.set(1);
      }
    },
    error: (error) => {
      console.error('Courses subscription error:', error);
      this.loadingCourses.set(false);
      this.courses.set([]);
      this.coursesTotalPages.set(1);
    }
  });
}

  
  

  coursesPageItems(): readonly CourseCard[] {
  let allCourses = this.courses();
  const selected = this.selectedCourseForCourses();

  if (selected) {
    allCourses = allCourses.filter(
      c => c.name.toLowerCase() === selected.toLowerCase()
    );
  }

  const startIndex = (this.coursePage() - 1) * this.coursePageSize;
  const endIndex = startIndex + this.coursePageSize;
  return allCourses.slice(startIndex, endIndex);
}

// Course filter for Courses We Provide section
readonly selectedCourseForCourses = signal<string | null>(null);

  /**
   * Handle page change from carousel component
   * Carousel emits 1-based page numbers
   */
  onCoursePageChange(page: number): void {
    // Carousel emits 1-based page numbers, convert to 0-based for API if needed
    const newPage = page;
    if (newPage !== this.coursePage()) {
      console.log('CampusAboutComponent: Changing course page from', this.coursePage(), 'to', newPage);
      this.coursePage.set(newPage);
    }
  }
  onCourseFilterChange(courseName: string): void {
  const value =
    courseName && courseName.trim() !== '' ? courseName.trim() : null;

  this.selectedCourseForCourses.set(value);

  // reset pagination when filter changes
  this.coursePage.set(1);
}


  // Placement Insights - API Integration
  readonly placementInsights = signal<YearlyTrend[]>([]);
  readonly sectorBreakdown = signal<SectorBreakdownItem[]>([]);
  readonly loadingPlacementInsights = signal(false);
  readonly placementPercentage = signal<number>(0);

  // Placement Years - Will be populated from API, fallback to hardcoded
  readonly placementYears = signal<string[]>(['2024', '2023', '2022', '2021', '2020']);

  /** Max value for Y-axis scale (round up to nearest 100 or 10) */
  readonly placementChartMax = computed(() => {
    const insights = this.placementInsights();
    let max = 0;
    for (const t of insights) {
      const pc = t.placedCount ?? 0;
      const ts = t.totalStudents ?? 0;
      max = Math.max(max, pc, ts);
    }
    if (max === 0) return 100;
    const step = max <= 10 ? 10 : max <= 100 ? 100 : 500;
    return Math.ceil((max + 1) / step) * step;
  });

  /** Y-axis tick values for placement chart (max to 0) */
  readonly placementChartYTicks = computed(() => {
    const max = this.placementChartMax();
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  });

  getPlacementYearData(year: string): { placedCount: number; totalStudents: number } {
    const insights = this.placementInsights();
    const t = insights.find(x => x.year === year);
    return {
      placedCount: t?.placedCount ?? 0,
      totalStudents: t?.totalStudents ?? 0
    };
  }

  /** Bar height as percentage of chart height (0-100) */
  getPlacementBarHeight(value: number): number {
    const max = this.placementChartMax();
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  getSectorColor(index: number): string {
    const colors = ['#7c3aed', '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#94a3b8'];
    return colors[index % colors.length];
  }

  /** Conic gradient for sector donut from sectorBreakdown */
  readonly sectorDonutGradient = computed(() => {
    const sectors = this.sectorBreakdown();
    if (!sectors.length) return 'conic-gradient(#e0e0e0 0deg 360deg)';
    const colors = ['#7c3aed', '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#94a3b8'];
    let deg = 0;
    const parts: string[] = [];
    for (let i = 0; i < sectors.length; i++) {
      const pct = sectors[i].percentage ?? 0;
      const next = deg + (pct / 100) * 360;
      parts.push(`${colors[i % colors.length]} ${deg}deg ${next}deg`);
      deg = next;
    }
    return `conic-gradient(${parts.join(', ')})`;
  });

  loadAnalytics(campusId: string): void {
    this.loadingAnalytics.set(true);
    this.campusApi.getAnalytics(campusId).pipe(
      catchError(() => {
        this.loadingAnalytics.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: AnalyticsDashboardResponse | null) => {
        this.loadingAnalytics.set(false);
        if (response?.success && response.data) {
          const d = response.data;
          if (d.totalStudents !== undefined) this.analyticsTotalStudents.set(d.totalStudents);
          if (d.totalFaculty !== undefined) this.analyticsTotalFaculty.set(d.totalFaculty);
          if (d.totalCourses !== undefined) this.analyticsTotalCourses.set(d.totalCourses);
        }
      }
    });
  }

  loadPlacementInsights(campusId: string): void {
    this.loadingPlacementInsights.set(true);
    this.campusApi.getPlacementInsights(campusId, 0, 9).pipe(
      catchError(() => {
        this.loadingPlacementInsights.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: PlacementInsightsResponse | null) => {
        this.loadingPlacementInsights.set(false);
        if (response?.success && response.data) {
          const d = response.data;
          if (d?.placementPercentage !== undefined) this.placementPercentage.set(d.placementPercentage);
          if (d?.yearlyTrends && d.yearlyTrends.length > 0) {
            this.placementInsights.set(d.yearlyTrends);
            const years = d.yearlyTrends
              .map(t => t.year)
              .filter((y): y is string => !!y)
              .sort((a, b) => b.localeCompare(a));
            if (years.length > 0) this.placementYears.set(years);
          }
          if (d?.sectorBreakdown && d.sectorBreakdown.length > 0) {
            this.sectorBreakdown.set(d.sectorBreakdown);
          } else {
            this.sectorBreakdown.set([]);
          }
        }
      }
    });
  }

  // Faculties - API Integration
  // Using getAllFaculties() from campus dashboard (same as campus home page)
  readonly allFaculties = signal<readonly PersonCard[]>([]);
  readonly faculties = signal<readonly PersonCard[]>([]);
  readonly loadingFaculties = signal(false);
  facultiesPage = 1;
  readonly facultiesPageSize = 6;
  readonly facultiesTotalPages = signal(1);

 loadFaculties(): void {

  const publicCampusId = this.getPublicCampusId();
  const campusId = this.getCampusId();
const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  console.log(
    'CampusAboutComponent: loadFaculties()',
    { publicCampusId, campusId, departmentId }
  );

  this.loadingFaculties.set(true);

  const source$ = publicCampusId
    ? this.campusApi
       .getPublicCampusFaculties(
  publicCampusId,
  this.facultiesPage,
  this.facultiesPageSize,
  departmentId || undefined
)

        .pipe(
          map((response: unknown) => {

            console.log('PUBLIC FACULTY RAW RESPONSE:', response);

            const facultiesArray =
              (response as { data?: { content?: unknown[] } })?.data?.content ||
              (response as { data?: unknown[] })?.data ||
              response ||
              [];

            if (!Array.isArray(facultiesArray)) {
              console.warn('Faculty response not array:', facultiesArray);
              return {
                success: true,
                message: null,
                error: null,
                data: []
              } as GetAllFacultiesResponse;
            }

            return {
              success: true,
              message: null,
              error: null,
              data: facultiesArray.map((faculty: Record<string, unknown>) => {

                const designation = faculty['designation'];
                const department = faculty['department'];

                return {
                  id: (faculty['id'] || faculty['facultyId'] || '') as string,
                  fullName: (faculty['name'] || faculty['fullName'] || '') as string,
                  email: (faculty['email'] || '') as string,

                  designation: Array.isArray(designation)
                    ? designation as string[]
                    : designation
                    ? [String(designation)]
                    : [],

                  photoUrl: (faculty['photoUrl'] || faculty['imageUrl'] || null) as string | null,

                  department: Array.isArray(department)
                    ? department as string[]
                    : department
                    ? [String(department)]
                    : []
                };
              })
            } as GetAllFacultiesResponse;
          })
        )

    : campusId
    ? this.campusApi.getAllFaculties(
        campusId,
departmentId || undefined      )
    : null;

  if (!source$) {
    this.loadingFaculties.set(false);
    this.allFaculties.set([]);
    this.faculties.set([]);
    return;
  }

  source$
    .pipe(
      catchError((error: unknown) => {
        const err = error as {
          status?: number;
          message?: string;
          url?: string;
          error?: unknown;
        };

        console.error('CampusAboutComponent: Error loading faculties:', error);
        console.error('CampusAboutComponent: Error details:', {
          status: err?.status,
          message: err?.message,
          url: err?.url,
          error: err?.error
        });

        this.loadingFaculties.set(false);
        return of(null);
      })
    )
    .subscribe({
      next: (response: GetAllFacultiesResponse | null) => {

        this.loadingFaculties.set(false);

        const items = unwrapApiResponse<FacultyListItem[]>(response);

        if (Array.isArray(items)) {

          console.log('Faculties loaded successfully, count:', items.length);

          const mappedFaculties = items.map((faculty: FacultyListItem) =>
            this.mapFacultyListItemToPersonCard(faculty)
          );

          this.allFaculties.set(mappedFaculties);

          const totalPages = Math.max(
            1,
            Math.ceil(mappedFaculties.length / this.facultiesPageSize)
          );

          this.facultiesTotalPages.set(totalPages);
          this.updateFacultiesPageItems();

          console.log('Faculties mapped and paginated:', mappedFaculties.length);

        } else {

          console.log('No faculties found');

          this.allFaculties.set([]);
          this.faculties.set([]);
          this.facultiesTotalPages.set(1);
        }
      },

      error: () => {
        this.loadingFaculties.set(false);
        this.allFaculties.set([]);
        this.faculties.set([]);
        this.facultiesTotalPages.set(1);
      }
    });
}

  

  private mapFacultyListItemToPersonCard(faculty: FacultyListItem): PersonCard {
    // Convert designation array to string (join with comma or take first element)
    const designationStr = faculty.designation && faculty.designation.length > 0
      ? faculty.designation.join(', ')
      : undefined;
    
    // Build image URL from photoUrl (API returns relative path or full URL)
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    if (faculty.photoUrl) {
      // If photoUrl is already a full URL (starts with http:// or https://), use it as is
      if (faculty.photoUrl.startsWith('http://') || faculty.photoUrl.startsWith('https://')) {
        imageUrl = faculty.photoUrl;
      } else if (faculty.photoUrl.startsWith('/')) {
        // If it starts with /, it's an absolute path - construct full URL
        imageUrl = `/api/v1/files${faculty.photoUrl}`;
      } else {
        // Relative path like "faculty/filename.jpg" - construct full URL
        imageUrl = `/api/v1/files/${faculty.photoUrl}`;
      }
    }
    
    return {
      id: faculty.id || '',
      name: faculty.fullName || 'Name',
      imageUrl: imageUrl,
      designation: designationStr,
    };
  }

  private updateFacultiesPageItems(): void {
    const all = this.allFaculties();
    const startIndex = (this.facultiesPage - 1) * this.facultiesPageSize;
    const endIndex = startIndex + this.facultiesPageSize;
    const pageItems = all.slice(startIndex, endIndex);
    this.faculties.set(pageItems);
  }

  facultiesPageItems(): readonly PersonCard[] {
    return this.faculties();
  }

  onFacultiesPageChange(page: number): void {
    if (page !== this.facultiesPage && page >= 1) {
      this.facultiesPage = page;
      this.updateFacultiesPageItems();
    }
  }

  // Alumni - API Integration (Using same API as campus dashboard)
  readonly allAlumni = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingAlumni = signal(false);
  selectedAlumniYear = signal<string | null>(null);
  alumniPage = 1;
  // Landing page: 6 items per page, Dashboard: 3 items per page
  get alumniPageSize(): number {
    return this.isPublicProfile ? 6 : 3;
  }
  readonly alumniTotalPages = signal(1);
  


loadAlumni(): void {

  const publicCampusId = this.getPublicCampusId();

  // ---------------- PUBLIC FLOW ----------------
  if (publicCampusId) {

    this.loadingAlumni.set(true);

    this.campusApi
      .getPublicCampusAlumni(
        publicCampusId,
        1,
        100,
        // publicDepartmentId || undefined   
      )
      .pipe(
        catchError(() => {
          this.loadingAlumni.set(false);
          this.allAlumni.set([]);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
          return of([]);
        })
      )
      .subscribe({
        next: (alumniData: unknown[]) => {

          this.loadingAlumni.set(false);

          if (Array.isArray(alumniData) && alumniData.length > 0) {

            const mappedAlumni = alumniData.map((alumnus: unknown) =>
              this.mapAlumniToPersonCard(alumnus as AlumniDashboardData)
            );

            this.allAlumni.set(mappedAlumni);

            const totalPages = Math.max(
              1,
              Math.ceil(mappedAlumni.length / this.alumniPageSize)
            );

            this.alumniTotalPages.set(totalPages);
            this.alumniPage = 1;
            this.updateAlumniPageItems();

          } else {
            this.allAlumni.set([]);
            this.alumni.set([]);
            this.alumniTotalPages.set(1);
          }
        },
        error: () => {
          this.loadingAlumni.set(false);
          this.allAlumni.set([]);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      });

    return;
  }

  // ---------------- AUTH FLOW ----------------

  const storedCampusId =
    this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

  if (!storedCampusId) {
    this.allAlumni.set([]);
    this.alumni.set([]);
    this.alumniTotalPages.set(1);
    return;
  }

const year = this.selectedAlumniYear() ?? '';

  const departmentId =
    (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)
      ?.trim() || null;

  this.loadingAlumni.set(true);

  this.campusApi.getStudentsByBatch(
    year,
    0,
    12,
    undefined,
    undefined,
    departmentId || undefined
  )
  .pipe(
    catchError(() => {
      this.loadingAlumni.set(false);
      this.allAlumni.set([]);
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
      return of(null);
    })
  )
  .subscribe({
    next: (response: StudentsByBatchResponse | null) => {

      this.loadingAlumni.set(false);

      const items =
        unwrapApiResponse<StudentByBatchData[]>(response);

      if (Array.isArray(items)) {

        const mappedAlumni = items.map((student) =>
          this.mapStudentByBatchToPersonCard(student)
        );

        this.allAlumni.set(mappedAlumni);

        const totalPages =
          response?.data && typeof response.data === 'object'
            ? (response.data.totalPages ?? 1)
            : 1;

        this.alumniTotalPages.set(Math.max(1, totalPages));
        this.alumniPage = 1;
        this.updateAlumniPageItems();

      } else {
        this.allAlumni.set([]);
        this.alumni.set([]);
        this.alumniTotalPages.set(1);
      }
    },
    error: () => {
      this.loadingAlumni.set(false);
      this.allAlumni.set([]);
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
    }
  });
}

// 🔥 NEW FUNCTION — load all alumni without batch filter
loadAllAlumni(): void {

  const publicCampusId = this.getPublicCampusId();

  // ---------------- PUBLIC FLOW ----------------
  if (publicCampusId) {

    this.loadingAlumni.set(true);

    this.campusApi
      .getPublicCampusAlumni(
        publicCampusId,
        1,
        1000 // large limit so all alumni come
      )
      .pipe(
        catchError(() => {
          this.loadingAlumni.set(false);
          this.allAlumni.set([]);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
          return of([]);
        })
      )
      .subscribe({
        next: (alumniData: unknown[]) => {

          this.loadingAlumni.set(false);

          if (Array.isArray(alumniData) && alumniData.length > 0) {

            const mappedAlumni = alumniData.map((alumnus: unknown) =>
              this.mapAlumniToPersonCard(alumnus as AlumniDashboardData)
            );

            this.allAlumni.set(mappedAlumni);

            const totalPages = Math.max(
              1,
              Math.ceil(mappedAlumni.length / this.alumniPageSize)
            );

            this.alumniTotalPages.set(totalPages);
            this.alumniPage = 1;
            this.updateAlumniPageItems();

          } else {
            this.allAlumni.set([]);
            this.alumni.set([]);
            this.alumniTotalPages.set(1);
          }
        },
        error: () => {
          this.loadingAlumni.set(false);
          this.allAlumni.set([]);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      });

    return;
  }

  // ---------------- AUTH FLOW ----------------

  const storedCampusId =
    this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

  if (!storedCampusId) {
    this.allAlumni.set([]);
    this.alumni.set([]);
    this.alumniTotalPages.set(1);
    return;
  }

  const departmentId =
    (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)
      ?.trim() || null;

  this.loadingAlumni.set(true);

  //  IMPORTANT — batch removed
  this.campusApi.getStudentsByBatch(
    '', // empty = all years
    0,
    1000,
    undefined,
    undefined,
    departmentId || undefined
  )
  .pipe(
    catchError(() => {
      this.loadingAlumni.set(false);
      this.allAlumni.set([]);
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
      return of(null);
    })
  )
  .subscribe({
    next: (response: StudentsByBatchResponse | null) => {

      this.loadingAlumni.set(false);

      const items =
        unwrapApiResponse<StudentByBatchData[]>(response);

      if (Array.isArray(items)) {

        const mappedAlumni = items.map((student) =>
          this.mapStudentByBatchToPersonCard(student)
        );

        this.allAlumni.set(mappedAlumni);

        const totalPages =
          response?.data && typeof response.data === 'object'
            ? (response.data.totalPages ?? 1)
            : 1;

        this.alumniTotalPages.set(Math.max(1, totalPages));
        this.alumniPage = 1;
        this.updateAlumniPageItems();

      } else {
        this.allAlumni.set([]);
        this.alumni.set([]);
        this.alumniTotalPages.set(1);
      }
    },
    error: () => {
      this.loadingAlumni.set(false);
      this.allAlumni.set([]);
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
    }
  });
}

  private mapAlumniToPersonCard(alumnus: AlumniDashboardData): PersonCard {
    const extra = alumnus as unknown as Record<string, unknown>;
    const extraName = typeof extra['name'] === 'string' ? extra['name'] : '';
    const extraImageUrl = typeof extra['imageUrl'] === 'string' ? extra['imageUrl'] : '';
    const extraCompany = typeof extra['company'] === 'string' ? extra['company'] : '';
    const extraGraduationYear =
      typeof extra['graduationYear'] === 'string' ? extra['graduationYear'] : '';

    const name =
      alumnus.studentName ||
      extraName ||
      [alumnus.firstName, alumnus.lastName].filter(Boolean).join(' ') ||
      'Unknown';
    
    const publicStudentId = (extra['publicStudentId'] as string) || alumnus.studentId || alumnus.userId;
    const id = publicStudentId || '';
    return {
      id,
      publicStudentId: publicStudentId || undefined,
      name: name,
      imageUrl: resolveImageUrl(
        (alumnus.profilePhotoUrl || extraImageUrl) || undefined,
        name
      ),
      designation: alumnus.designation,
      company: alumnus.companyName || extraCompany,
      batch: alumnus.batch || alumnus.yearOfPassing || extraGraduationYear,
    };
  }

  private updateAlumniPageItems(): void {
    const all = this.allAlumni();
    const startIndex = (this.alumniPage - 1) * this.alumniPageSize;
    const endIndex = startIndex + this.alumniPageSize;
    const pageItems = all.slice(startIndex, endIndex);
    this.alumni.set(pageItems);
  }

  alumniPageItems(): readonly PersonCard[] {
    return this.alumni();
  }

  previousAlumni(): void {
    if (this.alumniPage > 1) {
      this.alumniPage--;
      this.updateAlumniPageItems();
    }
  }

  nextAlumni(): void {
    if (this.alumniPage < this.alumniTotalPages()) {
      this.alumniPage++;
      this.updateAlumniPageItems();
    }
  }
onAlumniPageChange(page: number): void {
  this.alumniPage = page;
  this.updateAlumniPageItems();
}

onAlumniYearChange(year: string): void {
  this.alumniYearTouched.set(true);

  if (!year) {
    this.alumniYearError.set(true);
    return;
  }

  this.alumniYearError.set(false);
  this.selectedAlumniYear.set(year);
  this.alumniPage = 1;
  this.loadAlumni();
}

  avatarSrc(card: PersonCard): string {
    return resolveImageUrl(card.imageUrl, card.name);
  }

  onAvatarError(card: PersonCard, event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = createInitialsAvatar(card.name);
    img.alt = `${card.name} (initials)`;
  }

  // Testimonials - API Integration
  readonly testimonials = signal<readonly TestimonialData[]>([]);
  readonly loadingTestimonials = signal(false);
  readonly testimonialsTotalPages = signal(1);
  testimonialPage = 1;
  readonly testimonialPageSize = 10; // Backend default is 10 per page

loadTestimonials(): void {
  const publicCampusId = this.getPublicCampusId();
  const campusId = this.getCampusId();

  // departmentId always from storage (single source of truth)
 const publicDepartmentId = this.getPublicDepartmentId();

const departmentId = publicDepartmentId
  ? publicDepartmentId   // PUBLIC FLOW
  : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || null; // LOGIN FLOW

  if (!publicCampusId && !campusId) {
    console.warn('CampusAboutComponent: No campusId found, cannot load testimonials');
    this.testimonials.set([]);
    this.testimonialsTotalPages.set(1);
    return;
  }

  this.loadingTestimonials.set(true);

  const apiPage = this.testimonialPage - 1;

  let source$: Observable<TestimonialsResponse | null> | null = null;

  // ---------------- PUBLIC FLOW ----------------
  if (publicCampusId) {
    source$ = this.campusApi
      .getPublicCampusTestimonials(
        publicCampusId,
        apiPage,
        this.testimonialPageSize,
        departmentId || undefined
      )
      .pipe(
        map((response) => {
          if (!response) return null;

          return {
            success: true,
            message: null,
            error: null,
            data: {
              content: response.content as TestimonialData[],
              totalPages: response.totalPages,
              totalElements: response.content?.length || 0,
              page: apiPage,
              size: this.testimonialPageSize
            }
          } as TestimonialsResponse;
        })
      );
  }

  // ---------------- AUTH FLOW ----------------
  else if (campusId) {
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

    if (!storedCampusId) {
      this.loadingTestimonials.set(false);
      this.testimonials.set([]);
      this.testimonialsTotalPages.set(1);
      return;
    }

    const cleanCampusId = storedCampusId.trim().replace(/^CAMPUS-/i, '');

    source$ = this.campusApi.getTestimonials(
      cleanCampusId,
      apiPage,
      this.testimonialPageSize,
      departmentId || undefined
    );
  }

  if (!source$) {
    this.loadingTestimonials.set(false);
    this.testimonials.set([]);
    this.testimonialsTotalPages.set(1);
    return;
  }

  console.log('Loading testimonials → departmentId:', departmentId);

  source$
    .pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading testimonials:', error);
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
        return of(null);
      })
    )
    .subscribe({
      next: (response) => {
        this.loadingTestimonials.set(false);

        if (response?.success && response?.data?.content) {
          const testimonialsData = response.data.content;

          this.testimonials.set(testimonialsData);
          this.currentTestimonialIndex.set(0);

          const totalPages =
            response.data.totalPages ??
            Math.ceil((response.data.totalElements || 0) / this.testimonialPageSize) ??
            1;

          this.testimonialsTotalPages.set(Math.max(1, totalPages));

          console.log('Testimonials loaded:', testimonialsData.length);
        } else {
          this.testimonials.set([]);
          this.testimonialsTotalPages.set(1);
        }
      },
      error: () => {
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
      }
    });
}


  // Current testimonial index for carousel navigation
  readonly currentTestimonialIndex = signal(0);

  previousTestimonial(): void {
    const allTestimonials = this.testimonials();
    if (allTestimonials.length === 0) {
      return;
    }
    
    const currentIndex = this.currentTestimonialIndex();
    if (currentIndex > 0) {
      // Go to previous testimonial
      this.currentTestimonialIndex.set(currentIndex - 1);
    } else {
      // If on first testimonial, check if we can load previous page
      if (this.testimonialPage > 1) {
        this.testimonialPage--;
        this.loadTestimonials();
        // After loading, set index to last item of new page
        // We'll set it after testimonials are loaded
      }
    }
  }

  nextTestimonial(): void {
    const allTestimonials = this.testimonials();
    if (allTestimonials.length === 0) {
      return;
    }
    
    const currentIndex = this.currentTestimonialIndex();
    const maxIndex = allTestimonials.length - 1;
    
    if (currentIndex < maxIndex) {
      // Go to next testimonial in current page
      this.currentTestimonialIndex.set(currentIndex + 1);
    } else {
      // If on last testimonial of current page, check if we can load next page
      if (this.testimonialPage < this.testimonialsTotalPages()) {
        this.testimonialPage++;
        this.currentTestimonialIndex.set(0); // Reset to first item of new page
        this.loadTestimonials();
      }
    }
  }

  get currentTestimonial(): TestimonialData | null {
    const allTestimonials = this.testimonials();
    if (allTestimonials.length === 0) {
      return null;
    }
    
    const currentIndex = this.currentTestimonialIndex();
    // Ensure index is within bounds
    const safeIndex = Math.max(0, Math.min(currentIndex, allTestimonials.length - 1));
    return allTestimonials[safeIndex] || null;
  }

  // Research - API Integration
  readonly researchData = signal<ResearchData | null>(null);
  readonly loadingResearch = signal(false);

  // Temporarily commented out - API returning 502 errors
  // loadResearch(): void {
  //   // Get campusId explicitly to ensure we're loading research for the correct campus
  //   const campusId = this.getCampusId();

  //   if (!campusId) {
  //     console.warn('CampusAboutComponent: No campusId found, cannot load research');
  //     this.loadingResearch.set(false);
  //     this.researchData.set(null);
  //     return;
  //   }

  //   this.loadingResearch.set(true);

  //   // Use GET /public/landing/campus/{campusId}/research
  //   this.campusApi.getResearch(campusId).pipe(
  //     catchError(() => {
  //       this.loadingResearch.set(false);
  //       this.researchData.set(null);
  //       return of(null);
  //     })
  //   ).subscribe({
  //     next: (response: ResearchResponse | null) => {
  //       this.loadingResearch.set(false);

  //       if (response?.data) {
  //         this.researchData.set(response.data);
  //       } else {
  //         this.researchData.set(null);
  //       }
  //     },
  //     error: () => {
  //       this.loadingResearch.set(false);
  //       this.researchData.set(null);
  //     }
  //   });
  // }

  private slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  openVisitCampusModal(): void {
    console.log('Opening Visit Campus modal...');
    this.modalService.openModal('visit-campus');
    console.log('Modal service activeModal:', this.modalService.activeModal());
  }

  openPlacedStudentsModal(): void {
    console.log('Opening Placed Students modal...');
    this.modalService.openModal('placed-students');
  }

  openStudentProfile(card: PersonCard): void {
    const id = card.publicStudentId || card.id;
    if (!id || !id.trim()) return;
    const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', id]));
    window.open(url, '_blank');
  }

  openCampusWebsite(): void {
    // Same structure as company: onReadMore()
    const websiteUrl = this.campusWebsiteUrl();
    if (!websiteUrl) {
      // Don't show error - silently return (button won't work but no error message)
      return;
    }

    let url = websiteUrl.trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } 
    catch  {
      // Don't show error - silently return
      return;
    }
  }



// ------------ on follow --------

onFollowCampus() {
  // Use resolved campusId from contact-info when on public profile (API expects actual campus ID)
  const resolvedCampusId = this.resolvedCampusId();
  const publicCampusId = this.getPublicCampusId();
  const campusId = resolvedCampusId || publicCampusId || this.internalCampusId;

  if (!campusId) {
    this.notify.error('Campus not found');
    return;
  }

  if (publicCampusId && !resolvedCampusId) {
    this.notify.error('Please wait for the page to load');
    return;
  }

  const user = this.authState.user();

  if (!user?.userType) {
    this.notify.error('Please login to follow campus');
    return;
  }

  if (user.userType === 'CAMPUS' || user.userType === 'DEPARTMENT') {
    this.notify.error('Campus cannot follow itself');
    return;
  }

  let actorType: 'STUDENT' | 'COMPANY';
  let actorId: string;

  if (user.userType === 'STUDENT') {
    actorType = 'STUDENT';
    actorId =
      (user.studentId != null && String(user.studentId).trim()) ||
      (this.storage.get(STORAGE_KEYS.STUDENT_ID) as string) ||
      (user.profileServiceId?.trim()) ||
      (user.userId != null ? String(user.userId) : '');
    if (!actorId) {
      this.notify.error('Student ID not found');
      return;
    }
  } else if (user.userType === 'COMPANY') {
    actorType = 'COMPANY';
    actorId = (this.storage.get(STORAGE_KEYS.COMPANY_ID) as string) || user.profileServiceId || '';
    if (!actorId) {
      this.notify.error('Company ID not found');
      return;
    }
  } else {
    this.notify.error('User type not supported for follow');
    return;
  }

  // Prefer resolved campusId (from contact-info); for internal ID, remove CAMPUS- prefix
  const targetId = resolvedCampusId || (publicCampusId ?? campusId.replace(/^CAMPUS-/i, ''));

  const publicDepartmentId = this.getPublicDepartmentId();
  const departmentId = publicDepartmentId
    ? publicDepartmentId
    : (this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null)?.trim() || undefined;

  const followParams: {
    actorType: 'STUDENT' | 'COMPANY';
    actorId: string;
    targetType: 'CAMPUS';
    targetId: string;
    departmentId?: string;
  } = {
    actorType,
    actorId,
    targetType: 'CAMPUS',
    targetId,
  };
  if (departmentId) {
    followParams.departmentId = departmentId;
  }

  this.commonApi.follow(followParams).subscribe({
    next: () => {
      this.isFollowing = true;
      this.notify.success('Campus followed successfully');
    },
    error: (err) => {
      if (err?.status === 409) {
        this.isFollowing = true;
        this.notify.info('You are already following this campus');
      } else {
        this.notify.error(err?.error?.message || 'Follow failed');
      }
    },
  });
}





  closeModal(): void {
    // Reset edit mode when closing modal
    this.editingFacultyId = null;
    this.facultyFormValue = null;
    this.modalService.closeModal();
  }

  handlePlacedStudentsSubmit(value: PlacedStudentsFormValue): void {
    console.log('CampusAboutComponent: Placed Students form submitted:', value);
    this.submittingPlacedStudents = true;

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('studentName', value.studentName.trim());
    formData.append('courseName', value.course.trim());
    formData.append('batch', value.batch.trim());
    formData.append('placementCompanyName', value.placementCompany.trim());
    formData.append('designation', value.designation.trim());
    formData.append('sector', value.sector.trim());

    // Append photo file if provided
    if (value.studentPhoto) {
      formData.append('photo', value.studentPhoto);
    }

    const campusId = this.getCampusId();
    if (!campusId) {
      this.notify.error('Campus ID not found. Please ensure you are logged in as a campus admin.');
      this.submittingPlacedStudents = false;
      return;
    }

    this.campusApi.addPlacedStudent(formData).subscribe({
      next: (response) => {
        this.submittingPlacedStudents = false;
        if (response?.success) {
          this.notify.success(response?.message || 'Placed student added successfully');
          // Reset form after successful submit
          if (this.placedStudentsComponent) {
            this.placedStudentsComponent.resetForm();
          }
          this.closeModal();
          // Reset to page 0 and reload rising stars (placed students)
          this.risingStarsPage = 0;
          this.loadRisingStars();
        } else {
          this.notify.warn(response?.message || 'Placed student might not have been added');
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error adding placed student:', error);
        this.submittingPlacedStudents = false;
        this.notify.error('Failed to add placed student. Please try again.');
      }
    });
  }

  openAddFacultyModal(): void {
    // Reset edit state when opening add modal
    this.editingFacultyId = null;
    this.facultyFormValue = null;
    this.modalService.openModal('faculty');
  }

  handleVisitCampusSubmit(value: VisitCampusFormValue): void {
    console.log('CampusAboutComponent: ========== VISIT CAMPUS FORM SUBMITTED ==========');
    console.log('CampusAboutComponent: Form value:', value);
    
    // Validate form fields
    if (!value.companyName || !value.companyName.trim()) {
      console.warn('CampusAboutComponent: Validation failed - companyName is empty');
      this.notify.error('Please enter company name');
      return;
    }

    if (!value.contactPersonName || !value.contactPersonName.trim()) {
      console.warn('CampusAboutComponent: Validation failed - contactPersonName is empty');
      this.notify.error('Please enter contact person name');
      return;
    }

    if (!value.contactPersonEmail || !value.contactPersonEmail.trim()) {
      console.warn('CampusAboutComponent: Validation failed - contactPersonEmail is empty');
      this.notify.error('Please enter contact person email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.contactPersonEmail.trim())) {
      console.warn('CampusAboutComponent: Validation failed - invalid email format');
      this.notify.error('Please enter a valid email address');
      return;
    }

    if (!value.contactPersonPhoneNo || !value.contactPersonPhoneNo.trim()) {
      console.warn('CampusAboutComponent: Validation failed - contactPersonPhoneNo is empty');
      this.notify.error('Please enter contact person phone number');
      return;
    }

    if (!value.recruitmentType.internship && !value.recruitmentType.fullTime && !value.recruitmentType.both) {
      console.warn('CampusAboutComponent: Validation failed - no recruitment type selected');
      this.notify.error('Please select at least one recruitment type');
      return;
    }

    if (!value.numberOfPositions || !value.numberOfPositions.trim()) {
      console.warn('CampusAboutComponent: Validation failed - numberOfPositions is empty');
      this.notify.error('Please enter number of positions');
      return;
    }

    const numberOfPositionsNum = parseInt(value.numberOfPositions.trim(), 10);
    if (isNaN(numberOfPositionsNum) || numberOfPositionsNum <= 0) {
      console.warn('CampusAboutComponent: Validation failed - invalid numberOfPositions:', value.numberOfPositions);
      this.notify.error('Please enter a valid number of positions');
      return;
    }

    if (!value.dateOfVisit || !value.dateOfVisit.trim()) {
      console.warn('CampusAboutComponent: Validation failed - dateOfVisit is empty');
      this.notify.error('Please select visit date');
      return;
    }

    if (!value.timeOfVisit || !value.timeOfVisit.trim()) {
      console.warn('CampusAboutComponent: Validation failed - timeOfVisit is empty');
      this.notify.error('Please select visit time');
      return;
    }

    // Check if already submitting
    if (this.submittingVisitCampus) {
      console.warn('CampusAboutComponent: Already submitting, ignoring duplicate request');
      return;
    }

    // Get campusId from storage (same as courses/faculties/feedback/testimonials APIs use - set during login)
    // This ensures we use the correct MongoDB ObjectId format, not UUID from route
    const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    console.log('CampusAboutComponent: CampusId from storage:', campusId);

    if (!campusId || !campusId.trim()) {
      console.error('CampusAboutComponent: ❌ Campus ID not found in storage. Please ensure you are logged in as a campus admin.');
      this.notify.error('Campus ID not found. Please ensure you are logged in as a campus admin and try again. If the issue persists, please refresh the page or login again.');
      return;
    }
    
    // Ensure campus ID doesn't have any unwanted prefixes (like "CAMPUS-")
    const cleanCampusId = campusId.replace(/^CAMPUS-/i, '').trim();
    
    console.log('CampusAboutComponent: ✅ Using campusId for visit request:', cleanCampusId);
    console.log('CampusAboutComponent: Original campusId from storage:', campusId);

    this.submittingVisitCampus = true;
    console.log('CampusAboutComponent: Starting visit campus request submission...');

    // Map recruitment type from checkboxes to API format
    let recruitmentType: 'INTERNSHIP' | 'FULL_TIME' | 'BOTH';
    if (value.recruitmentType.both) {
      recruitmentType = 'BOTH';
    } else if (value.recruitmentType.internship && value.recruitmentType.fullTime) {
      recruitmentType = 'BOTH';
    } else if (value.recruitmentType.internship) {
      recruitmentType = 'INTERNSHIP';
    } else if (value.recruitmentType.fullTime) {
      recruitmentType = 'FULL_TIME';
    } else {
      // Fallback (should not reach here due to validation above)
      recruitmentType = 'BOTH';
    }

    // Parse time from "HH:MM" format (24-hour) to "HH:mm:ss" string format
    // Backend expects visitTime as "HH:mm:ss" string, not VisitTime object
    const timeParts = value.timeOfVisit.trim().split(':');
    const hour = parseInt(timeParts[0] || '0', 10);
    const minute = parseInt(timeParts[1] || '0', 10);
    
    // Ensure hour is valid (0-23) and minute is valid (0-59)
    const validHour = Math.max(0, Math.min(23, isNaN(hour) ? 0 : hour));
    const validMinute = Math.max(0, Math.min(59, isNaN(minute) ? 0 : minute));
    
    // Format as HH:mm:ss (backend expects this format)
    const visitTimeString = `${String(validHour).padStart(2, '0')}:${String(validMinute).padStart(2, '0')}:00`;
    
    console.log('CampusAboutComponent: Parsed visitTime string:', visitTimeString);
    console.log('CampusAboutComponent: Original time string:', value.timeOfVisit);

    // Format date to YYYY-MM-DD if needed (input type="date" already provides this format)
    let visitDate = value.dateOfVisit.trim();
    // If date is in MM/DD/YYYY format, convert it
    if (visitDate.includes('/')) {
      const dateParts = visitDate.split('/');
      if (dateParts.length === 3) {
        visitDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      }
    }

    // Prepare API request payload - match Swagger spec exactly
    const packageAmountValue = (value.package || '').trim();
    const additionalRequirementsValue = (value.additionalRequirements || '').trim();
    
    // Backend expects attachmentUrls as empty array (files are sent separately in multipart)
    // The actual files will be sent in the 'attachment' field of FormData
    const attachmentUrls: string[] = [];
    
    const request: VisitCampusRequest = {
      companyName: value.companyName.trim(),
      contactPersonName: value.contactPersonName.trim(),
      contactPersonEmail: value.contactPersonEmail.trim(),
      contactPersonPhone: value.contactPersonPhoneNo.trim() || '', // Optional field
      numberOfPositions: numberOfPositionsNum,
      packageAmount: packageAmountValue || '', // Optional field
      recruitmentType: recruitmentType,
      visitDate: visitDate,
      visitTime: visitTimeString, // Backend expects "HH:mm:ss" string format
      attachmentUrls: attachmentUrls, // Empty array - files sent separately
      additionalRequirements: additionalRequirementsValue || undefined
    };
    
    // Log the exact request being sent
    console.log('CampusAboutComponent: ✅ Final request payload (matching Swagger spec):', JSON.stringify(request, null, 2));
    console.log('CampusAboutComponent: visitTime string:', visitTimeString);

    console.log('CampusAboutComponent: Visit Campus request payload:', JSON.stringify(request, null, 2));
    console.log('CampusAboutComponent: Calling API: submitVisitCampusRequest with campusId:', cleanCampusId);
    console.log('CampusAboutComponent: Request object:', request);

    // Get attachment files from form value
    const attachmentFiles = (value.attachments || []).filter(file => file instanceof File);
    console.log('CampusAboutComponent: Attachment files to upload:', attachmentFiles.length);
    attachmentFiles.forEach((file, index) => {
      console.log(`  File ${index + 1}: ${file.name} (${file.size} bytes, ${file.type})`);
    });
    
    // Call API with multipart/form-data (request JSON + attachment files)
    console.log('CampusAboutComponent: About to call submitVisitCampusRequest with multipart/form-data...');
    const apiCall = this.campusApi.submitVisitCampusRequest(cleanCampusId, request, attachmentFiles);
    console.log('CampusAboutComponent: API call observable created:', apiCall);
    
    apiCall.subscribe({
      next: (response: VisitCampusResponse | null) => {
        console.log('✅ Visit Campus API Response:', response);
        this.submittingVisitCampus = false;

        if (!response) {
          console.error('❌ Visit Campus API - Response is null');
          this.notify.error('Failed to submit visit campus request. Please try again.');
          return;
        }

        if (response.success) {
          const successMessage = response.message || 'Campus visit request submitted successfully! Your request has been received and we will contact you soon.';
          console.log('✅ Success:', successMessage);
          
          // Show success notification with a prominent message
          this.notify.success(successMessage);
          
          // Reset form and close modal after a short delay to show success message
          setTimeout(() => {
            // Reset the form component if it has a reset method
            // The form will be reset when modal reopens (component recreated)
            this.closeModal();
          }, 1500); // Increased delay to ensure user sees the success message
        } else {
          const errorMessage = response.error || response.message || 'Failed to submit visit campus request';
          console.error('❌ API returned unsuccessful response:', errorMessage);
          this.notify.error(errorMessage);
        }
      },
      error: (error) => {
        console.error('❌ Visit Campus API Error:', error);
        console.error('Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        
        this.submittingVisitCampus = false;
        
        // Handle backend configuration issues (502/503) with user-friendly messages
        if (error?.status === 502 || error?.status === 503) {
          const errorMessage = error?.error?.message || error?.message || '';
          // Show user-friendly message for backend configuration issues
          if (errorMessage.includes('not configured') || errorMessage.includes('Upstream service URL')) {
            console.warn('CampusAboutComponent: Backend service not configured.');
            this.notify.error('Service is currently not available. Please contact support or try again later.');
            return;
          }
          // For other 502/503 errors, show a user-friendly message
          console.warn('CampusAboutComponent: Backend service unavailable.');
          this.notify.error('Service temporarily unavailable. Please try again later.');
          return;
        }
        
        let errorMessage = 'Failed to submit visit campus request. Please try again later.';
        
        // Handle other errors
        if (error?.error) {
          if (error.error.message && error.error.message !== 'null' && error.error.message.trim()) {
            errorMessage = error.error.message;
          } else if (error.error.error && error.error.error !== 'null' && error.error.error.trim()) {
            errorMessage = error.error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        console.error('Displaying error message:', errorMessage);
        this.notify.error(errorMessage);
      }
    });
  }

  handleFacultySubmit(value: FacultyFormValue): void {

    this.facultyFormValue = value;

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
      const designation = (info.designation ?? '').trim();
      const department = (info.department ?? '').trim();
      const yearsOfExp = (info.yearsOfExperience ?? '').trim();
      if (!designation || !department || !yearsOfExp) {
        this.submittingFaculty = false;
        this.notify.error('Please fill all required fields in professional information');
        return;
      }
    }
    this.submittingFaculty = true;

    // Prepare basic information JSON
    let dateOfBirth = value.dateOfBirth.trim();
    
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

    // Prepare professional information JSON
    let professionalInformation: {
      designation: string[];
      department: string[];
      specialization: string[];
      yearsOfExperience: number[];
      qualifications: string[];
      certificates: string[];
    }[] = [];
    
    try {
      professionalInformation = value.professionalInfo.map((info, index) => {
        const qualificationsStr = (info.qualifications || '').trim();
        const qualificationsArray = qualificationsStr
          ? qualificationsStr.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
          : [];
        
        const certificatesArray: string[] = [];
        
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
const specializationArray = specializationValue
  ? [specializationValue]
  : [];

        let yearsOfExperienceNum = 0;
        const yearsStr = (info.yearsOfExperience || '').trim();
        if (!yearsStr) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience is required`);
        }
        
        if (yearsStr.includes('-')) {
          const parts = yearsStr.split('-');
          if (parts.length === 2) {
            const lower = parseInt(parts[0].trim(), 10);
            const upper = parseInt(parts[1].trim(), 10);
            if (!isNaN(lower) && !isNaN(upper) && lower >= 0 && upper > 0) {
              yearsOfExperienceNum = upper;
            } else {
              throw new Error(`Professional info entry ${index + 1}: Invalid years of experience range`);
            }
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else if (yearsStr.endsWith('+')) {
          const num = parseInt(yearsStr.replace('+', '').trim(), 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else {
          const num = parseInt(yearsStr, 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience`);
          }
        }
        
        if (yearsOfExperienceNum <= 0) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience must be greater than 0`);
        }
        
        const professionalInfoObj: {
          designation: string[];
          department: string[];
          specialization: string[];
          yearsOfExperience: number[];
          qualifications: string[];
          certificates: string[];
        } = {
          designation: designationArray,
          department: departmentArray,
          specialization: specializationArray,
          yearsOfExperience: [yearsOfExperienceNum],
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

    if (professionalInformation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('At least one professional information entry is required');
      return;
    }
    
    const professionalInformationObj = professionalInformation[0];
    
    if (professionalInformation.length > 1) {
      console.warn('Multiple professional information entries provided. Only the first one will be saved.');
    }

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
    if (!Array.isArray(professionalInformationObj.yearsOfExperience) || professionalInformationObj.yearsOfExperience.length === 0 || !professionalInformationObj.yearsOfExperience.every((y: number) => typeof y === 'number' && y > 0)) {
      this.submittingFaculty = false;
      this.notify.error('Valid years of experience is required');
      return;
    }
    if (!Array.isArray(professionalInformationObj.qualifications)) {
      professionalInformationObj.qualifications = [];
    }
    if (!Array.isArray(professionalInformationObj.certificates)) {
      professionalInformationObj.certificates = [];
    }
    
    professionalInformationObj.designation = professionalInformationObj.designation.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.department = professionalInformationObj.department.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.specialization = professionalInformationObj.specialization.filter(s => s != null && s.trim() !== '');
    professionalInformationObj.qualifications = professionalInformationObj.qualifications.filter(q => q != null && q.trim() !== '');
    professionalInformationObj.certificates = professionalInformationObj.certificates.filter(c => c != null && c.trim() !== '');
    
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
        yearsOfExperience: number[];
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

    const token = this.authState.token();
    
    if (!token) {
      this.submittingFaculty = false;
      this.notify.error('Authentication required. Please login again.');
      return;
    }
    
    // Check if we're in edit mode
    const isEditMode = this.editingFacultyId !== null;
    
    if (isEditMode && this.editingFacultyId) {
      // Update existing faculty - send full basicInformation + professionalInformation per FacultyUpdateRequest
      this.campusApi.updateFaculty(this.editingFacultyId, {
        basicInformation: requestData.basicInformation,
        professionalInformation: requestData.professionalInformation,
      }, undefined, undefined, value.photo).subscribe({
        next: (response) => {
          setTimeout(() => {
            if (response === null) {
              this.submittingFaculty = false;
              this.notify.warn('Faculty might have been updated, but response format was unexpected. Please refresh the page.');
              this.closeModal();
              if (this.isBrowser) {
                window.dispatchEvent(new Event('facultyAdded'));
              }
              
              try {
                this.cdr.detectChanges();
              } catch {
                // Component might be destroyed, ignore
              }
              return;
            }
            
            this.submittingFaculty = false;
            const successMessage = response?.message || 'Faculty updated successfully!';
            
            this.notify.success(successMessage);
            
            setTimeout(() => {
              this.closeModal();
            }, 500);

            if (this.isBrowser) {
              window.dispatchEvent(new Event('facultyAdded'));
            }

            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
          }, 0);
        },
        error: (err) => {
          setTimeout(() => {
            this.submittingFaculty = false;
            
            let errorMessage = 'Failed to update faculty';
            if (err?.status === 401) {
              errorMessage = 'Unauthorized: Your session has expired. Please login again.';
            } else if (err?.status === 403) {
              errorMessage = 'Forbidden: You do not have permission to update faculty.';
            } else if (err?.status === 500) {
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

            if (err?.error?.errors && typeof err.error.errors === 'object') {
              const validationErrors = Object.entries(err.error.errors)
                .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                .join('; ');
              if (validationErrors.trim()) {
                errorMessage = validationErrors;
              }
            }
            
            this.notify.error(errorMessage);
            
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
          }, 0);
        },
      });
    } else {
      // Add new faculty (use multipart when photo is provided)
      this.campusApi.addFaculty(requestData, undefined, undefined, value.photo).subscribe({
        next: (response) => {
          setTimeout(() => {
            if (response === null) {
              this.submittingFaculty = false;
              this.notify.warn('Faculty might have been added, but response format was unexpected. Please refresh the page.');
              this.facultyFormValue = this.getDefaultFacultyFormValue();
              this.closeModal();
              if (this.isBrowser) {
                window.dispatchEvent(new Event('facultyAdded'));
              }
              
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

            this.facultyFormValue = this.getDefaultFacultyFormValue();
            this.closeModal();
            if (this.isBrowser) {
              window.dispatchEvent(new Event('facultyAdded'));
            }

            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
          }, 0);
        },
      error: (err) => {
        setTimeout(() => {
          this.submittingFaculty = false;
          
          let errorMessage = 'Failed to add faculty';
          if (err?.status === 401) {
            errorMessage = 'Unauthorized: Your session has expired. Please login again.';
          } else if (err?.status === 403) {
            errorMessage = 'Forbidden: You do not have permission to add faculty.';
          } else if (err?.status === 500) {
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

          if (err?.error?.errors && typeof err.error.errors === 'object') {
            const validationErrors = Object.entries(err.error.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            if (validationErrors.trim()) {
              errorMessage = validationErrors;
            }
          }
          
          this.notify.error(errorMessage);
          
          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
    });
    }
  }

  handleFacultyDetailClose(): void {
    this.facultyDetailService.clearSelectedFaculty();
    this.modalService.closeModal();
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
          this.handleFacultyDetailClose();
          
          // Refresh faculty list by dispatching event
          if (this.isBrowser) {
            window.dispatchEvent(new Event('facultyAdded'));
            window.dispatchEvent(new Event('facultyDeleted'));
          }
          
          // Reload faculties
          this.loadFaculties();
        } else {
          const errorMessage = response?.error || response?.message || 'Failed to delete faculty';
          this.notify.error(errorMessage);
        }
      },
      error: (err) => {
        this.deletingFaculty = false;
        
        console.error('❌ DELETE FACULTY - ERROR:', err);
        
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

  onFacultyEditClick(event: Event, faculty: PersonCard): void {
    event.stopPropagation(); // Prevent triggering onFacultyClick
    
    if (!faculty.id) {
      console.warn('CampusAboutComponent: Faculty has no ID, cannot edit');
      this.notify.error('Faculty ID is missing. Cannot edit faculty.');
      return;
    }

    console.log('CampusAboutComponent: Opening edit modal for faculty ID:', faculty.id);
    
    // Set edit mode
    this.editingFacultyId = faculty.id;
    
    // Load faculty data and pre-fill form
    this.loadFacultyForEdit(faculty.id);
  }

  loadFacultyForEdit(facultyId: string): void {
    this.campusApi.getFacultyById(facultyId).subscribe({
      next: (response) => {
        console.log('CampusAboutComponent: getFacultyById API response for edit:', response);
        
        const profile = unwrapApiResponse<Record<string, unknown>>(response);
        if (profile) {
          const basicInfo = profile['basicInformation'] as {
            id?: string;
            fullName?: string;
            photoUrl?: string;
            email?: string;
            dateOfBirth?: string;
            phoneNumber?: string;
          } | undefined;
          const professionalInfo = profile['professionalInformation'] as {
            designation?: string[];
            designationDisplay?: string[];
            department?: string[];
            qualifications?: string[];
            yearsOfExperience?: number[];
            experienceDisplay?: string[];
            specialization?: string[];
          } | undefined;
          
          // Convert backend data to FacultyFormValue
          const formValue: FacultyFormValue = {
            fullName: basicInfo?.fullName || '',
            photo: null, // We'll keep the existing photo URL, but not as File
            email: basicInfo?.email || '',
            dateOfBirth: basicInfo?.dateOfBirth || '',
            phoneNumber: basicInfo?.phoneNumber || '',
            professionalInfo: []
          };
          
          // Convert professional information
          if (professionalInfo) {
            const designation = professionalInfo.designation && professionalInfo.designation.length > 0
              ? professionalInfo.designation[0]
              : '';
            
            const department = professionalInfo.department && professionalInfo.department.length > 0
              ? professionalInfo.department[0]
              : '';
            
            const specialization = professionalInfo.specialization && professionalInfo.specialization.length > 0
              ? professionalInfo.specialization[0]
              : '';
            
            const yearsOfExperience = professionalInfo.yearsOfExperience && professionalInfo.yearsOfExperience.length > 0
              ? professionalInfo.yearsOfExperience[0].toString()
              : '';
            
            const qualifications = professionalInfo.qualifications && professionalInfo.qualifications.length > 0
              ? professionalInfo.qualifications.join(', ')
              : '';
            
            formValue.professionalInfo = [{
              designation: designation,
              department: department,
              specialization: specialization,
              yearsOfExperience: yearsOfExperience,
              qualifications: qualifications,
              certificates: null // Certificates are not editable as files in PUT request
            }];
          } else {
            // Default empty professional info
            formValue.professionalInfo = [{
              designation: '',
              department: '',
              specialization: '',
              yearsOfExperience: '',
              qualifications: '',
              certificates: null
            }];
          }
          
          // Store form value
          this.facultyFormValue = formValue;
          
          // Open modal
          this.modalService.openModal('faculty');
          
          // Trigger change detection to update form
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore if component is destroyed
          }
        } else {
          this.notify.error('Failed to load faculty data for editing');
          this.editingFacultyId = null;
          this.facultyFormValue = null;
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error loading faculty for edit:', error);
        this.notify.error('Failed to load faculty data. Please try again.');
        this.editingFacultyId = null;
        this.facultyFormValue = null;
      }
    });
  }

  onFacultyClick(faculty: PersonCard): void {
    if (!faculty.id) {
      console.warn('CampusAboutComponent: Faculty has no ID, cannot fetch details');
      return;
    }

    console.log('CampusAboutComponent: Fetching faculty details for ID:', faculty.id);
    
    this.campusApi.getFacultyById(faculty.id).subscribe({
      next: (response) => {
        console.log('CampusAboutComponent: getFacultyById API response:', response);
        
        const profile = unwrapApiResponse<Record<string, unknown>>(response);
        if (profile) {
          const basicInfo = profile['basicInformation'] as {
            id?: string;
            fullName?: string;
            photoUrl?: string;
            email?: string;
            phoneNumber?: string;
          } | undefined;
          const professionalInfo = profile['professionalInformation'] as {
            designation?: string[];
            designationDisplay?: string[];
            department?: string[];
            qualifications?: string[];
            yearsOfExperience?: number[];
            experienceDisplay?: string[];
            specialization?: string[];
          } | undefined;
          
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
          
          const designationStr = professionalInfo?.designationDisplay 
            ? professionalInfo.designationDisplay.join(', ')
            : (professionalInfo?.designation 
                ? professionalInfo.designation.join(', ')
                : 'Not specified');
          
          const departmentStr = professionalInfo?.department
            ? professionalInfo.department.join(', ')
            : 'Not specified';
          
          const qualificationsStr = professionalInfo?.qualifications 
            ? professionalInfo.qualifications.join(', ')
            : 'Not specified';
          
          const experienceStr = professionalInfo?.yearsOfExperience && professionalInfo.yearsOfExperience.length > 0
            ? `${professionalInfo.yearsOfExperience[0]} years of experience`
            : (professionalInfo?.experienceDisplay && professionalInfo.experienceDisplay.length > 0
                ? professionalInfo.experienceDisplay[0]
                : 'Not specified');
          
          const detailData: FacultyDetailData = {
            id: basicInfo?.id || faculty.id,
            name: basicInfo?.fullName || faculty.name,
            imageUrl: imageUrl,
            designation: designationStr,
            department: departmentStr,
            qualifications: qualificationsStr,
            experience: experienceStr,
            email: basicInfo?.email || 'Not available',
            phone: basicInfo?.phoneNumber || 'Not available',
          };
          
          console.log('CampusAboutComponent: Mapped faculty detail data:', detailData);
          this.facultyDetailService.setSelectedFaculty(detailData);
          this.modalService.openModal('faculty-detail');
        } else {
          console.warn('CampusAboutComponent: API response not successful or no data');
        }
      },
      error: (err) => {
        console.error('CampusAboutComponent: Failed to load faculty by ID:', err);
        this.notify.error('Failed to load faculty details');
      },
    });
  }

  /**
   * Open Download Prospectus modal
   */
  openDownloadProspectusModal(): void {
    this.modalService.openModal('prospectus-download');
  }

  /**
   * Submit Feedback Handler
   * Submits feedback from contact form to the API
   * POST /public/landing/feedback
   * Request: { name: string, contact: string, message: string }
   * Response: 201 Created with success message
   */
submitCampusFeedback(event?: Event): void {

  
  event?.preventDefault();

  if (this.isReviewerNameInvalid()) {
  this.notify.error('Enter valid name (letters only)');
  return;
}

  if (!this.campusFeedbackForm.reviewerName.trim()) {
    this.notify.error('Please enter your name');
    return;
  }

  if (!this.campusFeedbackForm.feedbackText.trim()) {
    this.notify.error('Please enter your feedback');
    return;
  }

  // Use resolved campusId from contact-info when on public profile (API expects actual campus ID)
  const resolvedCampusId = this.resolvedCampusId();
  const publicCampusId = this.getPublicCampusId();
  const campusId = resolvedCampusId || publicCampusId || this.internalCampusId;

  if (!campusId) {
    this.notify.error('Campus not found');
    return;
  }

  if (publicCampusId && !resolvedCampusId) {
    this.notify.error('Please wait for the page to load');
    return;
  }

  const user = this.authState.user();
  if (!user?.userType) {
    this.notify.error('Please login to send feedback');
    return;
  }

  // ✅ IMPORTANT FIX
  if (user.userType === 'CAMPUS') {
    this.notify.error('Campus cannot give feedback to itself');
    return;
  }

  let reviewerId: string | null = null;

  if (user.userType === 'STUDENT') {
    reviewerId = this.storage.get(STORAGE_KEYS.STUDENT_ID);
  } else if (user.userType === 'COMPANY') {
    reviewerId = this.storage.get(STORAGE_KEYS.COMPANY_ID);
  }

  if (!reviewerId) {
    this.notify.error('Reviewer ID not found');
    return;
  }

  this.submittingFeedback = true;

  // Prefer resolved campusId (from contact-info); for internal ID, remove CAMPUS- prefix
  const campusIdForApi = resolvedCampusId || (publicCampusId ?? campusId.replace(/^CAMPUS-/i, ''));

  this.campusApi
    .submitCampusFeedback(
      campusIdForApi,
      reviewerId,
      user.userType,
      {
        reviewerName: this.campusFeedbackForm.reviewerName.trim(),
        feedbackText: this.campusFeedbackForm.feedbackText.trim()
      }
    )
    .subscribe({
      next: (res) => {
        this.submittingFeedback = false;

        if (!res?.success) {
          this.notify.error(res?.error || 'Feedback submission failed');
          return;
        }

        this.notify.success(res.message || 'Feedback submitted successfully');

        this.campusFeedbackForm = {
          reviewerName: '',
          feedbackText: ''
        };

        this.loadTestimonials();
      },
      error: (err) => {
        this.submittingFeedback = false;
        this.notify.error(err?.error?.error || 'Feedback failed');
      }
    });
}











// --------------------- recommendation ---------------

submitCampusRecommendation(choice: 'yes' | 'no'): void {
  // Use resolved campusId from contact-info when on public profile (API expects actual campus ID)
  const resolvedCampusId = this.resolvedCampusId();
  const publicCampusId = this.getPublicCampusId();
  const campusId = resolvedCampusId || publicCampusId || this.internalCampusId;

  if (!campusId) {
    this.notify.error('Campus not found');
    return;
  }

  if (publicCampusId && !resolvedCampusId) {
    this.notify.error('Please wait for the page to load');
    return;
  }

  const user = this.authState.user();
  // ✅ LOGIN CHECK
  if (!user || !user.userType) {
    this.notify.error('Please login to submit recommendation');
    return;
  }

  if (user.userType === 'CAMPUS') {
    this.notify.error('Campus cannot recommend itself');
    return;
  }

  this.isSubmittingRecommendation = true;

  const wouldRecommend = choice === 'yes';

  // Prefer resolved campusId (from contact-info); for internal ID, remove CAMPUS- prefix
  const campusIdForApi = resolvedCampusId || (publicCampusId ?? campusId.replace(/^CAMPUS-/i, ''));

  this.campusApi
    .submitCampusRecommendation(
      campusIdForApi,
      String(user.userId),
      user.userType as 'STUDENT' | 'COMPANY',
      wouldRecommend
    )
    .subscribe({
      next: () => {
        this.isSubmittingRecommendation = false;
        this.notify.success('Recommendation submitted');
        this.loadPromotionsCount(); 
      },
      error: (err) => {
        this.isSubmittingRecommendation = false;
        this.notify.error(
          err?.error?.message || 'You already recommended'
        );
      }
    });
}


















}

// ----------------- recommendation --------------



function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  const first = parts[0][0] || '';
  const second = parts.length > 1 ? parts[1][0] : '';
  return (first + second).toUpperCase();
}

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
    return trimmed.startsWith('/files') ? `/api/v1${trimmed}` : `/api/v1/files${trimmed}`;
  }
  return `/api/v1/files/${trimmed}`;
}