import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { StudentResumeUploadComponent } from '../resume-upload/student-resume-upload.component';
import { StudentCareerCheckinComponent } from '../career-checkin/student-career-checkin.component';
import { StudentLearningPathwayComponent } from '../learning-pathway/student-learning-pathway.component';
import { StudentIdeasSubmissionComponent } from '../ideas-submission/student-ideas-submission.component';
import { StudentAiToolkitComponent } from '../ai-toolkit/ai-toolkit.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { CampusResponse } from '../../models/student.models';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    DropdownComponent,
    ButtonComponent,
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
    console.log('StudentHomeComponent: ngOnInit called');
    this.loadCampuses();
    this.loadData();
  }

  loadCampuses(): void {
    this.studentApiService.getRegisteredCampuses().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          console.log('StudentHomeComponent: Campuses loaded:', response.data);
          console.log('StudentHomeComponent: Total campuses:', response.data.length);
          this.campuses.set(response.data);
          // Debug: Log campus items
          console.log('StudentHomeComponent: Campus items for dropdown:', this.getCampusItems());
        } else {
          console.warn('StudentHomeComponent: No campus data in response:', response);
        }
      },
      error: (error) => {
        console.error('Failed to load campuses:', error);
      },
    });
  }

  loadData(): void {
    console.log('StudentHomeComponent: loadData called');
    const currentUser = this.authService.getCurrentUser();
    console.log('StudentHomeComponent: currentUser =', currentUser);
    const studentId = currentUser?.studentId;

    console.log('StudentHomeComponent: studentId =', studentId);
    console.log('StudentHomeComponent: currentUser =', currentUser);

    if (!studentId) {
      console.warn('Student ID not found. Cannot load batchmates, alumni, or placed students.');
      return;
    }

    // Try to get campusName and yearOfPassing from localStorage (stored during registration/profile update)
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
    // Load placed students as it doesn't require profile data
    // this.loadPlacedStudents();
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
    console.log('StudentHomeComponent: loadBatchmates called with studentId =', studentId);
    
    const profile = this.studentProfile();
    if (!profile) {
      console.warn('Student profile not loaded yet. Cannot load batchmates.');
      return;
    }

    const institutionName = Array.isArray(profile['institutionName']) && profile['institutionName'].length > 0
      ? String(profile['institutionName'][0])
      : null;
    const yearOfPassing = profile['yearOfPassing'] ? String(profile['yearOfPassing']) : null;

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
          console.log('StudentHomeComponent: Batchmates response received:', response);
          this.loadingBatchmates.set(false);
          if (response?.success && response.data) {
            const items = response.data.map((item) => this.mapBatchmateToPersonCard(item));
            console.log('StudentHomeComponent: Mapped batchmates items:', items);
            this.batchmates.set(items);
            // For batchmates, API returns array, calculate pages from length
            // Note: If API returns pagination metadata, use that instead
            this.batchmatesTotalPages.set(Math.max(1, Math.ceil(items.length / this.peoplePageSize)));
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
    console.log('StudentHomeComponent: loadPlacedStudents called');
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
          console.log('StudentHomeComponent: Placed students response received:', response);
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapPlacedStudentToPersonCard(item));
            console.log('StudentHomeComponent: Mapped placed students items:', items);
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
    console.log('StudentHomeComponent: loadAlumni called with studentId =', studentId);
    
    const campusName = this.selectedCampusName();
    const yearOfPassing = this.selectedYearOfPassing();

    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load alumni: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingAlumni.set(true);
    console.log('StudentHomeComponent: Loading alumni for campus =', campusName, 'year =', yearOfPassing);
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
          console.log('StudentHomeComponent: Alumni response received:', response);
          this.loadingAlumni.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapAlumniToPersonCard(item));
            console.log('StudentHomeComponent: Mapped alumni items:', items);
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
    this.modalService.closeModal();
  }

  /**
   * Get campus dropdown items (computed to always have latest data)
   */
  readonly campusItems = computed<DropdownItem[]>(() => {
    const items = this.campuses().map((campus) => ({
      value: campus.campusName || '',
      label: campus.campusName || '',
    })).filter(item => item.value && item.label); // Filter out empty values
    
    console.log('StudentHomeComponent: campusItems computed - Total items:', items.length, items);
    return items;
  });

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
    this.selectedCampusName.set(campusName);
    // Apply filters immediately when value changes
    if (this.selectedYearOfPassing()) {
      this.applyFilters();
    }
  }

  /**
   * Handle year selection change
   */
  onYearChange(year: string): void {
    this.selectedYearOfPassing.set(year);
    // Apply filters immediately when value changes
    if (this.selectedCampusName()) {
      this.applyFilters();
    }
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
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
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
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
  }

  private mapAlumniToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    designation?: string;
    companyName?: string;
  }): PersonCard {
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = [item.designation, item.companyName].filter(Boolean).join(' ') || '';
    return {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
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

  handleCareerCheckinSubmit(value: {
    companyName: string;
    jobTitle: string;
    startDate: string;
    endDate: string;
    currentlyWorking: boolean;
    recnHelped: boolean;
  }): void {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.userId?.toString();

    if (!userId) {
      console.error('User ID not found. Cannot submit career check-in.');
      this.submittingCareerCheckin = false;
      return;
    }

    this.submittingCareerCheckin = true;

    // Map form value to API request format
    // If currently working, endDate is optional (can be empty string)
    const request = {
      companyName: value.companyName.trim(),
      jobTitle: value.jobTitle.trim(),
      startDate: value.startDate,
      endDate: value.currentlyWorking ? (value.endDate || '') : value.endDate,
      isCurrentlyWorking: value.currentlyWorking,
      recnHelped: value.recnHelped,
    };

    this.studentApiService
      .createOrUpdateCareerCheckIn(userId, request)
      .pipe(
        catchError((error) => {
          console.error('Error submitting career check-in:', error);
          console.error('Error status:', error?.status);
          console.error('Error message:', error?.message);
          console.error('Error response:', error?.error);
          this.submittingCareerCheckin = false;
          // Don't close modal on error - let user see the error and try again
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.submittingCareerCheckin = false;
          if (response?.success) {
            console.log('Career check-in saved successfully:', response);
            // Only close modal on successful submission
            this.closeModal();
          } else {
            console.error('Failed to save career check-in:', response);
            // Don't close modal on failure - let user see the error
          }
        },
        error: (error) => {
          // This should not be reached due to catchError, but just in case
          console.error('Unexpected error in subscribe:', error);
          this.submittingCareerCheckin = false;
        },
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleIdeasSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingIdeas = true;
    // TODO: Call API service
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

