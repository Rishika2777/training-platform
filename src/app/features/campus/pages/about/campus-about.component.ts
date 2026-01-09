import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusVisitCampusComponent, VisitCampusFormValue } from '../visit-campus/campus-visit-campus.component';
import { CampusApiService, TestimonialData, TestimonialsResponse, ResearchData, ResearchResponse, GetProspectusResponse, PlacementInsightsResponse, YearlyTrend, GetAllFacultiesResponse, FacultyListItem, AlumniDashboardResponse, AlumniDashboardData } from '../../services/campus-api.service';
import { ApiResponsePlacedStudentsResponse, PlacedStudentResponse } from '../../../student/models/student.models';
import { StudentApiService } from '../../../student/services/student-api.service';
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
  fullName?: string; // For course description in card bottom
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
  private readonly studentApiService = inject(StudentApiService);
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
  readonly campusWebsiteUrl = signal<string | null>(null);
  
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
    // Try multiple sources for campusId (correct sources only)
    // 1. From storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    
    // 2. From auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    
    // Use the first available campusId (only from correct sources)
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      return;
    }
    
    this.loadingAboutCampus.set(true);

    this.campusApi.getCampusById(campusId).pipe(
      catchError(() => {
        this.loadingAboutCampus.set(false);
        return of(null);
      })
    ).subscribe({
      next: (campus) => {
        this.loadingAboutCampus.set(false);
        
        if (campus) {
          if (campus.aboutCampus) {
            this.aboutCampusText.set(campus.aboutCampus);
          } else {
            this.aboutCampusText.set('');
          }
          
          // Store campus website URL
          if (campus.campusWebsiteUrl) {
            this.campusWebsiteUrl.set(campus.campusWebsiteUrl);
          } else {
            this.campusWebsiteUrl.set(null);
          }
        } else {
          this.aboutCampusText.set('');
          this.campusWebsiteUrl.set(null);
        }
      },
      error: () => {
        this.loadingAboutCampus.set(false);
        this.aboutCampusText.set('');
        this.campusWebsiteUrl.set(null);
      }
    });
  }

  loadRisingStars(): void {
    this.loadingRisingStars.set(true);
    
    // Use the same API as campus home page placed students section
    this.studentApiService.getPlacedStudents(this.risingStarsPage, this.pageSize).pipe(
      catchError(() => {
        this.loadingRisingStars.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: ApiResponsePlacedStudentsResponse | null) => {
        this.loadingRisingStars.set(false);
        
        if (response?.success && response.data?.content && Array.isArray(response.data.content)) {
          const mappedStars = response.data.content.map((student) => this.mapPlacedStudentToPersonCard(student));
          this.risingStars.set(mappedStars);
          
          const totalPages = response.data.totalPages ?? 0;
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

  private mapPlacedStudentToPersonCard(student: PlacedStudentResponse): PersonCard {
    const name = student.studentName || 
                 [student.firstName, student.lastName].filter(Boolean).join(' ') || 
                 'Unknown';
    
    return {
      id: student.studentId || student.userId || '',
      name: name,
      imageUrl: student.profilePhotoUrl || 'assets/images/login-news-image.png',
      batch: student.batch,
      company: student.companyName,
      designation: student.designation,
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

  // Success Stories - API Integration (Using same API as campus dashboard placed students)
  readonly successStories = signal<readonly PersonCard[]>([]);
  readonly loadingSuccessStories = signal(false);
  successStoryPage = 1;
  readonly successStoryPageSize = 6;
  readonly successStoriesTotalPages = signal(1);

  loadSuccessStories(): void {
    this.loadingSuccessStories.set(true);
    
    // Use the same API as campus dashboard placed students section
    this.studentApiService.getPlacedStudents(this.successStoryPage, this.successStoryPageSize).pipe(
      catchError(() => {
        this.loadingSuccessStories.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: ApiResponsePlacedStudentsResponse | null) => {
        this.loadingSuccessStories.set(false);
        
        if (response?.success && response.data?.content && Array.isArray(response.data.content)) {
          const mappedStories = response.data.content.map((student) => this.mapPlacedStudentToPersonCard(student));
          this.successStories.set(mappedStories);
          
          const totalPages = response.data.totalPages ?? 0;
          this.successStoriesTotalPages.set(Math.max(1, totalPages));
        } else {
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
  // Using GET /courses to fetch all added courses (same as Courses We Offer section)
  readonly courses = signal<readonly CourseCard[]>([]);
  readonly loadingCourses = signal(false);
  coursePage = 1;
  readonly coursePageSize = 4;
  readonly coursesTotalPages = signal(1);

  loadCourses(): void {
    this.loadingCourses.set(true);
    
    // Use getAllCourses() to fetch all added courses (same API as Courses We Offer)
    this.campusApi.getAllCourses().pipe(
      catchError(() => {
        this.loadingCourses.set(false);
        return of([]);
      })
    ).subscribe({
      next: (coursesData) => {
        // Map API response to CourseCard format (same as Courses We Offer)
        const courseCards: CourseCard[] = coursesData
          .filter(course => course && course.courseName && course.id)
          .map(course => ({
            id: course.id || '',
            name: course.courseName || '',
            seats: course.availableSeats || course.totalSeats || 0,
            duration: course.duration ? `${course.duration} ${course.duration === 1 ? 'month' : 'months'}` : 'N/A',
            fullName: course.description || course.courseName || '', // For card bottom section
          }));
        
        this.courses.set(courseCards);
        
        // Calculate total pages for carousel pagination
        const totalPages = Math.max(1, Math.ceil(courseCards.length / this.coursePageSize));
        this.coursesTotalPages.set(totalPages);
        
        this.loadingCourses.set(false);
      },
      error: () => {
        this.loadingCourses.set(false);
        this.courses.set([]);
        this.coursesTotalPages.set(1);
      }
    });
  }

  coursesPageItems(): readonly CourseCard[] {
    const startIndex = (this.coursePage - 1) * this.coursePageSize;
    const endIndex = startIndex + this.coursePageSize;
    return this.courses().slice(startIndex, endIndex);
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

  loadPlacementInsights(): void {
    // Try multiple sources for campusId
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;
    
    if (!campusId) {
      return;
    }
    
    this.loadingPlacementInsights.set(true);
    
    this.campusApi.getPlacementInsights(campusId, 1, 9).pipe(
      catchError(() => {
        this.loadingPlacementInsights.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: PlacementInsightsResponse | null) => {
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
          }
        }
      },
      error: () => {
        this.loadingPlacementInsights.set(false);
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
    this.loadingFaculties.set(true);
    
    // Use the same API as campus home page (campus dashboard get all faculty)
    this.campusApi.getAllFaculties().pipe(
      catchError(() => {
        this.loadingFaculties.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: GetAllFacultiesResponse | null) => {
        this.loadingFaculties.set(false);
        
        if (response?.success && response.data && Array.isArray(response.data)) {
          const mappedFaculties = response.data.map((faculty: FacultyListItem) => this.mapFacultyListItemToPersonCard(faculty));
          this.allFaculties.set(mappedFaculties);
          
          // Calculate total pages for client-side pagination
          const totalPages = Math.max(1, Math.ceil(mappedFaculties.length / this.facultiesPageSize));
          this.facultiesTotalPages.set(totalPages);
          
          // Update current page items
          this.updateFacultiesPageItems();
        } else {
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
    
    return {
      id: faculty.id || '',
      name: faculty.fullName || 'Name',
      imageUrl: faculty.photoUrl || 'assets/images/login-news-image.png',
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
    // Try multiple sources for campusId (correct sources only)
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;

    if (!campusId) {
      this.testimonials.set([]);
      this.testimonialsTotalPages.set(1);
      return;
    }

    this.loadingTestimonials.set(true);

    this.campusApi.getTestimonials(campusId, this.testimonialPage, this.testimonialPageSize).pipe(
      catchError(() => {
        this.loadingTestimonials.set(false);
        this.testimonials.set([]);
        this.testimonialsTotalPages.set(1);
        return of(null);
      })
    ).subscribe({
      next: (response: TestimonialsResponse | null) => {
        this.loadingTestimonials.set(false);

        if (response?.data?.content && Array.isArray(response.data.content)) {
          const testimonialsData = response.data.content;
          
          this.testimonials.set(testimonialsData);
          
          const totalPages = response.data.totalPages ?? 0;
          this.testimonialsTotalPages.set(Math.max(1, totalPages));
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
      this.researchData.set(null);
      return;
    }

    this.loadingResearch.set(true);

    this.campusApi.getResearch(campusId).pipe(
      catchError(() => {
        this.loadingResearch.set(false);
        this.researchData.set(null);
        return of(null);
      })
    ).subscribe({
      next: (response: ResearchResponse | null) => {
        this.loadingResearch.set(false);

        if (response?.data) {
          this.researchData.set(response.data);
        } else {
          this.researchData.set(null);
        }
      },
      error: () => {
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
    // Check if already downloading
    if (this.downloadingProspectus()) {
      return;
    }

    // Get campusId from storage or auth state
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId;
    const campusId = campusIdFromUser || campusIdFromStorage || null;

    if (!campusId) {
      this.notify.error('Campus ID not found. Please login again to refresh your session.');
      return;
    }

    this.downloadingProspectus.set(true);

    // First, get prospectuses for the campus
    this.campusApi.getProspectusByCampus(campusId).pipe(
      catchError((error) => {
        this.downloadingProspectus.set(false);
        const errorMessage = error?.error?.message || error?.message || 'Failed to fetch prospectus information';
        this.notify.error(errorMessage);
        return of(null);
      })
    ).subscribe({
      next: (response: GetProspectusResponse | null) => {
        if (!response) {
          this.downloadingProspectus.set(false);
          this.notify.error('Failed to fetch prospectus information');
          return;
        }

        // Check if we have prospectus data
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
          this.downloadingProspectus.set(false);
          this.notify.error('No prospectus available for this campus');
          return;
        }

        // Get the first prospectus (or you could show a selection modal if multiple)
        const firstProspectus = response.data[0];
        const prospectusId = firstProspectus.id;

        if (!prospectusId) {
          this.downloadingProspectus.set(false);
          this.notify.error('Prospectus ID is missing');
          return;
        }

        // Download the prospectus file
        this.campusApi.downloadProspectus(prospectusId).subscribe({
          next: (blob: Blob) => {
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
          },
          error: (error) => {
            this.downloadingProspectus.set(false);
            const errorMessage = error?.error?.message || error?.message || 'Failed to download prospectus file';
            this.notify.error(errorMessage);
          }
        });
      },
      error: (error) => {
        this.downloadingProspectus.set(false);
        const errorMessage = error?.error?.message || error?.message || 'Failed to fetch prospectus';
        this.notify.error(errorMessage);
      }
    });
  }
}