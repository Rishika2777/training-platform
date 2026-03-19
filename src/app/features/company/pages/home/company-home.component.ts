import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, Component, computed, effect, inject, NgZone, OnDestroy, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanySpecializationComponent } from '../specialization/company-specialization.component';
import { CompanyVisionPerformanceComponent } from '../vision-performance/company-vision-performance.component';
import { CompanyBenefitsComponent, BenefitsFormValue } from '../benefits/company-benefits.component';
import { CompanyCurrentVacancyComponent, CurrentVacancyFormValue } from '../current-vacancy/company-current-vacancy.component';
import { CompanyClientFormComponent, ClientFormValue } from '../client-form/company-client-form.component';
import { CompanyPreferredCampusFormComponent, PreferredCampusFormValue } from '../preferred-campus-form/company-preferred-campus-form.component';
import { SpecializationFormValue } from '../specialization/company-specialization.component';
import { CreatePostComponent } from '../../../../shared/components/create-post/create-post.component';
import type { CreatePostSubmitPayload } from '../../../../shared/components/create-post/create-post.component';
import { CompanyApiService,  ClientRequest, VacancyRequest, VacancyResponse, TechnologyRequest, TechnologyResponse, BenefitsOfferRequest, BenefitsOfferResponse, ClientResponse } from '../../services/company-api.service';
import { CompanyHomeService } from '../../services/company-home.service';
import { ImageTile, PersonCard } from '../../models/company-home.models';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';
import { map, finalize, switchMap } from 'rxjs/operators';
import { CommonApiService } from '../../../../core/services/common-api.service';
import type { Post } from '../../../../core/models/common-api.model';
import { EditPostStateService } from '../../../../core/services/edit-post-state.service';
import { MediaViewerComponent } from '../../../../shared/components/media-viewer/media-viewer.component';
import {
  AnnouncementCarouselComponent,
  AnnouncementCarouselItem,
} from '../../../../shared/components/announcement-carousel/announcement-carousel.component';
import {  NewsService } from '../../../admin/services/news.service'; // path adjust karo
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CarouselComponent,
    ModalComponent,
    CompanySpecializationComponent,
    CompanyVisionPerformanceComponent,
    CompanyBenefitsComponent,
    CompanyCurrentVacancyComponent,
    CompanyClientFormComponent,
    CompanyPreferredCampusFormComponent,
    CreatePostComponent,
    MediaViewerComponent,
    AnnouncementCarouselComponent,
    RelativeTimePipe,
  ],
  templateUrl: './company-home.component.html',
  styleUrl: './company-home.component.css',
})
export class CompanyHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly modalService = inject(ModalService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly companyHome = inject(CompanyHomeService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly commonApi = inject(CommonApiService);
  readonly editPostState = inject(EditPostStateService);
private newsService = inject(NewsService);
readonly REPORT_MAX_LENGTH = 300;
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isSpecializationModalOpen = computed(() => this.activeModal() === 'company-specialization');
  readonly isVisionPerformanceModalOpen = computed(() => this.activeModal() === 'company-vision-performance');
  readonly isBenefitsModalOpen = computed(() => this.activeModal() === 'company-benefits');
  readonly isCurrentVacancyModalOpen = computed(() => this.activeModal() === 'company-current-vacancy');
  readonly isClientFormModalOpen = computed(() => this.activeModal() === 'company-client-form');
  readonly isPreferredCampusFormModalOpen = computed(() => this.activeModal() === 'company-preferred-campus-form');
  readonly isCreatePostModalOpen = computed(() => this.activeModal() === 'create-post');
  showVacancyForm = signal(false);
readonly newsList = signal<NewsItem[]>([]);
readonly loadingNews = signal(false);

private router = inject(Router);
  // Track previous modal states for form reset
  private clientFormModalWasOpen = false;
  private preferredCampusFormModalWasOpen = false;

  // NEWS MODAL VIA MODAL SERVICE
  openNewsDetail(news: NewsItem): void {
    this.newsModalData.set(news);
    this.modalService.openModal('news-detail');
  }


  // --------------- open cilent of our company -----
openClientCompany(company: ImageTile): void {

  console.log("Company clicked:", company);

  const companyId = company.id;

  if (!companyId) {
    console.warn("Company ID not available");
    return;
  }

  this.router.navigate(['/profile/company', companyId]);

}

// ------------------- open preferred campus page ------------
openPreferredCampus(campus: ImageTile): void {

  console.log("Preferred campus clicked:", campus);

  if (!campus.id) {
    console.warn("Campus ID not available");
    return;
  }

  this.router.navigate([
    '/profile/campus',
    campus.id
  ]);
}




  closeNewsDetail(): void {
    this.modalService.closeModal();
    this.newsModalData.set(null);
  }
  readonly isNewsDetailModalOpen = computed(
    () => this.modalService.activeModal() === 'news-detail'
  );
  
  readonly newsModalData = signal<NewsItem | null>(null);
  


  @ViewChild(CompanySpecializationComponent) specializationComponent?: CompanySpecializationComponent;
  @ViewChild(CompanyCurrentVacancyComponent)
vacancyFormComponent?: CompanyCurrentVacancyComponent;
  private readonly elementRef = inject(ElementRef);
  private feedScrollHost: HTMLElement | null = null;
  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLElement>;

  submittingSpecialization = false;
  submittingVisionPerformance = false;
  submittingBenefits = false;
  submittingCurrentVacancy = false;
  submittingClientForm = false;
  submittingPreferredCampusForm = false;
  readonly isSubmittingPost = signal(false);

  readonly postAuthorName = signal<string>('');
  readonly postAuthorImageUrl = signal<string | null>(null);

  // Form values for reset functionality
  clientFormValue: ClientFormValue = {
    logo: null,
    clientName: '',
  };

  preferredCampusFormValue: PreferredCampusFormValue = {
    photo: null,
    campusName: '',
    campusId: undefined,
  };

  // Key People - API Integration
  readonly keyPeople = signal<readonly PersonCard[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Clients - API Integration
  readonly clients = signal<readonly ImageTile[]>([]);
  readonly loadingClients = signal(false);
  clientsPage = 0;
  readonly clientsPageSize = 10; // API page size
  readonly clientsTotalPages = signal(1);
  // Carousel pagination for clients (3 items per page)
  clientsCarouselPage = 1;
  readonly clientsCarouselPageSize = 3;

  // Preferred Campuses - API Integration
  readonly preferredCampuses = signal<readonly ImageTile[]>([]);
  readonly loadingPreferredCampuses = signal(false);
  // Carousel pagination for preferred campuses (3 items per page)
  preferredCampusesCarouselPage = 1;
  readonly preferredCampusesCarouselPageSize = 3;

  // Specializations - API Integration
  readonly specializations = signal<readonly TechnologyResponse[]>([]);
  readonly loadingSpecializations = signal(false);
  // Carousel pagination for specializations (3 items per page)
  specializationsCarouselPage = 1;
  readonly specializationsCarouselPageSize = 3;

  // Vacancies
  readonly vacancies = signal<readonly VacancyResponse[]>([]);
  readonly loadingVacancies = signal(false);
  vacanciesPage = 0;
  readonly vacanciesPageSize = 10;

  readonly posts = signal<FeedPost[]>([]);
  readonly loadingFeed = signal(false);
  readonly loadingMoreFeed = signal(false);
  readonly hasMoreFeed = signal(true);
  private feedPage = 0; // API uses 0-indexed pagination (page 0 for first page)
  private readonly feedPageSize = 5;
  /** Set true after first loadFeed() completes; prevents observer from firing before we have hasMore from API */
  private feedFirstLoadDone = false;
  private feedIntersectionObserver: IntersectionObserver | null = null;
  private feedScrollListener: (() => void) | null = null;
  private feedTopRefreshListener: (() => void) | null = null;
  private maxScrollY = 0;
  private lastTopRefreshTime = 0;
  private readonly TOP_REFRESH_THRESHOLD = 200;
  private readonly MIN_SCROLL_DISTANCE = 500;
  private readonly TOP_REFRESH_COOLDOWN_MS = 2000;
  private readonly ngZone = inject(NgZone);
  readonly mediaViewerUrl = signal<string | null>(null);
  readonly mediaViewerType = signal<'image' | 'video' | null>(null);
  readonly reportPostId = signal<string | null>(null);
  readonly reportReason = signal('');
  readonly isReporting = signal(false);
  readonly isReportModalOpen = computed(() => !!this.reportPostId());

  readonly postTextTruncateLength = 200;
  readonly expandedPostIds = signal<Set<string>>(new Set());

  togglePostExpand(key: string): void {
    const next = new Set(this.expandedPostIds());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expandedPostIds.set(next);
  }

  // Announcements - loaded from dedicated API
  readonly announcementsLoaded = signal<FeedPost[]>([]);
  readonly announcements = computed(() => this.announcementsLoaded());

  readonly announcementCarouselItems = computed((): AnnouncementCarouselItem[] =>
    (this.announcementsLoaded() ?? []).map((p) => ({
      id: p.postId ?? undefined,
      text: p.text ?? '',
      date: p.createdAt ?? undefined,
      mediaUrl: p.mediaUrl ?? null,
      mediaType: p.mediaType ?? null,
    }))
  );

  // ------------ news 
  newsPage = 0;
newsPageSize = 2;


  // Feed posts (excluding announcements)
  readonly feedPosts = computed(() => {
    return this.posts().filter((post) => post.postKind !== 'ANNOUNCEMENT');
  });


  // ----------------- news --------
  newsTotalPages(): number {
  return Math.ceil(this.newsList().length / this.newsPageSize);
}

newsPageItems() {
  const start = this.newsPage * this.newsPageSize;
  return this.newsList().slice(start, start + this.newsPageSize);
}

onNewsPageChange(page: number) {
  this.newsPage = page - 1;
}


  // -------------- vacancy ------------------
selectedVacancy = signal<VacancyResponse | null>(null);


  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 7;
  keyPeoplePage = 1;

  get keyPeopleTotalPages(): number {
    return totalPages(this.keyPeople().length, this.peoplePageSize);
  }

  keyPeoplePageItems(): readonly PersonCard[] {
    return slicePage(this.keyPeople(), this.keyPeoplePage, this.peoplePageSize);
  }

  get preferredCampusesTotalPages(): number {
    return totalPages(this.preferredCampuses().length, this.preferredCampusesCarouselPageSize);
  }

  preferredCampusesPageItems(): readonly ImageTile[] {
    return slicePage(this.preferredCampuses(), this.preferredCampusesCarouselPage, this.preferredCampusesCarouselPageSize);
  }

  get clientsCarouselTotalPages(): number {
    return totalPages(this.clients().length, this.clientsCarouselPageSize);
  }

  clientsCarouselPageItems(): readonly ImageTile[] {
    return slicePage(this.clients(), this.clientsCarouselPage, this.clientsCarouselPageSize);
  }

  get specializationsTotalPages(): number {
    return totalPages(this.specializations().length, this.specializationsCarouselPageSize);
  }

  specializationsPageItems(): readonly ImageTile[] {
    return this.specializations().map((tech, index) => {
      let imageUrl: string | null = null;
      if (tech.iconUrl) {
        // If iconUrl is already a full URL, use it as is
        if (tech.iconUrl.startsWith('http://') || tech.iconUrl.startsWith('https://')) {
          imageUrl = tech.iconUrl;
        } else {
          // Otherwise, construct the full URL using the API base path
          imageUrl = `/api/v1/files/${tech.iconUrl}`;
        }
      }
      return {
        id: tech.technologyId || `tech-${index}`,
        imageUrl,
        alt: tech.technologyName || 'Technology',
      };
    });
  }

  specializationsCarouselPageItems(): readonly ImageTile[] {
    return slicePage(this.specializationsPageItems(), this.specializationsCarouselPage, this.specializationsCarouselPageSize);
  }

  get companyId(): string | null {
  return this.getCompanyId();
}

  private readonly clientFormResetEffect = effect(() => {
    const isClientModalOpen = this.isClientFormModalOpen();
    if (isClientModalOpen && !this.clientFormModalWasOpen) {
      // Reset client form when modal opens
      this.clientFormValue = {
        logo: null,
        clientName: '',
      };
    }
    this.clientFormModalWasOpen = isClientModalOpen;
  });

  private readonly preferredCampusFormResetEffect = effect(() => {
    const isPreferredCampusModalOpen = this.isPreferredCampusFormModalOpen();
    if (isPreferredCampusModalOpen && !this.preferredCampusFormModalWasOpen) {
      // Reset preferred campus form when modal opens
      this.preferredCampusFormValue = {
        photo: null,
        campusName: '',
        campusId: undefined,
      };
    }
    this.preferredCampusFormModalWasOpen = isPreferredCampusModalOpen;
  });


  private dataLoaded = false; // Track if company data has been loaded

  /** effect() must run in injection context (field initializer), not in ngOnInit */
  private readonly companyDataWhenReadyEffect = effect(() => {
    const currentUser = this.authState.user();
    const currentCompanyId = this.getCompanyId();
    if (!this.dataLoaded && currentUser && currentCompanyId) {
      this.loadCompanyData();
    }
  });

  ngOnInit(): void {
    // Load feed and other non-company-specific data immediately
    this.loadFeed();
    this.loadAnnouncements();
    this.loadLatestNews();

    // Load company data now if user is already available; otherwise effect will run when user becomes available
    const user = this.authState.user();
    const companyId = this.getCompanyId();
    if (user && companyId) {
      this.loadCompanyData();
    }
  }

  private loadCompanyData(): void {
    if (this.dataLoaded) {
      return; // Prevent duplicate loads
    }
    
    this.dataLoaded = true;
    this.loadKeyPeople();
    this.loadPreferredCampuses();
    this.loadClients();
    this.loadSpecializations();
    this.loadVacancies();
    this.loadPostAuthorData();
  }

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

  loadFeed(): void {
    this.loadingFeed.set(true);
    this.feedPage = 0; // API uses 0-indexed pagination
    this.hasMoreFeed.set(true);
    this.feedFirstLoadDone = false;
    const user = this.authState.user();
    const userId = this.companyId ?? user?.companyId ?? user?.profileServiceId ?? user?.userId?.toString();
    const pageSize = this.feedPageSize;
    this.commonApi
      .getFeed({ pageSize, page: 0, viewerUserId: userId })
      .pipe(
        map((res) => {
          const count = res.posts?.length ?? 0;
          const items = mapPostsToFeedPost(res.posts ?? []);
          // If we got fewer than pageSize, there is no next page (ignore backend hasMore)
          const hasMore =
            count < pageSize ? false : (res.hasMore ?? count >= pageSize);
          return { items, hasMore };
        }),
        switchMap(({ items, hasMore }) =>
          this.commonApi.enrichFeedLikes(items, { id: userId, type: 'COMPANY' }).pipe(
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
    const companyId = this.getCompanyId();
    const params: { viewerId?: string; viewerType?: string; pageSize?: number; page?: number } = { pageSize: 10, page: 0 };
    if (companyId) {
      params.viewerId = companyId;
      // params.viewerType = 'COMPANY';
    }
    this.commonApi.getAnnouncements(params).pipe(
      map((res) => mapPostsToFeedPost(res.posts ?? [])),
      catchError(() => of([] as FeedPost[]))
    ).subscribe({
      next: (items) => {
        queueMicrotask(() => this.announcementsLoaded.set(items));
      },
      error: () => {
        queueMicrotask(() => this.announcementsLoaded.set([]));
      },
    });
  }

  // ==================== news
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



  /** Attach observer and scroll listener after first load so sentinel is in correct place. */
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
      this.feedScrollListener = (): void => checkAndLoad();
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
    const user = this.authState.user();
    const userId = this.companyId ?? user?.companyId ?? user?.profileServiceId ?? user?.userId?.toString();
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
          this.commonApi.enrichFeedLikes(items, { id: userId, type: 'COMPANY' }).pipe(
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

  private loadPostAuthorData(): void {
    const companyId = this.companyId;
    if (!companyId) {
      const user = this.authState.user();
      this.postAuthorName.set(user?.email ?? user?.displayName ?? 'Company');
      this.postAuthorImageUrl.set(user?.imageUrl ?? null);
      return;
    }
    const cleanId = String(companyId).replace(/^COMPANY-/i, '').trim();
    this.companyApi.getCompanyById(cleanId).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (data) => {
        if (data?.companyName?.trim()) {
          this.postAuthorName.set(data.companyName.trim());
        } else {
          this.postAuthorName.set(this.authState.user()?.email ?? 'Company');
        }
        if (data?.companyLogoUrl?.trim()) {
          let url = data.companyLogoUrl.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
          }
          this.postAuthorImageUrl.set(url);
        } else {
          this.postAuthorImageUrl.set(this.authState.user()?.imageUrl ?? null);
        }
      },
    });
  }

  private getCompanyId(): string | null {
    // Try from auth state (user profile) - companyId from login response
    const currentUser = this.authState.user();
    console.log('CompanyHomeComponent: Current user from auth state:', currentUser);
    const companyIdFromUser = currentUser?.companyId;
    console.log('CompanyHomeComponent: companyId from user:', companyIdFromUser);
    if (companyIdFromUser) {
      // Also store it in storage for consistency
      this.storage.set(STORAGE_KEYS.COMPANY_ID, companyIdFromUser);
      return companyIdFromUser;
    }
    
    // Try from storage
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    console.log('CompanyHomeComponent: companyId from storage:', companyIdFromStorage);
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    // Additional fallback: check if userType is COMPANY and try to get from profileServiceId
    if (currentUser?.userType === 'COMPANY' && currentUser?.profileServiceId) {
      console.log('CompanyHomeComponent: Using profileServiceId as companyId fallback:', currentUser.profileServiceId);
      this.storage.set(STORAGE_KEYS.COMPANY_ID, currentUser.profileServiceId);
      return currentUser.profileServiceId;
    }
    
    console.error('CompanyHomeComponent: No companyId found in user object or storage. User:', currentUser);
    return null;
  }

  loadKeyPeople(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load key people');
      return;
    }

    this.loadingKeyPeople.set(true);
    this.companyHome.getKeyPeople(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading key people:', error);
        this.loadingKeyPeople.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response) => {
        this.loadingKeyPeople.set(false);
        this.keyPeople.set(response);
        this.keyPeoplePage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in key people subscription:', error);
        this.loadingKeyPeople.set(false);
        this.keyPeople.set([]);
      }
    });
  }

  loadPreferredCampuses(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load preferred campuses');
      return;
    }

    this.loadingPreferredCampuses.set(true);
    this.companyHome.getPreferredCampuses(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading preferred campuses:', error);
        this.loadingPreferredCampuses.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response) => {
        this.loadingPreferredCampuses.set(false);
        this.preferredCampuses.set(response);
        this.preferredCampusesCarouselPage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in preferred campuses subscription:', error);
        this.loadingPreferredCampuses.set(false);
        this.preferredCampuses.set([]);
      }
    });
  }

  loadVacancies(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load vacancies');
      return;
    }

    this.loadingVacancies.set(true);
    this.companyHome.getVacancies(companyId, this.vacanciesPage, this.vacanciesPageSize).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading vacancies:', error);
        this.loadingVacancies.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly VacancyResponse[]) => {
        this.loadingVacancies.set(false);
        console.log('CompanyHomeComponent: Vacancies loaded successfully', response);
        this.vacancies.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in vacancies subscription:', error);
        this.loadingVacancies.set(false);
        this.vacancies.set([]);
      }
    });
  }

  loadClients(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load clients');
      return;
    }

    this.loadingClients.set(true);
    this.companyHome.getClients(companyId, this.clientsPage, this.clientsPageSize).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading clients:', error);
        this.loadingClients.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response) => {
        this.loadingClients.set(false);
        this.clients.set(response);
        this.clientsCarouselPage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in clients subscription:', error);
        this.loadingClients.set(false);
        this.clients.set([]);
      }
    });
  }

  loadSpecializations(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load specializations');
      return;
    }

    this.loadingSpecializations.set(true);
    this.companyHome.getSpecializations(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading specializations:', error);
        this.loadingSpecializations.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly TechnologyResponse[]) => {
        this.loadingSpecializations.set(false);
        this.specializations.set(response);
        this.specializationsCarouselPage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in specializations subscription:', error);
        this.loadingSpecializations.set(false);
        this.specializations.set([]);
      }
    });
  }


  closeModal(): void {
    const wasVacancyModal = this.activeModal() === 'company-current-vacancy';
    this.selectedVacancy.set(null);
    if (wasVacancyModal) {
      this.showVacancyForm.set(false);
    }
    this.modalService.closeModal();
  }


  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling as HTMLElement;
      if (placeholder && placeholder.classList) {
        placeholder.style.display = 'block';
      }
    }
  }
   
  handleSpecializationSubmit(value: SpecializationFormValue): void {
    console.log('CompanyHomeComponent: ========== SPECIALIZATION FORM SUBMITTED ==========');
    console.log('CompanyHomeComponent: Form value:', value);
    
    // Initialize submitting state
    this.submittingSpecialization = true;
    
    const companyId = this.getCompanyId();
    console.log('CompanyHomeComponent: Company ID:', companyId);
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit specialization');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingSpecialization = false;
      return;
    }

    // Filter valid technologies
    const validTechnologies = value.technologies.filter(tech => 
      tech.technologyName.trim().length > 0 && 
      tech.description.trim().length > 0 && 
      tech.icon !== null
    );
    
    console.log('CompanyHomeComponent: Valid technologies count:', validTechnologies.length);
    if (validTechnologies.length === 0) {
      this.notify.error('Please add at least one valid technology with name, description, and icon.');
      this.submittingSpecialization = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API calls to add technologies', { companyId, count: validTechnologies.length });

    // Add each technology one by one
    let completed = 0;
    let hasError = false;

   validTechnologies.forEach((tech, index) => {

  // Build request according to API spec: { technologyName, description }
  const request: TechnologyRequest = {
    technologyName: tech.technologyName.trim(),
    description: tech.description.trim(),
  };

  const subscription =
    this.companyApi.addTechnology(companyId, request, tech.icon ?? undefined)
      .pipe(
        catchError((error) => {
          console.error(`CompanyHomeComponent: ========== ERROR ADDING TECHNOLOGY ${index + 1} ==========`);

          hasError = true;

          if (error?.status === 500) {
            const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
            this.notify.error(`Failed to add technology "${tech.technologyName}": ${errorMessage}`);
          } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            const errorMessage = error?.error?.message || 'Failed to add technology. Please try again.';
            this.notify.error(`Failed to add technology "${tech.technologyName}": ${errorMessage}`);
          }

          return of(null);
        })
      )
    .subscribe({
  next: () => {
    completed++;

    if (completed === validTechnologies.length) {
      this.submittingSpecialization = false;

      if (!hasError) {
        this.notify.success('All technologies added successfully!');
        this.loadSpecializations();
        this.specializationComponent?.resetForm();
      } else {
        this.notify.error('Some technologies failed to add. Please check the errors above.');
      }
    }
  },
  error: () => {
    completed++;
    hasError = true;

    if (completed === validTechnologies.length) {
      this.submittingSpecialization = false;
      this.notify.error('An error occurred while adding technologies.');
    }
  }
});

  console.log(`CompanyHomeComponent: Subscription created for technology ${index + 1}`, subscription);
});
  }

  handleDeleteSpecialization(technologyId: string): void {
    console.log('CompanyHomeComponent: ========== DELETE SPECIALIZATION REQUESTED ==========');
    console.log('CompanyHomeComponent: Technology ID:', technologyId);
    
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot delete specialization');
      this.notify.error('Unable to delete. Company ID not found.');
      return;
    }

    if (!technologyId) {
      console.warn('CompanyHomeComponent: No technology ID provided');
      this.notify.error('Unable to delete. Technology ID not found.');
      return;
    }

    // Set deleting state in child component
    if (this.specializationComponent) {
      this.specializationComponent.deletingTechnologyId = technologyId;
    }

    console.log('CompanyHomeComponent: Calling companyApi.deleteTechnology...', { companyId, technologyId });
    
    this.companyApi.deleteTechnology(companyId, technologyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: ========== ERROR DELETING TECHNOLOGY ==========');
        console.error('CompanyHomeComponent: Error details:', error);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(`Failed to delete technology: ${errorMessage}`);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to delete technology. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(false);
      })
    ).subscribe({
      next: (success: boolean) => {
        console.log('CompanyHomeComponent: ========== TECHNOLOGY DELETED SUCCESSFULLY ==========');
        console.log('CompanyHomeComponent: Delete success:', success);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        if (success) {
          this.notify.success('Technology deleted successfully!');
          // Reload the list to show updated data
          this.loadSpecializations();
        } else {
          this.notify.error('Failed to delete technology. Please try again.');
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: ========== SUBSCRIPTION ERROR ==========');
        console.error('CompanyHomeComponent: Error:', error);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        this.notify.error('An error occurred while deleting the technology.');
      }
    });
  }

