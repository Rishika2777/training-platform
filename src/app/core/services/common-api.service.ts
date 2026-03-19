import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN } from '../config/app.constants';
import type {
  CreatePostRequest,
  CreatePostResponse,
  ApiResponseCreatePost,
  FeedResponse,
  LikeInfo,
  Post,
  ReportPostRequest,
  UpdatePostRequest,
} from '../models/common-api.model';

export type {
  CreatePostRequest,
  CreatePostResponse,
  ApiResponseCreatePost,
  FeedResponse,
  LikeInfo,
  Post,
  ReportPostRequest,
  UpdatePostRequest,
} from '../models/common-api.model';

/**
 * Common API service for shared endpoints (feed, search, etc.) that live on the common microservice.
 */
@Injectable({ providedIn: 'root' })
export class CommonApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.API_BASE_URL;

  /**
   * Create post (JSON).
   * POST /common/feed/post with application/json.
   */
  createPost(request: CreatePostRequest): Observable<CreatePostResponse | ApiResponseCreatePost> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.CREATE_POST);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CreatePostResponse | ApiResponseCreatePost>(url, request, { headers });
  }

  /**
   * Create post with file upload (multipart/form-data).
   * Use when uploading images/videos directly.
   */
  createPostWithFiles(formData: FormData): Observable<CreatePostResponse | ApiResponseCreatePost> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.CREATE_POST);
    const headers = new HttpHeaders({ Accept: 'application/json' });
    return this.http.post<CreatePostResponse | ApiResponseCreatePost>(url, formData, { headers });
  }

  /**
   * Create announcement (JSON).
   * POST /common/feed/announcements with application/json.
   * Use for announcements when postKind is ANNOUNCEMENT.
   */
  createAnnouncement(request: CreatePostRequest): Observable<CreatePostResponse | ApiResponseCreatePost> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.CREATE_ANNOUNCEMENT);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CreatePostResponse | ApiResponseCreatePost>(url, request, { headers });
  }

  /**
   * Create announcement with file upload (multipart/form-data).
   * POST /common/feed/announcements.
   * Query params: text, postType, authorId, authorDisplayName, authorImageUrl, location.
   * Form data: images, videos (binary arrays).
   */
  createAnnouncementWithFiles(formData: FormData): Observable<CreatePostResponse | ApiResponseCreatePost> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.CREATE_ANNOUNCEMENT);
    const headers = new HttpHeaders({ Accept: 'application/json' });
    return this.http.post<CreatePostResponse | ApiResponseCreatePost>(url, formData, { headers });
  }

  /**
   * Get announcements (list).
   * List announcements newest first. Use authorId, viewerId+viewerType, authorIds, postType, pageSize, before, page, after, viewerUserId.
   * GET /common/feed/announcements
   */
  getAnnouncements(params?: {
    authorId?: string;
    viewerId?: string;
    viewerType?: string;
    authorIds?: string;
    postType?: string;
    pageSize?: number;
    before?: string;
    page?: number;
    after?: string;
    viewerUserId?: string;
    /** Cursor for next page (pass nextCursor from previous response). */
    nextCursor?: string;
  }): Observable<FeedResponse> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.GET_ANNOUNCEMENTS);
    const queryParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
        ) as Record<string, string | number>
      : undefined;
    // Use nextCursor as 'before' for cursor-based pagination when provided
    const cursor = queryParams?.['nextCursor'];
    if (cursor) {
      (queryParams as Record<string, string>)['before'] = cursor as string;
      delete (queryParams as Record<string, unknown>)['nextCursor'];
    }
    return this.http
      .get<FeedResponse | { success?: boolean; data?: FeedResponse }>(
        url,
        queryParams ? { params: queryParams } : {}
      )
      .pipe(
        map((res) => {
          const wrapped = res as { data?: FeedResponse };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as FeedResponse;
        })
      );
  }

  /**
   * Get feed.
   * List published posts newest first. Use pageSize and before (timestamp) or page for pagination.
   * Optional authorId to filter by author; optional postType (CAMPUS, STUDENT, COMPANY, DEPARTMENT);
   * optional viewerUserId for likedByMe.
   * GET /common/feed/posts
   */
  getFeed(params?: {
    authorId?: string;
    postType?: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'DEPARTMENT';
    pageSize?: number;
    before?: string;
    page?: number;
    after?: string;
    viewerUserId?: string;
  }): Observable<FeedResponse> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.GET_FEED);
    const queryParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) as Record<string, string | number>
      : undefined;
    return this.http
      .get<FeedResponse | { success?: boolean; data?: FeedResponse }>(
        url,
        queryParams ? { params: queryParams } : {}
      )
      .pipe(
        map((res) => {
          const wrapped = res as { data?: FeedResponse };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as FeedResponse;
        })
      );
  }

  /**
   * Get announcement by ID.
   * GET /common/feed/announcements/{postId}
   */
  getAnnouncement(postId: string, params?: { viewerUserId?: string }): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.GET_ANNOUNCEMENT.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const queryParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) as Record<string, string>
      : undefined;
    return this.http
      .get<Post | { success?: boolean; data?: Post }>(
        url,
        queryParams ? { params: queryParams } : {}
      )
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Get post by ID.
   * GET /common/feed/posts/{postId}
   */
  getPost(postId: string, params?: { viewerUserId?: string }): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.GET_POST.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const queryParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) as Record<string, string>
      : undefined;
    return this.http
      .get<Post | { success?: boolean; data?: Post }>(
        url,
        queryParams ? { params: queryParams } : {}
      )
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Update post (application/json).
   * PATCH /common/feed/posts/{postId}
   * Author only. Send authorId and fields to update (text, imageUrls, videoUrls, location).
   */
  updatePost(postId: string, request: UpdatePostRequest): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.UPDATE_POST.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .patch<Post | { success?: boolean; data?: Post }>(url, request, { headers })
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Update post with file upload (multipart/form-data).
   * PATCH /common/feed/posts/{postId}
   * Use when uploading new images/videos. authorId required.
   */
  updatePostWithFiles(postId: string, formData: FormData): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.UPDATE_POST.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const headers = new HttpHeaders({ Accept: 'application/json' });
    return this.http
      .patch<Post | { success?: boolean; data?: Post }>(url, formData, { headers })
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Update announcement (application/json).
   * PATCH /common/feed/announcements/{postId}
   * Author only.
   */
  updateAnnouncement(postId: string, request: UpdatePostRequest): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.UPDATE_ANNOUNCEMENT.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .patch<Post | { success?: boolean; data?: Post }>(url, request, { headers })
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Update announcement with file upload (multipart/form-data).
   * PATCH /common/feed/announcements/{postId}
   * Author only. authorId required.
   */
  updateAnnouncementWithFiles(postId: string, formData: FormData): Observable<Post> {
    const endpoint = API_ENDPOINTS.COMMON.UPDATE_ANNOUNCEMENT.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    const headers = new HttpHeaders({ Accept: 'application/json' });
    return this.http
      .patch<Post | { success?: boolean; data?: Post }>(url, formData, { headers })
      .pipe(
        map((res) => {
          const wrapped = res as { data?: Post };
          if (wrapped.data && typeof wrapped.data === 'object') {
            return wrapped.data;
          }
          return res as Post;
        })
      );
  }

  /**
   * Like post.
   * POST /common/feed/posts/{postId}/like
   * Query params: userId (required), userType (required: CAMPUS, STUDENT, or COMPANY).
   */
  likePost(
    postId: string,
    params: { userId: string; userType: 'CAMPUS' | 'STUDENT' | 'COMPANY' }
  ): Observable<unknown> {
    const endpoint = API_ENDPOINTS.COMMON.LIKE_POST.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    return this.http.post(url, null, { params: params as Record<string, string> });
  }

  /**
   * Get who liked a post.
   * GET /common/feed/posts/{postId}/likes
   */
  getPostLikes(postId: string): Observable<LikeInfo[]> {
    const endpoint = API_ENDPOINTS.COMMON.GET_POST_LIKES.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    return this.http
      .get<LikeInfo[] | { success?: boolean; data?: LikeInfo[] }>(url)
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res;
          const wrapped = res as { data?: LikeInfo[] };
          return Array.isArray(wrapped.data) ? wrapped.data : [];
        })
      );
  }

  /**
   * Enrich feed items with accurate likes from likes API.
   * Useful when feed response does not return stable likedByMe/likeCount values.
   */
  enrichFeedLikes<T extends { postId: string | null; likedByMe: boolean; likeCount: number }>(
    posts: T[],
    viewer?: { id?: string | null; type?: string | null }
  ): Observable<T[]> {
    if (!posts.length) return of(posts);
    const viewerId = String(viewer?.id ?? '').trim();
    const viewerType = String(viewer?.type ?? '').trim().toUpperCase();

    const requests = posts.map((post) => {
      if (!post.postId) return of(post);
      return this.getPostLikes(post.postId).pipe(
        map((likes) => {
          const likedByViewer = viewerId
            ? likes.some((like) => {
                const likeUserId = this.extractLikeUserId(like);
                if (!likeUserId) return false;
                const sameId = likeUserId === viewerId;
                if (!sameId) return false;
                if (!viewerType) return true;
                const likeUserType = this.extractLikeUserType(like);
                return !likeUserType || likeUserType === viewerType;
              })
            : post.likedByMe;
          return {
            ...post,
            likeCount: likes.length,
            likedByMe: likedByViewer,
          };
        }),
        catchError(() => of(post))
      );
    });

    return forkJoin(requests);
  }

  /**
   * Follow an entity.
   * POST /common/follow
   * actorType/actorId = who is following; targetType/targetId = who is being followed.
   * departmentId optional for targetType=CAMPUS (department-level follow).
   */
  follow(params: {
    actorType: 'STUDENT' | 'COMPANY' | 'CAMPUS';
    actorId: string;
    targetType: 'STUDENT' | 'COMPANY' | 'CAMPUS';
    targetId: string;
    departmentId?: string;
  }): Observable<unknown> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.FOLLOW);
    let httpParams = new HttpParams()
      .set('actorType', params.actorType)
      .set('actorId', params.actorId)
      .set('targetType', params.targetType)
      .set('targetId', params.targetId);
    if (params.departmentId?.trim()) {
      httpParams = httpParams.set('departmentId', params.departmentId.trim());
    }
    return this.http.post(url, null, { params: httpParams });
  }

  /**
   * Report post for moderation.
   * POST /common/feed/posts/report
   */
  reportPost(request: ReportPostRequest): Observable<unknown> {
    const url = this.buildUrl(API_ENDPOINTS.COMMON.REPORT_POST);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, request, { headers });
  }

  /**
   * Delete post.
   * Author only.
   * DELETE /common/feed/posts/{postId}
   */
  deletePost(postId: string, authorId: string): Observable<unknown> {
    const endpoint = API_ENDPOINTS.COMMON.DELETE_POST.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    return this.http.delete(url, { params: { authorId } });
  }

  /**
   * Delete announcement.
   * Author only.
   * DELETE /common/feed/announcements/{postId}
   */
  deleteAnnouncement(postId: string, authorId: string): Observable<unknown> {
    const endpoint = API_ENDPOINTS.COMMON.DELETE_ANNOUNCEMENT.replace(':postId', postId);
    const url = this.buildUrl(endpoint);
    return this.http.delete(url, { params: { authorId } });
  }

  private buildUrl(endpoint: string): string {
    const base = (this.baseUrl ?? '').trim();
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return normalized + path;
  }

  private extractLikeUserId(like: LikeInfo): string {
    const candidate =
      like.userId ??
      like.likerId ??
      like.profileServiceId ??
      like.studentId ??
      like.campusId ??
      like.companyId;
    return String(candidate ?? '').trim();
  }

  private extractLikeUserType(like: LikeInfo): string {
    const candidate = like.userType ?? like.likerType;
    return String(candidate ?? '').trim().toUpperCase();
  }
}
