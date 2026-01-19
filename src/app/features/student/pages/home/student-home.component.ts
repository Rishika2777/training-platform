import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent, DropdownItem, ApiFetchFunction } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { StudentResumeUploadComponent } from '../resume-upload/student-resume-upload.component';
import { StudentCareerCheckinComponent } from '../career-checkin/student-career-checkin.component';
import { StudentLearningPathwayComponent } from '../learning-pathway/student-learning-pathway.component';
import { StudentIdeasSubmissionComponent } from '../ideas-submission/student-ideas-submission.component';
import { StudentAiToolkitComponent } from '../ai-toolkit/ai-toolkit.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { catchError, of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CampusResponse } from '../../models/student.models';
import { APP_CONFIG_TOKEN, APP_CONFIG } from '../../../../core/config/app.constants';
import { CampusApiService, CampusAutocompleteResponse } from '../../../../features/campus/services/campus-api.service';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    DropdownComponent,
    ButtonComponent,
    AvatarComponent,
    StudentResumeUploadComponent,
    StudentCareerCheckinComponent,
    StudentLearningPathwayComponent,
    StudentIdeasSubmissionComponent,
    StudentAiToolkitComponent,
  ],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.css',
})
export class StudentHomeComponent implements OnInit {
  readonly modalService = inject(ModalService);
  readonly studentApiService = inject(StudentApiService);
  readonly authService = inject(AuthService);
  private readonly campusApiService = inject(CampusApiService);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isResumeModalOpen = computed(() => this.activeModal() === 'resume-upload');
  readonly isCareerCheckinModalOpen = computed(() => this.activeModal() === 'career-checkin');
  readonly isLearningPathwayModalOpen = computed(() => this.activeModal() === 'learning-pathway');
  readonly isIdeasSubmissionModalOpen = computed(() => this.activeModal() === 'ideas-submission');
  readonly isDreamJobToolkitModalOpen = computed(() => this.activeModal() === 'dream-job-toolkit');
  readonly isFilterModalOpen = computed(() => this.activeModal() === 'batchmates-filter');

  submittingResume = false;
  submittingCareerCheckin = false;
  submittingIdeas = false;
  readonly announcementDate = 'January 7th, 2025';

  readonly batchmates = signal<readonly PersonCard[]>([]);
  readonly placedStudents = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly campuses = signal<readonly CampusResponse[]>([]);

  loadingBatchmates = signal(false);
  loadingPlacedStudents = signal(false);
  loadingAlumni = signal(false);

  // Store student profile data for campusName and yearOfPassing (from localStorage)
  readonly studentProfile = signal<Record<string, unknown> | null>(null);

  // Filter state for batchmates and alumni
  readonly selectedCampusName = signal<string | null>(null);
  readonly selectedYearOfPassing = signal<string | null>(null);

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

  readonly registeredCompaniesSlots = 3;

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 6;
  batchmatesPage = 1;
  placedStudentsPage = 1;
  alumniPage = 1;

  batchmatesTotalPages = signal(1);
  placedStudentsTotalPages = signal(1);
  alumniTotalPages = signal(1);

