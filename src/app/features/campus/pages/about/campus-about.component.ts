import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusVisitCampusComponent, VisitCampusFormValue } from '../visit-campus/campus-visit-campus.component';
import { CampusApiService, FacultyData, FacultiesResponse, TestimonialData, TestimonialsResponse, ResearchData, ResearchResponse, RisingStarData, SuccessStoryData, GetProspectusResponse, CourseData, PlacementInsightsResponse, YearlyTrend } from '../../services/campus-api.service';
import { ApiResponsePageAlumniResponse, AlumniResponse } from '../../../student/models/student.models';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { catchError, of } from 'rxjs';

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
}

@Component({
  selector: 'app-campus-about',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CarouselComponent,
    InputComponent,
    TextareaComponent,
    ModalComponent,
    CampusVisitCampusComponent,
  ],
  templateUrl: './campus-about.component.html',
  styleUrl: './campus-about.component.css',
})
export class CampusAboutComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);
  private readonly notify = inject(NotificationService);
  readonly pageSize = 8;

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isVisitCampusModalOpen = computed(() => this.activeModal() === 'visit-campus');

  submittingVisitCampus = false;

  // Rising Stars - API Integration
  readonly risingStars = signal<readonly PersonCard[]>([]);
  readonly loadingRisingStars = signal(false);
  risingStarsPage = 1;
  readonly risingStarsTotalPages = signal(1);

  // Campus Insights - About Campus Content
  readonly aboutCampusText = signal<string>('');
  readonly loadingAboutCampus = signal(false);
  
  // Prospectus Download
  readonly downloadingProspectus = signal(false);

  ngOnInit(): void {
    this.loadRisingStars();
    this.loadAboutCampus();
    this.loadSuccessStories();
    this.loadFaculties();
    this.loadTestimonials();
    this.loadResearch();
    this.loadAlumni();
    this.loadCourses();
    this.loadPlacementInsights();
  }

  loadAboutCampus(): void {
    console.log('🔵🔵🔵 CampusAboutComponent: loadAboutCampus() CALLED 🔵🔵🔵');
    
    // Try multiple sources for campusId (correct sources only)
    // 1. From storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    console.log('CampusAboutComponent: CampusId from storage:', campusIdFromStorage);
    
    // 2. From auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    console.log('CampusAboutComponent: Current user:', currentUser);
    console.log('CampusAboutComponent: CampusId from user.profileServiceId:', campusIdFromUser);
    
    // Use the first available campusId (only from correct sources)
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    console.log('CampusAboutComponent: Final campusId to use:', campusId);
    
    if (!campusId) {
      console.warn('❌ CampusAboutComponent: No campusId found in storage or auth state');
      console.warn('CampusAboutComponent: Storage campusId:', campusIdFromStorage);
      console.warn('CampusAboutComponent: Auth state campusId:', campusIdFromUser);
      console.warn('CampusAboutComponent: User object:', currentUser);
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }
    
    console.log('✅ CampusAboutComponent: CampusId found:', campusId);

    console.log('✅ CampusAboutComponent: CampusId found:', campusId);
    console.log('CampusAboutComponent: Making API call to getCampusById...');
    console.log('CampusAboutComponent: API Endpoint will be: GET /campus/' + campusId);
    
    this.loadingAboutCampus.set(true);
    console.log('CampusAboutComponent: Loading state set to true');

    this.campusApi.getCampusById(campusId).pipe(
      catchError((error) => {
        console.error('❌❌❌ CampusAboutComponent: API ERROR in pipe ❌❌❌');
        console.error('CampusAboutComponent: Error object:', error);
        console.error('CampusAboutComponent: Error status:', error?.status);
        console.error('CampusAboutComponent: Error statusText:', error?.statusText);
        console.error('CampusAboutComponent: Error URL:', error?.url);
        console.error('CampusAboutComponent: Error message:', error?.message);
        console.error('CampusAboutComponent: Error response:', error?.error);
        this.loadingAboutCampus.set(false);
        return of(null);
      })
    ).subscribe({
      next: (campus) => {
        console.log('✅✅✅ CampusAboutComponent: API RESPONSE RECEIVED ✅✅✅');
        console.log('CampusAboutComponent: Full campus object:', JSON.stringify(campus, null, 2));
        console.log('CampusAboutComponent: Campus type:', typeof campus);
        console.log('CampusAboutComponent: Campus is null?', campus === null);
        console.log('CampusAboutComponent: Campus is undefined?', campus === undefined);
        
        this.loadingAboutCampus.set(false);
        console.log('CampusAboutComponent: Loading state set to false');
        
        if (campus) {
          console.log('CampusAboutComponent: Campus object exists');
          console.log('CampusAboutComponent: Has aboutCampus property?', 'aboutCampus' in campus);
          console.log('CampusAboutComponent: aboutCampus value:', campus.aboutCampus);
          console.log('CampusAboutComponent: aboutCampus type:', typeof campus.aboutCampus);
          console.log('CampusAboutComponent: aboutCampus length:', campus.aboutCampus?.length);
          
          if (campus.aboutCampus) {
            console.log('✅ CampusAboutComponent: aboutCampus found! Setting text...');
            this.aboutCampusText.set(campus.aboutCampus);
            console.log('✅ CampusAboutComponent: aboutCampusText signal updated with:', campus.aboutCampus);
            console.log('✅ CampusAboutComponent: Current aboutCampusText() value:', this.aboutCampusText());
          } else {
            console.warn('⚠️ CampusAboutComponent: aboutCampus field is empty or null');
            console.warn('CampusAboutComponent: All campus properties:', Object.keys(campus));
            this.aboutCampusText.set('');
          }
        } else {
          console.warn('⚠️ CampusAboutComponent: Campus object is null or undefined');
          this.aboutCampusText.set('');
        }
      },
      error: (error) => {
        console.error('❌❌❌ CampusAboutComponent: SUBSCRIPTION ERROR ❌❌❌');
        console.error('CampusAboutComponent: Error in subscribe error handler:', error);
        this.loadingAboutCampus.set(false);
        this.aboutCampusText.set('');
      }
    });
  }

  loadRisingStars(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found in storage or auth state, cannot load rising stars');
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }

    console.log('CampusAboutComponent: Loading rising stars for campusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.risingStarsPage, 'Size:', this.pageSize);
    
    this.loadingRisingStars.set(true);
    
    this.campusApi.getRisingStars(campusId, this.risingStarsPage, this.pageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading rising stars:', error);
        this.loadingRisingStars.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        console.log('CampusAboutComponent: Rising stars response received:', response);
        this.loadingRisingStars.set(false);
        
        if (response && response.content && Array.isArray(response.content)) {
          const mappedStars = response.content.map((star) => this.mapRisingStarToPersonCard(star));
          this.risingStars.set(mappedStars);
          
          const totalPages = response.totalPages ?? 0;
          this.risingStarsTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped rising stars:', mappedStars.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
          this.risingStars.set([]);
          this.risingStarsTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Rising stars subscription error:', error);
        this.loadingRisingStars.set(false);
        this.risingStars.set([]);
        this.risingStarsTotalPages.set(1);
      }
    });
  }

  private mapRisingStarToPersonCard(star: RisingStarData): PersonCard {
    return {
      id: star.id || star.studentId || star.userId || '',
      name: star.studentName || `${star.firstName || ''} ${star.lastName || ''}`.trim() || 'Name',
      imageUrl: star.profilePhotoUrl || star.imageUrl || 'assets/images/login-news-image.png',
      batch: star.batch,
    };
  }

  risingStarsPageItems(): readonly PersonCard[] {
    return this.risingStars();
  }

  onRisingStarsPageChange(page: number): void {
    if (page !== this.risingStarsPage && page >= 1) {
      this.risingStarsPage = page;
      this.loadRisingStars();
    }
  }

  // Success Stories - API Integration
  readonly successStories = signal<readonly PersonCard[]>([]);
  readonly loadingSuccessStories = signal(false);
  successStoryPage = 1;
  readonly successStoryPageSize = 6;
  readonly successStoriesTotalPages = signal(1);

  loadSuccessStories(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found, cannot load success stories');
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }

    console.log('CampusAboutComponent: Loading success stories for campusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.successStoryPage, 'Size:', this.successStoryPageSize);
    
    this.loadingSuccessStories.set(true);
    
    this.campusApi.getSuccessStories(campusId, this.successStoryPage, this.successStoryPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading success stories:', error);
        this.loadingSuccessStories.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        console.log('CampusAboutComponent: Success stories response received:', response);
        this.loadingSuccessStories.set(false);
        
        if (response && response.content && Array.isArray(response.content)) {
          const mappedStories = response.content.map((story) => this.mapSuccessStoryToPersonCard(story));
          this.successStories.set(mappedStories);
          
          const totalPages = response.totalPages ?? 0;
          this.successStoriesTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped success stories:', mappedStories.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
          this.successStories.set([]);
          this.successStoriesTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Success stories subscription error:', error);
        this.loadingSuccessStories.set(false);
        this.successStories.set([]);
        this.successStoriesTotalPages.set(1);
      }
    });
  }

  private mapSuccessStoryToPersonCard(story: SuccessStoryData): PersonCard {
    return {
      id: story.id || story.studentId || story.userId || '',
      name: story.studentName || `${story.firstName || ''} ${story.lastName || ''}`.trim() || 'Name',
      imageUrl: story.profilePhotoUrl || story.imageUrl || 'assets/images/login-news-image.png',
      batch: story.batch,
      company: story.companyName || story.company,
    };
  }

  successStoriesPageItems(): readonly PersonCard[] {
    return this.successStories();
  }

  previousSuccessStory(): void {
    if (this.successStoryPage > 1) {
      this.successStoryPage--;
      this.loadSuccessStories();
    }
  }

  nextSuccessStory(): void {
    if (this.successStoryPage < this.successStoriesTotalPages()) {
      this.successStoryPage++;
      this.loadSuccessStories();
    }
  }

  // Courses - API Integration
  readonly courses = signal<readonly CourseCard[]>([]);
  readonly loadingCourses = signal(false);
  coursePage = 1;
  readonly coursePageSize = 4;
  readonly coursesTotalPages = signal(1);

  loadCourses(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found in storage or auth state, cannot load courses');
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }

    console.log('CampusAboutComponent: Loading courses for campusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.coursePage, 'Size:', this.coursePageSize);
    
    this.loadingCourses.set(true);
    
    this.campusApi.getCourses(campusId, this.coursePage, this.coursePageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading courses:', error);
        this.loadingCourses.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        console.log('CampusAboutComponent: Courses response received:', response);
        this.loadingCourses.set(false);
        
        if (response && response.content && Array.isArray(response.content)) {
          const mappedCourses = response.content.map((course) => this.mapCourseDataToCourseCard(course));
          this.courses.set(mappedCourses);
          
          const totalPages = response.totalPages ?? 0;
          this.coursesTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped courses:', mappedCourses.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
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

  private mapCourseDataToCourseCard(course: CourseData): CourseCard {
    // Parse seats from seatsAvailable string or use seats number
    let seats = 0;
    if (course.seats !== undefined) {
      seats = course.seats;
    } else if (course.seatsAvailable) {
      const parsed = parseInt(course.seatsAvailable, 10);
      if (!isNaN(parsed)) {
        seats = parsed;
      }
    }

    // Use courseName or name, fallback to empty string
    const courseName = course.courseName || course.name || '';
    
    // Use courseDuration or duration, fallback to empty string
    const duration = course.courseDuration || course.duration || '';

    return {
      id: course.id || course.courseId || '',
      name: courseName,
      seats: seats,
      duration: duration,
    };
  }

  coursesPageItems(): readonly CourseCard[] {
    return this.courses();
  }

  previousCourse(): void {
    if (this.coursePage > 1) {
      this.coursePage--;
      this.loadCourses();
    }
  }

  nextCourse(): void {
    if (this.coursePage < this.coursesTotalPages()) {
      this.coursePage++;
      this.loadCourses();
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

  loadPlacementInsights(): void {
    // Try multiple sources for campusId
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found, cannot load placement insights');
      return;
    }

    console.log('CampusAboutComponent: Loading placement insights for campusId:', campusId);
    this.loadingPlacementInsights.set(true);
    
    this.campusApi.getPlacementInsights(campusId, 1, 9).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading placement insights:', error);
        this.loadingPlacementInsights.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: PlacementInsightsResponse | null) => {
        console.log('CampusAboutComponent: Placement Insights response received:', response);
        this.loadingPlacementInsights.set(false);
        
        if (response?.success && response.data) {
          // Store placement percentage
          if (response.data.placementPercentage !== undefined) {
            this.placementPercentage.set(response.data.placementPercentage);
          }
          
          // Store yearly trends
          if (response.data.yearlyTrends && response.data.yearlyTrends.length > 0) {
            this.placementInsights.set(response.data.yearlyTrends);
            
            // Extract years from yearlyTrends and sort descending (newest first)
            const years = response.data.yearlyTrends
              .map(trend => trend.year)
              .filter((year): year is string => !!year)
              .sort((a, b) => b.localeCompare(a));
            
            if (years.length > 0) {
              this.placementYears.set(years);
            }
            
            console.log('CampusAboutComponent: Placement insights loaded successfully');
            console.log('CampusAboutComponent: Years:', years);
            console.log('CampusAboutComponent: Placement percentage:', response.data.placementPercentage);
          } else {
            console.warn('CampusAboutComponent: No yearly trends in response');
            // Keep fallback years
          }
        } else {
          console.warn('CampusAboutComponent: No placement insights data in response');
          // Keep fallback years
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Placement insights subscription error:', error);
        this.loadingPlacementInsights.set(false);
        // Keep fallback years on error
      }
    });
  }

  // Faculties - API Integration
  readonly faculties = signal<readonly PersonCard[]>([]);
  readonly loadingFaculties = signal(false);
  facultiesPage = 1;
  readonly facultiesPageSize = 6;
  readonly facultiesTotalPages = signal(1);

  loadFaculties(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found, cannot load faculties');
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }

    console.log('CampusAboutComponent: Loading faculties for campusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.facultiesPage, 'Size:', this.facultiesPageSize);
    
    this.loadingFaculties.set(true);
    
    this.campusApi.getFaculties(campusId, this.facultiesPage, this.facultiesPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading faculties:', error);
        this.loadingFaculties.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: FacultiesResponse | null) => {
        console.log('CampusAboutComponent: Faculties response received:', response);
        this.loadingFaculties.set(false);
        
        if (response && response.content && Array.isArray(response.content)) {
          const mappedFaculties = response.content.map((faculty: FacultyData) => this.mapFacultyToPersonCard(faculty));
          this.faculties.set(mappedFaculties);
          
          const totalPages = response.totalPages ?? 0;
          this.facultiesTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped faculties:', mappedFaculties.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
          this.faculties.set([]);
          this.facultiesTotalPages.set(1);
        }
      },
      error: (error: unknown) => {
        console.error('CampusAboutComponent: Faculties subscription error:', error);
        this.loadingFaculties.set(false);
        this.faculties.set([]);
        this.facultiesTotalPages.set(1);
      }
    });
  }

  private mapFacultyToPersonCard(faculty: FacultyData): PersonCard {
    return {
      id: faculty.id || faculty.facultyId || faculty.userId || '',
      name: faculty.fullName || faculty.name || 'Name',
      imageUrl: faculty.photoUrl || faculty.profilePhotoUrl || faculty.imageUrl || 'assets/images/login-news-image.png',
      designation: faculty.designation,
    };
  }

  facultiesPageItems(): readonly PersonCard[] {
    return this.faculties();
  }

  onFacultiesPageChange(page: number): void {
    if (page !== this.facultiesPage && page >= 1) {
      this.facultiesPage = page;
      this.loadFaculties();
    }
  }

  // Alumni - API Integration
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingAlumni = signal(false);
  alumniPage = 1;
  readonly alumniPageSize = 7;
  readonly alumniTotalPages = signal(1);

  loadAlumni(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId found, cannot load alumni');
      console.warn('CampusAboutComponent: ⚠️ Backend issue - campusId not available. Please check backend.');
      return;
    }

    console.log('CampusAboutComponent: Loading alumni for campusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.alumniPage, 'Size:', this.alumniPageSize);
    
    this.loadingAlumni.set(true);
    
    this.campusApi.getAlumni(campusId, this.alumniPage, this.alumniPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading alumni:', error);
        this.loadingAlumni.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: ApiResponsePageAlumniResponse | null) => {
        console.log('CampusAboutComponent: Alumni response received:', response);
        this.loadingAlumni.set(false);
        
        if (response?.data?.content && Array.isArray(response.data.content)) {
          const mappedAlumni = response.data.content.map((alumnus: AlumniResponse) => this.mapAlumniToPersonCard(alumnus));
          this.alumni.set(mappedAlumni);
          
          const totalPages = response.data.totalPages ?? 0;
          this.alumniTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped alumni:', mappedAlumni.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Alumni subscription error:', error);
        this.loadingAlumni.set(false);
        this.alumni.set([]);
        this.alumniTotalPages.set(1);
      }
    });
  }

  private mapAlumniToPersonCard(alumnus: AlumniResponse): PersonCard {
    return {
      id: alumnus.studentId || alumnus.userId || '',
      name: `${alumnus.firstName || ''} ${alumnus.lastName || ''}`.trim() || 'Name',
      imageUrl: alumnus.profilePhotoUrl || 'assets/images/login-news-image.png',
      designation: alumnus.designation,
      company: alumnus.companyName,
    };
  }

  alumniPageItems(): readonly PersonCard[] {
    return this.alumni();
  }

  previousAlumni(): void {
    if (this.alumniPage > 1) {
      this.alumniPage--;
      this.loadAlumni();
    }
  }

  nextAlumni(): void {
    if (this.alumniPage < this.alumniTotalPages()) {
      this.alumniPage++;
      this.loadAlumni();
    }
  }

  // Testimonials - API Integration
  readonly testimonials = signal<readonly TestimonialData[]>([]);
  readonly loadingTestimonials = signal(false);
  readonly testimonialsTotalPages = signal(1);
  testimonialPage = 1;
  readonly testimonialPageSize = 5;

  loadTestimonials(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;

    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId available for testimonials');
      this.testimonials.set([]);
      this.testimonialsTotalPages.set(1);
      return;
    }

    console.log('🔵🔵🔵 CampusAboutComponent: loadTestimonials() CALLED 🔵🔵🔵');
    console.log('CampusAboutComponent: CampusId:', campusId);
    console.log('CampusAboutComponent: Page:', this.testimonialPage);
    console.log('CampusAboutComponent: PageSize:', this.testimonialPageSize);

    this.loadingTestimonials.set(true);

    this.campusApi.getTestimonials(campusId, this.testimonialPage, this.testimonialPageSize).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading testimonials:', error);
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
        return of(null);
      })
    ).subscribe({
      next: (response: TestimonialsResponse | null) => {
        console.log('✅✅✅ CampusAboutComponent: loadTestimonials RESPONSE ✅✅✅');
        console.log('CampusAboutComponent: Response:', response);
        this.loadingTestimonials.set(false);

        if (response?.data?.content && Array.isArray(response.data.content)) {
          const testimonialsData = response.data.content;
          console.log('CampusAboutComponent: Testimonials data:', testimonialsData);
          
          this.testimonials.set(testimonialsData);
          
          const totalPages = response.data.totalPages ?? 0;
          this.testimonialsTotalPages.set(Math.max(1, totalPages));
          
          console.log('CampusAboutComponent: Mapped testimonials:', testimonialsData.length);
          console.log('CampusAboutComponent: Total pages:', totalPages);
        } else {
          console.warn('CampusAboutComponent: No content in response or invalid structure');
          this.testimonials.set([]);
          this.testimonialsTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error in loadTestimonials subscription:', error);
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

  loadResearch(): void {
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;

    if (!campusId) {
      console.warn('CampusAboutComponent: No campusId available for research');
      this.researchData.set(null);
      return;
    }

    console.log('🔵🔵🔵 CampusAboutComponent: loadResearch() CALLED 🔵🔵🔵');
    console.log('CampusAboutComponent: CampusId:', campusId);

    this.loadingResearch.set(true);

    this.campusApi.getResearch(campusId).pipe(
      catchError((error) => {
        console.error('CampusAboutComponent: Error loading research:', error);
        this.loadingResearch.set(false);
        this.researchData.set(null);
        return of(null);
      })
    ).subscribe({
      next: (response: ResearchResponse | null) => {
        console.log('✅✅✅ CampusAboutComponent: loadResearch RESPONSE ✅✅✅');
        console.log('CampusAboutComponent: Response:', response);
        this.loadingResearch.set(false);

        if (response?.data) {
          const researchInfo = response.data;
          console.log('CampusAboutComponent: Research data:', researchInfo);
          
          this.researchData.set(researchInfo);
          
          console.log('CampusAboutComponent: Research info:', researchInfo.researchInfo);
          console.log('CampusAboutComponent: Research description:', researchInfo.description);
        } else {
          console.warn('CampusAboutComponent: No data in response or invalid structure');
          this.researchData.set(null);
        }
      },
      error: (error) => {
        console.error('CampusAboutComponent: Error in loadResearch subscription:', error);
        this.loadingResearch.set(false);
        this.researchData.set(null);
      }
    });
  }

  private slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  openVisitCampusModal(): void {
    console.log('Opening Visit Campus modal...');
    this.modalService.openModal('visit-campus');
    console.log('Modal service activeModal:', this.modalService.activeModal());
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  handleVisitCampusSubmit(value: VisitCampusFormValue): void {
    console.log('Visit Campus Form submitted:', value);
    this.submittingVisitCampus = true;
    // TODO: Implement API call to submit visit campus form
    // For now, just close the modal after a delay
    setTimeout(() => {
      this.submittingVisitCampus = false;
      this.closeModal();
    }, 1000);
  }

  /**
   * Download Prospectus Handler
   * Fetches prospectuses for the campus and downloads the first available one
   */
  downloadProspectusHandler(): void {
    console.log('🔵🔵🔵 CampusAboutComponent: downloadProspectusHandler() CALLED 🔵🔵🔵');
    
    // Check if already downloading
    if (this.downloadingProspectus()) {
      console.log('CampusAboutComponent: Download already in progress, ignoring request');
      return;
    }

    // Get campusId from storage or auth state
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;

    if (!campusId) {
      console.error('❌ CampusAboutComponent: No campusId found, cannot download prospectus');
      this.notify.error('Campus ID not found. Please login again to refresh your session.');
      return;
    }

    console.log('✅ CampusAboutComponent: CampusId found:', campusId);
    console.log('CampusAboutComponent: Fetching prospectuses for campus...');

    this.downloadingProspectus.set(true);

    // First, get prospectuses for the campus
    this.campusApi.getProspectusByCampus(campusId).pipe(
      catchError((error) => {
        console.error('❌ CampusAboutComponent: Error fetching prospectuses:', error);
        console.error('CampusAboutComponent: Error status:', error?.status);
        console.error('CampusAboutComponent: Error message:', error?.message);
        this.downloadingProspectus.set(false);
        const errorMessage = error?.error?.message || error?.message || 'Failed to fetch prospectus information';
        this.notify.error(errorMessage);
        return of(null);
      })
    ).subscribe({
      next: (response: GetProspectusResponse | null) => {
        console.log('✅✅✅ CampusAboutComponent: Prospectus response received ✅✅✅');
        console.log('CampusAboutComponent: Response:', response);

        if (!response) {
          console.warn('⚠️ CampusAboutComponent: Response is null');
          this.downloadingProspectus.set(false);
          this.notify.error('Failed to fetch prospectus information');
          return;
        }

        // Check if we have prospectus data
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
          console.warn('⚠️ CampusAboutComponent: No prospectuses available for this campus');
          this.downloadingProspectus.set(false);
          this.notify.error('No prospectus available for this campus');
          return;
        }

        // Get the first prospectus (or you could show a selection modal if multiple)
        const firstProspectus = response.data[0];
        const prospectusId = firstProspectus.id;

        if (!prospectusId) {
          console.error('❌ CampusAboutComponent: Prospectus ID is missing');
          this.downloadingProspectus.set(false);
          this.notify.error('Prospectus ID is missing');
          return;
        }

        console.log('✅ CampusAboutComponent: Found prospectus with ID:', prospectusId);
        console.log('CampusAboutComponent: Starting download...');

        // Download the prospectus file
        this.campusApi.downloadProspectus(prospectusId).subscribe({
          next: (blob: Blob) => {
            console.log('✅✅✅ CampusAboutComponent: Prospectus blob received ✅✅✅');
            console.log('CampusAboutComponent: Blob size:', blob.size, 'bytes');
            console.log('CampusAboutComponent: Blob type:', blob.type);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename - use prospectus ID or default name
            const fileName = `prospectus-${prospectusId}.pdf`;
            link.download = fileName;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
            this.downloadingProspectus.set(false);
            this.notify.success('Prospectus downloaded successfully');
            console.log('✅ CampusAboutComponent: Prospectus downloaded successfully');
          },
          error: (error) => {
            console.error('❌ CampusAboutComponent: Error downloading prospectus file:', error);
            console.error('CampusAboutComponent: Error status:', error?.status);
            console.error('CampusAboutComponent: Error message:', error?.message);
            this.downloadingProspectus.set(false);
            const errorMessage = error?.error?.message || error?.message || 'Failed to download prospectus file';
            this.notify.error(errorMessage);
          }
        });
      },
      error: (error) => {
        console.error('❌ CampusAboutComponent: Error in getProspectusByCampus subscription:', error);
        this.downloadingProspectus.set(false);
        const errorMessage = error?.error?.message || error?.message || 'Failed to fetch prospectus';
        this.notify.error(errorMessage);
      }
    });
  }
}