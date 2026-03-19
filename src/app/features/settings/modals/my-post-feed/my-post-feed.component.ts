import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, computed, effect } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { EditPostStateService } from '../../../../core/services/edit-post-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { RoleService } from '../../../../core/rbac/role.service';
import type { Post } from '../../../../core/models/common-api.model';
import { APP_CONFIG, APP_CONFIG_TOKEN } from '../../../../core/config/app.constants';

export type MyPostFeedTab = 'posts' | 'announcements';

@Component({
  selector: 'app-my-post-feed',
  standalone: true,
  imports: [CommonModule, ButtonComponent, AvatarComponent, ModalComponent, RelativeTimePipe],
  templateUrl: './my-post-feed.component.html',
  styleUrl: './my-post-feed.component.css',
})
export class MyPostFeedComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() editPostRequested = new EventEmitter<void>();

  private readonly commonApi = inject(CommonApiService);
  private readonly authState = inject(AuthStateService);
  private readonly editPostState = inject(EditPostStateService);
  private readonly notify = inject(NotificationService);
  private readonly roles = inject(RoleService);
  private readonly appConfig = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;

  readonly activeTab = signal<MyPostFeedTab>('posts');

  readonly posts = signal<Post[]>([]);
  readonly announcements = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly postToDelete = signal<Post | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly announcementsNextCursor = signal<string | null>(null);
  readonly announcementsHasMore = signal(false);
  readonly pageSize = (this.appConfig.DEFAULT_PAGE_SIZE ?? 10);
  private readonly postsLoaded = signal(false);
  private readonly announcementsLoaded = signal(false);

  readonly currentUserId = computed(() => {
    const user = this.authState.user();
    const id = user?.userId ?? user?.profileServiceId;
    return id != null ? String(id) : null;
  });

  /** Author ID for filtering "my posts" (profileServiceId, studentId, campusId, companyId, or userId). */
  readonly currentAuthorId = computed(() => {
    const user = this.authState.user();
    const id =
      user?.profileServiceId ??
      user?.studentId ??
      user?.campusId ??
      user?.companyId ??
      user?.userId;
    return id != null ? String(id).trim() : null;
  });

  /** Posts to display (filtered by authorId when set). */
  readonly displayPosts = computed(() => {
    const list = this.posts();
    return list.map((p) => ({
      ...p,
      postId: p.postId ?? p.id,
    }));
  });

  /** Announcements to display. */
  readonly displayAnnouncements = computed(() => {
    const list = this.announcements();
    return list.map((p) => ({
      ...p,
      postId: p.postId ?? p.id,
    }));
  });

  /** Items to display based on active tab. */
  readonly displayItems = computed(() =>
    this.activeTab() === 'announcements' ? this.displayAnnouncements() : this.displayPosts()
  );

  readonly isEmpty = computed(() => {
    const tab = this.activeTab();
    if (tab === 'posts') {
      return this.displayPosts().length === 0 && !this.loading();
    }
    return this.displayAnnouncements().length === 0 && !this.loading();
  });

  readonly canLoadMoreAnnouncements = computed(
    () => this.activeTab() === 'announcements' && this.announcementsHasMore() && !this.loadingMore()
  );

  /** Students: only posts. Campus, company, admin: posts + announcements. */
  readonly showAnnouncementsTab = computed(() => this.roles.getUserType() !== 'STUDENT');

  constructor() {
    effect(
      () => {
        const uid = this.currentUserId();
        const authorId = this.currentAuthorId();
        const tab = this.activeTab();
        const showAnnouncements = this.showAnnouncementsTab();
        if (uid || authorId) {
          if (tab === 'posts' || !showAnnouncements) {
            if (!this.postsLoaded()) {
              this.loadFeed(uid ?? authorId ?? '');
            } else {
              this.loading.set(false);
            }
          } else {
            if (!this.announcementsLoaded()) {
              this.loadAnnouncements(uid ?? authorId ?? '', true);
            } else {
              this.loading.set(false);
            }
          }
        } else {
          this.loading.set(false);
          this.posts.set([]);
          this.announcements.set([]);
          this.postsLoaded.set(false);
          this.announcementsLoaded.set(false);
        }
      },
      { allowSignalWrites: true }
    );
  }

  setTab(tab: MyPostFeedTab): void {
    this.activeTab.set(tab);
  }

  private loadFeed(viewerUserId: string): void {
    this.loading.set(true);
    this.error.set(null);
    const authorId = this.currentAuthorId() ?? undefined;
    this.commonApi
      .getFeed({
        authorId,
        pageSize: this.pageSize * 2,
        viewerUserId,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.posts.set(res.posts ?? []);
          this.postsLoaded.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.posts.set([]);
          this.postsLoaded.set(true);
          this.error.set(err?.message ?? 'Failed to load posts');
          this.notify.error('Failed to load your posts.');
        },
      });
  }

  loadAnnouncements(viewerUserId: string, reset = false): void {
    if (reset) {
      this.loading.set(true);
      this.error.set(null);
      this.announcements.set([]);
      this.announcementsNextCursor.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const authorId = this.currentAuthorId() ?? undefined;
    const nextCursor = reset ? undefined : this.announcementsNextCursor() ?? undefined;

    this.commonApi
      .getAnnouncements({
        authorId,
        pageSize: this.pageSize,
        viewerUserId,
        ...(nextCursor && { nextCursor }),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.loadingMore.set(false);
          const newItems = res.posts ?? [];
          if (reset) {
            this.announcements.set(newItems);
          } else {
            this.announcements.update((prev) => [...prev, ...newItems]);
          }
          this.announcementsHasMore.set(res.hasMore ?? false);
          this.announcementsNextCursor.set(res.nextCursor ?? res.nextBefore ?? null);
          this.announcementsLoaded.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadingMore.set(false);
          this.announcementsLoaded.set(true);
          this.error.set(err?.message ?? 'Failed to load announcements');
          this.notify.error('Failed to load announcements.');
        },
      });
  }

  loadMoreAnnouncements(): void {
    const uid = this.currentUserId();
    const authorId = this.currentAuthorId();
    if (this.canLoadMoreAnnouncements() && (uid || authorId)) {
      this.loadAnnouncements(uid ?? authorId ?? '', false);
    }
  }

  onEdit(post: Post): void {
    const postId = post.postId ?? post.id;
    if (!postId) {
      this.notify.error('Post ID not found.');
      return;
    }
    this.editingId.set(postId);
    const viewerUserId = this.currentUserId() ?? undefined;
    const params = viewerUserId ? { viewerUserId } : undefined;
    const fetch$ =
      this.activeTab() === 'announcements'
        ? this.commonApi.getAnnouncement(postId, params)
        : this.commonApi.getPost(postId, params);
    fetch$.subscribe({
      next: (fetchedPost) => {
        const fullPost = {
          ...fetchedPost,
          postId: fetchedPost.postId ?? fetchedPost.id ?? postId,
          postKind: this.activeTab() === 'announcements' ? 'ANNOUNCEMENT' : (fetchedPost.postKind ?? 'FEED'),
        };
        this.editPostState.setPostToEdit(fullPost);
        this.editingId.set(null);
        this.editPostRequested.emit();
      },
      error: () => {
        this.editingId.set(null);
        this.notify.error(
          this.activeTab() === 'announcements'
            ? 'Failed to load announcement for editing.'
            : 'Failed to load post for editing.'
        );
      },
    });
  }

  openDeleteConfirm(post: Post): void {
    this.postToDelete.set(post);
  }

  closeDeleteConfirm(): void {
    this.postToDelete.set(null);
  }

  confirmDelete(): void {
    const post = this.postToDelete();
    if (!post) return;
    const postId = post.postId ?? post.id;
    const authorId = String(post.authorId ?? post.author?.authorId ?? '').trim();
    if (!postId || !authorId) {
      this.notify.error('Cannot delete: post author not found.');
      this.closeDeleteConfirm();
      return;
    }
    this.deletingId.set(postId);
    const delete$ =
      this.activeTab() === 'announcements'
        ? this.commonApi.deleteAnnouncement(postId, authorId)
        : this.commonApi.deletePost(postId, authorId);
    delete$.subscribe({
      next: () => {
        const pred = (p: Post) => (p.postId ?? p.id) !== postId;
        this.posts.update((list) => list.filter(pred));
        this.announcements.update((list) => list.filter(pred));
        this.deletingId.set(null);
        this.closeDeleteConfirm();
        this.notify.success(
          this.activeTab() === 'announcements' ? 'Announcement deleted.' : 'Post deleted.'
        );
      },
      error: () => {
        this.deletingId.set(null);
        this.notify.error(
          this.activeTab() === 'announcements'
            ? 'Failed to delete announcement.'
            : 'Failed to delete post.'
        );
      },
    });
  }

  isDeleting(post: Post): boolean {
    const id = post.postId ?? post.id;
    return id != null && this.deletingId() === id;
  }

  close(): void {
    this.closed.emit();
  }
}
