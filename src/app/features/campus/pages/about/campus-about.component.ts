import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, OnDestroy, signal, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusVisitCampusComponent, VisitCampusFormValue } from '../visit-campus/campus-visit-campus.component';
import { CampusFacultyComponent, FacultyFormValue } from '../faculty/campus-faculty.component';
import { CampusFacultyDetailComponent, FacultyDetailData } from '../faculty-detail/campus-faculty-detail.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusDownloadProspectusComponent } from '../download-prospectus/campus-download-prospectus.component';
import { FacultyDetailService } from '../../services/faculty-detail.service';
import { CampusApiService, TestimonialData, TestimonialsResponse, ResearchData, YearlyTrend, GetAllFacultiesResponse, FacultyListItem, AlumniDashboardResponse, AlumniDashboardData, FeedbackRequest, FeedbackResponse, VisitCampusRequest, VisitCampusResponse, VisitTime, StudentByBatchData, StudentsByBatchResponse } from '../../services/campus-api.service';
import { ApiResponsePlacedStudentsResponse } from '../../../student/models/student.models';
import { StudentApiService } from '../../../student/services/student-api.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

interface PersonCard {
  id: string;
  name: string;
  imageUrl: string;
  batch?: string;
  company?: string;
  designation?: string;
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
    CampusVisitCampusComponent,
    CampusFacultyComponent,
    CampusFacultyDetailComponent,
    CampusPlacedStudentsComponent,
    CampusDownloadProspectusComponent,
  ],
  templateUrl: './campus-about.component.html',
  styleUrl: './campus-about.component.css',
})
export class CampusAboutComponent implements OnInit, OnDestroy {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly pageSize = 8;

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
  
  // Delete faculty modal state
  deletingFaculty = false;
  showDeleteFacultyModal = false;
  facultyToDeleteId: string | null = null;

  // Edit faculty state
  editingFacultyId: string | null = null;
  readonly isEditMode = computed(() => this.editingFacultyId !== null);
  facultyFormValue: FacultyFormValue | null = null;

  submittingVisitCampus = false;
  submittingFaculty = false;
  submittingFeedback = false;
  submittingPlacedStudents = false;

  // Feedback form data
  feedbackForm = {
    name: '',
    contact: '',
    message: '',
    recommendation: '' as 'yes' | 'no' | ''
  };

  // Rising Stars - API Integration (Using GET /dashboard/placed-students - same as Placed Students section)
  // This fetches all placed students from the campus dashboard and displays them as rising stars
  readonly risingStars = signal<readonly PersonCard[]>([]);
  readonly loadingRisingStars = signal(false);
  risingStarsPage = 0; // API uses 0-based pagination
  readonly risingStarsPageSize = 8;
  readonly risingStarsTotalPages = signal(1);

  // Campus Insights - About Campus Content
  readonly aboutCampusText = signal<string>('');
  readonly loadingAboutCampus = signal(false);
  readonly campusWebsiteUrl = signal<string | null>(null);
  readonly currentCampusId = signal<string | null>(null);
  

