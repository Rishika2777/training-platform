import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanyInvitationFormComponent, InvitationFormValue } from '../invitation-form/company-invitation-form.component';
import {
  CompanyApiService,
  KeyPersonResponse,
  CompanyInvitationRequest,
  TargetCampusResponse,
  ClientResponse,
  BenefitsOfferResponse,
  VacancyResponse,
  CompanyOverviewStatsResponse,
} from '../../services/company-api.service';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { AppHeaderComponent } from '../../../../shared/components/header/header.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { CompanyRegistrationResponse } from '../../services/company-api.service';

Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Tooltip,
  Legend
);

function getChartYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current, current + 1, current + 2, current + 3, current + 4, current + 5];
}

function resolveCampusImageUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const s = url.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('assets/')) return s;
  if (s.startsWith('/')) return `/api/v1/files${s}`;
  return `/api/v1/files/${s}`;
}

interface TeamMember {
  name: string;
  designation: string;
  image: string;
}

interface Campus {
  name: string;
  image: string;
}

interface Benefit {
  title: string;
  icon: string;
  isOpen: boolean;
  description?: string;
}

interface Vacancy {
  vacancyId?: string;
  companyId?: string;
  jobTitle: string;
  jobLocation: string;
  department: string;
  jobType: string;
  salary: string;
  numberOfOpenings: string;
  contractDuration: string;
  jobDescription: string;
  requiredQualifications: string[];
  streamsEligible: string[];
  minimumCgpaPercentage: string;
  yearOfPassing: string;
  selectionProcess: string[];
  interviewMode: string;
}


