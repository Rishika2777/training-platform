import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, Component, computed, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CreatePostComponent } from '../../../../shared/components/create-post/create-post.component';
import type { CreatePostSubmitPayload } from '../../../../shared/components/create-post/create-post.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { MediaViewerComponent } from '../../../../shared/components/media-viewer/media-viewer.component';
import {
  AnnouncementCarouselComponent,
  AnnouncementCarouselItem,
} from '../../../../shared/components/announcement-carousel/announcement-carousel.component';
import { EditPostStateService } from '../../../../core/services/edit-post-state.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { RoleService } from '../../../../core/rbac/role.service';
import type { Post } from '../../../../core/models/common-api.model';
import { catchError, of, switchMap } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CreatePostComponent, MediaViewerComponent, AnnouncementCarouselComponent, ModalComponent, RelativeTimePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly modalService = inject(ModalService);
  private readonly notify = inject(NotificationService);
  private readonly commonApi = inject(CommonApiService);
  readonly editPostState = inject(EditPostStateService);
  private readonly authState = inject(AuthStateService);
  private readonly roleService = inject(RoleService);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isCreatePostModalOpen = computed(() => this.activeModal() === 'create-post');

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

  // Feed posts (excluding announcements)
  readonly feedPosts = computed(() => {
    return this.posts().filter((post) => post.postKind !== 'ANNOUNCEMENT');
  });

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
    const user = this.authState.user();
    if (user?.displayName) return user.displayName;
    if (this.roleService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return 'Admin';
    return user?.email ?? 'Admin';
  });
  readonly postAuthorImageUrl = computed(() => this.authState.user()?.imageUrl ?? null);

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
  private maxScrollY = 0;
  private lastTopRefreshTime = 0;
  private readonly TOP_REFRESH_THRESHOLD = 200;
  private readonly MIN_SCROLL_DISTANCE = 500;
  private readonly TOP_REFRESH_COOLDOWN_MS = 2000;
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef);
  private feedScrollHost: HTMLElement | null = null;
  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLElement>;
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

  ngOnInit(): void {
    this.loadFeed();
    this.loadAnnouncements();
  }

  loadFeed(): void {
    this.loadingFeed.set(true);
    this.feedPage = 0; // API uses 0-indexed pagination
    this.hasMoreFeed.set(true);
    this.feedFirstLoadDone = false;
    const user = this.authState.user();
    const userId = user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.profileServiceId ?? user?.userId?.toString();
    const userType = user?.userType;
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
          this.commonApi.enrichFeedLikes(items, { id: userId, type: userType }).pipe(
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
    const user = this.authState.user();
    const viewerUserId = user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.profileServiceId ?? user?.userId?.toString();
    const params: { viewerUserId?: string; pageSize?: number; page?: number } = { pageSize: 10, page: 0 };
    if (viewerUserId) params.viewerUserId = viewerUserId;
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
    const user = this.authState.user();
    const userId = user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.profileServiceId ?? user?.userId?.toString();
    const userType = user?.userType;
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
          this.commonApi.enrichFeedLikes(items, { id: userId, type: userType }).pipe(
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

  openMediaViewer(url: string, type: 'image' | 'video'): void {
    this.mediaViewerUrl.set(url);
    this.mediaViewerType.set(type);
  }

  closeMediaViewer(): void {
    this.mediaViewerUrl.set(null);
    this.mediaViewerType.set(null);
  }

  openCreatePostModal(): void {
    if (this.isSubmittingPost()) return;
    this.editPostState.clearPostToEdit();
    this.modalService.openModal('create-post');
  }

  onCreatePostClosed(): void {
    this.editPostState.clearPostToEdit();
    this.modalService.closeModal();
  }

  onCreatePostSubmitted(payload: CreatePostSubmitPayload): void {
    if (payload.postId) {
      const postToEdit = this.editPostState.postToEdit();
      const user = this.authState.user();
      const authorId =
        postToEdit?.authorId ??
        postToEdit?.author?.authorId ??
        user?.profileServiceId ??
        user?.campusId ??
        user?.companyId ??
        user?.studentId ??
        user?.userId;
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
      user?.profileServiceId ?? user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.userId;
    const authorDisplayName = this.postAuthorName() || user?.displayName || user?.email || 'Admin';

    if (payload.mediaFile && !authorId) {
      this.notify.error('Author information is required to post with media. Please log in again.');
      return;
    }

    this.isSubmittingPost.set(true);
    this.modalService.closeModal();

    const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
    const request = {
      text: payload.text,
      postType: 'CAMPUS' as const,
      postKind: payload.postKind,
      ...(authorId && { authorId: String(authorId) }),
      ...(authorDisplayName && { authorDisplayName }),
    };

    if (payload.mediaFile) {
      const formData = new FormData();
      formData.append('text', payload.text);
      formData.append('postType', 'CAMPUS');
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
    const user = this.authState.user();
    const userId =
      user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.profileServiceId ?? user?.userId?.toString();
    const userType = (user?.userType === 'COMPANY' ? 'COMPANY' : user?.userType === 'STUDENT' ? 'STUDENT' : 'CAMPUS') as 'CAMPUS' | 'STUDENT' | 'COMPANY';
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
    if (reason.length > 1500) {
      this.notify.error('Report reason must be at most 1500 characters.');
      return;
    }

    const user = this.authState.user();
    const reporterId =
      user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.profileServiceId ?? user?.userId?.toString();
    const reporterType = (user?.userType === 'COMPANY' ? 'COMPANY' : user?.userType === 'STUDENT' ? 'STUDENT' : 'CAMPUS') as
      | 'CAMPUS'
      | 'STUDENT'
      | 'COMPANY';
    if (!reporterId) return;

    this.isReporting.set(true);
    this.commonApi
      .reportPost({
        postId,
        reporterId: String(reporterId),
        reporterType,
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
