/**
 * Common API models for feed, search, and other shared endpoints.
 */

/** Create post request (application/json). */
export interface CreatePostRequest {
  text: string;
  postType: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'DEPARTMENT';
  postKind: 'FEED' | 'ANNOUNCEMENT';
  authorId?: string;
  authorDisplayName?: string;
  authorImageUrl?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  location?: {
    name?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
  };
}

/** Create post response. */
export interface CreatePostResponse {
  postId?: string;
  status?: 'PENDING_MODERATION' | 'PUBLISHED' | 'REJECTED' | 'UNPUBLISHED';
  rejectionReason?: string;
  author?: {
    authorId?: string;
    userType?: string;
    displayName?: string;
    imageUrl?: string;
  };
}

/** API wrapper response (e.g. ApiResponseCreatePostResponse). */
export interface ApiResponseCreatePost {
  success?: boolean;
  message?: string;
  data?: CreatePostResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

/** Post author info. */
export interface PostAuthor {
  authorId?: string;
  userType?: string;
  displayName?: string;
  imageUrl?: string;
}

/** Post location. */
export interface PostLocation {
  name?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

/** Single post in feed. */
export interface Post {
  /** Post ID (API may return as `id` instead). */
  postId?: string;
  /** Alternate post ID from API response. */
  id?: string;
  text?: string;
  postType?: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'DEPARTMENT';
  postKind?: 'FEED' | 'ANNOUNCEMENT';
  author?: PostAuthor;
  authorId?: string;
  authorDisplayName?: string;
  authorImageUrl?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  location?: PostLocation;
  createdAt?: string;
  likedByMe?: boolean;
  likeCount?: number;
  status?: 'PENDING_MODERATION' | 'PUBLISHED' | 'REJECTED' | 'UNPUBLISHED';
}

/** Feed list response. */
export interface FeedResponse {
  posts?: Post[];
  totalCount?: number;
  hasMore?: boolean;
  nextBefore?: string;
  /** Cursor for next page (announcements API). */
  nextCursor?: string;
}

/** Generic API response wrapper. */
export interface ApiResponseVoid {
  success?: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

/** API response with map of string keys/values (e.g. validation errors). */
export interface ApiResponseMapStringString {
  success?: boolean;
  message?: string;
  data?: Record<string, string>;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

/** Report post request payload. */
export interface ReportPostRequest {
  postId: string;
  reporterId: string;
  reporterType: string;
  reason: string;
}

/** A single like item returned by get likes API. */
export interface LikeInfo {
  userId?: string;
  userType?: string;
  likerId?: string;
  likerType?: string;
  campusId?: string;
  companyId?: string;
  studentId?: string;
  profileServiceId?: string;
  [key: string]: unknown;
}

/** Update post request (application/json). Author only. */
export interface UpdatePostRequest {
  authorId: string;
  text?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  location?: string;
}