@Component({
  selector: 'app-company-about',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CarouselComponent,
    InputComponent,
    TextareaComponent,
    ModalComponent,
    CompanyInvitationFormComponent,
    AppHeaderComponent,
    AvatarComponent,
  ],
  templateUrl: './company-about.component.html',
  styleUrl: './company-about.component.css',
})
export class CompanyAboutComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly modalService = inject(ModalService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly commonApi = inject(CommonApiService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  // -------------- for public id --------------
  private readonly route = inject(ActivatedRoute);

  @ViewChild('achievementChartCanvas') achievementChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Engagement metrics
  promotions = 25;
  followers = 100;

  // Follow state
isFollowing = signal(false);
followingLoading = signal(false);

  /** Invite Company button visible only for CAMPUS and DEPARTMENT users. */
  readonly showInviteCompany = computed(() => {
    const userType = this.authState.user()?.userType;
    return userType === 'CAMPUS' || userType === 'DEPARTMENT';
  });

  //campus section for comapany invite 
    selectedCampusId: string | null = null;
  campusOptions: { label: string; value: string }[] = [];

onCampusSelected(id: string): void {
  this.selectedCampusId = id;

  const selected = this.campusOptions.find(c => c.value === id);
  if (selected) {
    this.invitationFormValue = {
      ...this.invitationFormValue,
      campusName: selected.label, 
    };
  }
}

// ------------- follower -----------
readonly loadingFollowers = signal(false);


  // Key People - API Integration
  readonly keyPeople = signal<readonly KeyPersonResponse[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Campus carousel - API Integration
  readonly targetCampuses = signal<readonly TargetCampusResponse[]>([]);
  readonly loadingTargetCampuses = signal(false);

   // ===================== OUR CLIENTS =====================
readonly loadingClients = signal(false);
currentClientPage = signal(1);
totalClientPages = signal(1);

// View-model for template
private _clientViewList: { logo: string; name: string }[] = [];

get clientList(): { logo: string; name: string }[] {
  return this._clientViewList;
}
 

  get campuses(): Campus[] {
    // Map target campuses from API to campus display format
    return this.targetCampuses().map((campus) => {
      const raw = campus as Record<string, unknown>;
      const logoUrl = (campus.campusLogoUrl ?? raw['CampusLogoUrl'] ?? campus.campusLogo) as string | undefined;
      return {
        name: campus.campusName || 'Campus Name',
        image: resolveCampusImageUrl(logoUrl) || '/assets/images/campus-placeholder.jpg',
      };
    });
  }

  // Team members
  ceo = {
    name: 'Ankitha Willson',
    designation: 'CEO',
    image: '/assets/images/ceo-placeholder.jpg',
  };

  get teamMembers(): TeamMember[] {
    // Map key people from API to team members display format
    return this.keyPeople().map((person) => ({
      name: person.name || 'Name',
      designation: person.designation || 'Designation',
      image: person.photoUrl || '/assets/images/team-placeholder.jpg',
    }));
  }

currentCampusPage = signal(1);
currentTeamPage = signal(1);

  // Benefits
 // Benefits
internToJobRate = 0;
startingSalaryRange = '';
benefitsData: BenefitsOfferResponse | null = null;

/** Formatted salary range with INR (e.g. "₹80,000 - ₹1,00,000 INR"). */
get formattedSalaryRange(): string {
  const s = (this.startingSalaryRange || '').trim().replace(/,/g, '');
  if (!s) return 'N/A';
  const match = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return s + ' INR';
  const format = (n: string) => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return n;
    return '₹' + num.toLocaleString('en-IN');
  };
  return `${format(match[1])} - ${format(match[2])} INR`;
}

/** Salary bar fill percentage (0-100) based on range midpoint on scale 0–200000. */
get salaryBarWidthPercent(): number {
  const s = (this.startingSalaryRange || '').trim().replace(/,/g, '');
  const match = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return 0;
  const min = parseInt(match[1], 10);
  const max = parseInt(match[2], 10);
  if (isNaN(min) || isNaN(max) || min > max) return 0;
  const midpoint = (min + max) / 2;
  const scaleMax = 200000;
  return Math.min(100, Math.round((midpoint / scaleMax) * 100));
}

benefits: Benefit[] = [
  { title: 'Performance Bonus', icon: '📊', isOpen: false },
  { title: 'Healthcare', icon: '🏥', isOpen: false },
  { title: 'Mentor Buddy System', icon: '👥', isOpen: false },
  { title: 'Work Life Balance Perks', icon: '💼', isOpen: false },
  { title: 'Appreciation Day Off', icon: '🎖️', isOpen: false },
  { title: 'Training & Upskilling', icon: '📈', isOpen: false },
  { title: 'Sick Leaves', icon: '🔒', isOpen: false },
  { title: 'New Employee Referral Bonus', icon: '👨‍👩‍👧', isOpen: false },
];

// vision
// Vision & Performance
companyVision = '';
loadingVision = false;

// Overview stats chart
  private achievementChart: Chart<'bar'> | null = null;
readonly loadingOverviewStats = signal(false);
readonly overviewStats = signal<CompanyOverviewStatsResponse | null>(null);
readonly selectedChartYear = signal(new Date().getFullYear());
readonly chartYearOptions = getChartYearOptions();
private chartDirty = false;

// read more 
companyWebsiteUrl: string | null = null;
loadingCompanyDetails = signal(false);

//company about text
companyAboutText = '';
  companyContactEmail = '';
  companyContactPhone = '';
  companyAddress = '';
  companyName = '';
  companyLogoUrl = '';

  get resolvedCompanyLogoUrl(): string {
    const url = (this.companyLogoUrl || '').trim();
    if (!url) return 'assets/images/company-building.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('assets/')) return url;
    if (url.startsWith('/')) return `/api/v1/files${url}`;
    return `/api/v1/files/${url}`;
  }

// ----------- current vacancy ---
readonly loadingVacancies = signal(false);
readonly vacancies = signal<Vacancy[]>([]);
selectedVacancy = signal<Vacancy | null>(null);
readonly applyingToVacancy = signal(false);


// pagination statel
currentVacancyPage = signal(1);
totalVacancyPages = signal(1);
private allVacancies: Vacancy[] = [];
private readonly vacancyPageSize = 3;



 // Optional: placeholder clients before API loads
readonly placeholderClients: { logo: string }[] = Array(8).fill(null).map((_, i) => ({
  logo: `/assets/images/client-${i + 1}-placeholder.jpg`,
}));

 // ===================== TESTIMONIALS =====================
readonly loadingTestimonials = signal(false);
readonly testimonials = signal<
  { quote: string; author: string; image: string }[]
>([]);
readonly currentTestimonialPage = signal(1);
readonly totalTestimonialPages = signal(1);

/** Current testimonial for display (one at a time, from current page). */
readonly currentTestimonial = computed(() => {
  const list = this.testimonials();
  return list.length > 0 ? list[0] : null;
});

loadTestimonials(page = 1, showLoading = true): void {
  const safePage = Math.max(1, page);
  this.currentTestimonialPage.set(safePage);
  const companyId = this.loadedCompanyId ?? this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  const source$ = publicId
    ? this.companyApi.getPublicTestimonials(publicId, safePage, 1)
    : companyId
    ? this.companyApi.getTestimonials(companyId, safePage, 1)
    : null;

  if (!source$) return;

  if (showLoading) this.loadingTestimonials.set(true);

  source$
    .pipe(
      catchError((err) => {
        console.error(
          'CompanyAboutComponent: Error loading testimonials',
          err
        );
        if (showLoading) this.loadingTestimonials.set(false);
        return of(null);
      })
    )
    .subscribe((res: unknown) => {
      if (showLoading) this.loadingTestimonials.set(false);

      if (!res) {
        this.testimonials.set([]);
        this.totalTestimonialPages.set(1);
        return;
      }

      const data = res as {
        content?: {
          quote?: string;
          reviewerName?: string;
          photoUrl?: string;
        }[];
        data?: {
          content?: {
            quote?: string;
            reviewerName?: string;
            photoUrl?: string;
          }[];
        };
        totalPages?: number;
      };

      const content =
        data.content ??
        data.data?.content ??
        [];

      const mapped = content.map((t) => {
        let img = t.photoUrl || '';

        if (img) {
          if (img.startsWith('http')) {
            // use as-is
          } else if (img.startsWith('/')) {
            img = `/api/v1/files${img}`;
          } else {
            img = `/api/v1/files/${img}`;
          }
        }

        return {
          quote: t.quote || '',
          author: t.reviewerName || '',
          image: img || '', // empty = AvatarComponent shows initials
        };
      });

      this.testimonials.set(mapped);
      this.totalTestimonialPages.set(Math.max(1, data.totalPages ?? 1));
    });
}


/**
 * Loads the most recent testimonial by jumping to the last page (limit=1).
 * This helps show the newest entry after submitting feedback/testimonial.
 */
private loadLatestTestimonial(): void {
  const companyId = this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  if (!companyId && !publicId) return;

  this.loadingTestimonials.set(true);

  const first$ = publicId
    ? this.companyApi.getPublicTestimonials(publicId, 1, 1)
    : this.companyApi.getTestimonials(companyId!, 1, 1);

  first$
    .pipe(
      switchMap((first: unknown) => {
        const data = first as { totalPages?: number };

        const totalPages = Math.max(1, data?.totalPages ?? 1);
        this.totalTestimonialPages.set(totalPages);

        const lastPage = totalPages;
        this.currentTestimonialPage.set(lastPage);

        return publicId
          ? this.companyApi.getPublicTestimonials(publicId, lastPage, 1)
          : this.companyApi.getTestimonials(companyId!, lastPage, 1);
      }),
      catchError((err) => {
        console.error(
          'CompanyAboutComponent: Error loading latest testimonial',
          err
        );
        this.loadingTestimonials.set(false);
        return of(null);
      })
    )
    .subscribe((res: unknown) => {
      this.loadingTestimonials.set(false);

      if (!res) {
        this.testimonials.set([]);
        return;
      }

      const data = res as {
        content?: {
          quote?: string;
          reviewerName?: string;
          photoUrl?: string;
        }[];
        data?: {
          content?: {
            quote?: string;
            reviewerName?: string;
            photoUrl?: string;
          }[];
        };
      };

      const content =
        data.content ??
        data.data?.content ??
        [];

      const mapped = content.map((t) => {
        let img = t.photoUrl || '';

        if (img) {
          if (img.startsWith('http')) {
            // use as-is
          } else if (img.startsWith('/')) {
            img = `/api/v1/files${img}`;
          } else {
            img = `/api/v1/files/${img}`;
          }
        }

        return {
          quote: t.quote || '',
          author: t.reviewerName || '',
          image: img || '', // empty = AvatarComponent shows initials
        };
      });

      this.testimonials.set(mapped);
    });
}




  /** Company ID from profile API (used for feedback, recommendation, etc.) */
  loadedCompanyId: string | null = null;

  // Feedback form
  feedbackForm = {
  name: '',
  feedback: '',
};
nameTouched = false;

onNameChange(value: string): void {
  this.nameTouched = true;
  this.feedbackForm.name = value;
}
isNameInvalid(): boolean {
  if (!this.nameTouched) return false;

  const name = this.feedbackForm.name?.trim();
  if (!name) return true;

  const nameRegex = /^[A-Za-z ]+$/;
  return !nameRegex.test(name);
}

recommendation: 'yes' | 'no' | '' = '';
submittingRecommendation = false;


  submittingFeedback = false;

  // Modal state
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isInvitationFormModalOpen = computed(() => this.activeModal() === 'company-invitation-form');

  // Invitation form
  submittingInvitationForm = false;
  invitationFormValue: InvitationFormValue = {
    campusName: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonPhone: '',
    contactPersonDesignation: '',
    campusWebsiteUrl: '',
    campusAddress: '',
    campusProspectus: null,
    academicYear: '',
    programsOffered: '',
    proposedDate: '',
    preferredSkills: '',
    facilitiesAvailable: '',
    confirmationChecked: false,
  };

  toggleBenefit(index: number): void {
    this.benefits[index].isOpen = !this.benefits[index].isOpen;
  }

  ngOnInit(): void {
    const user = this.storage.get(STORAGE_KEYS.USER_DATA);
    if (user) {
      this.authState.setUser(
        typeof user === 'string' ? JSON.parse(user) : user
      );
    }
    this.loadKeyPeople();
    this.loadTargetCampuses();
    this.loadClients();
    this.loadTestimonials(1);
    this.loadBenefitsOffer();
    this.loadCompanyVision();
    this.loadCurrentVacancies();
    this.loadCompanyDetails();
    this.loadFollowersCount();
    this.loadPromotionsCount();
    const companyId = this.getCompanyId();
    if (companyId) {
      this.loadOverviewStats(companyId);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.achievementChart?.destroy();
      this.achievementChart = null;
    }
  }

  ngAfterViewChecked(): void {
    if (this.chartDirty && !this.loadingOverviewStats() && this.hasOverviewChartData()) {
      this.chartDirty = false;
      setTimeout(() => this.tryInitAchievementChart(), 0);
    }
  }

// ---------------------- LOADING COMPANY DETAILS --------------


loadCompanyDetails(): void {
  const companyId = this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  const source$ = publicId
    ? this.companyApi.getPublicCompanyProfile(publicId)
    : companyId
    ? this.companyApi.getCompanyById(companyId)
    : null;

  if (!source$) {
    console.warn('CompanyAboutComponent: No company ID available, cannot load company details');
    return;
  }

  this.loadingCompanyDetails.set(true);

  source$
    .pipe(
    catchError((error) => {
  console.error('CompanyAboutComponent: Error loading company details:', error);
  this.loadingCompanyDetails.set(false);
  return of(null);
}),
    )
    .subscribe({
      next: (response: CompanyRegistrationResponse | null) => {
        this.loadingCompanyDetails.set(false);

        if (response?.companyId) {
          this.loadedCompanyId = response.companyId;
          this.loadOverviewStats(response.companyId);
        }

        if (response?.websiteUrl) {
          this.companyWebsiteUrl = response.websiteUrl;
        }

        if (response?.aboutCompany) {
          this.companyAboutText = response.aboutCompany;
        } else {
          this.companyAboutText = '';
        }

        this.companyContactEmail = response?.adminEmail ?? '';
        this.companyContactPhone = response?.adminPhone ?? '';
        this.companyAddress = response?.companyAddress ?? '';
        this.companyName = response?.companyName ?? '';
        const raw = response as Record<string, unknown> | null | undefined;
        this.companyLogoUrl = ((response?.companyLogoUrl ?? raw?.['CompanyLogoUrl']) as string) ?? '';
      },
      error: (err) => {
        console.error('CompanyAboutComponent: Error in company details subscription:', err);
        this.loadingCompanyDetails.set(false);
      },
    });
}


onReadMore(): void {
  if (!this.companyWebsiteUrl) {
    this.notify.error('Website URL is not available for this company');
    return;
  }

  let url = this.companyWebsiteUrl.trim();

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    new URL(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  } 
  catch  {
    this.notify.error('Invalid website URL format');
  }
}

// -------------------- ON FOLLOW ------------------
onFollow(): void {
  if (this.followingLoading() || this.isFollowing()) return;

  const currentUser = this.authState.user();

  if (!currentUser?.userType) {
    this.notify.error('Please login to follow this company.');
    return;
  }

  // Use companyId from profile API (loaded on page init), fallback to logged-in company
  const companyId = this.loadedCompanyId ?? this.getCompanyId();
  if (!companyId) {
    this.notify.error('Company ID not found.');
    return;
  }

  const userType = currentUser.userType as 'STUDENT' | 'COMPANY' | 'CAMPUS';
  let actorType: 'STUDENT' | 'COMPANY' | 'CAMPUS';
  let actorId: string;

  if (userType === 'STUDENT') {
    actorType = 'STUDENT';
    actorId =
      currentUser.studentId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.STUDENT_ID) as string | null) ||
      '';
    if (!actorId) {
      this.notify.error('Student ID not found.');
      return;
    }
  } else if (userType === 'COMPANY') {
    actorType = 'COMPANY';
    actorId =
      currentUser.companyId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null) ||
      '';
    if (!actorId) {
      this.notify.error('Company ID not found.');
      return;
    }
    // Only block "follow own company" when target is our company (same ID)
    if (actorId === companyId) {
      this.notify.info('You cannot follow your own company.');
      return;
    }
  } else if (userType === 'CAMPUS') {
    actorType = 'CAMPUS';
    actorId =
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null) ||
      '';
    if (!actorId) {
      this.notify.error('Campus ID not found.');
      return;
    }
  } else {
    this.notify.error('User type not supported for follow.');
    return;
  }

  this.followingLoading.set(true);

  this.commonApi.follow({
    actorType,
    actorId,
    targetType: 'COMPANY',
    targetId: companyId,
  }).subscribe({
    next: () => {
      this.followingLoading.set(false);
      this.isFollowing.set(true);
      this.loadFollowersCount();
      this.followers++;
      this.notify.success('You are now following this company.');
    },
    error: (err) => {
      this.followingLoading.set(false);
      if (err?.status === 409) {
        this.isFollowing.set(true);
        this.notify.info('You are already following this company.');
      } else {
        this.notify.error(err?.error?.message || 'Failed to follow company.');
      }
    },
  });
}

