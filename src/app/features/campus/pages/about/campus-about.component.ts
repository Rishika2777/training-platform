import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusVisitCampusComponent, VisitCampusFormValue } from '../visit-campus/campus-visit-campus.component';
import { CampusApiService, FacultyData, FacultiesResponse, TestimonialData, TestimonialsResponse, ResearchData, ResearchResponse, RisingStarData, SuccessStoryData } from '../../services/campus-api.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
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

  ngOnInit(): void {
    this.loadRisingStars();
    this.loadAboutCampus();
    this.loadSuccessStories();
    this.loadFaculties();
    this.loadTestimonials();
    this.loadResearch();
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

  // Courses
  readonly courses: readonly CourseCard[] = [
    { id: '1', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '2', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '3', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '4', name: 'BCA', seats: 30, duration: '3 yr' },
  ];

  coursePage = 1;
  readonly coursePageSize = 4;
  get coursesTotalPages(): number {
    return Math.max(1, Math.ceil(this.courses.length / this.coursePageSize));
  }
  coursesPageItems(): readonly CourseCard[] {
    return this.slicePage(this.courses, this.coursePage, this.coursePageSize);
  }

  previousCourse(): void {
    if (this.coursePage > 1) {
      this.coursePage--;
    }
  }

  nextCourse(): void {
    if (this.coursePage < this.coursesTotalPages) {
      this.coursePage++;
    }
  }

  // Placement Years
  readonly placementYears = ['2024', '2023', '2022', '2021', '2020'];

  getPlacementValue(year: string): number {
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

  // Alumni
  readonly alumni: readonly PersonCard[] = [
    { id: '1', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
  ];

  alumniPage = 1;
  readonly alumniPageSize = 7;
  get alumniTotalPages(): number {
    return Math.max(1, Math.ceil(this.alumni.length / this.alumniPageSize));
  }
  alumniPageItems(): readonly PersonCard[] {
    return this.slicePage(this.alumni, this.alumniPage, this.alumniPageSize);
  }

  previousAlumni(): void {
    if (this.alumniPage > 1) {
      this.alumniPage--;
    }
  }

  nextAlumni(): void {
    if (this.alumniPage < this.alumniTotalPages) {
      this.alumniPage++;
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
}