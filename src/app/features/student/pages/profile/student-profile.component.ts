import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { AppHeaderComponent } from '../../../../shared/components/header/header.component';
import { StudentApiService } from '../../services/student-api.service';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import {
  ApiResponseObject,
  ApiResponseBatchmateResponse,
  ApiResponsePageAlumniResponse,
  ApiResponseTestimonialResponse,
  ApiResponsePromotionCountResponse,
  ApiResponseFollowerCountResponse,
  ApiResponseKnowledgeBaseResponse,
  KnowledgeBaseResponse,
  StudentPublicProfileResponse,
  TestimonialResponse,
} from '../../models/student.models';
import { catchError, of, forkJoin } from 'rxjs';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';

interface PersonCard {
  id?: string;
  publicStudentId?: string;
  name: string;
  imageUrl: string;
  designation?: string;
  company?: string;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, TextareaComponent, AppHeaderComponent],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.css',
})
export class StudentProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentApi = inject(StudentApiService);
  private readonly commonApi = inject(CommonApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly storage = inject(StorageService);

  // Route parameters
  readonly studentId = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly publicStudentId = signal<string | null>(null);
  readonly isStandalone = signal<boolean>(false);
  readonly isPublicProfile = signal<boolean>(false);

  // Profile data
  readonly profileData = signal<Record<string, unknown> | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Additional data
  readonly batchmates = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingBatchmates = signal<boolean>(false);
  readonly loadingAlumni = signal<boolean>(false);
  readonly testimonials = signal<readonly TestimonialResponse[]>([]);
  readonly promotionCount = signal<number>(0);
  readonly followerCount = signal<number>(0);
  readonly isFollowing = signal<boolean>(false);
  readonly followSubmitting = signal<boolean>(false);

  // Feedback form
  feedbackName = '';
  feedbackComment = '';
  feedbackRecommendation: 'yes' | 'no' | null = null;
  readonly feedbackSubmitError = signal<string | null>(null);
  readonly feedbackSubmitSuccess = signal<boolean>(false);
  readonly feedbackSubmitting = signal<boolean>(false);
  readonly recommendationSubmitting = signal<boolean>(false);
  readonly recommendationSubmitSuccess = signal<boolean>(false);

  readonly resumeUrlFromApi = signal<string | null>(null);
  readonly resumeUrlLoading = signal<boolean>(false);

  readonly knowledgeBase = signal<KnowledgeBaseResponse | null>(null);
  readonly loadingKnowledgeBase = signal<boolean>(false);

  // Pagination and carousel
  currentBatchmatesPage = 1;
  currentAlumniIndex = 0;
  currentTestimonialIndex = 0;

  @ViewChild('alumniList') alumniListRef?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Check if opened in standalone mode (new tab)
    this.route.queryParamMap.subscribe((queryParams) => {
      const standalone = queryParams.get('standalone');
      this.isStandalone.set(standalone === 'true');
      console.log('📋 Profile Page - Standalone mode:', this.isStandalone());
    });

    // Extract route parameters
    this.route.paramMap.subscribe((params) => {
      const publicStudentIdFromRoute = params.get('publicStudentId');
      const studentIdFromRoute = params.get('studentId');
      const userIdFromRoute = params.get('userId');

      if (publicStudentIdFromRoute) {
        this.publicStudentId.set(publicStudentIdFromRoute);
        this.isPublicProfile.set(true);
        this.loadPublicStudentProfile(publicStudentIdFromRoute);
        return;
      }

      if (studentIdFromRoute && userIdFromRoute) {
        this.studentId.set(studentIdFromRoute);
        this.userId.set(userIdFromRoute);
        this.loadStudentProfile(studentIdFromRoute);
      } else {
        this.loadProfileFromCurrentUser();
      }
    });
  }

  /**
   * Load public student profile and related data by publicStudentId (landing search).
   */
  private loadPublicStudentProfile(publicStudentId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentApi.getPublicStudentProfile(publicStudentId).subscribe({
      next: (resp) => {
        const data: StudentPublicProfileResponse | undefined = resp?.data;
        if (!data) {
          this.loading.set(false);
          this.error.set(resp?.message ?? 'Profile not found');
          return;
        }
        const profileRecord: Record<string, unknown> = { ...data };
        this.profileData.set(profileRecord);
        const { campusName, yearOfPassing } = this.getInstitutionAndYearFromProfile(profileRecord);
        this.studentId.set(data.studentId ?? null);
        this.userId.set(data.userId ?? null);
        this.loadResumeUrl();

        const batchmates$ =
          data.studentId && campusName && yearOfPassing
            ? this.studentApi
                .getBatchmates(data.studentId, campusName, String(yearOfPassing), 1, 12)
                .pipe(catchError(() => of({ success: true, data: [] } as ApiResponseBatchmateResponse)))
            : of({ success: true, data: [] } as ApiResponseBatchmateResponse);

        this.loadKnowledgeBase(publicStudentId);

        forkJoin({
          testimonials: this.studentApi.getPublicTestimonials(publicStudentId, 20, 1),
          promotions: this.studentApi.getPublicPromotions(publicStudentId),
          followers: this.studentApi.getPublicFollowers(publicStudentId),
          batchmates: batchmates$,
        }).subscribe({
          next: (res: {
            testimonials?: ApiResponseTestimonialResponse;
            promotions?: ApiResponsePromotionCountResponse;
            followers?: ApiResponseFollowerCountResponse;
            batchmates?: ApiResponseBatchmateResponse;
          }) => {
            const testimonialData = res.testimonials?.data as
              | { content?: TestimonialResponse[] }
              | TestimonialResponse[]
              | undefined;
            const rawList = Array.isArray(testimonialData)
              ? testimonialData
              : (testimonialData as { content?: TestimonialResponse[] })?.content ?? [];
            const list = this.normalizeTestimonials(Array.isArray(rawList) ? rawList : []);
            this.testimonials.set(list);
            this.promotionCount.set((res.promotions?.data as { promotionCount?: number })?.promotionCount ?? 0);
            this.followerCount.set(res.followers?.data?.followerCount ?? 0);
            const batchmateList = unwrapApiResponse<unknown[]>(res.batchmates);
            if (Array.isArray(batchmateList)) {
              this.batchmates.set(batchmateList.map((item) => this.mapBatchmateToPersonCard(item as unknown)));
            }
            if (campusName && yearOfPassing) {
              this.loadPublicAlumni(publicStudentId, campusName, String(yearOfPassing));
            }
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: (err: { message?: string }) => {
        this.loading.set(false);
        this.error.set(err?.message ?? 'Failed to load profile');
      },
    });
  }

  private loadKnowledgeBase(publicStudentId: string): void {
    this.loadingKnowledgeBase.set(true);
    this.studentApi
      .getKnowledgeBase(publicStudentId)
      .pipe(
        catchError(() => {
          this.loadingKnowledgeBase.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (resp: ApiResponseKnowledgeBaseResponse | null) => {
          this.loadingKnowledgeBase.set(false);
          this.knowledgeBase.set(resp?.data ?? null);
        },
      });
  }

  private loadPublicAlumni(
    publicStudentId: string,
    campusName: string,
    yearOfPassing: string,
  ): void {
    this.loadingAlumni.set(true);
    this.studentApi
      .getPublicAlumni(publicStudentId, campusName, yearOfPassing, 12, 1)
      .pipe(
        catchError(() => {
          this.loadingAlumni.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingAlumni.set(false);
          const alumniList = unwrapApiResponse<unknown[]>(response);
          if (Array.isArray(alumniList)) {
            const items = alumniList.map((item) => this.mapAlumniToPersonCard(item as unknown));
            this.alumni.set(items);
          }
        },
      });
  }

  /**
   * Load profile using studentId from current user
   */
  private loadProfileFromCurrentUser(): void {
    const currentUser = this.auth.getCurrentUser();
    console.log('📋 Profile Page - Current user:', currentUser);
    
    if (!currentUser) {
      console.error('❌ No current user found');
      this.error.set('User not authenticated. Please login again.');
      return;
    }

    // Get studentId from current user
    const studentId = currentUser.studentId;
    const userId = currentUser.userId?.toString() || null;

    console.log('📋 Profile Page - Extracted IDs:', { studentId, userId });

    if (!studentId) {
      console.error('❌ No studentId found in current user data');
      this.error.set('Student ID not found. Please ensure your profile is complete.');
      return;
    }

    this.studentId.set(studentId);
    this.userId.set(userId);
    this.loadStudentProfile(studentId);
  }

  /**
   * Load student profile using the studentId from route
   * Uses full profile API which gets all the student data
   */
  private loadStudentProfile(studentId: string): void {
    console.log('📡 Loading student full profile for studentId:', studentId);
    this.loading.set(true);
    this.error.set(null);

    // Get current user for requester info
    const currentUser = this.auth.getCurrentUser();
    const requesterUserId = this.userId() || currentUser?.userId?.toString() || '';
    const requesterUserType = 'STUDENT';

    console.log('📡 Requester info:', { requesterUserId, requesterUserType });

    // Call the full profile API
    // requesterUserId and requesterUserType are required
    this.studentApi.getStudentFullProfile(studentId, requesterUserId, requesterUserType).subscribe({
      next: (response: ApiResponseObject) => {
        console.log('✅ Student full profile loaded:', response);
        this.loading.set(false);
        
        const profileData = unwrapApiResponse<Record<string, unknown>>(response);
        if (profileData) {
          this.profileData.set(profileData);
          // Extract follower/promotion counts from profile response (API returns these)
          const followerCount = Number(profileData['followerCount']) || 0;
          const promotionCount = Number(profileData['promotionCount']) || 0;
          this.followerCount.set(followerCount);
          this.promotionCount.set(promotionCount);
          // Load Knowledge Base when we have publicStudentId (for standalone / own profile view)
          const publicStudentId =
            (profileData['publicStudentId'] as string) ??
            (profileData['publicId'] as string) ??
            null;
          if (publicStudentId) {
            this.publicStudentId.set(publicStudentId);
            this.loadKnowledgeBase(publicStudentId);
          }
          // Store profile data in localStorage for use on home page (to avoid calling profile API there)
          try {
            localStorage.setItem('student_profile_data', JSON.stringify(profileData));
            // Dispatch event to notify sidebar and other components
            window.dispatchEvent(new Event('studentProfileUpdated'));
          } catch (error) {
            console.warn('Failed to store profile data in localStorage:', error);
          }
          // Load batchmates and alumni after profile is loaded
          this.loadBatchmates(studentId);
          this.loadAlumni(studentId);
          this.loadResumeUrl();
        } else {
          this.error.set(response.message || 'Failed to load profile data');
        }
      },
      error: (err: { message?: string; error?: { message?: string } }) => {
        console.error('❌ Failed to load student full profile:', err);
        this.loading.set(false);
        const errorMessage = err.error?.message || err.message || 'Failed to load profile';
        this.error.set(errorMessage);
      },
    });
  }

  /**
   * Reload profile data
   */
  reload(): void {
    const pubId = this.publicStudentId();
    if (pubId) {
      this.loadPublicStudentProfile(pubId);
      return;
    }
    const studentId = this.studentId();
    if (studentId) {
      this.loadStudentProfile(studentId);
    }
  }

  getPromotionCount(): number {
    return this.promotionCount();
  }

  /**
   * Map API testimonial shape (quote, reviewerName) to UI shape (content, author).
   */
  private normalizeTestimonials(raw: TestimonialResponse[]): TestimonialResponse[] {
    return raw.map((item) => ({
      ...item,
      content: (item as { quote?: string }).quote ?? item.content ?? '',
      author: (item as { reviewerName?: string }).reviewerName ?? item.author ?? '',
    }));
  }

  getCurrentTestimonial(): TestimonialResponse | null {
    const list = this.testimonials();
    if (!list.length) return null;
    const idx = this.currentTestimonialIndex % list.length;
    return list[idx] ?? null;
  }

  /**
   * Load batchmates for the student
   */
  private loadBatchmates(studentId: string): void {
    const profileData = this.profileData();
    console.log('📋 PROFILE PAGE - Full profile data:', profileData);
    console.log('📋 PROFILE PAGE - institutionName field:', profileData?.['institutionName']);
    console.log('📋 PROFILE PAGE - campusName field:', profileData?.['campusName']);
    
    const campusName = this.getInstitutionName();
    const yearOfPassing = this.getYearOfPassing();
    
    console.log('👥 PROFILE PAGE - loadBatchmates using campusName:', campusName);
    console.log('👥 PROFILE PAGE - loadBatchmates using yearOfPassing:', yearOfPassing);
    
    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load batchmates: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingBatchmates.set(true);
    this.studentApi.getBatchmates(studentId, campusName, yearOfPassing, 1, 12)
      .pipe(catchError((error) => {
        console.error('Error loading batchmates:', error);
        this.loadingBatchmates.set(false);
        return of(null);
      }))
      .subscribe({
        next: (response: ApiResponseBatchmateResponse | null) => {
          this.loadingBatchmates.set(false);
          const batchmateList = unwrapApiResponse<unknown[]>(response);
          if (Array.isArray(batchmateList)) {
            const items = batchmateList.map((item) => this.mapBatchmateToPersonCard(item as unknown));
            this.batchmates.set(items);
          }
        },
      });
  }

  /**
   * Load alumni for the student
   */
  private loadAlumni(studentId: string): void {
    const campusName = this.getInstitutionName();
    const yearOfPassing = this.getYearOfPassing();
    
    console.log('🎓 PROFILE PAGE - loadAlumni using campusName:', campusName);
    console.log('🎓 PROFILE PAGE - loadAlumni using yearOfPassing:', yearOfPassing);
    
    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load alumni: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingAlumni.set(true);
    this.studentApi.getAlumniForStudent(studentId, campusName, yearOfPassing, 1, 10)
      .pipe(catchError((error) => {
        console.error('Error loading alumni:', error);
        this.loadingAlumni.set(false);
        return of(null);
      }))
      .subscribe({
        next: (response: ApiResponsePageAlumniResponse | null) => {
          this.loadingAlumni.set(false);
          const alumniList = unwrapApiResponse<unknown[]>(response);
          if (Array.isArray(alumniList)) {
            const items = alumniList.map((item) => this.mapAlumniToPersonCard(item as unknown));
            this.alumni.set(items);
          }
        },
      });
  }

  /**
   * Map batchmate data to PersonCard
   */
  private mapBatchmateToPersonCard(item: unknown): PersonCard {
    const batchmate = item as Record<string, unknown>;
    const firstName = ((batchmate['firstName'] as string) || '').trim();
    const lastName = ((batchmate['lastName'] as string) || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const photoUrl = (batchmate['profilePhotoUrl'] as string) || '';
    const imageUrl = photoUrl
      ? (photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`)
      : 'assets/images/login-news-image.png';
    const publicStudentId = (batchmate['publicStudentId'] as string) || (batchmate['studentId'] as string) || (batchmate['userId'] as string);

    return {
      name: fullName,
      imageUrl,
      id: publicStudentId || '',
      publicStudentId: publicStudentId || undefined,
    };
  }

  /**
   * Map alumni data to PersonCard
   */
  private mapAlumniToPersonCard(item: unknown): PersonCard {
    const alumnus = item as { 
      name?: string;
      firstName?: string; 
      lastName?: string; 
      profilePhotoUrl?: string;
      designation?: string;
      company?: string;
      companyName?: string;
    };
    
    // Try to get name from 'name' field first, then construct from firstName/lastName
    let fullName = (alumnus.name || '').trim();
    if (!fullName) {
      const firstName = (alumnus.firstName || '').trim();
      const lastName = (alumnus.lastName || '').trim();
      fullName = [firstName, lastName].filter(Boolean).join(' ');
    }
    fullName = fullName || 'Unknown';
    
    const photoUrl = alumnus.profilePhotoUrl || '';
    const imageUrl = photoUrl
      ? (photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`)
      : 'assets/images/login-news-image.png';
    
    return {
      name: fullName,
      imageUrl,
      designation: alumnus.designation,
      company: alumnus.company || alumnus.companyName,
    };
  }

  /**
   * Extracts institution name and year of passing for the most recent year.
   * Used when profile data is not yet in profileData signal (e.g. during loadPublicStudentProfile).
   */
  private getInstitutionAndYearFromProfile(profile: Record<string, unknown>): {
    campusName: string;
    yearOfPassing: string;
  } {
    const institutions = (profile?.['institutionName'] as string[]) ?? [];
    const years = (profile?.['yearOfPassingList'] as string[]) ?? [];
    const fallbackYear = String(profile?.['yearOfPassing'] ?? profile?.['batch'] ?? '');
    if (institutions.length === 0) {
      return { campusName: '', yearOfPassing: fallbackYear };
    }
    if (years.length === 0 || institutions.length !== years.length) {
      return { campusName: String(institutions[0]), yearOfPassing: fallbackYear };
    }
    let maxYear = '';
    let maxIndex = 0;
    for (let i = 0; i < years.length; i++) {
      const y = String(years[i]).trim();
      if (y > maxYear) {
        maxYear = y;
        maxIndex = i;
      }
    }
    return {
      campusName: String(institutions[maxIndex]),
      yearOfPassing: maxYear,
    };
  }

  /**
   * Helper methods to extract data from profileData
   */
  getProfileValue(key: string): unknown {
    return this.profileData()?.[key];
  }

  getStringValue(key: string, defaultValue = ''): string {
    const value = this.getProfileValue(key);
    return value ? String(value) : defaultValue;
  }

  getArrayValue(key: string): unknown[] {
    const value = this.getProfileValue(key);
    return Array.isArray(value) ? value : [];
  }

  getFirstName(): string {
    return this.getStringValue('firstName');
  }

  getLastName(): string {
    return this.getStringValue('lastName');
  }

  getFullName(): string {
    const first = this.getFirstName();
    const last = this.getLastName();
    return [first, last].filter(Boolean).join(' ') || 'Unknown';
  }

  getContactEmail(): string {
    return this.getStringValue('email', '—');
  }

  getContactPhone(): string {
    return this.getStringValue('phoneNumber', '—');
  }

  getContactAddress(): string {
    return this.getStringValue('address', '—');
  }

  /** Truncate address for display (Figma: short line, no long paragraph). */
  getContactAddressDisplay(maxLen = 80): string {
    const raw = this.getContactAddress();
    if (raw === '—' || raw.length <= maxLen) return raw;
    return raw.slice(0, maxLen).trim() + '…';
  }

  getProfilePhotoUrl(): string {
    const photoUrl = this.getStringValue('profilePhotoUrl');
    if (!photoUrl) return 'assets/images/login-news-image.png';
    return photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`;
  }

  /** Backend returns placeholders like "no.pdf" when there is no resume; do not use as URL. */
  private isPlaceholderResumeValue(value: string): boolean {
    const v = value.trim().toLowerCase();
    return !v || v === 'no.pdf' || v === 'no' || v === 'none' || v === 'null' || v === 'n/a';
  }

  /**
   * Fetch resume URL from GET /student/{studentId}/resume (works for public and logged-in).
   */
  loadResumeUrl(): void {
    const studentId = this.studentId();
    if (!studentId) return;
    const requesterUserType = this.auth.getCurrentUser()?.userType ?? 'STUDENT';
    this.resumeUrlLoading.set(true);
    this.resumeUrlFromApi.set(null);
    this.studentApi.getResume(studentId, requesterUserType).subscribe({
      next: (res) => {
        this.resumeUrlLoading.set(false);
        const raw = res?.data?.trim() ?? '';
        if (!raw || this.isPlaceholderResumeValue(raw)) {
          this.resumeUrlFromApi.set(null);
          return;
        }
        const url = raw.startsWith('http') ? raw : `/api/v1/files/${raw}`;
        this.resumeUrlFromApi.set(url);
      },
      error: () => {
        this.resumeUrlLoading.set(false);
        this.resumeUrlFromApi.set(null);
      },
    });
  }

  getResumeUrl(): string {
    const fromApi = this.resumeUrlFromApi();
    if (fromApi) return fromApi;
    const resumeUrl = this.getStringValue('resumeUrl');
    if (!resumeUrl || this.isPlaceholderResumeValue(resumeUrl)) return '#';
    return resumeUrl.startsWith('http') ? resumeUrl : `/api/v1/files/${resumeUrl}`;
  }

  /**
   * Returns the institution name for the most recent year of passing.
   * If yearOfPassingList exists, picks the institution at the index of the max year.
   */
  getInstitutionName(): string {
    const institutions = this.getArrayValue('institutionName') as string[];
    const years = this.getArrayValue('yearOfPassingList') as string[];
    if (institutions.length === 0) return '';
    if (years.length === 0 || institutions.length !== years.length) {
      return String(institutions[0]);
    }
    let maxYear = '';
    let maxIndex = 0;
    for (let i = 0; i < years.length; i++) {
      const y = String(years[i]).trim();
      if (y > maxYear) {
        maxYear = y;
        maxIndex = i;
      }
    }
    return String(institutions[maxIndex]);
  }

  getCompanyName(): string {
    return this.getStringValue('companyName');
  }

  getRole(): string {
    return this.getStringValue('role');
  }

  getStartDate(): string {
    return this.getStringValue('startDate');
  }

  getEndDate(): string {
    return this.getStringValue('endDate');
  }

  getCurrentlyWorking(): boolean {
    return Boolean(this.getProfileValue('currentlyWorking'));
  }

  getEmploymentType(): string[] {
    return this.getArrayValue('employmentType') as string[];
  }

  getExpectedSalary(): string {
    return this.getStringValue('expectedSalary');
  }

  getPreferredLocation(): string[] {
    return this.getArrayValue('preferredLocation') as string[];
  }

  getAvailability(): string[] {
    return this.getArrayValue('availability') as string[];
  }

  getJobRolesOfInterest(): string[] {
    return this.getArrayValue('jobRolesOfInterest') as string[];
  }

  getLanguagesKnown(): string[] {
    return this.getArrayValue('languagesKnown') as string[];
  }

  getSoftSkills(): string[] {
    return this.getArrayValue('softSkills') as string[];
  }

  getProficiencyLevel(): string {
    return this.getStringValue('proficiencyLevel');
  }

  getCgpa(): string {
    return this.getStringValue('cgpa');
  }

  /**
   * Returns the most recent year of passing.
   * Uses yearOfPassingList when available; otherwise falls back to yearOfPassing.
   */
  getYearOfPassing(): string {
    const years = this.getArrayValue('yearOfPassingList') as string[];
    if (years.length > 0) {
      let maxYear = '';
      for (const y of years) {
        const s = String(y).trim();
        if (s > maxYear) maxYear = s;
      }
      return maxYear;
    }
    return this.getStringValue('yearOfPassing');
  }

  getCertificates(): string[] {
    return this.getArrayValue('certificates') as string[];
  }

  getPortfolioUrl(): string {
    return this.getStringValue('portfolioUrl');
  }

  getOtherWebsites(): string[] {
    return this.getArrayValue('otherWebsites') as string[];
  }

  getOffersInHand(): boolean {
    return Boolean(this.getProfileValue('offersInHand'));
  }

  getJobAlertPreference(): string {
    return this.getStringValue('jobAlertPreference');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  getProjects(): { projectId?: string; projectName?: string; description?: string; technologiesUsed?: string[] }[] {
    const projects = this.getArrayValue('projects');
    console.log('📦 Projects data:', projects);
    console.log('📦 Projects length:', projects.length);
    if (projects.length > 0) {
      console.log('📦 First project:', projects[0]);
    }
    return projects as { projectId?: string; projectName?: string; description?: string; technologiesUsed?: string[] }[];
  }

  /**
   * Format project description to handle newlines
   */
  formatProjectDescription(description: string | undefined): string {
    if (!description) return 'No description available.';
    return description.replace(/\n/g, '<br>');
  }

  getTechnicalSkills(): string[] {
    return this.getArrayValue('technicalSkills') as string[];
  }

  getQualifications(): string[] {
    return this.getArrayValue('qualifications') as string[];
  }

  getDegrees(): string[] {
    return this.getArrayValue('degrees') as string[];
  }

  getSpecializations(): string[] {
    return this.getArrayValue('specializations') as string[];
  }

  /**
   * Whether the current user can submit feedback (logged in, not self when student).
   */
  canSubmitFeedback(): boolean {
    if (!this.isPublicProfile() || !this.studentId()) {
      return false;
    }
    const user = this.auth.getCurrentUser();
    if (!user?.userType) {
      return false;
    }
    const reviewerId = this.getReviewerId();
    if (!reviewerId) {
      return false;
    }
    if (user.userType === 'STUDENT' && user.studentId === this.studentId()) {
      return false;
    }
    return true;
  }

  /**
   * Reviewer ID from current user (studentId, companyId, or campusId).
   */
  private getReviewerId(): string | null {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return null;
    }
    return user.studentId ?? user.companyId ?? user.campusId ?? null;
  }

  /**
   * Called when user clicks Yes or No: submits recommendation only.
   */
  onRecommendationClick(value: 'yes' | 'no'): void {
    this.feedbackRecommendation = value;
    this.feedbackSubmitError.set(null);
    this.recommendationSubmitSuccess.set(false);

    if (!this.canSubmitFeedback()) {
      this.feedbackSubmitError.set('You have to first login.');
      return;
    }

    const targetStudentId = this.studentId();
    const reviewerId = this.getReviewerId();
    const user = this.auth.getCurrentUser();
    const requesterUserType = user?.userType;
    if (!targetStudentId || !reviewerId || !requesterUserType) {
      this.feedbackSubmitError.set('You have to first login.');
      return;
    }

    this.recommendationSubmitting.set(true);
    const request = { wouldRecommend: value === 'yes' };

    this.studentApi
      .submitRecommendation(targetStudentId, reviewerId, requesterUserType, request)
      .pipe(
        catchError((err: { status?: number; error?: { message?: string }; message?: string }) => {
          const status = err?.status;
          const msg = err?.error?.message ?? err?.message ?? 'Failed to submit recommendation.';
          if (status === 403) {
            this.feedbackSubmitError.set('You cannot give recommendation to yourself.');
          } else if (status === 409) {
            this.feedbackSubmitError.set('You have already submitted recommendation for this student.');
          } else {
            this.feedbackSubmitError.set(msg);
          }
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.recommendationSubmitting.set(false);
        if (result) {
          this.recommendationSubmitSuccess.set(true);
          this.feedbackSubmitError.set(null);
          const newCount = (this.promotionCount() ?? 0) + 1;
          this.promotionCount.set(newCount);
          this.notifications.success('Your recommendation has been submitted.');
        }
      });
  }

  /**
   * Handle feedback form submission: POST feedback only (no recommendation).
   */
  submitFeedback(): void {
    if (!this.feedbackName.trim() || !this.feedbackComment.trim()) {
      return;
    }

    if (!this.canSubmitFeedback()) {
      this.feedbackSubmitError.set('You have to first login.');
      return;
    }

    const targetStudentId = this.studentId();
    const reviewerId = this.getReviewerId();
    const user = this.auth.getCurrentUser();
    const requesterUserType = user?.userType;
    if (!targetStudentId || !reviewerId || !requesterUserType) {
      this.feedbackSubmitError.set('You have to first login.');
      return;
    }
    if (user?.userType === 'STUDENT' && user.studentId === targetStudentId) {
      this.feedbackSubmitError.set('You cannot give feedback to yourself.');
      return;
    }

    this.feedbackSubmitError.set(null);
    this.feedbackSubmitSuccess.set(false);
    this.feedbackSubmitting.set(true);

    const feedbackReq = {
      reviewerName: this.feedbackName.trim(),
      feedbackText: this.feedbackComment.trim(),
    };

    this.studentApi
      .submitFeedback(targetStudentId, reviewerId, requesterUserType, feedbackReq)
      .pipe(
        catchError((err: { status?: number; error?: { message?: string }; message?: string }) => {
          const status = err?.status;
          const msg = err?.error?.message ?? err?.message ?? 'Failed to submit feedback.';
          if (status === 403) {
            this.feedbackSubmitError.set('You cannot give feedback to yourself.');
          } else if (status === 409) {
            this.feedbackSubmitError.set('You have already submitted feedback for this student.');
          } else {
            this.feedbackSubmitError.set(msg);
          }
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.feedbackSubmitting.set(false);
        if (result) {
          this.feedbackSubmitSuccess.set(true);
          this.feedbackSubmitError.set(null);
          this.feedbackName = '';
          this.feedbackComment = '';
        }
      });
  }

  /**
   * Download resume
   */
  downloadResume(): void {
    const studentId = this.studentId();
    if (!studentId) {
      const fallback = this.getResumeUrl();
      if (fallback && fallback !== '#') {
        window.open(fallback, '_blank');
      }
      return;
    }
    const requesterUserType = this.auth.getCurrentUser()?.userType ?? 'STUDENT';
    this.studentApi.getResume(studentId, requesterUserType).subscribe({
      next: (res) => {
        const raw = res?.data?.trim() ?? '';
        if (!raw || this.isPlaceholderResumeValue(raw)) return;
        const url = raw.startsWith('http') ? raw : `/api/v1/files/${raw}`;
        window.open(url, '_blank');
      },
    });
  }

  followStudent(): void {
    const targetStudentId = this.studentId();
    if (!targetStudentId) {
      this.notifications.error('Student ID not found.');
      return;
    }
    const currentUser = this.auth.getCurrentUser();
    const userType = currentUser?.userType ?? null;
    if (!currentUser || !userType) {
      this.notifications.error('Please login first to do this action.');
      return;
    }

    let actorType: 'STUDENT' | 'COMPANY' | 'CAMPUS';
    let actorId: string;

    if (userType === 'STUDENT') {
      actorType = 'STUDENT';
      actorId = currentUser.studentId ?? currentUser.profileServiceId ?? '';
      if (!actorId) {
        this.notifications.error('Student ID not found.');
        return;
      }
    } else if (userType === 'COMPANY') {
      actorType = 'COMPANY';
      actorId = currentUser.companyId ?? currentUser.profileServiceId ?? '';
      if (!actorId) {
        this.notifications.error('Company ID not found.');
        return;
      }
    } else if (userType === 'CAMPUS' || userType === 'DEPARTMENT') {
      actorType = 'CAMPUS';
      actorId = currentUser.campusId ?? this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string ?? '';
      if (!actorId) {
        this.notifications.error('Campus ID not found.');
        return;
      }
    } else {
      this.notifications.error('User type not supported for follow.');
      return;
    }

    this.followSubmitting.set(true);
    this.commonApi.follow({
      actorType,
      actorId,
      targetType: 'STUDENT',
      targetId: targetStudentId,
    }).subscribe({
      next: () => {
        this.followSubmitting.set(false);
        this.isFollowing.set(true);
        this.followerCount.set(this.followerCount() + 1);
        this.notifications.success('Followed successfully.');
      },
      error: (err: unknown) => {
        this.followSubmitting.set(false);
        if (err instanceof HttpErrorResponse) {
          if (err.status === 409) {
            this.isFollowing.set(true);
            this.notifications.info('You are already following this student.');
            return;
          }
          if (err.status === 403) {
            this.notifications.error('A student cannot follow themselves.');
            return;
          }
          if (err.status === 404) {
            this.notifications.error('Student not found.');
            return;
          }
        }
        this.notifications.error('Failed to follow student.');
      },
    });
  }

  /**
   * Get technology icon class
   */
  getTechIcon(tech: string): string {
    const techLower = tech.toLowerCase();
    if (techLower.includes('html')) return 'html5';
    if (techLower.includes('css')) return 'css3-alt';
    if (techLower.includes('javascript') || techLower.includes('js')) return 'js';
    if (techLower.includes('react')) return 'react';
    if (techLower.includes('node')) return 'node-js';
    if (techLower.includes('mongodb')) return 'mongodb';
    if (techLower.includes('angular')) return 'angular';
    if (techLower.includes('python')) return 'python';
    if (techLower.includes('java')) return 'java';
    return 'code';
  }

  /**
   * Get bar color for chart
   */
  getBarColor(index: number): string {
    const colors = ['#9C27B0', '#FF9800', '#03A9F4', '#00BCD4', '#9C27B0', '#E91E63', '#4CAF50'];
    return colors[index % colors.length];
  }

  /**
   * Get initials from name for fallback when image is not available
   */
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase() || '?';
  }

  /**
   * Check if image URL is valid
   */
  hasValidImage(imageUrl: string | null | undefined): boolean {
    return !!(imageUrl && imageUrl !== 'assets/images/login-news-image.png' && !imageUrl.includes('placeholder'));
  }

  /**
   * Get batchmate specialization or default
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBatchmateSpecialization(_batchmate: PersonCard): string {
    const specializations = this.getSpecializations();
    return specializations.length > 0 ? specializations[0] : 'CS';
  }

  /**
   * Get total courses count for donut chart
   */
  getTotalCourses(): number {
    const qualifications = this.getQualifications().length;
    const degrees = this.getDegrees().length;
    const specializations = this.getSpecializations().length;
    return qualifications + degrees + specializations || 20;
  }

  /**
   * Get knowledge base labels (tech names) from API
   */
  getKnowledgeBaseLabels(): string[] {
    return this.knowledgeBase()?.xaxisLabels ?? [];
  }

  /**
   * Get knowledge base values (proficiency 0-10) from API
   */
  getKnowledgeBaseValues(): number[] {
    return this.knowledgeBase()?.yaxisValues ?? [];
  }

  /**
   * Get bar height percentage for proficiency 0-10 (Y-axis scale)
   */
  getKnowledgeBaseBarHeight(value: number): number {
    const v = Math.min(10, Math.max(0, Number(value) || 0));
    return (v / 10) * 100;
  }

  /**
   * Get skill bar height percentage (fallback for non-public profile)
   */
  getSkillBarHeight(skill: string, index: number): number {
    const values = this.getKnowledgeBaseValues();
    if (values[index] != null) {
      return this.getKnowledgeBaseBarHeight(values[index]);
    }
    return 30 + (index * 10);
  }

  openBatchmateProfile(batchmate: PersonCard): void {
    const id = batchmate.publicStudentId || batchmate.id;
    if (!id || !id.trim()) return;
    const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', id]));
    window.open(url, '_blank');
  }

  /**
   * Pagination methods for batchmates
   */
  previousBatchmatesPage(): void {
    if (this.currentBatchmatesPage > 1) {
      this.currentBatchmatesPage--;
      // TODO: Load batchmates for this page
    }
  }

  nextBatchmatesPage(): void {
    if (this.currentBatchmatesPage < 6) {
      this.currentBatchmatesPage++;
      // TODO: Load batchmates for this page
    }
  }

  goToBatchmatesPage(page: number): void {
    this.currentBatchmatesPage = page;
    // TODO: Load batchmates for this page
  }

  /** Scroll amount for alumni carousel (one card width + gap). */
  private static readonly ALUMNI_SCROLL_PX = 180;

  /**
   * Carousel navigation for alumni – scroll the list left.
   */
  previousAlumni(): void {
    const el = this.alumniListRef?.nativeElement;
    if (el) {
      el.scrollBy({ left: -StudentProfileComponent.ALUMNI_SCROLL_PX, behavior: 'smooth' });
    }
  }

  /**
   * Carousel navigation for alumni – scroll the list right.
   */
  nextAlumni(): void {
    const el = this.alumniListRef?.nativeElement;
    if (el) {
      el.scrollBy({ left: StudentProfileComponent.ALUMNI_SCROLL_PX, behavior: 'smooth' });
    }
  }

  /**
   * Carousel navigation for testimonials
   */
  previousTestimonial(): void {
    const list = this.testimonials();
    if (!list.length) return;
    this.currentTestimonialIndex =
      (this.currentTestimonialIndex - 1 + list.length) % list.length;
  }

  nextTestimonial(): void {
    const list = this.testimonials();
    if (!list.length) return;
    this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % list.length;
  }

  /**
   * Navigate to registration (Get Started for Free)
   */
  onGetStartedForFree(): void {
    void this.router.navigate(['/register/options']);
  }

  /**
   * Handle image error - hide image and show initials
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const nextSibling = img.nextElementSibling as HTMLElement;
      if (nextSibling) {
        nextSibling.style.display = 'flex';
      }
    }
  }
}