// ------------- GET FOLLOW count ----------------

loadFollowersCount(): void {
  const companyId = this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  let source$: Observable<unknown> | null = null;

  if (publicId) {
    // Public landing flow
    source$ = this.companyApi.getPublicFollowers(publicId);
  } else if (companyId) {
    // Logged-in flow (existing behavior)
    source$ = this.companyApi.getFollowerCount(companyId);
  }

  if (!source$) return;

  this.loadingFollowers.set(true);

  source$
    .pipe(
      catchError((err) => {
        console.error('Error loading follower count', err);
        this.loadingFollowers.set(false);
        return of(null);
      }),
    )
    .subscribe((res: unknown) => {
      this.loadingFollowers.set(false);
    
      const data = res as {
        followerCount?: number;
        success?: boolean;
        data?: {
          followerCount?: number;
        };
      };
    
      // Public API shape: { companyId, followerCount }
      if (data?.followerCount !== undefined) {
        this.followers = data.followerCount ?? 0;
        return;
      }
    
      // Logged-in API shape: { success, data: { followerCount } }
      if (data?.success && data.data) {
        this.followers = data.data.followerCount ?? 0;
      }
    });
    
}


// ---------------------- PROMOTIONS COUNT -------------------
loadPromotionsCount(): void {
  const companyId = this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  let source$: Observable<unknown> | null = null;

  if (publicId) {
    // public landing
    source$ = this.companyApi.getPublicPromotions(publicId);
  } else if (companyId) {
    // logged-in company
    source$ = this.companyApi.getPromotionsCount(companyId);
  }

  if (!source$) return;

  source$
    .pipe(
      catchError((err) => {
        console.error('Error loading promotions count', err);
        return of(null);
      })
    )
    .subscribe((res: unknown) => {
      const data = res as {
        promotionCount?: number;
        success?: boolean;
        data?: {
          promotionCount?: number;
        };
      };
    
      // Public API case: { companyId, promotionCount }
      if (data?.promotionCount !== undefined) {
        this.promotions = data.promotionCount ?? 0;
        return;
      }
    
      // Logged-in API case: { success, data: { promotionCount } }
      if (data?.success && data.data) {
        this.promotions = data.data.promotionCount ?? 0;
      }
    });
    
}




