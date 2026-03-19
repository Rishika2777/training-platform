import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, Component, computed, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent, DropdownItem, ApiFetchFunction } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { YearPickerComponent } from '../../../../shared/components/year-picker/year-picker.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { StudentResumeUploadComponent } from '../resume-upload/student-resume-upload.component';
import { StudentCareerCheckinComponent } from '../career-checkin/student-career-checkin.component';
import { StudentLearningPathwayComponent } from '../learning-pathway/student-learning-pathway.component';
import { StudentIdeasSubmissionComponent } from '../ideas-submission/student-ideas-submission.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { CreatePostComponent } from '../../../../shared/components/create-post/create-post.component';
import type { CreatePostSubmitPayload } from '../../../../shared/components/create-post/create-post.component';
import { StudentAiToolkitComponent } from '../ai-toolkit/ai-toolkit.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { EditPostStateService } from '../../../../core/services/edit-post-state.service';
import { MediaViewerComponent } from '../../../../shared/components/media-viewer/media-viewer.component';
import {
  AnnouncementCarouselComponent,
  AnnouncementCarouselItem,
} from '../../../../shared/components/announcement-carousel/announcement-carousel.component';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of, Observable } from 'rxjs';
import { map, finalize, switchMap } from 'rxjs/operators';
import type { Post } from '../../../../core/models/common-api.model';
import { AlumniResponse, CampusResponse, PlacedStudentResponse } from '../../models/student.models';
import { APP_CONFIG_TOKEN, APP_CONFIG } from '../../../../core/config/app.constants';
import { CampusApiService, CampusAutocompleteResponse, CompanyVisitedItem } from '../../../../features/campus/services/campus-api.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { NewsService } from '../../../admin/services/news.service';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    YearPickerComponent,
    CreatePostComponent,
    MediaViewerComponent,
    AnnouncementCarouselComponent,
    RelativeTimePipe,
  ],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.css',
})
export class StudentHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly modalService = inject(ModalService);
  readonly studentApiService = inject(StudentApiService);
  readonly authService = inject(AuthService);
  private readonly campusApiService = inject(CampusApiService);
  private readonly commonApi = inject(CommonApiService);
  private readonly authState = inject(AuthStateService);
  readonly editPostState = inject(EditPostStateService);
  private readonly notify = inject(NotificationService);
  private readonly storage = inject(StorageService);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
private newsService = inject(NewsService);
readonly REPORT_MAX_LENGTH = 300;


  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isResumeModalOpen = computed(() => this.activeModal() === 'resume-upload');
  readonly isCareerCheckinModalOpen = computed(() => this.activeModal() === 'career-checkin');
  readonly isLearningPathwayModalOpen = computed(() => this.activeModal() === 'learning-pathway');
  readonly isIdeasSubmissionModalOpen = computed(() => this.activeModal() === 'ideas-submission');
  readonly isDreamJobToolkitModalOpen = computed(() => this.activeModal() === 'dream-job-toolkit');
  readonly isFilterModalOpen = computed(() => this.activeModal() === 'batchmates-filter');
  readonly isCreatePostModalOpen = computed(() => this.activeModal() === 'create-post');
private readonly router = inject(Router);
  submittingResume = false;
  submittingCareerCheckin = false;
  submittingIdeas = false;
  readonly isSubmittingPost = signal(false);
  
  // Announcements - loaded from dedicated API
  readonly announcementsLoaded = signal<FeedPost[]>([]);
  readonly announcements = computed(() => this.announcementsLoaded());

  readonly announcementCarouselItems = computed((): AnnouncementCarouselItem[] =>
    this.announcementsLoaded().map((p) => ({
      id: p.postId ?? undefined,
      text: p.text ?? '',
      date: p.createdAt ?? undefined,
      mediaUrl: p.mediaUrl ?? null,
      mediaType: p.mediaType ?? null,
    }))
  );

  // ----------------- news -------------
readonly newsList = signal<NewsItem[]>([]);
readonly loadingNews = signal(false);

newsPage = 0;
newsPageSize = 2;


// NEWS MODAL VIA MODAL SERVICE
openNewsDetail(news: NewsItem): void {
  this.newsModalData.set(news);
  this.modalService.openModal('news-detail');
}