  ngOnInit(): void {
    // Extract route parameters (for new tab scenario) - properly unsubscribe on destroy
    this.route.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params: ParamMap) => {
      const campusIdFromRoute = params.get('campusId');
      const userIdFromRoute = params.get('userId');

      console.log('📋 Campus About Page - Route Params:', {
        campusId: campusIdFromRoute,
        userId: userIdFromRoute,
      });

      // If route params exist, use them (opened from menu in new tab)
      if (campusIdFromRoute && userIdFromRoute) {
        this.routeCampusId.set(campusIdFromRoute);
        this.routeUserId.set(userIdFromRoute);
        // Set the campusId for the component to use
        this.currentCampusId.set(campusIdFromRoute);
        
        // Load data after route params are set
        this.loadAllData();
      } else {
        // If no route params, try to load with existing campusId
        this.loadAllData();
      }
    });

    // Check if opened in standalone mode (new tab) - properly unsubscribe on destroy
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((queryParams: ParamMap) => {
      const standalone = queryParams.get('standalone');
      this.isStandalone.set(standalone === 'true');
      console.log('📋 Campus About Page - Standalone mode:', this.isStandalone());
    });
    
    // Listen for facultyAdded event to refresh faculties list
    // Store reference to remove it later
    this.facultyAddedHandler = () => {
      this.loadFaculties();
    };
    window.addEventListener('facultyAdded', this.facultyAddedHandler);
  }

  /**
   * Load all data for the campus about page
   * Called after route parameters are extracted
   */
  private loadAllData(): void {
    this.loadAboutCampus();
    this.loadRisingStars(); // Load placed students data for Rising Stars section
    this.loadBatchesForSuccessStories(); // This will also load success stories after batches are loaded
    this.loadFaculties();
    this.loadTestimonials();
    // this.loadResearch(); // Temporarily commented out - API returning 502 errors
    this.loadAlumni();
    this.loadCourses();
    // this.loadPlacementInsights(); // Temporarily commented out - API returning 502 errors
  }

  // Store event handler reference for cleanup
  private facultyAddedHandler: (() => void) | null = null;

  ngOnDestroy(): void {
    // Remove event listener to prevent memory leaks
    if (this.facultyAddedHandler) {
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
    // First priority: route parameter (for new tab scenario)
    const routeCampusId = this.routeCampusId();
    if (routeCampusId) {
      console.log('CampusAboutComponent: Found campusId from route parameter:', routeCampusId);
      return routeCampusId;
    }

    // Second, try the stored campusId from loaded campus data
    const storedCampusId = this.currentCampusId();
    if (storedCampusId) {
      console.log('CampusAboutComponent: Found campusId from stored campus data:', storedCampusId);
      return storedCampusId;
    }
    
    // Try from auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId || currentUser?.campusId;
    if (campusIdFromUser) {
      console.log('CampusAboutComponent: Found campusId from user profile:', campusIdFromUser);
      return campusIdFromUser;
    }
    
    // Try from storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    if (campusIdFromStorage) {
      console.log('CampusAboutComponent: Found campusId from storage:', campusIdFromStorage);
      return campusIdFromStorage;
    }
    
    // Log debug info if campusId not found
    console.warn('CampusAboutComponent: Campus ID not found in any source.', {
      routeCampusId: routeCampusId,
      storedCampusId: storedCampusId,
      campusIdFromUser: campusIdFromUser,
      campusIdFromStorage: campusIdFromStorage,
      currentUser: currentUser ? { email: currentUser.email, profileServiceId: currentUser.profileServiceId, campusId: currentUser.campusId } : null,
      isAuthenticated: this.authState.isAuthenticated(),
      token: this.authState.token() ? 'present' : 'missing'
    });
    
    return null;
  }

  loadAboutCampus(): void {
    const campusId = this.getCampusId();
    
    if (!campusId) {
      console.warn('CampusAboutComponent: ❌ No campusId found, cannot load campus data');
      console.warn('CampusAboutComponent: This means aboutCampus content will not be fetched');
      return;
    }
    
    // Store the campusId for future use
    this.currentCampusId.set(campusId);
    
    this.loadingAboutCampus.set(true);

    console.log('CampusAboutComponent: Loading campus data for aboutCampus field - campusId:', campusId);

    // Use GET /public/landing/campus/{campusId} (public landing endpoint)
    this.campusApi.getPublicCampusById(campusId).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading campus data:', error);
        this.loadingAboutCampus.set(false);
        
        // Don't show error notification for backend configuration issues (502) or service unavailable (503)
        // These are infrastructure issues, not user errors
        if (error instanceof HttpErrorResponse) {
          const status = error.status;
          const errorMessage = error.error?.message || error.message || '';
          
          // Suppress errors for backend configuration issues
          if (status === 502 || status === 503) {
            console.warn('CampusAboutComponent: Backend service not configured or unavailable. Skipping error notification.');
            // Don't show error notification - this is a configuration issue
            return of(null);
          }
          
          // Suppress "Campus not found" errors if it's a configuration issue
          if (errorMessage.includes('Upstream service URL not configured') || 
              errorMessage.includes('not configured')) {
            console.warn('CampusAboutComponent: Backend service URL not configured. Skipping error notification.');
            return of(null);
          }
        }
        
        return of(null);
      })
    ).subscribe({
      next: (campus) => {
        this.loadingAboutCampus.set(false);
        
        console.log('CampusAboutComponent: Campus data received:', campus);
        console.log('CampusAboutComponent: Checking for aboutCampus field...');
        console.log('CampusAboutComponent: campus.aboutCampus value:', campus?.aboutCampus);
        console.log('CampusAboutComponent: campus.aboutCampus type:', typeof campus?.aboutCampus);
        console.log('CampusAboutComponent: campus.aboutCampus length:', campus?.aboutCampus?.length);
        
        if (campus) {
          // Store campusId from the response - prioritize campusId field, then id field
          // This is important for subsequent API calls
          const campusIdFromResponse = campus.campusId || campus.id;
          if (campusIdFromResponse) {
            console.log('CampusAboutComponent: Storing campusId from API response:', campusIdFromResponse);
            this.currentCampusId.set(campusIdFromResponse);
            // Also store in storage for other components to use
            this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusIdFromResponse);
          } else {
            // Fallback to the campusId we used for the request
            console.log('CampusAboutComponent: No campusId in response, using request campusId:', campusId);
            this.currentCampusId.set(campusId);
            this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
          }
          
          // Fetch and display the aboutCampus field (from campus registration form's "About" field)
          if (campus.aboutCampus && campus.aboutCampus.trim()) {
            console.log('CampusAboutComponent: ✅ Found aboutCampus content, length:', campus.aboutCampus.length);
            console.log('CampusAboutComponent: aboutCampus content preview:', campus.aboutCampus.substring(0, 100) + '...');
            this.aboutCampusText.set(campus.aboutCampus);
          } else {
            console.warn('CampusAboutComponent: ⚠️ No aboutCampus content found in response');
            console.warn('CampusAboutComponent: Available campus fields:', Object.keys(campus));
            this.aboutCampusText.set('');
          }
          
          // Store campus website URL
          if (campus.campusWebsiteUrl) {
            this.campusWebsiteUrl.set(campus.campusWebsiteUrl);
          } else {
            this.campusWebsiteUrl.set(null);
          }
        } else {
          console.warn('CampusAboutComponent: Campus data is null');
          this.aboutCampusText.set('');
          this.campusWebsiteUrl.set(null);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error in campus data subscription:', error);
        this.loadingAboutCampus.set(false);
        this.aboutCampusText.set('');
        this.campusWebsiteUrl.set(null);
      }
    });
  }

  loadRisingStars(): void {
    console.log('CampusAboutComponent: ========== LOADING RISING STARS (PLACED STUDENTS) ==========');
    console.log('CampusAboutComponent: Current page (0-indexed):', this.risingStarsPage);
    console.log('CampusAboutComponent: Page size:', this.risingStarsPageSize);
    
    this.loadingRisingStars.set(true);
    
    // Call getPlacedStudents() without campusId parameter
    // The API service will automatically use the campusId from storage (set during login)
    // This matches how courses and faculties are loaded and ensures we use the correct campusId
    // Use GET /dashboard/{campusId}/placed-students (same API as Placed Students section in campus dashboard)
    // API uses 0-indexed pagination (page=0 for first page)
    this.campusApi.getPlacedStudents(this.risingStarsPage, this.risingStarsPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: ❌ Error loading rising stars (placed students):', error);
        console.error('CampusAboutComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          url: error?.url,
          error: error?.error
        });
        this.loadingRisingStars.set(false);
        // Don't show error notification - suppress errors for new campuses
        return of(null);
      })
    ).subscribe({
      next: (response: ApiResponsePlacedStudentsResponse | null) => {
        console.log('CampusAboutComponent: ✅ GET RISING STARS API RESPONSE RECEIVED');
        console.log('CampusAboutComponent: Response:', response);
        console.log('CampusAboutComponent: Response success:', response?.success);
        console.log('CampusAboutComponent: Response message:', response?.message);
        console.log('CampusAboutComponent: Response data:', response?.data);
        console.log('CampusAboutComponent: Response content array:', response?.data?.content);
        console.log('CampusAboutComponent: Content length:', response?.data?.content?.length || 0);
        console.log('CampusAboutComponent: Total pages:', response?.data?.totalPages);
        
        this.loadingRisingStars.set(false);
        
        if (response?.success && response.data?.content && Array.isArray(response.data.content)) {
          console.log('CampusAboutComponent: ✅ Rising stars (placed students) loaded successfully, count:', response.data.content.length);
          // Map PlacedStudentData to PersonCard format (same as Placed Students section)
          const mappedStars = response.data.content.map((student: {
            id?: string;
            userId?: string | null;
            campusId?: string;
            courseId?: string | null;
            courseName?: string;
            studentName?: string;
            photoUrl?: string;
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
            firstName?: string;
            lastName?: string;
            profilePhotoUrl?: string;
            companyName?: string;
            studentId?: string;
          }) => this.mapPlacedStudentToPersonCard(student));
          this.risingStars.set(mappedStars);
          
          const totalPages = response.data.totalPages ?? 1;
          this.risingStarsTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: ✅ Rising stars mapped, total:', mappedStars.length, 'pages:', totalPages);
          console.log('CampusAboutComponent: Mapped stars:', mappedStars);
        } else {
          console.warn('CampusAboutComponent: ⚠️ No rising stars (placed students) found (empty array or unsuccessful response)');
          console.warn('CampusAboutComponent: Response success:', response?.success);
          console.warn('CampusAboutComponent: Response data exists:', !!response?.data);
          console.warn('CampusAboutComponent: Response content exists:', !!response?.data?.content);
          console.warn('CampusAboutComponent: Response content is array:', Array.isArray(response?.data?.content));
          this.risingStars.set([]);
          this.risingStarsTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: ❌❌❌ RISING STARS SUBSCRIPTION ERROR ❌❌❌');
        console.error('CampusAboutComponent: Error:', error);
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
    
    return {
      id: item.id || item.studentId || item.userId || '',
      name: name,
      imageUrl: imageUrl,
      batch: item.batch,
      company: item.placementCompanyName || item.companyName,
      designation: item.designation,
    };
  }

  risingStarsPageItems(): readonly PersonCard[] {
    return this.risingStars();
  }

  onRisingStarsPageChange(page: number): void {
    // Carousel component uses 1-based indexing, convert to 0-based for API
    const apiPage = page - 1;
    if (apiPage !== this.risingStarsPage && apiPage >= 0) {
      this.risingStarsPage = apiPage;
      this.loadRisingStars();
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
        
        if (response?.success && response.data?.content && Array.isArray(response.data.content)) {
          console.log('CampusAboutComponent: Success stories loaded successfully, count:', response.data.content.length);
          // Map StudentByBatchData to PersonCard format (same as Current Batch section)
          const mappedStories = response.data.content.map((student) => this.mapStudentByBatchToPersonCard(student));
          this.successStories.set(mappedStories);
          
          const totalPages = response.data.totalPages ?? 1;
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
    const name = student.studentName || 
                 [student.firstName, student.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    
    // Build image URL from profilePhotoUrl or imageUrl
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    const photoUrl = student.profilePhotoUrl || student.imageUrl;
    if (photoUrl) {
      // If photoUrl is already a full URL (starts with http:// or https://), use it as is
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        imageUrl = photoUrl;
      } else if (photoUrl.startsWith('/')) {
        // If it starts with /, it's an absolute path - prepend API base URL
        imageUrl = `/api/v1/files/${photoUrl.substring(1)}`; // Remove leading /
      } else {
        // Relative path like "student/filename.jpg" - construct full URL
        imageUrl = `/api/v1/files/${photoUrl}`;
      }
    }
    
    return {
      id: student.studentId || student.userId || student.id || `${name}-${student.batch || ''}`,
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
  coursePage = 1;
  readonly coursePageSize = 4;
  readonly coursesTotalPages = signal(1);

  loadCourses(): void {
    this.loadingCourses.set(true);
    
    // Call getAllCourses() without campusId parameter
    // The API service will automatically use the campusId from storage (set during login)
    // This matches how the sidebar/courses menu loads courses and ensures we use the correct campusId
    this.campusApi.getAllCourses().pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading courses:', error);
        console.error('CampusAboutComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          url: error?.url,
          error: error?.error
        });
        this.loadingCourses.set(false);
        // Don't show error notification - suppress 404 errors for "Campus not found"
        // This is expected for new campuses that haven't added courses yet
        return of([]);
      })
    ).subscribe({
      next: (coursesData) => {
        console.log('CampusAboutComponent: Courses data received:', coursesData);
        console.log('CampusAboutComponent: Courses count:', coursesData?.length || 0);
        this.loadingCourses.set(false);
        
        if (coursesData && Array.isArray(coursesData) && coursesData.length > 0) {
          // Map API response to CourseCard format (same as Courses menu section)
          const courseCards: CourseCard[] = coursesData
            .filter(course => course && course.courseName && course.id)
            .map(course => ({
              id: course.id || '',
              name: course.courseName || '',
              seats: course.availableSeats || course.totalSeats || 0,
              duration: course.duration ? `${course.duration} ${course.duration === 1 ? 'month' : 'months'}` : 'N/A',
              fullName: course.description || course.courseName || '', // For card bottom section
            }));
          
          console.log('CampusAboutComponent: Mapped course cards:', courseCards.length);
          this.courses.set(courseCards);
          
          // Calculate total pages for carousel pagination (client-side pagination)
          const totalPages = Math.max(1, Math.ceil(courseCards.length / this.coursePageSize));
          this.coursesTotalPages.set(totalPages);
          
          console.log('CampusAboutComponent: Courses mapped and paginated, total:', courseCards.length, 'pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No courses data or empty array');
          this.courses.set([]);
          this.coursesTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Courses subscription error:', error);
        this.loadingCourses.set(false);
        this.courses.set([]);
        this.coursesTotalPages.set(1);
      }
    });
  }

  coursesPageItems(): readonly CourseCard[] {
    // Client-side pagination - slice courses array for current page
    const allCourses = this.courses();
    const startIndex = (this.coursePage - 1) * this.coursePageSize;
    const endIndex = startIndex + this.coursePageSize;
    return allCourses.slice(startIndex, endIndex);
  }

  previousCourse(): void {
    if (this.coursePage > 1) {
      this.coursePage--;
    }
  }

  nextCourse(): void {
    if (this.coursePage < this.coursesTotalPages()) {
      this.coursePage++;
    }
  }

  // Placement Insights - API Integration
  readonly placementInsights = signal<YearlyTrend[]>([]);
  readonly loadingPlacementInsights = signal(false);
  readonly placementPercentage = signal<number>(0);

  // Placement Years - Will be populated from API, fallback to hardcoded
  readonly placementYears = signal<string[]>(['2024', '2023', '2022', '2021', '2020']);

  getPlacementValue(year: string): number {
    // First try to use API data
    const insights = this.placementInsights();
    if (insights && insights.length > 0) {
      const yearData = insights.find(trend => trend.year === year);
      if (yearData && yearData.totalStudents && yearData.totalStudents > 0) {
        // Calculate percentage: (placedCount / totalStudents) * 100
        const percentage = Math.round(((yearData.placedCount || 0) / yearData.totalStudents) * 100);
        return percentage;
      }
    }

    // Fallback to hardcoded values if API data not available
    const values: Record<string, number> = {
      '2024': 85,
      '2023': 80,
      '2022': 75,
      '2021': 70,
      '2020': 65,
    };
    return values[year] || 50;
  }

  getPlacementColor(year: string): string {
    const colors: Record<string, string> = {
      '2024': 'var(--color-primary)',
      '2023': 'var(--color-secondary)',
      '2022': '#87CEEB',
      '2021': 'var(--color-primary)',
      '2020': 'var(--color-secondary)',
    };
    return colors[year] || 'var(--color-secondary)';
  }

  // Temporarily commented out - API returning 502 errors
  // loadPlacementInsights(): void {
  //   // Get campusId explicitly to ensure we're loading placement insights for the correct campus
  //   const campusId = this.getCampusId();
  //   
  //   if (!campusId) {
  //     console.warn('CampusAboutComponent: No campusId found, cannot load placement insights');
  //     this.loadingPlacementInsights.set(false);
  //     return;
  //   }
  //   
  //   this.loadingPlacementInsights.set(true);
  //   
  //   // Use GET /public/landing/campus/{campusId}/placement-insights
  //   // API uses 0-indexed pagination (page=0 for first page), so convert from 1-based to 0-based
  //   const apiPage = 0; // First page for placement insights
  //   
  //   this.campusApi.getPlacementInsights(campusId, apiPage, 9).pipe(
  //     catchError(() => {
  //       this.loadingPlacementInsights.set(false);
  //       return of(null);
  //     })
  //   ).subscribe({
  //     next: (response: PlacementInsightsResponse | null) => {
  //       this.loadingPlacementInsights.set(false);
  //       
  //       if (response?.success && response.data) {
  //         // Store placement percentage
  //         if (response.data.placementPercentage !== undefined) {
  //           this.placementPercentage.set(response.data.placementPercentage);
  //         }
  //         
  //         // Store yearly trends
  //         if (response.data.yearlyTrends && response.data.yearlyTrends.length > 0) {
  //           this.placementInsights.set(response.data.yearlyTrends);
  //           
  //           // Extract years from yearlyTrends and sort descending (newest first)
  //           const years = response.data.yearlyTrends
  //             .map(trend => trend.year)
  //             .filter((year): year is string => !!year)
  //             .sort((a, b) => b.localeCompare(a));
  //           
  //           if (years.length > 0) {
  //             this.placementYears.set(years);
  //           }
  //         }
  //       }
  //     },
  //     error: () => {
  //       this.loadingPlacementInsights.set(false);
  //     }
  //   });
  // }

  // Faculties - API Integration
  // Using getAllFaculties() from campus dashboard (same as campus home page)
  readonly allFaculties = signal<readonly PersonCard[]>([]);
  readonly faculties = signal<readonly PersonCard[]>([]);
  readonly loadingFaculties = signal(false);
  facultiesPage = 1;
  readonly facultiesPageSize = 6;
  readonly facultiesTotalPages = signal(1);

  loadFaculties(): void {
    this.loadingFaculties.set(true);
    
    // Call getAllFaculties() without campusId parameter
    // The API service will automatically use the campusId from storage (set during login)
    // This matches how the sidebar loads faculties and ensures we use the correct campusId
    this.campusApi.getAllFaculties().pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading faculties:', error);
        console.error('CampusAboutComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          url: error?.url,
          error: error?.error
        });
        this.loadingFaculties.set(false);
        // Don't show error notification - suppress 404 errors for "Campus not found"
        // This is expected for new campuses that haven't added faculties yet
        return of(null);
      })
    ).subscribe({
      next: (response: GetAllFacultiesResponse | null) => {
        this.loadingFaculties.set(false);
        
        if (response?.success && response.data && Array.isArray(response.data)) {
          console.log('CampusAboutComponent: Faculties loaded successfully, count:', response.data.length);
          const mappedFaculties = response.data.map((faculty: FacultyListItem) => this.mapFacultyListItemToPersonCard(faculty));
          this.allFaculties.set(mappedFaculties);
          
          // Calculate total pages for client-side pagination
          const totalPages = Math.max(1, Math.ceil(mappedFaculties.length / this.facultiesPageSize));
          this.facultiesTotalPages.set(totalPages);
          
          // Update current page items
          this.updateFacultiesPageItems();
          
          console.log('CampusAboutComponent: Faculties mapped and paginated, total:', mappedFaculties.length, 'pages:', totalPages);
        } else {
          // No faculties found for this campus (empty array is valid for new campuses)
          // This is correct behavior - new campuses won't have faculties until they add them
          console.log('CampusAboutComponent: No faculties found (empty array or unsuccessful response)');
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
  alumniPage = 1;
  readonly alumniPageSize = 7;
  readonly alumniTotalPages = signal(1);

  loadAlumni(): void {
    this.loadingAlumni.set(true);
    
    // Use the same API as campus dashboard (getAlumniForCarousel)
    this.campusApi.getAlumniForCarousel(50).pipe(
      catchError(() => {
        this.loadingAlumni.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: AlumniDashboardResponse | null) => {
        this.loadingAlumni.set(false);
        
        if (response?.success && Array.isArray(response.data)) {
          const mappedAlumni = response.data.map((alumnus: AlumniDashboardData) => this.mapAlumniToPersonCard(alumnus));
          this.allAlumni.set(mappedAlumni);
          
          // Calculate total pages for client-side pagination
          const totalPages = Math.max(1, Math.ceil(mappedAlumni.length / this.alumniPageSize));
          this.alumniTotalPages.set(totalPages);
          
          // Update current page items
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
    const name = alumnus.studentName || 
                 [alumnus.firstName, alumnus.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    
    return {
      id: alumnus.studentId || alumnus.userId || '',
      name: name,
      imageUrl: alumnus.profilePhotoUrl || alumnus.imageUrl || 'assets/images/login-news-image.png',
      designation: alumnus.designation,
      company: alumnus.companyName,
      batch: alumnus.batch || alumnus.yearOfPassing,
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

  // Testimonials - API Integration
  readonly testimonials = signal<readonly TestimonialData[]>([]);
  readonly loadingTestimonials = signal(false);
  readonly testimonialsTotalPages = signal(1);
  testimonialPage = 1;
  readonly testimonialPageSize = 5;

  loadTestimonials(): void {
    // Get campusId explicitly to ensure we're loading testimonials for the correct campus
    const campusId = this.getCampusId();

    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found, cannot load testimonials');
      this.testimonials.set([]);
      this.testimonialsTotalPages.set(1);
      return;
    }

    this.loadingTestimonials.set(true);

    // Use GET /public/landing/campus/{campusId}/testimonials
    // API uses 0-based page indexing, so convert from 1-based (UI) to 0-based (API)
    const apiPage = this.testimonialPage - 1;

    this.campusApi.getTestimonials(campusId, apiPage, this.testimonialPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading testimonials:', error);
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
        return of(null);
      })
    ).subscribe({
      next: (response: TestimonialsResponse | null) => {
        console.log('CampusAboutComponent: Testimonials API response:', response);
        this.loadingTestimonials.set(false);

        if (response?.success && response?.data?.content && Array.isArray(response.data.content)) {
          const testimonialsData = response.data.content;
          
          console.log('CampusAboutComponent: Loaded testimonials:', testimonialsData.length);
          this.testimonials.set(testimonialsData);
          
          const totalPages = response.data.totalPages ?? 0;
          this.testimonialsTotalPages.set(Math.max(1, totalPages));
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.log('CampusAboutComponent: No testimonials data or unsuccessful response');
          this.testimonials.set([]);
          this.testimonialsTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Testimonials subscription error:', error);
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
      }
    });
  }

  previousTestimonial(): void {
    if (this.testimonialPage > 1) {
      this.testimonialPage--;
      this.loadTestimonials();
    }
  }

  nextTestimonial(): void {
    if (this.testimonialPage < this.testimonialsTotalPages()) {
      this.testimonialPage++;
      this.loadTestimonials();
    }
  }

  get currentTestimonial(): TestimonialData | null {
    const allTestimonials = this.testimonials();
    if (allTestimonials.length === 0) {
      return null;
    }
    // Show first testimonial from current page data
    return allTestimonials[0] || null;
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

  openCampusWebsite(): void {
    const websiteUrl = this.campusWebsiteUrl();
    if (websiteUrl && websiteUrl.trim()) {
      // Ensure URL has protocol
      let url = websiteUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      // Open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    // If no URL, button still enabled but does nothing (as per requirement)
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

    // Get campusId using helper method
    const campusId = this.getCampusId();
    console.log('CampusAboutComponent: getCampusId() returned:', campusId);

    if (!campusId) {
      console.error('CampusAboutComponent: ❌ Campus ID not found. Please ensure you are logged in as a campus admin.');
      console.error('CampusAboutComponent: Route campusId:', this.routeCampusId());
      console.error('CampusAboutComponent: Current campusId:', this.currentCampusId());
      console.error('CampusAboutComponent: Auth state user:', this.authState.user());
      this.notify.error('Campus ID not found. Please ensure you are logged in as a campus admin and try again. If the issue persists, please refresh the page or login again.');
      return;
    }
    
    // Ensure campus ID doesn't have any unwanted prefixes (like "CAMPUS-")
    const cleanCampusId = campusId.replace(/^CAMPUS-/i, '').trim();
    
    console.log('CampusAboutComponent: ✅ Using campusId for visit request:', cleanCampusId);
    console.log('CampusAboutComponent: Original campusId:', campusId);

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

    // Parse time from "HH:MM" format (24-hour) to { hour, minute, second, nano }
    // value.timeOfVisit is already in 24-hour format (HH:MM) from form component
    const timeParts = value.timeOfVisit.trim().split(':');
    const hour = parseInt(timeParts[0] || '0', 10);
    const minute = parseInt(timeParts[1] || '0', 10);
    
    // Ensure hour is valid (0-23) and minute is valid (0-59)
    const validHour = Math.max(0, Math.min(23, isNaN(hour) ? 0 : hour));
    const validMinute = Math.max(0, Math.min(59, isNaN(minute) ? 0 : minute));
    
    const visitTime: VisitTime = {
      hour: validHour,
      minute: validMinute,
      second: 0,
      nano: 0
    };
    
    console.log('CampusAboutComponent: Parsed visitTime:', visitTime);
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
    
    const request: VisitCampusRequest = {
      companyName: value.companyName.trim(),
      contactPersonName: value.contactPersonName.trim(),
      contactPersonEmail: value.contactPersonEmail.trim(),
      contactPersonPhone: value.contactPersonPhoneNo.trim(),
      numberOfPositions: numberOfPositionsNum,
      packageAmount: packageAmountValue || '', // Empty string if not provided
      recruitmentType: recruitmentType,
      visitDate: visitDate,
      visitTime: visitTime,
      attachmentUrls: [], // Empty array for now (file upload not implemented)
      additionalRequirements: additionalRequirementsValue || undefined
    };
    
    // Log the exact request being sent
    console.log('CampusAboutComponent: ✅ Final request payload (matching Swagger spec):', JSON.stringify(request, null, 2));
    console.log('CampusAboutComponent: visitTime object:', JSON.stringify(visitTime, null, 2));

    console.log('CampusAboutComponent: Visit Campus request payload:', JSON.stringify(request, null, 2));
    console.log('CampusAboutComponent: Calling API: submitVisitCampusRequest with campusId:', cleanCampusId);
    console.log('CampusAboutComponent: Request object:', request);

    // Call API
    console.log('CampusAboutComponent: About to call submitVisitCampusRequest...');
    const apiCall = this.campusApi.submitVisitCampusRequest(cleanCampusId, request);
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
        const specializationArray = [specializationValue];
        
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
      // Update existing faculty
      // Prepare update request body (only professional information fields + photo)
      const updateData: {
        department?: string[];
        specialization?: string[];
        yearsOfExperience?: number[];
        qualifications?: string[];
        certificates?: string[];
        photo?: string;
      } = {
        department: professionalInformationObj.department,
        specialization: professionalInformationObj.specialization,
        yearsOfExperience: professionalInformationObj.yearsOfExperience,
        qualifications: professionalInformationObj.qualifications,
        certificates: professionalInformationObj.certificates,
      };
      
      // Add photo URL if provided (from existing photo or new upload)
      // Note: For now, we'll skip photo update in PUT request as it requires file upload handling
      // Photo can be updated separately if needed
      
      this.campusApi.updateFaculty(this.editingFacultyId, updateData).subscribe({
        next: (response) => {
          setTimeout(() => {
            if (response === null) {
              this.submittingFaculty = false;
              this.notify.warn('Faculty might have been updated, but response format was unexpected. Please refresh the page.');
              this.closeModal();
              window.dispatchEvent(new Event('facultyAdded'));
              
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

            window.dispatchEvent(new Event('facultyAdded'));

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
      // Add new faculty
      this.campusApi.addFaculty(requestData).subscribe({
        next: (response) => {
          setTimeout(() => {
            if (response === null) {
              this.submittingFaculty = false;
              this.notify.warn('Faculty might have been added, but response format was unexpected. Please refresh the page.');
              this.closeModal();
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
            
            setTimeout(() => {
              this.closeModal();
            }, 500);

            window.dispatchEvent(new Event('facultyAdded'));

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
          window.dispatchEvent(new Event('facultyAdded'));
          window.dispatchEvent(new Event('facultyDeleted'));
          
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
        
        if (response?.success && response.data) {
          const basicInfo = response.data.basicInformation;
          const professionalInfo = response.data.professionalInformation;
          
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
        
        if (response?.success && response.data) {
          const basicInfo = response.data.basicInformation;
          const professionalInfo = response.data.professionalInformation;
          
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
  submitFeedback(event: Event | MouseEvent | null): void {
    // Prevent default form submission/navigation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('CampusAboutComponent: ========== SUBMIT FEEDBACK CALLED ==========');
    console.log('CampusAboutComponent: Feedback form data:', this.feedbackForm);
    console.log('CampusAboutComponent: Event:', event);
    console.log('CampusAboutComponent: Event type:', event?.type);
    console.log('CampusAboutComponent: Event target:', event?.target);

    // Validate form fields
    if (!this.feedbackForm.name || !this.feedbackForm.name.trim()) {
      console.warn('CampusAboutComponent: Validation failed - name is empty');
      this.notify.error('Please enter your name');
      return;
    }

    if (!this.feedbackForm.contact || !this.feedbackForm.contact.trim()) {
      console.warn('CampusAboutComponent: Validation failed - contact is empty');
      this.notify.error('Please enter your contact information');
      return;
    }

    if (!this.feedbackForm.message || !this.feedbackForm.message.trim()) {
      console.warn('CampusAboutComponent: Validation failed - message is empty');
      this.notify.error('Please enter your message');
      return;
    }

    // Check if already submitting
    if (this.submittingFeedback) {
      console.log('CampusAboutComponent: Already submitting feedback, ignoring duplicate request');
      return;
    }

    this.submittingFeedback = true;
    console.log('CampusAboutComponent: ✅ Validation passed, setting submittingFeedback to true');

    // Prepare request payload - only send name, contact, and message (as per API spec)
    const requestData: FeedbackRequest = {
      name: this.feedbackForm.name.trim(),
      contact: this.feedbackForm.contact.trim(),
      message: this.feedbackForm.message.trim()
    };

    console.log('CampusAboutComponent: ✅ Request payload prepared:', JSON.stringify(requestData, null, 2));
    console.log('CampusAboutComponent: About to call campusApi.submitFeedback()...');

    // Call API - ensure the observable is subscribed to
    const apiCall = this.campusApi.submitFeedback(requestData);
    console.log('CampusAboutComponent: API call observable created:', apiCall);
    
    apiCall.subscribe({
      next: (response: FeedbackResponse | null) => {
        console.log('CampusAboutComponent: ✅ SUBMIT FEEDBACK API RESPONSE RECEIVED');
        console.log('CampusAboutComponent: Response:', response);
        console.log('CampusAboutComponent: Response success:', response?.success);
        
        this.submittingFeedback = false;

        if (response?.success) {
          const successMessage = response.message || 'Thank you for your feedback! We will review it and get back to you soon.';
          console.log('CampusAboutComponent: ✅ Success:', successMessage);
          this.notify.success(successMessage);
          
          // Reset form after successful submission
          this.feedbackForm = {
            name: '',
            contact: '',
            message: '',
            recommendation: ''
          };
        } else {
          const errorMessage = response?.error || response?.message || 'Failed to submit feedback. Please try again.';
          console.error('CampusAboutComponent: ❌ API returned unsuccessful response:', errorMessage);
          this.notify.error(errorMessage);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: ❌ SUBMIT FEEDBACK API ERROR');
        console.error('CampusAboutComponent: Error object:', error);
        console.error('CampusAboutComponent: Error type:', typeof error);
        console.error('CampusAboutComponent: Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url,
          name: error?.name,
          stack: error?.stack
        });
        
        this.submittingFeedback = false;
        
        // Handle HttpErrorResponse
        if (error && typeof error === 'object' && 'status' in error) {
          console.error('CampusAboutComponent: This is an HttpErrorResponse');
          const httpError = error as HttpErrorResponse;
          console.error('CampusAboutComponent: HTTP Status:', httpError.status);
          console.error('CampusAboutComponent: HTTP Status Text:', httpError.statusText);
          console.error('CampusAboutComponent: HTTP Error Body:', httpError.error);
        }
        
        let errorMessage = 'Failed to submit feedback. Please try again.';
        if (error?.error) {
          if (error.error.message && typeof error.error.message === 'string' && error.error.message !== 'null' && error.error.message.trim()) {
            errorMessage = error.error.message;
          } else if (error.error.error && typeof error.error.error === 'string' && error.error.error !== 'null' && error.error.error.trim()) {
            errorMessage = error.error.error;
          }
        } else if (error?.message && typeof error.message === 'string') {
          errorMessage = error.message;
        }
        
        console.error('CampusAboutComponent: Displaying error message:', errorMessage);
        this.notify.error(errorMessage);
      },
      complete: () => {
        console.log('CampusAboutComponent: ✅ SUBMIT FEEDBACK API CALL COMPLETED (observable completed)');
      }
    });
    
    console.log('CampusAboutComponent: ✅ subscribe() called on API observable');
  }

}