// --------------------------- LOAD ALL CAMPUS -----------------


  private getCompanyId(): string | null {
    // Try from auth state (user profile) - companyId from login response
    const currentUser = this.authState.user();
    const companyIdFromUser = currentUser?.companyId;
    if (companyIdFromUser) {
      // Also store it in storage for consistency
      this.storage.set(STORAGE_KEYS.COMPANY_ID, companyIdFromUser);
      return companyIdFromUser;
    }
    
    // Try from storage
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    // Additional fallback: check if userType is COMPANY and try to get from profileServiceId
    if (currentUser?.userType === 'COMPANY' && currentUser?.profileServiceId) {
      this.storage.set(STORAGE_KEYS.COMPANY_ID, currentUser.profileServiceId);
      return currentUser.profileServiceId;
    }
    
    return null;
  }

  // -------------- get public id landing page ---------
  private getPublicCompanyId(): string | null {
    return this.route.snapshot.paramMap.get('publicCompanyId');
  }

  get isPublicProfile(): boolean {
    return !!this.route.snapshot.paramMap.get('publicCompanyId');
  }

  // -------------- KEY PEOPLE ----------------------

  loadKeyPeople(): void {
    const companyId = this.getCompanyId();
    const publicId = this.getPublicCompanyId?.(); // agar helper banaya hai
  
    const source$ = publicId
      ? this.companyApi.getPublicKeyPeople(publicId)
      : companyId
        ? this.companyApi.getKeyPeople(companyId)
        : null;
  
    if (!source$) {
      console.warn('CompanyAboutComponent: No company ID available, cannot load key people');
      return;
    }
  
    this.loadingKeyPeople.set(true);
  
    source$.pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error loading key people:', error);
        this.loadingKeyPeople.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly KeyPersonResponse[]) => {
        this.loadingKeyPeople.set(false);
        this.keyPeople.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyAboutComponent: Error in key people subscription:', error);
        this.loadingKeyPeople.set(false);
        this.keyPeople.set([]);
      }
    });
  }
  
  // ------------ OUR TARGET CAMPUS -----------------

  loadTargetCampuses(): void {
    const companyId = this.getCompanyId();
    const publicId = this.getPublicCompanyId?.(); 
  
    const source$ = publicId
      ? this.companyApi.getPublicTargetCampuses(publicId)
      : companyId
        ? this.companyApi.getTargetCampuses(companyId)
        : null;
  
    if (!source$) {
      console.warn('CompanyAboutComponent: No company ID available, cannot load target campuses');
      return;
    }
  
    this.loadingTargetCampuses.set(true);
  
    source$.pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error loading target campuses:', error);
        this.loadingTargetCampuses.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly TargetCampusResponse[]) => {
        this.loadingTargetCampuses.set(false);
        this.targetCampuses.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyAboutComponent: Error in target campuses subscription:', error);
        this.loadingTargetCampuses.set(false);
        this.targetCampuses.set([]);
      }
    });
  }
  

  // --------------------- CURRENT VACNACY -----------

  loadCurrentVacancies(): void {
    const companyId = this.getCompanyId();          // logged-in flow
    const publicId = this.getPublicCompanyId?.();  // public flow 
  
    if (!companyId && !publicId) return;
  
    this.loadingVacancies.set(true);
  
    const source$ = publicId
      ? this.companyApi.getPublicVacancies(publicId)
      : this.companyApi.getVacancies(companyId!, 0, 100);
  
    source$
      .pipe(
        catchError(err => {
          console.error('Error loading vacancies', err);
          this.loadingVacancies.set(false);
          return of([]);
        })
      )
      .subscribe((res: readonly VacancyResponse[]) => {
        this.loadingVacancies.set(false);
  
        const mapped: Vacancy[] = res.map((v) => {
          const item = v as VacancyResponse;

          return {
            vacancyId: item.vacancyId ?? '',
            companyId: item.companyId ?? '',
            jobTitle: item.jobTitle ?? '',
            jobLocation: item.jobLocation ?? '',
            department: item.department ?? '',
            jobType: item.jobType ?? '',
            salary: item.salary ?? '',
            numberOfOpenings: item.numberOfOpenings ?? '0',
            contractDuration: item.contractDuration ?? '',
            jobDescription: item.jobDescription ?? '',
            requiredQualifications: item.requiredQualifications ?? [],
            streamsEligible: item.streamsEligible ?? [],
            minimumCgpaPercentage: item.minimumCgpaPercentage ?? '',
            yearOfPassing: item.yearOfPassing ?? '',
            selectionProcess: item.selectionProcess ?? [],
            interviewMode: item.interviewMode ?? '',
          };
        });
  
        this.allVacancies = mapped;
        const pages = Math.max(1, Math.ceil(this.allVacancies.length / this.vacancyPageSize));
        this.totalVacancyPages.set(pages);
  
        this.currentVacancyPage.set(1);
        this.updateVacancyPage();
      });
  }
  