// --------------- open placed student --------------
openPlacedStudentProfile(student: PersonCard): void {
  const id = student.publicStudentId || student.id;
  if (!id || !id.trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', id]));
  window.open(url, '_blank');
}

// ----------------- open my batchmates ------------
openBatchmateProfile(student: PersonCard): void {
  const id = student.publicStudentId || student.id;
  if (!id || !id.trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', id]));
  window.open(url, '_blank');
}

// ------------------ open company profile ------------
openCompanyProfile(company: CompanyCard): void {
  const publicId = company.publicCompanyId;
  if (!publicId || !String(publicId).trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/company', publicId]));
  window.open(url, '_blank');
}

// -------------------- open alumni profile ---------------
openAlumniProfile(student: PersonCard): void {
  const id = student.publicStudentId || student.id;
  if (!id || !id.trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', id]));
  window.open(url, '_blank');
}

closeNewsDetail(): void {
  this.modalService.closeModal();
  this.newsModalData.set(null);
}


readonly isNewsDetailModalOpen = computed(
  () => this.modalService.activeModal() === 'news-detail'
);

readonly newsModalData = signal<NewsItem | null>(null);

  // Feed posts (excluding announcements)
  readonly feedPosts = computed(() => {
    return this.posts().filter((post) => post.postKind !== 'ANNOUNCEMENT');
  });



  // --------------- news ----------
loadLatestNews(): void {
  // Only load news if user is authenticated and has a valid token
  const user = this.authState.user();
  const token = this.authState.token();
  if (!user || !token) {
    this.newsList.set([]);
    this.loadingNews.set(false);
    return;
  }

  this.loadingNews.set(true);

  this.newsService.getAllNews().subscribe({
    next: (res: unknown) => {

      if (Array.isArray(res)) {
        this.newsList.set(res as NewsItem[]);
      } 
      else if (res && typeof res === 'object' && 'data' in res) {
        const apiRes = res as { data: NewsItem[] };
        this.newsList.set(apiRes.data || []);
      } 
      else {
        this.newsList.set([]);
      }

      this.loadingNews.set(false);
    },

    error: (err) => {
      // Only log non-401 errors (401 is expected if not authenticated or token expired)
      if (err && typeof err === 'object' && 'status' in err && err.status !== 401) {
        console.error('Student news load error:', err);
      }
      this.newsList.set([]);
      this.loadingNews.set(false);
    }
  });
}


newsTotalPages(): number {
  return Math.ceil(this.newsList().length / this.newsPageSize);
}

newsPageItems(): NewsItem[] {
  const start = this.newsPage * this.newsPageSize;
  return this.newsList().slice(start, start + this.newsPageSize);
}

onNewsPageChange(page: number) {
  this.newsPage = page - 1;
}



  /** Scroll container: layout main.content when present (sticky sidebar), else window. */
  private getScrollHost(): HTMLElement | null {
    const el = this.elementRef?.nativeElement;
    return el?.closest?.('.content') ?? null;
  }

  ngOnDestroy(): void {
    this.feedIntersectionObserver?.disconnect();
    this.feedIntersectionObserver = null;
    const win = typeof window !== 'undefined' ? window : null;
    if (this.feedScrollListener) {
      if (this.feedScrollHost) this.feedScrollHost.removeEventListener('scroll', this.feedScrollListener as EventListener);
      if (win) win.removeEventListener('scroll', this.feedScrollListener as EventListener);
      this.feedScrollListener = null;
    }
    if (this.feedTopRefreshListener) {
      if (this.feedScrollHost) this.feedScrollHost.removeEventListener('scroll', this.feedTopRefreshListener as EventListener);
      if (win) win.removeEventListener('scroll', this.feedTopRefreshListener as EventListener);
      this.feedTopRefreshListener = null;
    }
    this.feedScrollHost = null;
  }
  readonly postAuthorName = computed(() => {
    // Use studentProfile signal so we react when loadData completes
    const profile = this.studentProfile();
    if (profile) {
      const fullName = profile['fullName'] ?? profile['full_name'] ?? profile['name'];
      if (fullName && String(fullName).trim()) return String(fullName).trim();
      const firstName = profile['firstName'] ?? profile['first_name'];
      const lastName = profile['lastName'] ?? profile['last_name'];
      if (firstName || lastName) {
        const name = [firstName, lastName].filter(Boolean).map(String).join(' ').trim();
        if (name) return name;
      }
    }
    // Fallback: read from localStorage (e.g. when coming from profile page)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('student_profile_data');
        if (raw) {
          const stored = JSON.parse(raw) as Record<string, unknown>;
          const fullName = stored?.['fullName'] ?? stored?.['full_name'] ?? stored?.['name'];
          if (fullName && String(fullName).trim()) return String(fullName).trim();
          const firstName = stored?.['firstName'] ?? stored?.['first_name'];
          const lastName = stored?.['lastName'] ?? stored?.['last_name'];
          if (firstName || lastName) {
            const name = [firstName, lastName].filter(Boolean).map(String).join(' ').trim();
            if (name) return name;
          }
        }
      } catch { /* ignore */ }
    }
    return this.authState.user()?.displayName ?? this.authState.user()?.email ?? 'Student';
  });
  readonly postAuthorImageUrl = computed(() => {
    // Use studentProfile signal so we react when loadData completes
    const profile = this.studentProfile();
    if (profile) {
      const photoUrl = profile['profilePhotoUrl'] ?? profile['profile_photo_url'];
      if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
        const url = photoUrl.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
      }
    }
    // Fallback: read from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('student_profile_data');
        if (raw) {
          const stored = JSON.parse(raw) as Record<string, unknown>;
          const photoUrl = stored?.['profilePhotoUrl'] ?? stored?.['profile_photo_url'];
          if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
            const url = photoUrl.trim();
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
          }
        }
      } catch { /* ignore */ }
    }
    return this.authState.user()?.imageUrl ?? null;
  });

  readonly batchmates = signal<readonly PersonCard[]>([]);
  readonly placedStudents = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly companies = signal<readonly CompanyCard[]>([]);
  readonly campuses = signal<readonly CampusResponse[]>([]);

  loadingBatchmates = signal(false);
  loadingPlacedStudents = signal(false);
  loadingAlumni = signal(false);
  loadingCompanies = signal(false);

  // Store student profile data for campusName and yearOfPassing (from localStorage)
  readonly studentProfile = signal<Record<string, unknown> | null>(null);

  // Filter state for batchmates and alumni
  readonly selectedCampusName = signal<string | null>(null);
  readonly selectedYearOfPassing = signal<string | null>(null);
  
  // Filter state for placed students
  readonly placedStudentsYear = signal<string>(''); // YYYY-01-01 format

  readonly posts = signal<FeedPost[]>([]);
  readonly loadingFeed = signal(false);
  readonly loadingMoreFeed = signal(false);
  readonly hasMoreFeed = signal(true);
  private feedPage = 0; // API uses 0-indexed pagination (page 0 for first page)
  private readonly feedPageSize = 10;
  private feedFirstLoadDone = false;
  private feedIntersectionObserver: IntersectionObserver | null = null;
  private feedScrollListener: (() => void) | null = null;
  private feedTopRefreshListener: (() => void) | null = null;
  private maxScrollY = 0; // Track maximum scroll position reached
  private lastTopRefreshTime = 0; // Timestamp of last top refresh to prevent spam
  private readonly TOP_REFRESH_THRESHOLD = 200; // Refresh when within 200px of top
  private readonly MIN_SCROLL_DISTANCE = 500; // Must scroll down at least 500px before allowing refresh
  private readonly TOP_REFRESH_COOLDOWN_MS = 2000; // 2 seconds cooldown between refreshes
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef);
  /** Layout main content element when inside dashboard layout; scroll happens here after sticky sidebar. */
  private feedScrollHost: HTMLElement | null = null;
  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLElement>;
  readonly mediaViewerUrl = signal<string | null>(null);
  readonly mediaViewerType = signal<'image' | 'video' | null>(null);
  readonly reportPostId = signal<string | null>(null);
  readonly reportReason = signal('');
  readonly isReporting = signal(false);
  readonly isReportModalOpen = computed(() => !!this.reportPostId());

  /** Max characters to show before truncating; beyond this show "See more". */
  readonly postTextTruncateLength = 200;
  readonly expandedPostIds = signal<Set<string>>(new Set());

  togglePostExpand(key: string): void {
    const next = new Set(this.expandedPostIds());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expandedPostIds.set(next);
  }

  readonly registeredCompaniesSlots = 3;

 get placedStudentsYearMax(): string {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-12-31`;
}
  readonly peoplePageSize = 6;
  readonly companiesPageSize = 6;
  batchmatesPage = 1;
  placedStudentsPage = 1;
  alumniPage = 1;
  companiesPage = 1;

  batchmatesTotalPages = signal(1);
  placedStudentsTotalPages = signal(1);
  alumniTotalPages = signal(1);
  companiesTotalPages = signal(1);

  batchmatesPageItems(): readonly PersonCard[] {
    return slicePage(this.batchmates(), this.batchmatesPage, this.peoplePageSize);
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents(), this.placedStudentsPage, this.peoplePageSize);
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni(), this.alumniPage, this.peoplePageSize);
  }

  companiesPageItems(): readonly CompanyCard[] {
    return this.companies();
  }

  /**
   * Load initial campuses on component init using search API
   * This populates the dropdown with initial data so users see options immediately
   */
  loadInitialCampuses(): void {
    this.campusApiService.getCampusBySearch('', 0, 20).subscribe({
      next: (response) => {        
        const content = this.extractCampusContent(response);
        if (content.length > 0) {
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
        }
      },
      error: () => {
        // Error loading campuses
      },
    });
  }

  private extractCampusContent(response: unknown): CampusAutocompleteResponse[] {
    const content = unwrapApiResponse<CampusAutocompleteResponse[]>(response);
    return Array.isArray(content) ? content : [];
  }

  ngOnInit(): void {
    this.loadData();
    this.loadInitialCampuses();
    this.loadFeed();
    this.loadAnnouncements();
    this.loadLatestNews();
  }

  loadFeed(): void {
    this.loadingFeed.set(true);
    this.feedPage = 0; // API uses 0-indexed pagination
    this.hasMoreFeed.set(true);
    this.feedFirstLoadDone = false;
    const user = this.authService.getCurrentUser();
    const userId = user?.studentId ?? user?.userId?.toString();
    const pageSize = this.feedPageSize;
    this.commonApi
      .getFeed({ pageSize, page: 0, viewerUserId: userId })
      .pipe(
        map((res) => {
          const count = res.posts?.length ?? 0;
          const items = mapPostsToFeedPost(res.posts ?? []);
          const hasMore = count < pageSize ? false : (res.hasMore ?? count >= pageSize);
          return { items, hasMore };
        }),
        switchMap(({ items, hasMore }) =>
          this.commonApi.enrichFeedLikes(items, { id: userId, type: 'STUDENT' }).pipe(
            map((enriched) => ({ items: enriched, hasMore }))
          )
        ),
        catchError(() => of({ items: [] as FeedPost[], hasMore: false })),
        finalize(() => {
          this.loadingFeed.set(false);
          this.feedFirstLoadDone = true;
        })
      )
      .subscribe({
        next: ({ items, hasMore }) => {
          this.posts.set(items);
          this.hasMoreFeed.set(hasMore);
          this.feedPage = 0; // API uses 0-indexed pagination
          this.setupFeedInfiniteScroll();
        },
        error: () => {
          this.posts.set([]);
          this.hasMoreFeed.set(false);
        },
      });
  }

  loadAnnouncements(): void {
    const user = this.authService.getCurrentUser();
    const studentId = user?.studentId ?? user?.userId?.toString();
    const params: { viewerId?: string; viewerType?: string; viewerUserId?: string; pageSize?: number; page?: number } = {
      pageSize: 10,
      page: 0,
    };
    if (studentId) {
      params.viewerId = studentId;
      params.viewerType = 'STUDENT';
      params.viewerUserId = studentId;
    }
    this.commonApi.getAnnouncements(params).pipe(
      map((res) => mapPostsToFeedPost(res.posts ?? [])),
      catchError(() => of([] as FeedPost[]))
    ).subscribe({
      next: (items) => this.announcementsLoaded.set(items),
      error: () => this.announcementsLoaded.set([]),
    });
  }

  private setupFeedInfiniteScroll(): void {
    if (typeof window === 'undefined') return;
    const el = this.feedSentinel?.nativeElement;
    if (!el) return;
    this.feedScrollHost = this.getScrollHost();
    const contentTarget = this.feedScrollHost as EventTarget | null;
    const win = typeof window !== 'undefined' ? window : null;

    if (!this.feedIntersectionObserver) {
      this.ngZone.runOutsideAngular(() => {
        this.feedIntersectionObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry?.isIntersecting) return;
            this.ngZone.run(() => {
              if (
                this.feedFirstLoadDone &&
                this.hasMoreFeed() &&
                !this.loadingMoreFeed() &&
                !this.loadingFeed()
              ) {
                this.loadMoreFeed();
              }
            });
          },
          { root: null, rootMargin: '200px 0px', threshold: 0 }
        );
        this.feedIntersectionObserver.observe(el);
      });
    }
    if (!this.feedScrollListener) {
      const checkAndLoad = (): void => {
        if (
          !this.feedFirstLoadDone ||
          !this.hasMoreFeed() ||
          this.loadingMoreFeed() ||
          this.loadingFeed()
        )
          return;
        const sentinel = this.feedSentinel?.nativeElement;
        if (!sentinel) return;
        const rect = sentinel.getBoundingClientRect();
        const viewHeight = win ? window.innerHeight : 0;
        const triggerZone = viewHeight + 300;
        if (rect.top <= triggerZone) {
          this.ngZone.run(() => this.loadMoreFeed());
        }
      };
      this.feedScrollListener = checkAndLoad;
      this.ngZone.runOutsideAngular(() => {
        if (contentTarget) contentTarget.addEventListener('scroll', this.feedScrollListener as EventListener, { passive: true });
        if (win) win.addEventListener('scroll', this.feedScrollListener as EventListener, { passive: true });
      });
    }
    if (!this.feedTopRefreshListener) {
      const checkTopRefresh = (): void => {
        const contentScroll = this.feedScrollHost ? this.feedScrollHost.scrollTop : 0;
        const windowScroll = win ? (window.scrollY || window.pageYOffset || 0) : 0;
        const scrollY = Math.max(contentScroll, windowScroll);
        if (scrollY > this.maxScrollY) {
          this.maxScrollY = scrollY;
        }
        if (
          scrollY <= this.TOP_REFRESH_THRESHOLD &&
          this.maxScrollY >= this.MIN_SCROLL_DISTANCE &&
          this.feedFirstLoadDone &&
          !this.loadingFeed() &&
          !this.loadingMoreFeed()
        ) {
          const now = Date.now();
          if (now - this.lastTopRefreshTime >= this.TOP_REFRESH_COOLDOWN_MS) {
            this.lastTopRefreshTime = now;
            this.maxScrollY = 0;
            this.ngZone.run(() => this.loadFeed());
          }
        }
      };
      this.feedTopRefreshListener = checkTopRefresh;
      this.ngZone.runOutsideAngular(() => {
        if (contentTarget) contentTarget.addEventListener('scroll', this.feedTopRefreshListener as EventListener, { passive: true });
        if (win) win.addEventListener('scroll', this.feedTopRefreshListener as EventListener, { passive: true });
      });
    }
  }

  loadMoreFeed(): void {
    if (
      this.loadingMoreFeed() ||
      !this.hasMoreFeed() ||
      this.loadingFeed() ||
      !this.feedFirstLoadDone
    )
      return;
    const user = this.authService.getCurrentUser();
    const userId = user?.studentId ?? user?.userId?.toString();
    const nextPage = this.feedPage + 1;
    this.loadingMoreFeed.set(true);
    this.commonApi
      .getFeed({ pageSize: this.feedPageSize, page: nextPage, viewerUserId: userId })
      .pipe(
        map((res) => {
          const count = res.posts?.length ?? 0;
          const items = mapPostsToFeedPost(res.posts ?? []);
          const hasMore =
            count < this.feedPageSize ? false : (res.hasMore ?? count >= this.feedPageSize);
          return { items, hasMore };
        }),
        switchMap(({ items, hasMore }) =>
          this.commonApi.enrichFeedLikes(items, { id: userId, type: 'STUDENT' }).pipe(
            map((enriched) => ({ items: enriched, hasMore }))
          )
        ),
        catchError(() => of({ items: [] as FeedPost[], hasMore: false })),
        finalize(() => this.loadingMoreFeed.set(false))
      )
      .subscribe({
        next: ({ items, hasMore }) => {
          if (items.length > 0) {
            this.posts.update((prev) => [...prev, ...items]);
          }
          this.hasMoreFeed.set(hasMore);
          this.feedPage = nextPage;
        },
      });
  }

  ngAfterViewInit(): void {
    this.setupFeedInfiniteScroll();
    queueMicrotask(() => {
      if (this.posts().length === 0 && !this.loadingFeed()) {
        this.loadFeed();
      }
    });
  }

  loadData(): void {
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId;
    const userId = currentUser?.userId?.toString();

    if (!studentId || !userId) {
      return;
    }

    // Call getStudentFullProfile API to get fresh data
    this.studentApiService.getStudentFullProfile(studentId, userId, 'STUDENT').subscribe({
      next: (response) => {
        const profileData = unwrapApiResponse<Record<string, unknown>>(response);
        if (profileData) {
          
          // Store profile data in localStorage for navbar and other components
          try {
            localStorage.setItem('student_profile_data', JSON.stringify(profileData));
            // Dispatch event to notify sidebar and other components
            window.dispatchEvent(new Event('studentProfileUpdated'));
          } catch {
            // Error storing profile data
          }
          
          // Update signal with profile data
          this.studentProfile.set(profileData);
          const { institutionName, yearOfPassing } = this.getInstitutionAndYearFromProfile(profileData);

          this.selectedCampusName.set(institutionName);
          this.selectedYearOfPassing.set(yearOfPassing);
          
          // Extract campusId from profile - handle both array and single value formats
          let campusId: string | null = null;
          
          if (Array.isArray(profileData['campusId']) && profileData['campusId'].length > 0) {
            // If it's an array, take the first element
            campusId = String(profileData['campusId'][0]);
          } else if (profileData['campusId'] && typeof profileData['campusId'] === 'string') {
            // If it's a single string value
            campusId = profileData['campusId'] as string;
          }
          
          // Fallback to storage if campusId is not in profile
          const finalCampusId = campusId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) || null;   
          if (campusId) {
  this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
}       
          // Load batchmates and alumni with the profile data
          if (institutionName && yearOfPassing) {
            this.loadBatchmates(studentId);
            this.loadAlumni(studentId);
          }
          
          // Load placed students using campusId from profile or storage
          if (finalCampusId) {
            this.loadPlacedStudents(finalCampusId);
            this.loadCompanies(finalCampusId);
          }
        } else {
          // Fallback to localStorage if API fails
          this.loadDataFromStorage(studentId);
        }
      },
      error: () => {
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
      // Initialize filter values from profile (use institution with latest year)
      const { institutionName, yearOfPassing } = this.getInstitutionAndYearFromProfile(storedProfile);

      this.selectedCampusName.set(institutionName);
      this.selectedYearOfPassing.set(yearOfPassing);
      
      // Extract campusId from stored profile - handle both array and single value formats
      let campusId: string | null = null;
      
      if (Array.isArray(storedProfile['campusId']) && storedProfile['campusId'].length > 0) {
        // If it's an array, take the first element
        campusId = String(storedProfile['campusId'][0]);
      } else if (storedProfile['campusId'] && typeof storedProfile['campusId'] === 'string') {
        // If it's a single string value
        campusId = storedProfile['campusId'] as string;
      }
      
      // Fallback to storage if campusId is not in stored profile
      const finalCampusId = campusId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) || null;
      if (campusId) {
  this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
}
      // Load batchmates, alumni, and placed students with the stored profile data
      if (institutionName && yearOfPassing) {
        this.loadBatchmates(studentId);
        this.loadAlumni(studentId);
      }
      
      // Load placed students using campusId from stored profile or storage
      if (finalCampusId) {
        this.loadPlacedStudents(finalCampusId);
        this.loadCompanies(finalCampusId);
      }
      }
  }

  /**
   * Extracts institution name and year of passing for the most recent year.
   */
  private getInstitutionAndYearFromProfile(profile: Record<string, unknown>): {
    institutionName: string | null;
    yearOfPassing: string | null;
  } {
    const institutions = (profile?.['institutionName'] as string[]) ?? [];
    const years = (profile?.['yearOfPassingList'] as string[]) ?? [];
    const fallbackYear = profile?.['yearOfPassing'] ? String(profile['yearOfPassing']) : null;
    if (institutions.length === 0) {
      return { institutionName: null, yearOfPassing: fallbackYear };
    }
    if (years.length === 0 || institutions.length !== years.length) {
      return { institutionName: String(institutions[0]), yearOfPassing: fallbackYear };
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
      institutionName: String(institutions[maxIndex]),
      yearOfPassing: maxYear,
    };
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
    } catch {
      // Error reading stored profile data
    }
    return null;
  }

  loadBatchmates(studentId: string): void {
    // Prefer filter values when set; otherwise use profile
    let institutionName = this.selectedCampusName();
    let yearOfPassing = this.selectedYearOfPassing();
    if (!institutionName || !yearOfPassing) {
      const profile = this.studentProfile();
      if (!profile) return;
      const fromProfile = this.getInstitutionAndYearFromProfile(profile);
      institutionName = fromProfile.institutionName ?? institutionName;
      yearOfPassing = fromProfile.yearOfPassing ?? yearOfPassing;
    }

    if (!institutionName || !yearOfPassing) {
      return;
    }

    this.loadingBatchmates.set(true);
    this.studentApiService
      .getBatchmates(studentId, institutionName, yearOfPassing, this.batchmatesPage, this.peoplePageSize)
      .pipe(
        catchError(() => {
          this.loadingBatchmates.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingBatchmates.set(false);
          const content = unwrapApiResponse<unknown[]>(response);
          if (Array.isArray(content)) {
            const items = content.map((item) => this.mapBatchmateToPersonCard(item as Record<string, unknown>));
            this.batchmates.set(items);
            const meta = response && typeof response === 'object' ? (response as { data?: unknown }).data : null;
            const totalPages =
              meta && typeof meta === 'object' && !Array.isArray(meta) && typeof (meta as Record<string, unknown>)['totalPages'] === 'number'
                ? ((meta as Record<string, unknown>)['totalPages'] as number)
                : Math.max(1, Math.ceil(items.length / this.peoplePageSize));
            this.batchmatesTotalPages.set(totalPages);
          }
        },
        error: () => {
          this.loadingBatchmates.set(false);
        },
      });
  }

  loadPlacedStudents(campusId: string): void {
    if (!campusId) {
      this.loadingPlacedStudents.set(false);
      this.placedStudents.set([]);
      this.placedStudentsTotalPages.set(1);
      return;
    }
    this.loadingPlacedStudents.set(true);
    
    // Extract year from placedStudentsYear if set
    const yearValue = this.placedStudentsYear();
    let yearParam: number | undefined = undefined;
    if (yearValue) {
      const yearMatch = yearValue.match(/^(\d{4})/);
      if (yearMatch) {
        yearParam = parseInt(yearMatch[1], 10);
      }
    }
    
    // Uses campus dashboard placed-students API (0-based paging)
    this.campusApiService
      .getDashboardPlacedStudents(campusId, Math.max(0, this.placedStudentsPage - 1), this.peoplePageSize, yearParam)
      .pipe(
        catchError(() => {
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingPlacedStudents.set(false);
          const content = unwrapApiResponse<PlacedStudentResponse[]>(response);
          if (Array.isArray(content)) {
            const items = content.map((item) => this.mapPlacedStudentToPersonCard(item));
            this.placedStudents.set(items);
            const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
              ? (response.data.totalPages || 1)
              : 1;
            this.placedStudentsTotalPages.set(totalPages);
          }
        },
        error: () => {
          this.loadingPlacedStudents.set(false);
        },
      });
  }

  loadAlumni(studentId: string): void {    
    const campusName = this.selectedCampusName();
    const yearOfPassing = this.selectedYearOfPassing();

    if (!campusName || !yearOfPassing) {
      return;
    }

    this.loadingAlumni.set(true);
    this.studentApiService
      .getAlumniForStudent(studentId, campusName, yearOfPassing, this.alumniPage, 12)
      .pipe(
        catchError(() => {
          this.loadingAlumni.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingAlumni.set(false);
          const content = unwrapApiResponse<AlumniResponse[]>(response);
          if (Array.isArray(content)) {
            const items = content.map((item) => this.mapAlumniToPersonCard(item));
            this.alumni.set(items);
            const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
              ? (response.data.totalPages || 1)
              : 1;
            this.alumniTotalPages.set(totalPages);
          }
        },
        error: () => {
          this.loadingAlumni.set(false);
        },
      });
  }

  loadCompanies(campusId: string): void {
    if (!campusId) {
      this.loadingCompanies.set(false);
      this.companies.set([]);
      this.companiesTotalPages.set(1);
      return;
    }
    this.loadingCompanies.set(true);
    // Uses campus dashboard companies API (0-based paging)
    this.campusApiService
      .getDashboardCompanies(campusId, Math.max(0, this.companiesPage - 1), this.companiesPageSize)
      .pipe(
        catchError(() => {
          this.loadingCompanies.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingCompanies.set(false);
          const content = unwrapApiResponse<CompanyVisitedItem[]>(response);
          if (Array.isArray(content)) {
            const items = content.map((item) => this.mapCompanyToCompanyCard(item));
            this.companies.set(items);
            const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
              ? (response.data.totalPages || 1)
              : 1;
            this.companiesTotalPages.set(totalPages);
          }
        },
        error: () => {
          this.loadingCompanies.set(false);
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
    const profile = this.studentProfile();
    
    // Extract campusId from profile - handle both array and single value formats
    let campusId: string | null = null;
    
    if (profile) {
      if (Array.isArray(profile['campusId']) && profile['campusId'].length > 0) {
        // If it's an array, take the first element
        campusId = String(profile['campusId'][0]);
      } else if (profile['campusId'] && typeof profile['campusId'] === 'string') {
        // If it's a single string value
        campusId = profile['campusId'] as string;
      }
    }
    
    // Fallback to storage if campusId is not in profile
    const finalCampusId = campusId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) || null;
    
    if (finalCampusId) {
      this.loadPlacedStudents(finalCampusId);
    }
  }

  onPlacedStudentsYearChange(year: string): void {
    this.placedStudentsYear.set(year);
    // Reset to first page when year filter changes
    this.placedStudentsPage = 1;
    
    const profile = this.studentProfile();
    let campusId: string | null = null;
    
    if (profile) {
      if (Array.isArray(profile['campusId']) && profile['campusId'].length > 0) {
        campusId = String(profile['campusId'][0]);
      } else if (profile['campusId'] && typeof profile['campusId'] === 'string') {
        campusId = profile['campusId'] as string;
      }
    }
    
    const finalCampusId = campusId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) || null;
    
    if (finalCampusId) {
      this.loadPlacedStudents(finalCampusId);
    }
  }

  onAlumniPageChange(page: number): void {
    this.alumniPage = page;
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId || currentUser?.profileServiceId;
    if (studentId) {
      this.loadAlumni(studentId);
    }
  }

  onCompaniesPageChange(page: number): void {
    this.companiesPage = page;
    const profile = this.studentProfile();
    
    // Extract campusId from profile - handle both array and single value formats
    let campusId: string | null = null;
    
    if (profile) {
      if (Array.isArray(profile['campusId']) && profile['campusId'].length > 0) {
        // If it's an array, take the first element
        campusId = String(profile['campusId'][0]);
      } else if (profile['campusId'] && typeof profile['campusId'] === 'string') {
        // If it's a single string value
        campusId = profile['campusId'] as string;
      }
    }
    
    // Fallback to storage if campusId is not in profile
    const finalCampusId = campusId || this.storage.get(STORAGE_KEYS.CAMPUS_ID) || null;
    
    if (finalCampusId) {
      this.loadCompanies(finalCampusId);
    }
  }

  /**
   * Open filter modal for batchmates/alumni.
   * Auto-populate campus (latest from profile) and year when opening.
   */
  openFilterModal(): void {
    const profile = this.studentProfile();
    if (profile) {
      const { institutionName, yearOfPassing } = this.getInstitutionAndYearFromProfile(profile);
      if (institutionName) this.selectedCampusName.set(institutionName);
      if (yearOfPassing) this.selectedYearOfPassing.set(yearOfPassing);
    }
    this.modalService.openModal('batchmates-filter');
  }

  /**
   * Close filter modal
   */
  closeFilterModal(): void {
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
   * Only shows campuses that are in the student's profile
   */
  fetchCampuses: ApiFetchFunction<string> = (searchTerm: string): Observable<DropdownItem<string>[]> => {
    // Get student's campusId(s) from profile
    const profile = this.studentProfile();
    let studentCampusIds: string[] = [];
    
    if (profile) {
      if (Array.isArray(profile['campusId'])) {
        studentCampusIds = profile['campusId'].map(id => String(id));
      } else if (profile['campusId']) {
        studentCampusIds = [String(profile['campusId'])];
      }
    }
    
    // If no campusIds in profile, return empty array
    if (studentCampusIds.length === 0) {
      return of([]);
    }
    
    // Call the API to get campuses
    return this.campusApiService.getCampusBySearch(searchTerm || '', 0, 20).pipe(
      map((response) => {        
        const items: DropdownItem<string>[] = [];
        const content = this.extractCampusContent(response);
        if (content.length > 0) {
          const campusItems = content
            .filter((campus) => {
              const campusId = campus.campusId || campus.id;
              const hasId = !!campusId;
              const hasName = !!campus.campusName;
              // Only include campuses that match student's profile campusId(s)
              const matchesStudentProfile = hasId && studentCampusIds.includes(String(campusId));
              return hasId && hasName && matchesStudentProfile;
            })
            .map((campus) => {
              const campusName = campus.campusName || '';
              return {
                label: campusName,
                value: campusName, // Use campusName as value for filter dropdown
              };
            });
          items.push(...campusItems);
        }
        return items;
      }),
      catchError(() => {
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

  /** Year options: next 6 years, current, and all past years (80 years back), newest first */
  getYearItems(): DropdownItem[] {
    const currentYear = new Date().getFullYear();
    const years: DropdownItem[] = [];
    for (let year = currentYear + 6; year >= currentYear - 80; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  }

  /**
   * Handle campus selection change
   */
  onCampusChange(campusName: string): void {
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
  firstName?: string
  lastName?: string
  profilePhotoUrl?: string
  batch?: string
  publicStudentId?: string
}): PersonCard {

  const name =
    [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown'

  return {
    publicStudentId: item.publicStudentId || '',
    name,
    subtitle: item.batch || '',
    imageUrl: this.buildImageUrl(item.profilePhotoUrl),
  }
}

 private mapPlacedStudentToPersonCard(item: {
  studentId?: string
  publicStudentId?: string
  firstName?: string
  lastName?: string
  studentName?: string
  profilePhotoUrl?: string
  photoUrl?: string
  batch?: string
  companyName?: string
  designation?: string
}): PersonCard {

  const name =
    item.studentName ||
    [item.firstName, item.lastName].filter(Boolean).join(' ') ||
    'Unknown'

  const subtitle =
    [item.batch, item.companyName].filter(Boolean).join(' ') || ''

  const photoUrl = item.profilePhotoUrl || item.photoUrl

  return {
    id: item.studentId || '',
    publicStudentId: item.publicStudentId || '',
    name,
    subtitle,
    imageUrl: this.buildImageUrl(photoUrl),
  }
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
  studentId?: string
  publicStudentId?: string
  name?: string
  firstName?: string
  lastName?: string
  profilePhotoUrl?: string
  designation?: string
  companyName?: string
  company?: string
}): PersonCard {

  const name =
    item.name ||
    [item.firstName, item.lastName].filter(Boolean).join(' ') ||
    'Unknown'

  const subtitle =
    [item.designation, item.companyName || item.company]
      .filter(Boolean)
      .join(' ') || ''

  return {
    id: item.studentId || '',
    publicStudentId: item.publicStudentId || '',
    name,
    subtitle,
    imageUrl: this.buildImageUrl(item.profilePhotoUrl),
  }

}

private mapCompanyToCompanyCard(item: CompanyVisitedItem): CompanyCard {

  return {
    id: item.id || '',
    publicCompanyId: item.publicCompanyId || '',
    name: item.companyName || 'Unknown Company',
    logoUrl: this.buildImageUrl(item.logoUrl || item.logourl),
    visitedDate: item.visitedDate,
  }

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

  openCreatePostModal(): void {
    if (this.isSubmittingPost()) return;
    this.editPostState.clearPostToEdit();
    this.modalService.openModal('create-post');
  }

  openMediaViewer(url: string, type: 'image' | 'video'): void {
    this.mediaViewerUrl.set(url);
    this.mediaViewerType.set(type);
  }

  closeMediaViewer(): void {
    this.mediaViewerUrl.set(null);
    this.mediaViewerType.set(null);
  }

  onCreatePostClosed(): void {
    this.editPostState.clearPostToEdit();
    this.modalService.closeModal();
  }

  onCreatePostSubmitted(payload: CreatePostSubmitPayload): void {
    if (payload.postId) {
      const postToEdit = this.editPostState.postToEdit();
      const authorId = postToEdit?.authorId ?? postToEdit?.author?.authorId;
      if (!authorId) {
        this.notify.error('Cannot update: author not found.');
        return;
      }
      this.isSubmittingPost.set(true);
      this.modalService.closeModal();

      const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
      if (payload.mediaFile) {
        const formData = new FormData();
        formData.append('authorId', String(authorId));
        formData.append('text', payload.text);
        const isVideo = payload.mediaFile.type.startsWith('video/');
        formData.append(isVideo ? 'videos' : 'images', payload.mediaFile, payload.mediaFile.name);

        const updateWithFiles$ = isAnnouncement
          ? this.commonApi.updateAnnouncementWithFiles(payload.postId, formData)
          : this.commonApi.updatePostWithFiles(payload.postId, formData);
        updateWithFiles$.pipe(
          finalize(() => this.isSubmittingPost.set(false))
        ).subscribe({
          next: () => {
            this.notify.success(isAnnouncement ? 'Announcement updated successfully' : 'Post updated successfully');
            if (isAnnouncement) this.loadAnnouncements(); else this.loadFeed();
            this.onCreatePostClosed();
          },
          error: (err) => {
            this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to update announcement' : 'Failed to update post'));
          },
        });
      } else {
        const update$ = isAnnouncement
          ? this.commonApi.updateAnnouncement(payload.postId, { authorId: String(authorId), text: payload.text })
          : this.commonApi.updatePost(payload.postId, { authorId: String(authorId), text: payload.text });
        update$.pipe(
          finalize(() => this.isSubmittingPost.set(false))
        ).subscribe({
          next: () => {
            this.notify.success(isAnnouncement ? 'Announcement updated successfully' : 'Post updated successfully');
            if (isAnnouncement) this.loadAnnouncements(); else this.loadFeed();
            this.onCreatePostClosed();
          },
          error: (err) => {
            this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to update announcement' : 'Failed to update post'));
          },
        });
      }
      return;
    }

    const user = this.authState.user();
    const authorId =
      user?.profileServiceId ?? user?.studentId ?? user?.campusId ?? user?.companyId ?? user?.userId;
    const authorDisplayName = this.postAuthorName() || user?.displayName || user?.email || 'Student';

    if (payload.mediaFile && !authorId) {
      this.notify.error('Author information is required to post with media. Please log in again.');
      return;
    }

    this.isSubmittingPost.set(true);
    this.modalService.closeModal();

    const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
    const request = {
      text: payload.text,
      postType: 'STUDENT' as const,
      postKind: payload.postKind,
      ...(authorId && { authorId: String(authorId) }),
      ...(authorDisplayName && { authorDisplayName }),
    };

    if (payload.mediaFile) {
      const formData = new FormData();
      formData.append('text', payload.text);
      formData.append('postType', 'STUDENT');
      formData.append('postKind', payload.postKind);
      formData.append('authorId', String(authorId));
      if (authorDisplayName) formData.append('authorDisplayName', authorDisplayName);
      const isVideo = payload.mediaFile.type.startsWith('video/');
      formData.append(isVideo ? 'videos' : 'images', payload.mediaFile, payload.mediaFile.name);

      const api$ = isAnnouncement
        ? this.commonApi.createAnnouncementWithFiles(formData)
        : this.commonApi.createPostWithFiles(formData);

      api$.pipe(finalize(() => this.isSubmittingPost.set(false))).subscribe({
        next: () => {
          this.notify.success(isAnnouncement ? 'Announcement submitted successfully' : 'Post submitted successfully');
          if (isAnnouncement) this.loadAnnouncements(); else this.prependPostToFeed(payload, authorDisplayName);
        },
        error: (err) => {
          this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to create announcement' : 'Failed to create post'));
        },
      });
    } else {
      const api$ = isAnnouncement ? this.commonApi.createAnnouncement(request) : this.commonApi.createPost(request);
      api$.pipe(finalize(() => this.isSubmittingPost.set(false))).subscribe({
        next: () => {
          this.notify.success(isAnnouncement ? 'Announcement submitted successfully' : 'Post submitted successfully');
          if (isAnnouncement) this.loadAnnouncements(); else this.prependPostToFeed(payload, authorDisplayName);
        },
        error: (err) => {
          this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to create announcement' : 'Failed to create post'));
        },
      });
    }
  }

  private prependPostToFeed(payload: CreatePostSubmitPayload, authorDisplayName: string): void {
    const authorImgUrl = this.postAuthorImageUrl() ?? 'assets/images/login-news-image.png';
    const mediaUrl = payload.mediaFile ? URL.createObjectURL(payload.mediaFile) : null;
    const mediaType = payload.mediaFile?.type.startsWith('video/') ? 'video' : payload.mediaFile ? 'image' : null;
    const newPost: FeedPost = {
      postId: null,
      author: authorDisplayName,
      authorId: 'Just now',
      authorImageUrl: authorImgUrl,
      mediaUrl,
      mediaType,
      text: payload.text,
      likedByMe: false,
      likeCount: 0,
    };
    this.posts.update((list) => [newPost, ...list]);
  }

  onLikePost(post: FeedPost): void {
    if (!post.postId) return;
    const user = this.authService.getCurrentUser();
    const userId = user?.studentId ?? user?.userId?.toString();
    const userType = 'STUDENT';
    if (!userId) return;
    this.commonApi.likePost(post.postId, { userId, userType }).subscribe({
      next: () => {
        this.posts.update((list) =>
          list.map((p) =>
            p.postId === post.postId
              ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
              : p
          )
        );
      },
    });
  }

  onReportPost(post: FeedPost): void {
    if (!post.postId) return;
    this.reportPostId.set(post.postId);
    this.reportReason.set('');
  }

  closeReportModal(): void {
    if (this.isReporting()) return;
    this.reportPostId.set(null);
    this.reportReason.set('');
  }

  submitReport(): void {
    const postId = this.reportPostId();
    if (!postId) return;
    const reason = this.reportReason().trim();
    if (!reason) {
      this.notify.error('Report reason is required.');
      return;
    }
 if (reason.length > this.REPORT_MAX_LENGTH) {
  this.notify.error(`Report reason must be at most ${this.REPORT_MAX_LENGTH} characters.`);
  return;
}

    const user = this.authService.getCurrentUser();
    const reporterId = user?.studentId ?? user?.userId?.toString();
    if (!reporterId) return;
    this.isReporting.set(true);
    this.commonApi
      .reportPost({
        postId,
        reporterId: String(reporterId),
        reporterType: 'STUDENT',
        reason,
      })
      .pipe(finalize(() => this.isReporting.set(false)))
      .subscribe({
        next: () => {
          this.notify.success('Post reported successfully');
          this.closeReportModal();
        },
        error: (err) => this.notify.error(err?.error?.message ?? err?.message ?? 'Failed to report post'),
      });
  }
}

interface PersonCard {
    id?: string
  publicStudentId?: string
  name: string;
  subtitle: string;
  imageUrl: string | null;
}


interface NewsItem {
  id: string;
  title: string;
  description: string;
  createDate: string;
}

interface CompanyCard {
    id?: string
  publicCompanyId?: string
  name: string;
  logoUrl: string | null;
  visitedDate?: string;
}

interface FeedPost {
  postId: string | null;
  author: string;
  authorId: string;
  authorImageUrl: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  text: string;
  likedByMe: boolean;
  likeCount: number;
  postKind?: 'FEED' | 'ANNOUNCEMENT';
  createdAt?: string;
}

function mapPostsToFeedPost(posts: Post[]): FeedPost[] {
  return posts.map((p) => {
    const firstImage = p.imageUrls?.[0];
    const firstVideo = p.videoUrls?.[0];
    const hasImage = !!firstImage;
    const hasVideo = !!firstVideo;
    return {
      postId: p.postId ?? p.id ?? null,
      author: p.author?.displayName ?? p.authorDisplayName ?? 'Unknown',
      authorId: p.author?.authorId ?? p.authorId ?? '',
      authorImageUrl:
        p.authorImageUrl ?? p.author?.imageUrl ?? 'assets/images/login-news-image.png',
      mediaUrl: hasImage ? firstImage! : hasVideo ? firstVideo! : null,
      mediaType: hasImage ? 'image' : hasVideo ? 'video' : null,
      text: p.text ?? '',
      likedByMe: p.likedByMe ?? false,
      likeCount: p.likeCount ?? 0,
      postKind: p.postKind,
      createdAt: p.createdAt,
    };
  });
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