handleDeleteVacancy(vacancyId: string | undefined): void {
  if (!vacancyId) {
    this.notify.error('Invalid vacancy id.');
    return;
  }

  const companyId = this.getCompanyId();
  if (!companyId) {
    this.notify.error('Company ID not found.');
    return;
  }

  this.companyApi.deleteVacancy(companyId, vacancyId).pipe(
    catchError((error) => {
      console.error('Error deleting vacancy:', error);
      this.notify.error('Failed to delete vacancy.');
      return of(false);
    })
  ).subscribe({
    next: (success: boolean) => {
      if (success) {
        this.notify.success('Vacancy deleted successfully!');
        this.loadVacancies();
      } else {
        this.notify.error('Failed to delete vacancy.');
      }
    }
  });
}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleVisionPerformanceSubmit(_value: unknown): void {
    this.submittingVisionPerformance = true;
    // TODO: Call API service
  }

  handleBenefitsSubmit(value: BenefitsFormValue): void {
    console.log('CompanyHomeComponent: Benefits form submitted', value);
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit benefits offer');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingBenefits = false;
      return;
    }

    // Map form values to API request format
    // Note: Form uses workLifeBalance and trainingUpskilling, but API expects workLifeBalancePerks and trainingAndUpskilling
  const request: BenefitsOfferRequest = {
  internToJobRate: value.internToJobRate.trim() || '',
  startingSalaryRange: value.startingSalaryRange.trim() || '',
  performanceBonus: value.performanceBonus.trim() || '',
  healthcare: value.healthcare.trim() || '',
  mentorBuddySystem: value.mentorBuddySystem.trim() || '',
  workLifeBalancePerks: value.workLifeBalancePerks.trim() || '',
  appreciationDayOff: value.appreciationDayOff.trim() || '',
  trainingAndUpskilling: value.trainingAndUpskilling.trim() || '',
  sickLeaves: value.sickLeaves.trim() || '',
  referralBonus: value.referralBonus.trim() || '',
};

    console.log('CompanyHomeComponent: Making API call to add benefits offer', { companyId, request });
    this.submittingBenefits = true;
    
    this.companyApi.addBenefitsOffer(companyId, request).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding benefits offer:', error);
        this.submittingBenefits = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to submit benefits offer. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: BenefitsOfferResponse | null) => {
        console.log('CompanyHomeComponent: Subscription next() called', response);
        this.submittingBenefits = false;
        if (response) {
          this.notify.success('Your offered benefits package has been successfully submitted!');
          this.closeModal();
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add benefits offer subscription:', error);
        this.submittingBenefits = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while submitting the benefits offer.');
          }
        } else {
          this.notify.error('An error occurred while submitting the benefits offer.');
        }
      }
    });
  }

  handleCurrentVacancySubmit(value: CurrentVacancyFormValue): void {

    
    // Initialize submitting state
    this.submittingCurrentVacancy = true;
    
    const companyId = this.getCompanyId();
    console.log('CompanyHomeComponent: Company ID:', companyId);
    if (!companyId) {
      const currentUser = this.authState.user();
      console.error('CompanyHomeComponent: No company ID available, cannot submit vacancy');
      console.error('CompanyHomeComponent: Current user:', currentUser);
      console.error('CompanyHomeComponent: User type:', currentUser?.userType);
      console.error('CompanyHomeComponent: CompanyId from user:', currentUser?.companyId);
      console.error('CompanyHomeComponent: ProfileServiceId from user:', currentUser?.profileServiceId);
      console.error('CompanyHomeComponent: CompanyId from storage:', this.storage.get(STORAGE_KEYS.COMPANY_ID));
      
      this.notify.error('Unable to submit. Company ID not found. Please log out and log back in, or contact support if the issue persists.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate required fields
    if (!value.jobTitle || !value.jobTitle.trim()) {
      this.notify.error('Please select a job title.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.jobType || !value.jobType.trim()) {
      this.notify.error('Please select a job type.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.jobLocation || !value.jobLocation.trim()) {
      this.notify.error('Please select a job location.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.department || !value.department.trim()) {
      this.notify.error('Please select a department.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate job description - backend likely requires this field
    if (!value.jobDescription || !value.jobDescription.trim()) {
      this.notify.error('Please enter a job description.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate year of passing - backend likely requires this field
    if (!value.yearOfPassing || !value.yearOfPassing.trim()) {
      this.notify.error('Please select a year of passing.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate minimum CGPA - backend likely requires this field
    if (!value.minimumCGPA || !value.minimumCGPA.trim()) {
      this.notify.error('Please enter a minimum CGPA/percentage.');
      this.submittingCurrentVacancy = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API call to add vacancy', { companyId, value });
    
    // Map form values to API request format
    // Convert selection rounds to array
    const selectionProcess: string[] = [];
    if (value.selectionRounds.aptitudeTest) selectionProcess.push('Aptitude Test');
    if (value.selectionRounds.groupDiscussion) selectionProcess.push('Group Discussion');
    if (value.selectionRounds.faceToFace) selectionProcess.push('Face To Face');
    if (value.selectionRounds.all) selectionProcess.push('All');

    // Validate selection process - backend requires at least one selection round
    if (selectionProcess.length === 0) {
      this.notify.error('Please select at least one selection round.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Convert mode of selection to a single string (backend expects string, not array)
    // Priority: "Both" > "Online" > "Offline" (if multiple selected, use "Both" if available)
    let interviewMode = '';
    if (value.modeOfSelection.both) {
      interviewMode = 'Both';
    } else if (value.modeOfSelection.online) {
      interviewMode = 'Online';
    } else if (value.modeOfSelection.offline) {
      interviewMode = 'Offline';
    }

    // Validate interview mode - backend requires a mode to be selected
    if (!interviewMode || interviewMode.trim() === '') {
      this.notify.error('Please select a mode of selection.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Ensure interviewMode is a non-empty string
    interviewMode = interviewMode.trim();
    console.log('CompanyHomeComponent: interviewMode value:', interviewMode);

    // Map dropdown values to labels for API (backend expects display labels, not internal values)
    const qualificationsItems = [
      { label: 'B.Tech', value: 'btech' },
      { label: 'M.Tech', value: 'mtech' },
      { label: 'B.Sc', value: 'bsc' },
      { label: 'M.Sc', value: 'msc' },
    ];
    const streamsItems = [
      { label: 'Computer Science', value: 'cs' },
      { label: 'Electronics', value: 'electronics' },
      { label: 'Electrical', value: 'electrical' },
      { label: 'Mechanical', value: 'mechanical' },
    ];
    const jobTitleItems = [
      { label: 'Software Engineer', value: 'software-engineer' },
      { label: 'Product Manager', value: 'product-manager' },
      { label: 'Data Analyst', value: 'data-analyst' },
      { label: 'UI/UX Designer', value: 'ui-ux-designer' },
    ];
    const jobTypeItems = [
      { label: 'Full-time', value: 'full-time' },
      { label: 'Part-time', value: 'part-time' },
      { label: 'Contract', value: 'contract' },
      { label: 'Internship', value: 'internship' },
    ];
    const jobLocationItems = [
      { label: 'Remote', value: 'remote' },
      { label: 'Hybrid', value: 'hybrid' },
      { label: 'On-site', value: 'on-site' },
    ];
    const departmentItems = [
      { label: 'Engineering', value: 'engineering' },
      { label: 'Product', value: 'product' },
      { label: 'Design', value: 'design' },
      { label: 'Marketing', value: 'marketing' },
    ];
    const contractDurationItems = [
      { label: '6 months', value: '6-months' },
      { label: '1 year', value: '1-year' },
      { label: '2 years', value: '2-years' },
      { label: 'Permanent', value: 'permanent' },
    ];
    
    // Convert qualifications to array of strings (as per backend API - REQUEST format)
    // Backend REQUEST expects: ["Bachelor's Degree", "Master's Degree"] (array of strings)
    // Map dropdown values to their labels - ensure we find the label
    const qualificationItem = qualificationsItems.find(item => item.value === value.requiredQualifications);
    if (!qualificationItem) {
      this.notify.error('Invalid qualification selected. Please select a valid qualification.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const requiredqualifications: string[] = [qualificationItem.label];
    
    // Convert streams to array of strings - map to labels - ensure we find the label
    const streamItem = streamsItems.find(item => item.value === value.streamsEligible);
    if (!streamItem) {
      this.notify.error('Invalid stream selected. Please select a valid stream.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const streamseligible: string[] = [streamItem.label];
    
    // Map other dropdown values to labels - ensure we find the label, don't fall back to value
    const jobTitleItem = jobTitleItems.find(item => item.value === value.jobTitle);
    if (!jobTitleItem) {
      this.notify.error('Invalid job title selected. Please select a valid job title.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobTitleLabel = jobTitleItem.label;

    const jobTypeItem = jobTypeItems.find(item => item.value === value.jobType);
    if (!jobTypeItem) {
      this.notify.error('Invalid job type selected. Please select a valid job type.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobTypeLabel = jobTypeItem.label;

    const jobLocationItem = jobLocationItems.find(item => item.value === value.jobLocation);
    if (!jobLocationItem) {
      this.notify.error('Invalid job location selected. Please select a valid job location.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobLocationLabel = jobLocationItem.label;

    const departmentItem = departmentItems.find(item => item.value === value.department);
    if (!departmentItem) {
      this.notify.error('Invalid department selected. Please select a valid department.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const departmentLabel = departmentItem.label;

    // Map contract duration to label (backend expects "6 months" not "6-months")
    let contractDurationLabel = '';
    if (value.contractDuration && value.contractDuration.trim()) {
      const contractDurationItem = contractDurationItems.find(item => item.value === value.contractDuration);
      if (contractDurationItem) {
        contractDurationLabel = contractDurationItem.label;
      } else {
        // If not found in mapping, use the value as-is (might be already formatted)
        contractDurationLabel = value.contractDuration.trim();
      }
    }

    // Validate required qualifications - backend requires at least one qualification
    if (requiredqualifications.length === 0) {
      this.notify.error('Please select at least one required qualification.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate streams eligible - backend requires at least one stream
    if (streamseligible.length === 0) {
      this.notify.error('Please select at least one stream eligible.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Build request according to API spec (matching backend format from image)
    // Backend REQUEST expects requiredQualifications as array of strings: ["Bachelor's Degree"]
    // All required fields are validated above, so we can safely build the request
    const request: VacancyRequest = {
      jobTitle: jobTitleLabel.trim(),
      jobLocation: jobLocationLabel.trim(),
      department: departmentLabel.trim(),
      jobType: jobTypeLabel.trim(),
      salary: value.salary?.trim() || '', // Salary can be empty string if not provided
      numberOfOpenings: value.numberOfOpenings?.trim() || '', // Backend uses camelCase (dropdown values match labels)
      contractDuration: contractDurationLabel, // Backend expects label format like "6 months" not "6-months"
      jobDescription: value.jobDescription.trim(), // Backend uses camelCase (validated above, non-empty)
      requiredQualifications: requiredqualifications, // Backend REQUEST expects array of strings (non-empty, validated above)
      streamsEligible: streamseligible, // Backend uses plural "streamsEligible" (matching request/response format)
      minimumCgpaPercentage: value.minimumCGPA.trim(), // Backend uses camelCase (validated above, non-empty)
      yearOfPassing: value.yearOfPassing.trim(), // Backend uses camelCase (validated above, non-empty)
      selectionProcess: selectionProcess, // Non-empty array (validated above)
      interviewMode: interviewMode, // Single string value: "Both", "Online", or "Offline" (validated above, non-empty)
    };

    // Verify interviewMode is included in the request
    console.log('CompanyHomeComponent: ========== REQUEST OBJECT VERIFICATION ==========');
    console.log('CompanyHomeComponent: interviewMode in request:', request.interviewMode);
    console.log('CompanyHomeComponent: interviewMode type:', typeof request.interviewMode);
    console.log('CompanyHomeComponent: interviewMode length:', request.interviewMode?.length);
    
    // Log the final request payload for debugging
    console.log('CompanyHomeComponent: Final request payload:', JSON.stringify(request, null, 2));
    
    // Verify all required fields are present
    const requiredFields = ['jobTitle', 'jobLocation', 'department', 'jobType', 'jobDescription', 
                           'requiredQualifications', 'streamsEligible', 'minimumCgpaPercentage', 
                           'yearOfPassing', 'selectionProcess', 'interviewMode'];
    const missingFields = requiredFields.filter(field => !(field in request) || 
      (Array.isArray(request[field as keyof VacancyRequest]) ? 
        (request[field as keyof VacancyRequest] as string[]).length === 0 : 
        !request[field as keyof VacancyRequest] || 
        (typeof request[field as keyof VacancyRequest] === 'string' && 
         (request[field as keyof VacancyRequest] as string).trim() === '')));
    
    if (missingFields.length > 0) {
      console.error('CompanyHomeComponent: Missing or empty required fields:', missingFields);
      this.notify.error(`Missing required fields: ${missingFields.join(', ')}`);
      this.submittingCurrentVacancy = false;
      return;
    }
    
    console.log('CompanyHomeComponent: All required fields are present and valid');

    console.log('CompanyHomeComponent: ========== CALLING API TO ADD VACANCY ==========');
    console.log('CompanyHomeComponent: Request payload:', request);
    console.log('CompanyHomeComponent: Calling companyApi.addVacancy...');
    const apiCall = this.companyApi.addVacancy(companyId, request);
    console.log('CompanyHomeComponent: API call Observable created, setting up pipe and subscribe...');
    
    const subscription = apiCall.pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: ========== ERROR ADDING VACANCY ==========');
        console.error('CompanyHomeComponent: Error details:', error);
        this.submittingCurrentVacancy = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to add vacancy. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: VacancyResponse | null) => {
        console.log('CompanyHomeComponent: ========== VACANCY ADDED SUCCESSFULLY ==========');
        console.log('CompanyHomeComponent: Response:', response);
        this.submittingCurrentVacancy = false;
     if (response) {
  this.notify.success('Vacancy added successfully!');
  this.loadVacancies();
    this.vacancyFormComponent?.resetForm();
  this.showVacancyForm.set(false);
}

        else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: ========== SUBSCRIPTION ERROR ==========');
        console.error('CompanyHomeComponent: Error:', error);
        this.submittingCurrentVacancy = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while adding the vacancy.');
          }
        } else {
          this.notify.error('An error occurred while adding the vacancy.');
        }
      }
    });
    
    console.log('CompanyHomeComponent: Subscription created, subscription object:', subscription);
  }

  openVacancyDetails(vacancy: VacancyResponse): void {
  this.selectedVacancy.set(vacancy);
  this.showVacancyForm.set(false); // ensure list view
  this.modalService.openModal('company-current-vacancy');
}

   handleClientFormSubmit(value: ClientFormValue): void {
    console.log('CompanyHomeComponent: Client form submitted', value);
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit client');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingClientForm = false;
      return;
    }

    if (!value.clientName || !value.clientName.trim()) {
      console.warn('CompanyHomeComponent: Client name is required');
      this.notify.error('Please enter a client name.');
      this.submittingClientForm = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API call to add client', { companyId, clientName: value.clientName, hasLogo: !!value.logo });
    this.submittingClientForm = true;
    
    const request: ClientRequest = {
      clientName: value.clientName.trim(),
      photoUrl: value.logo?.name?.trim() || undefined,
    };

    const payload = {
      request,
      files: {
        photo: value.logo,
      },
    };

    console.log('CompanyHomeComponent: Calling companyApi.addClient...', request);
    const apiCall = this.companyApi.addClient(companyId, payload);
    console.log('CompanyHomeComponent: API call Observable created, setting up pipe and subscribe...');
    
    apiCall.pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding client:', error);
        this.submittingClientForm = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to add client. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: ClientResponse | null) => {
        console.log('CompanyHomeComponent: Subscription next() called', response);
        this.submittingClientForm = false;
        if (response) {
          this.notify.success('Client added successfully!');
          // Reset form after successful submission
          this.clientFormValue = {
            logo: null,
            clientName: '',
          };
          this.loadClients(); // Reload the list
          this.modalService.closeModal();
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add client subscription:', error);
        this.submittingClientForm = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while adding the client.');
          }
        } else {
        this.notify.error('An error occurred while adding the client.');
        }
      }
    });
  }


  onCreatePostSubmitted(payload: CreatePostSubmitPayload): void {
    if (payload.postId) {
      const postToEdit = this.editPostState.postToEdit();
      const authorId = postToEdit?.authorId ?? postToEdit?.author?.authorId ?? this.companyId;
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
      this.companyId ?? user?.profileServiceId ?? user?.companyId ?? user?.campusId ?? user?.studentId ?? user?.userId;
    const authorDisplayName = this.postAuthorName() || user?.displayName || user?.email || 'Company';

    if (payload.mediaFile && !authorId) {
      this.notify.error('Author information is required to post. Please log in again.');
      return;
    }

    this.isSubmittingPost.set(true);
    this.modalService.closeModal();

    const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
    const request = {
      text: payload.text,
      postType: 'COMPANY' as const,
      postKind: payload.postKind,
      ...(authorId && { authorId: String(authorId) }),
      ...(authorDisplayName && { authorDisplayName }),
    };

    if (payload.mediaFile) {
      const formData = new FormData();
      formData.append('text', payload.text);
      formData.append('postType', 'COMPANY');
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
    const user = this.authState.user();
    const userId = this.companyId ?? user?.companyId ?? user?.profileServiceId ?? user?.userId?.toString();
    const userType = 'COMPANY';
    if (!userId) return;
    this.commonApi.likePost(post.postId, { userId: String(userId), userType }).subscribe({
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
    const user = this.authState.user();
    const reporterId = this.companyId ?? user?.companyId ?? user?.profileServiceId ?? user?.userId?.toString();
    if (!reporterId) return;
    this.isReporting.set(true);
    this.commonApi
      .reportPost({
        postId,
        reporterId: String(reporterId),
        reporterType: 'COMPANY',
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
  

  handlePreferredCampusFormSubmit(value: PreferredCampusFormValue): void {
  // ✅ companyId is a GETTER, NOT a function
  const companyId = this.companyId;

  if (!companyId) {
    console.error('Company ID not found');
    this.notify.error('Company ID not found');
    return;
  }

  // ✅ prevent double submit
  if (this.submittingPreferredCampusForm) {
    return;
  }

  this.submittingPreferredCampusForm = true;

  const payload = {
    request: {
      campusId: value.campusId!,          // already validated in form
      campusName: value.campusName,
      campusLogoUrl: value.photo?.name,   // backend expects string
    },
    files: {
      campusLogo: value.photo,
    },
  };

  console.log('Submitting preferred campus payload:', payload);

  this.companyApi.addPreferredCampus(companyId, payload).subscribe({
    next: (res) => {
      console.log('Preferred campus added successfully', res);

      // ✅ show success message
      this.notify.success('Preferred campus added successfully');

      // ✅ reset form state
      this.preferredCampusFormValue = {
        photo: null,
        campusName: '',
        campusId: undefined,
      };

      // ✅ reload preferred campuses list
      this.loadPreferredCampuses();

      // ✅ close modal AFTER UX delay (important)
      setTimeout(() => {
        this.modalService.closeModal(); // NO ARG
      }, 400);
    },

    error: (err) => {
      console.error('Failed to add preferred campus', err);
      this.notify.error('Failed to add preferred campus');
      this.submittingPreferredCampusForm = false;
    },

    complete: () => {
      this.submittingPreferredCampusForm = false;
    },
  });
}





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
interface NewsItem {
  id: string;
  title: string;
  description: string;
  createDate: string;
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