private updateVacancyPage(): void {
  const start = (this.currentVacancyPage() - 1) * this.vacancyPageSize;
  const end = start + this.vacancyPageSize;
  this.vacancies.set(this.allVacancies.slice(start, end));
}

onVacancyPageChange(page: number): void {
  this.currentVacancyPage.set(page);
  this.updateVacancyPage();
}



openVacancyDetails(job: Vacancy): void {
  this.selectedVacancy.set(job);
  this.modalService.openModal('company-current-vacancy');
}

onApplyToVacancy(): void {
  if (this.applyingToVacancy()) return;

  const vacancy = this.selectedVacancy();
  if (!vacancy) {
    this.notify.error('No vacancy selected');
    return;
  }

  // Check if vacancyId exists
  if (!vacancy.vacancyId) {
    this.notify.error('Vacancy ID not found');
    return;
  }

  // Check if companyId exists
  if (!vacancy.companyId) {
    this.notify.error('Company ID not found');
    return;
  }

  // Check if user is logged in
  const currentUser = this.authState.user();
  if (!currentUser || !currentUser.userType) {
    this.notify.error('Please login to apply for this vacancy');
    return;
  }

  // Check if user is a student
  if (currentUser.userType !== 'STUDENT') {
    this.notify.error('Only students can apply for vacancies');
    return;
  }

  // Get studentId
  const studentId = 
    currentUser.studentId ||
    currentUser.profileServiceId ||
    (this.storage.get(STORAGE_KEYS.STUDENT_ID) as string | null);

  if (!studentId) {
    this.notify.error('Student ID not found. Please login again.');
    return;
  }

  this.applyingToVacancy.set(true);

  this.companyApi.applyVacancy(vacancy.vacancyId, vacancy.companyId, studentId).subscribe({
    next: (response) => {
      this.applyingToVacancy.set(false);
      
      if (response?.success) {
        this.notify.success(response.message || 'Your application has been submitted successfully. The company and admin have been notified.');
        this.modalService.closeModal();
      } else {
        this.notify.error(response?.message || 'Failed to submit application');
      }
    },
    error: (error) => {
      this.applyingToVacancy.set(false);
      const errorMessage = error?.error?.message || error?.message || 'Failed to submit application. Please try again.';
      this.notify.error(errorMessage);
      console.error('CompanyAboutComponent: Error applying to vacancy', error);
    }
  });
}



  // ===================== OUR CLIENTS =====================

  loadClients(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  
    const tryLoad = () => {
      const companyId = this.getCompanyId();
      const publicId = this.getPublicCompanyId?.();
  
      const source$ = publicId
        ? this.companyApi.getPublicClients(publicId)
        : companyId
        ? this.companyApi.getClients(companyId, 0, 50)
        : null;
  
      if (!source$) {
        setTimeout(tryLoad, 300);
        return;
      }
  
      this.loadingClients.set(true);
  
      source$
        .pipe(
          catchError((error) => {
            console.error('CompanyAboutComponent: Error loading clients:', error);
            this.loadingClients.set(false);
            return of([]);
          })
        )
        .subscribe({
          next: (response: readonly ClientResponse[]) => {
            this.loadingClients.set(false);
  
            const mapped = response.map((client: ClientResponse) => {
              let imageUrl = client.photoUrl || client.photourl || client.clientLogo || client.logoUrl || null;
  
              if (imageUrl) {
                if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                  // use as-is
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = `/api/v1/files${imageUrl}`;
                } else if (imageUrl.startsWith('assets/')) {
                  // use as-is
                } else {
                  imageUrl = `/api/v1/files/${imageUrl}`;
                }
              }
  
              return {
                logo: imageUrl || '/assets/images/client-placeholder.jpg',
                name: client.clientName || 'Client',
              };
            });
  
            this._clientViewList = mapped;
            this.totalClientPages.set(Math.max(1, Math.ceil(mapped.length / 8)));
          },
          error: () => {
            this.loadingClients.set(false);
            this._clientViewList = [];
            this.totalClientPages.set(1);
          },
        });
    };
  
    tryLoad();
  }
  