  batchmatesPageItems(): readonly PersonCard[] {
    return slicePage(this.batchmates(), this.batchmatesPage, this.peoplePageSize);
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents(), this.placedStudentsPage, this.peoplePageSize);
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni(), this.alumniPage, this.peoplePageSize);
  }

  ngOnInit(): void {
    this.loadInitialCampuses();
    this.loadData();
  }

  /**
   * Load initial campuses on component init using search API
   * This populates the dropdown with initial data so users see options immediately
   */
  loadInitialCampuses(): void {
    this.campusApiService.getCampusBySearch('', 0, 20).subscribe({
      next: (response) => {        
        if (response) {
          let content: CampusAutocompleteResponse[] | undefined;
          
          // Check if content is in response.data.content
          if (response.data?.content && Array.isArray(response.data.content)) {
            content = response.data.content;
          }
          // Check if content is directly in response.data (array)
          else if (response.data && Array.isArray(response.data)) {
            content = response.data as CampusAutocompleteResponse[];
          }
          // Check if content is at root level
          else if ('content' in response && Array.isArray((response as Record<string, unknown>)['content'])) {
            content = (response as Record<string, unknown>)['content'] as CampusAutocompleteResponse[];
          }
          
          if (content && content.length > 0) {
            // Convert to CampusResponse format for compatibility
            const campusResponses: CampusResponse[] = content
              .filter((campus) => {
                const campusId = campus.campusId || campus.id;
                return !!campusId && !!campus.campusName;
              })
              .map((campus) => ({
                campusId: campus.campusId || campus.id || '',
                campusName: campus.campusName || '',
                campusAddress: campus.campusAddress,
              }));
            this.campuses.set(campusResponses);
          } else {
            console.warn('StudentHomeComponent: No campus content in initial response');
          }
        }
      },
      error: (error) => {
        console.error('StudentHomeComponent: Failed to load initial campuses:', error);
      },
    });
  }

  loadData(): void {
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId;
    const userId = currentUser?.userId?.toString();

    if (!studentId || !userId) {
      console.warn('Student ID or User ID not found. Cannot load profile and related data.');
      return;
    }

    // Call getStudentFullProfile API to get fresh data
    this.studentApiService.getStudentFullProfile(studentId, userId, 'STUDENT').subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const profileData = response.data as Record<string, unknown>;
          
          // Store profile data in localStorage for navbar and other components
          try {
            localStorage.setItem('student_profile_data', JSON.stringify(profileData));
            // Dispatch event to notify sidebar and other components
            window.dispatchEvent(new Event('studentProfileUpdated'));
          } catch (error) {
            console.error('Error storing profile data:', error);
          }
          
          // Update signal with profile data
          this.studentProfile.set(profileData);
          
          // Extract firstName and lastName for navbar
          const firstName = profileData['firstName'] ? String(profileData['firstName']) : '';
          const lastName = profileData['lastName'] ? String(profileData['lastName']) : '';
          console.log('Student name loaded:', firstName, lastName);
          
          // Extract institutionName and yearOfPassing
          console.log('📊 Profile data institutionName:', profileData['institutionName']);
          console.log('📊 Profile data campusName:', profileData['campusName']);
          
          const institutionName = Array.isArray(profileData['institutionName']) && profileData['institutionName'].length > 0
            ? String(profileData['institutionName'][0])
            : null;
          const yearOfPassing = profileData['yearOfPassing'] ? String(profileData['yearOfPassing']) : null;
          
          console.log('✅ Setting selectedCampusName to:', institutionName);
          console.log('✅ Setting selectedYearOfPassing to:', yearOfPassing);
          
          this.selectedCampusName.set(institutionName);
          this.selectedYearOfPassing.set(yearOfPassing);
          
          // Load batchmates and alumni with the profile data
          if (institutionName && yearOfPassing) {
            this.loadBatchmates(studentId);
            this.loadAlumni(studentId);
          } else {
            console.warn('Cannot load batchmates/alumni: institutionName or yearOfPassing is missing');
          }
        } else {
          console.warn('Profile data not found in API response');
          // Fallback to localStorage if API fails
          this.loadDataFromStorage(studentId);
        }
      },
      error: (error) => {
        console.error('Error loading student profile:', error);
        // Fallback to localStorage if API fails
        this.loadDataFromStorage(studentId);
      },
    });
  }

  /**
   * Fallback method to load data from localStorage if API fails
   */
  private loadDataFromStorage(studentId: string): void {
    const storedProfile = this.getStoredProfileData();
    if (storedProfile) {
      this.studentProfile.set(storedProfile);
      // Initialize filter values from profile
      const institutionName = Array.isArray(storedProfile['institutionName']) && storedProfile['institutionName'].length > 0
        ? String(storedProfile['institutionName'][0])
        : null;
      const yearOfPassing = storedProfile['yearOfPassing'] ? String(storedProfile['yearOfPassing']) : null;
      
      this.selectedCampusName.set(institutionName);
      this.selectedYearOfPassing.set(yearOfPassing);
      
      // Load batchmates, alumni, and placed students with the stored profile data
      if (institutionName && yearOfPassing) {
        this.loadBatchmates(studentId);
        this.loadAlumni(studentId);
      }
    } else {
      console.warn('Profile data not found in storage. Batchmates and alumni will not be loaded.');
    }
  }

  /**
   * Get stored profile data from localStorage
   * This data should be stored when profile is loaded/updated elsewhere
   */
  private getStoredProfileData(): Record<string, unknown> | null {
    try {
      const stored = localStorage.getItem('student_profile_data');
      if (stored) {
        return JSON.parse(stored) as Record<string, unknown>;
      }
    } catch (error) {
      console.error('Error reading stored profile data:', error);
    }
    return null;
  }

  loadBatchmates(studentId: string): void {    
    const profile = this.studentProfile();
    if (!profile) {
      console.warn('Student profile not loaded yet. Cannot load batchmates.');
      return;
    }

    const institutionName = Array.isArray(profile['institutionName']) && profile['institutionName'].length > 0
      ? String(profile['institutionName'][0])
      : null;
    const yearOfPassing = profile['yearOfPassing'] ? String(profile['yearOfPassing']) : null;
    
    console.log('👥 loadBatchmates using institutionName:', institutionName);
    console.log('👥 loadBatchmates using yearOfPassing:', yearOfPassing);

    if (!institutionName || !yearOfPassing) {
      console.warn('Cannot load batchmates: institutionName or yearOfPassing is missing', { institutionName, yearOfPassing });
      return;
    }

    this.loadingBatchmates.set(true);
    this.studentApiService
      .getBatchmates(studentId, institutionName, yearOfPassing, this.batchmatesPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('Error loading batchmates:', error);
          this.loadingBatchmates.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingBatchmates.set(false);
          if (response?.success && response.data) {
            // API returns data.content array with pagination metadata, or data as array directly
            const data = response.data as Record<string, unknown> | unknown[];
            const content = Array.isArray(data) ? data : ((data as Record<string, unknown>)['content'] as unknown[] || []);
            const items = content.map((item) => this.mapBatchmateToPersonCard(item as Record<string, unknown>));
            this.batchmates.set(items);
            // Use pagination metadata from API if available
            const totalPages = Array.isArray(data) 
              ? Math.max(1, Math.ceil(items.length / this.peoplePageSize)) 
              : (typeof (data as Record<string, unknown>)['totalPages'] === 'number' ? (data as Record<string, unknown>)['totalPages'] as number : 1);
            this.batchmatesTotalPages.set(totalPages);
          } else {
            console.warn('StudentHomeComponent: Batchmates response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Batchmates subscription error:', error);
          this.loadingBatchmates.set(false);
        },
      });
  }

  loadPlacedStudents(): void {
    this.loadingPlacedStudents.set(true);
    this.studentApiService
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('Error loading placed students:', error);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapPlacedStudentToPersonCard(item));
            this.placedStudents.set(items);
            this.placedStudentsTotalPages.set(response.data.totalPages || 1);
          } else {
            console.warn('StudentHomeComponent: Placed students response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Placed students subscription error:', error);
          this.loadingPlacedStudents.set(false);
        },
      });
  }

  loadAlumni(studentId: string): void {    
    const campusName = this.selectedCampusName();
    const yearOfPassing = this.selectedYearOfPassing();
    
    console.log('🎓 loadAlumni called with selectedCampusName:', campusName);
    console.log('🎓 loadAlumni called with selectedYearOfPassing:', yearOfPassing);

    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load alumni: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingAlumni.set(true);
    this.studentApiService
      .getAlumniForStudent(studentId, campusName, yearOfPassing, this.alumniPage, 12)
      .pipe(
        catchError((error) => {
          console.error('Error loading alumni:', error);
          this.loadingAlumni.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingAlumni.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapAlumniToPersonCard(item));
            this.alumni.set(items);
            this.alumniTotalPages.set(response.data.totalPages || 1);
          } else {
            console.warn('StudentHomeComponent: Alumni response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Alumni subscription error:', error);
          this.loadingAlumni.set(false);
        },
      });
  }

  onBatchmatesPageChange(page: number): void {
    this.batchmatesPage = page;
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId || currentUser?.profileServiceId;
    if (studentId) {
      this.loadBatchmates(studentId);
    }
  }

  onPlacedStudentsPageChange(page: number): void {
    this.placedStudentsPage = page;
    this.loadPlacedStudents();
  }

  onAlumniPageChange(page: number): void {
    this.alumniPage = page;
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId || currentUser?.profileServiceId;
    if (studentId) {
      this.loadAlumni(studentId);
    }
  }

  /**
   * Open filter modal for batchmates/alumni
   */
  openFilterModal(): void {
    this.modalService.openModal('batchmates-filter');
  }

  /**
   * Close filter modal
   */
  closeFilterModal(): void {
    console.log('✅ Apply button clicked - Applying filters with:', {
      campusName: this.selectedCampusName(),
      yearOfPassing: this.selectedYearOfPassing()
    });
    
    // Apply filters before closing
    this.applyFilters();
    this.modalService.closeModal();
  }

  /**
   * Get campus dropdown items (computed to always have latest data)
   * This is kept for backward compatibility, but apiFetchFn is preferred
   */
  readonly campusItems = computed<DropdownItem[]>(() => {
    const items = this.campuses().map((campus) => ({
      value: campus.campusName || '',
      label: campus.campusName || '',
    })).filter(item => item.value && item.label); // Filter out empty values
    return items;
  });

  /**
   * API fetch function for campus autocomplete (called when user types)
   * This is used for filtering/searching campuses as user types
   */
  fetchCampuses: ApiFetchFunction<string> = (searchTerm: string): Observable<DropdownItem<string>[]> => {    
    // Always call the API to ensure fresh data
    return this.campusApiService.getCampusBySearch(searchTerm || '', 0, 20).pipe(
      map((response) => {        
        const items: DropdownItem<string>[] = [];
        
        if (response) {
          // Try different response structures
          let content: CampusAutocompleteResponse[] | undefined;
          
          // Check if content is in response.data.content
          if (response.data?.content && Array.isArray(response.data.content)) {
            content = response.data.content;
          }
          // Check if content is directly in response.data (array)
          else if (response.data && Array.isArray(response.data)) {
            content = response.data as CampusAutocompleteResponse[];
          }
          // Check if content is at root level
          else if ('content' in response && Array.isArray((response as Record<string, unknown>)['content'])) {
            content = (response as Record<string, unknown>)['content'] as CampusAutocompleteResponse[];
          }
          
          if (content && content.length > 0) {
            const campusItems = content
              .filter((campus) => {
                const campusId = campus.campusId || campus.id;
                const hasId = !!campusId;
                const hasName = !!campus.campusName;
                return hasId && hasName;
              })
              .map((campus) => {
                const campusName = campus.campusName || '';
                const item = {
                  label: campusName,
                  value: campusName, // Use campusName as value for filter dropdown
                };
                return item;
              });
            items.push(...campusItems);
          }
        }
        return items;
      }),
      catchError((error) => {
        console.error('StudentHomeComponent: Error in fetchCampuses:', error);
        return of([]);
      })
    );
  };

  /**
   * Get campus dropdown items (legacy method for compatibility)
   */
  getCampusItems(): DropdownItem[] {
    return this.campusItems();
  }

  /**
   * Get year dropdown items (generate years from current year to 10 years back)
   */
  getYearItems(): DropdownItem[] {
    const currentYear = new Date().getFullYear();
    const years: DropdownItem[] = [];
    for (let i = 0; i <= 10; i++) {
      const year = (currentYear - i).toString();
      years.push({ value: year, label: year });
    }
    return years;
  }

  /**
   * Handle campus selection change
   */
  onCampusChange(campusName: string): void {
    console.log('⚠️ onCampusChange called with:', campusName);
    console.log('⚠️ Current selectedCampusName:', this.selectedCampusName());
    
    // Just update the value, don't apply filters yet (wait for Apply button)
    this.selectedCampusName.set(campusName);
  }

  /**
   * Handle year selection change
   */
  onYearChange(year: string): void {
    // Just update the value, don't apply filters yet (wait for Apply button)
    this.selectedYearOfPassing.set(year);
  }

  /**
   * Apply filters and reload batchmates and alumni
   */
  applyFilters(): void {
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId;
    
    if (!studentId) {
      return;
    }

    const campusName = this.selectedCampusName();
    const yearOfPassing = this.selectedYearOfPassing();

    if (campusName && yearOfPassing) {
      // Reset to first page when filters change
      this.batchmatesPage = 1;
      this.alumniPage = 1;
      
      // Reload both batchmates and alumni with new filters
      this.loadBatchmates(studentId);
      this.loadAlumni(studentId);
    }
  }

  private mapBatchmateToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    batch?: string;
  }): PersonCard {
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = item.batch || '';
    return {
      name,
      subtitle,
      imageUrl: this.buildImageUrl(item.profilePhotoUrl),
    };
  }

  private mapPlacedStudentToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    studentName?: string;
    profilePhotoUrl?: string;
    batch?: string;
    companyName?: string;
    designation?: string;
  }): PersonCard {
    // Use studentName if available, otherwise fall back to firstName + lastName
    const name = item.studentName || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = [item.batch, item.companyName].filter(Boolean).join(' ') || '';
    return {
      name,
      subtitle,
      imageUrl: this.buildImageUrl(item.profilePhotoUrl),
    };
  }

  /**
   * Build full image URL from profilePhotoUrl
   * If it's just a filename, construct the full URL
   * If it's already a full URL, return as-is
   */
  private buildImageUrl(profilePhotoUrl?: string | null): string | null {
    if (!profilePhotoUrl) {
      return null; // Return null so AvatarComponent can show initials
    }
    
    // If it's already a full URL (starts with http:// or https://), return as-is
    if (profilePhotoUrl.startsWith('http://') || profilePhotoUrl.startsWith('https://')) {
      return profilePhotoUrl;
    }
    
    // If it's a data URL, return as-is
    if (profilePhotoUrl.startsWith('data:')) {
      return profilePhotoUrl;
    }
    
    // Otherwise, assume it's a filename and construct the full URL
    // Use the API base URL from config
    const baseUrl = this.config.API_BASE_URL || '/api/v1';
    // Remove leading slash from profilePhotoUrl if present
    const cleanUrl = profilePhotoUrl.startsWith('/') ? profilePhotoUrl.slice(1) : profilePhotoUrl;
    return `${baseUrl}/images/${cleanUrl}`;
  }

  private mapAlumniToPersonCard(item: {
    name?: string;
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    designation?: string;
    companyName?: string;
    company?: string;
  }): PersonCard {
    // API returns 'name' field directly, fallback to firstName + lastName
    const name = item.name || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = [item.designation, item.companyName || item.company].filter(Boolean).join(' ') || '';
    return {
      name,
      subtitle,
      imageUrl: this.buildImageUrl(item.profilePhotoUrl),
    };
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleResumeSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingResume = true;
    // TODO: Call API service
  }

  handleCareerCheckinSubmit(): void {
    // Submission now handled inside career-checkin component
    this.submittingCareerCheckin = false;
    this.closeModal();
  }

  handleIdeasSubmit(): void {
    // Submission now handled inside ideas-submission component
    this.submittingIdeas = false;
    this.closeModal();
  }
}

interface PersonCard {
  name: string;
  subtitle: string;
  imageUrl: string | null;
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