// --------------------- AUTOSEARCH CAMPUS ------------------

onCampusSearch(term: string): void {
  if (!term || term.trim().length < 2) {
    this.campusOptions = [];
    return;
  }

  this.companyApi.searchCampuses(term).subscribe((res) => {
    const list = res.data?.content ?? [];

    this.campusOptions = list.map(c => ({
      label: c.campusName,
      value: c.id,
    }));
  });
}

// -----------------  BENEFITS OFFER ---------

loadBenefitsOffer(): void {
  const companyId = this.getCompanyId();
  const publicId = this.getPublicCompanyId?.();

  const source$ = publicId
    ? this.companyApi.getPublicBenefitsOffer(publicId)
    : companyId
    ? this.companyApi.getBenefitsOffer(companyId)
    : null;

  if (!source$) return;

  source$.subscribe({
    next: (res) => {
      if (!res) {
        this.benefitsData = null;
        return;
      }

      // Check if response has meaningful data (at least benefitsOfferId or companyId exists)
      if (!res.benefitsOfferId && !res.companyId) {
        this.benefitsData = null;
        return;
      }

      this.benefitsData = res;

      const rate = res.internToJobRate?.replace('%', '') ?? '0';
      this.internToJobRate = Number(rate) || 0;
      this.startingSalaryRange = res.startingSalaryRange || '';

      const map: Record<string, string | undefined> = {
        'Performance Bonus': res.performanceBonus,
        'Healthcare': res.healthcare,
        'Mentor Buddy System': res.mentorBuddySystem,
        'Work Life Balance Perks': res.workLifeBalancePerks,
        'Appreciation Day Off': res.appreciationDayOff,
        'Training & Upskilling': res.trainingAndUpskilling,
        'Sick Leaves': res.sickLeaves,
        'New Employee Referral Bonus': res.referralBonus,
      };

      this.benefits = this.benefits.map(b => ({
        ...b,
        description: map[b.title] || '',
      }));
    },
    error: (err) => {
      console.error('Error loading benefits offer', err);
      this.benefitsData = null;
    }
  });
}

hasBenefitsData(): boolean {
  if (!this.benefitsData) {
    return false;
  }
  // Check if benefitsOfferId or companyId exists (indicates data was actually saved)
  return !!(this.benefitsData.benefitsOfferId || this.benefitsData.companyId);
}

// ------------------ OUR VISION & PERFORMANCE -------------------------------------

loadCompanyVision(): void {
  const tryLoad = () => {
    const publicId = this.getPublicCompanyId?.(); // tum apna helper banaogi
    const companyId = this.getCompanyId();

    // agar dono hi nahi mile to retry
    if (!publicId && !companyId) {
      setTimeout(tryLoad, 300);
      return;
    }

    this.loadingVision = true;

    const api$ = publicId
      ? this.companyApi.getPublicCompanyVision(publicId)   
      : this.companyApi.getCompanyVision(companyId!);      

    api$
      .pipe(
        catchError((err) => {
          console.error('Error loading company vision', err);
          this.loadingVision = false;
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.loadingVision = false;

        if (res?.vision) {
          this.companyVision = res.vision;
        }
      });
  };

  tryLoad();
}

  loadOverviewStats(companyId: string): void {
    const year = this.selectedChartYear();
    this.loadingOverviewStats.set(true);
    this.companyApi
      .getOverviewStats(companyId, year)
      .pipe(
        finalize(() => this.loadingOverviewStats.set(false)),
        catchError((err) => {
          console.error('Error loading overview stats', err);
          return of(null);
        })
      )
      .subscribe((result) => {
        this.overviewStats.set(result);
        this.cdr.detectChanges();
        if (this.achievementChart) {
          this.updateAchievementChart();
        } else {
          this.chartDirty = true;
          setTimeout(() => this.tryInitAchievementChart(), 100);
        }
      });
  }

  onChartYearChange(year: number): void {
    this.selectedChartYear.set(year);
    const companyId = this.loadedCompanyId ?? this.getCompanyId();
    if (companyId) {
      this.loadOverviewStats(companyId);
    }
  }

  private hasOverviewChartData(): boolean {
    return this.overviewStats() != null;
  }

  private tryInitAchievementChart(): void {
    const canvas = this.achievementChartCanvas?.nativeElement;
    if (!canvas || this.achievementChart) return;
    if (!isPlatformBrowser(this.platformId)) return;
    this.achievementChart = new Chart(canvas, this.getAchievementChartConfig());
  }

  private updateAchievementChart(): void {
    if (!this.achievementChart) return;
    const { labels, datasets } = this.getChartData();
    this.achievementChart.data.labels = labels;
    const ds = this.achievementChart.data.datasets[0];
    if (ds) {
      ds.data = datasets[0].data;
      ds.label = datasets[0].label;
      ds.backgroundColor = datasets[0].backgroundColor;
      ds.borderColor = datasets[0].borderColor;
    }
    this.achievementChart.update('none');
  }

  private getChartData(): {
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor: string | string[]; borderColor: string | string[]; borderWidth: number }[];
  } {
    const stats = this.overviewStats();
    const targetVal = typeof stats?.targetCampusesCount === 'number' ? stats.targetCampusesCount : 0;
    const visitsVal = typeof stats?.campusVisitsOrDrivesThisYear === 'number' ? stats.campusVisitsOrDrivesThisYear : 0;
    return {
      labels: ['Target Campuses', 'Campus Visits / Drives'],
      datasets: [
        {
          label: String(this.selectedChartYear()),
          data: [targetVal, visitsVal],
          backgroundColor: ['rgba(139, 92, 246, 0.8)', 'rgba(59, 130, 246, 0.8)'],
          borderColor: ['rgb(139, 92, 246)', 'rgb(59, 130, 246)'],
          borderWidth: 1,
        },
      ],
    };
  }

  private getAchievementChartConfig(): ChartConfiguration<'bar'> {
    const { labels, datasets } = this.getChartData();
    return {
      type: 'bar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { stepSize: 1 },
          },
        },
      },
    };
  }

  onCampusPageChange(page: number): void {
    this.currentCampusPage.set(page);
  }

  onTeamPageChange(page: number): void {
    this.currentTeamPage.set(page);
  }

  onClientPageChange(page: number): void {
    this.currentClientPage.set(page);
  }

 onTestimonialPageChange(page: number): void {
  this.currentTestimonialPage.set(page);
  this.loadTestimonials(page);
}

previousTestimonial(): void {
  const next = this.currentTestimonialPage() - 1;
  if (next >= 1) this.loadTestimonials(next, false);
}

nextTestimonial(): void {
  const next = this.currentTestimonialPage() + 1;
  if (next <= this.totalTestimonialPages()) this.loadTestimonials(next, false);
}

// ------------------ submit recommendation -----------------

onRecommendationSelect(value: 'yes' | 'no'): void {
  if (this.submittingRecommendation) return;

  const currentUser = this.authState.user();

  // ✅ LOGIN CHECK
  if (!currentUser || !currentUser.userType) {
    this.notify.error('Please login to submit recommendation');
    return;
  }

  const companyId = this.loadedCompanyId ?? this.getCompanyId();
  if (!companyId) {
    this.notify.error('Company not found');
    return;
  }

  const requesterUserType = currentUser.userType as
    | 'STUDENT'
    | 'COMPANY'
    | 'CAMPUS';

  let reviewerId: string | null = null;

  // Try all possible identity fields (backend may use different IDs)
  if (requesterUserType === 'COMPANY') {
    reviewerId =
      currentUser.companyId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  } else if (requesterUserType === 'STUDENT') {
    reviewerId =
      currentUser.studentId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.STUDENT_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  } else if (requesterUserType === 'CAMPUS') {
    reviewerId =
      currentUser.campusId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  }

  if (!reviewerId || !String(reviewerId).trim()) {
    this.notify.error('User identity not found');
    return;
  }

  // 🚫 COMPANY CANNOT RECOMMEND ITSELF
  if (requesterUserType === 'COMPANY' && reviewerId === companyId) {
    this.notify.error('A company cannot recommend itself');
    return;
  }

  this.submittingRecommendation = true;

  const publicCompanyId = this.getPublicCompanyId?.() ?? undefined;

  this.companyApi
    .submitCompanyRecommendation(companyId, reviewerId, requesterUserType, {
      wouldRecommend: value === 'yes',
      publicCompanyId,
    })
    .subscribe({
      next: (res) => {
        this.submittingRecommendation = false;
        if (res) {
          this.recommendation = value;
          this.notify.success('Thanks for your response!');
        }
        // If res is null, API failed - interceptor already showed error toast
      },
      error: () => {
        this.submittingRecommendation = false;
        // Interceptor shows backend error; only show generic if needed
        this.notify.error('Recommendation service unavailable');
      },
    });
}
















submitFeedback(event?: Event): void {
  event?.preventDefault();
  if (this.submittingFeedback) return;

    // trigger validation if user directly clicks submit
  if (!this.feedbackForm.name?.trim()) {
    this.nameTouched = true;
  }

  if (this.isNameInvalid()) {
    return;
  }

  //  1. LOGIN CHECK FIRST (MOST IMPORTANT)
  const currentUser = this.authState.user();
  if (!currentUser || !currentUser.userType) {
    this.notify.error('Please login to submit feedback');
    return;
  }

  //  2. COMPANY CHECK - use companyId from profile API (loaded on page init)
  const companyId = this.loadedCompanyId ?? this.getCompanyId();
  if (!companyId) {
    this.notify.error('Company not found');
    return;
  }

  const reviewerName = this.feedbackForm.name.trim();
  const feedbackText = this.feedbackForm.feedback.trim();

  if (!reviewerName || !feedbackText) {
    this.notify.error('Please fill all fields');
    return;
  }

  //  COMPANY CANNOT FEEDBACK ITSELF
  if (
    currentUser.userType === 'COMPANY' &&
    currentUser.companyId === companyId
  ) {
    this.notify.error('A company cannot give feedback to itself');
    return;
  }

  //  requesterUserType
  const requesterUserType: 'STUDENT' | 'COMPANY' | 'CAMPUS' =
    currentUser.userType === 'STUDENT'
      ? 'STUDENT'
      : currentUser.userType === 'CAMPUS'
      ? 'CAMPUS'
      : 'COMPANY';

  //  reviewerId - try all possible identity fields
  let reviewerId: string | null = null;
  if (requesterUserType === 'STUDENT') {
    reviewerId =
      currentUser.studentId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.STUDENT_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  } else if (requesterUserType === 'CAMPUS') {
    reviewerId =
      currentUser.campusId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  } else {
    reviewerId =
      currentUser.companyId ||
      currentUser.profileServiceId ||
      (this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null) ||
      (currentUser.userId != null ? String(currentUser.userId) : null);
  }

  if (!reviewerId || !String(reviewerId).trim()) {
    this.notify.error('User identity not found');
    return;
  }

  this.submittingFeedback = true;

  this.companyApi
    .submitCompanyFeedback(companyId, reviewerId, requesterUserType, {
      reviewerName,
      feedbackText,
    })
    .subscribe({
      next: () => {
        this.submittingFeedback = false;
        this.notify.success('Feedback submitted successfully');
        this.feedbackForm = { name: '', feedback: '' };
        this.loadLatestTestimonial();
      },
      error: (err) => {
        this.submittingFeedback = false;
        const msg =
          err?.error?.message || 'Failed to submit feedback';
        this.notify.error(msg);
      },
    });
}







  onInviteCompany(): void {
    // Open invitation form modal
    this.modalService.openModal('company-invitation-form');
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

handleInvitationFormSubmit(value: InvitationFormValue): void {
  if (!this.selectedCampusId) {
    this.notify.error('Please select a campus');
    return;
  }

  this.submittingInvitationForm = true;

  const request: CompanyInvitationRequest = {
    campusId: this.selectedCampusId,   // 🔥 real backend ID
    campusName: value.campusName.trim(),

    contactPersonName: value.contactPersonName.trim(),
    contactPersonEmail: value.contactPersonEmail.trim(),
    contactPersonPhoneNo: value.contactPersonPhone.trim(),
    contactPersonDesignation: value.contactPersonDesignation.trim(),

    campusWebsiteUrl: value.campusWebsiteUrl.trim(),
    campusAddress: value.campusAddress.trim(),

    campusProspectusUrl: value.campusProspectus
      ? `https://dummy.com/${value.campusProspectus.name}` // backend expects URL
      : undefined,

    academicYear: value.academicYear.trim(),

    programsOffered: Array.isArray(value.programsOffered)
      ? value.programsOffered
      : [value.programsOffered],

    preferredSkills: Array.isArray(value.preferredSkills)
      ? value.preferredSkills
      : [value.preferredSkills],

    proposedDateForPlacementDrive: value.proposedDate.trim(),
    facilitiesAvailableForRecruitmentProcess: value.facilitiesAvailable.trim(),

    inviteCompany: value.confirmationChecked,
  };


  const companyId = this.loadedCompanyId ?? this.getCompanyId();

if (!companyId) {
  this.notify.error('Company ID not found. Please login again.');
  this.submittingInvitationForm = false;
  return;
}

this.companyApi.submitCompanyInvitation(companyId, request).subscribe({
  next: (res) => {
    console.log('Invitation submitted', res);
    this.submittingInvitationForm = false;
    this.modalService.closeModal();
    this.notify.success('Invitation sent successfully');
  },
  error: (err) => {
    console.error('Error submitting invitation', err);
    this.submittingInvitationForm = false;
    this.notify.error('Failed to send invitation');
  }
});

}



 

  // Expose Math to template
  readonly Math = Math;
}
