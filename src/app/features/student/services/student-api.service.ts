import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, STATIC_CAMPUSES } from '../../../core/config/app.constants';
import {
  ApiResponseObject,
  ApiResponseListStudentProfileResponse,
  ApiResponseStudentProfileResponse,
  ApiResponseStudentRegistrationResponse,
  StudentCompleteRegistrationRequest,
  StudentUpdateRequest,
  ApiResponsePageAlumniResponse,
  ApiResponseBatchmateResponse,
  ApiResponsePlacedStudentsResponse,
  CareerCheckInRequest,
  ApiResponseCareerCheckInResponse,
  ApiResponseCampusResponse,
  CampusResponse,
  ApiResponseStudentPublicProfileResponse,
  ApiResponseTestimonialResponse,
  ApiResponsePromotionCountResponse,
  ApiResponseFollowerCountResponse,
  StudentFeedbackRequest,
  StudentRecommendationRequest,
  ApiResponseFeedbackResponse,
  ApiResponseRecommendationResponse,
  ApiResponseString,
  ApiResponseKnowledgeBaseResponse,
} from '../models/student.models';
import type { UserType } from '../../../core/config/app.constants';

/**
 * Student API (ported from legacy `Synkup_FE/app/features/student/services/student.service.js`).
 */
@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  // Uses STUDENT_SERVICE_URL from runtime config (resolved via STUDENT_API_BASE_URL)
  private readonly baseUrl = this.config.STUDENT_API_BASE_URL;

  registerStudent(
    data: StudentCompleteRegistrationRequest | StudentRegisterPayload,
    options?: RegisterStudentOptions,
  ): Observable<ApiResponseStudentRegistrationResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.REGISTER);
    const payload = normalizeStudentRegisterPayload(data);

    // Add userType query parameter if provided (component will pass 'ADMIN' when needed)
    let params = new HttpParams();
    if (options?.userType) {
      params = params.set('userType', options.userType);
    }

    if (hasStudentRegisterFiles(payload.files)) {
      const formData = buildStudentRegisterFormData(payload);
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.post<ApiResponseStudentRegistrationResponse>(url, formData, { params, headers });
    }

    return this.http.post<ApiResponseStudentRegistrationResponse>(url, payload.request, { params });
  }

  /**
   * POST /admin/students/bulk-upload
   * Bulk upload students from Excel file (Admin only).
   * Student admin endpoints use requesterUserType (not userType like company/campus).
   */
  bulkUploadStudents(file: File): Observable<BulkUploadResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.BULK_UPLOAD);

    const formData = new FormData();
    formData.append('file', file, file.name);

    const params = new HttpParams().set('requesterUserType', 'ADMIN');

    const headers = new HttpHeaders({
      Accept: 'application/json',
    });

    return this.http.post<unknown>(url, formData, { headers, params }).pipe(
      map((raw) => this.normalizeBulkUploadResponse(raw)),
      catchError((error) => {
        console.error('StudentApiService: bulkUploadStudents - Error:', error);
        return throwError(() => error);
      })
    );
  }

  private normalizeBulkUploadResponse(raw: unknown): BulkUploadResponse | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const responseObj = raw as Record<string, unknown>;

    if ('success' in responseObj && 'message' in responseObj && 'data' in responseObj) {
      const apiResponse = raw as unknown as ApiResponseBulkUploadResponse;
      return apiResponse.data ?? null;
    }

    if (
      'totalRows' in responseObj ||
      'successfulRows' in responseObj ||
      'failedRows' in responseObj ||
      'total_rows' in responseObj ||
      'successful_rows' in responseObj ||
      'failed_rows' in responseObj
    ) {
      return this.toBulkUploadResponse(responseObj);
    }

    console.warn('StudentApiService: bulkUploadStudents - Invalid response format:', raw);
    return null;
  }

  private toBulkUploadResponse(obj: Record<string, unknown>): BulkUploadResponse {
    return {
      totalRows:
        typeof obj['totalRows'] === 'number'
          ? obj['totalRows']
          : typeof obj['total_rows'] === 'number'
            ? obj['total_rows']
            : undefined,
      successfulRows:
        typeof obj['successfulRows'] === 'number'
          ? obj['successfulRows']
          : typeof obj['successful_rows'] === 'number'
            ? obj['successful_rows']
            : undefined,
      failedRows:
        typeof obj['failedRows'] === 'number'
          ? obj['failedRows']
          : typeof obj['failed_rows'] === 'number'
            ? obj['failed_rows']
            : undefined,
    };
  }

  getAllStudents(
    requesterUserType: 'ADMIN',
    approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  ): Observable<ApiResponseListStudentProfileResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.ALL_STUDENTS);
    let params = new HttpParams().set('requesterUserType', requesterUserType);
    if (approvalStatus) {
      params = params.set('approvalStatus', approvalStatus);
    }
    return this.http.get<ApiResponseListStudentProfileResponse>(url, {
      params,
      withCredentials: false,
    });
  }

  /**
   * GET /public-landing/{publicStudentId}/student-profile
   */
  getPublicStudentProfile(publicStudentId: string): Observable<ApiResponseStudentPublicProfileResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_STUDENT_PROFILE, {
      publicStudentId,
    });
    return this.http.get<ApiResponseStudentPublicProfileResponse>(this.buildUrl(endpoint));
  }

  /**
   * GET /public-landing/{publicStudentId}/testimonials
   */
  getPublicTestimonials(
    publicStudentId: string,
    limit = 1,
    page = 1,
  ): Observable<ApiResponseTestimonialResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_TESTIMONIALS, {
      publicStudentId,
    });
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());
    return this.http.get<ApiResponseTestimonialResponse>(this.buildUrl(endpoint), { params });
  }

  /**
   * GET /public-landing/{publicStudentId}/promotions
   */
  getPublicPromotions(publicStudentId: string): Observable<ApiResponsePromotionCountResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_PROMOTIONS, {
      publicStudentId,
    });
    return this.http.get<ApiResponsePromotionCountResponse>(this.buildUrl(endpoint));
  }

  /**
   * GET /public-landing/{publicStudentId}/followers
   */
  getPublicFollowers(publicStudentId: string): Observable<ApiResponseFollowerCountResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_FOLLOWERS, {
      publicStudentId,
    });
    return this.http.get<ApiResponseFollowerCountResponse>(this.buildUrl(endpoint));
  }

  /**
   * GET /public-landing/{publicStudentId}/alumni
   */
  getPublicAlumni(
    publicStudentId: string,
    campusName: string,
    yearOfPassing: string,
    limit = 12,
    page = 1,
  ): Observable<ApiResponsePageAlumniResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_ALUMNI, {
      publicStudentId,
    });
    const params = new HttpParams()
      .set('campusName', campusName)
      .set('yearOfPassing', yearOfPassing)
      .set('limit', limit.toString())
      .set('page', page.toString());
    return this.http.get<ApiResponsePageAlumniResponse>(this.buildUrl(endpoint), { params });
  }

  /**
   * GET /public-landing/{publicStudentId}/overview/knowledge-base
   * Top 7-8 technologies with proficiency 0-10. X-axis: tech names, Y-axis: proficiency.
   */
  getKnowledgeBase(publicStudentId: string): Observable<ApiResponseKnowledgeBaseResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.PUBLIC_LANDING_KNOWLEDGE_BASE, {
      publicStudentId,
    });
    return this.http.get<ApiResponseKnowledgeBaseResponse>(this.buildUrl(endpoint));
  }

  /**
   * POST /student/{studentId}/feedback
   * Submits feedback for a student. Query: reviewerId, requesterUserType.
   */
  submitFeedback(
    studentId: string,
    reviewerId: string,
    requesterUserType: UserType,
    request: StudentFeedbackRequest,
  ): Observable<ApiResponseFeedbackResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.FEEDBACK, { studentId });
    const params = new HttpParams()
      .set('reviewerId', reviewerId)
      .set('requesterUserType', requesterUserType);
    return this.http.post<ApiResponseFeedbackResponse>(this.buildUrl(endpoint), request, { params });
  }

  /**
   * POST /recommendation/{studentId}
   * Submits recommendation (Yes/No) for a student. Query: reviewerId, requesterUserType.
   */
  submitRecommendation(
    studentId: string,
    reviewerId: string,
    requesterUserType: UserType,
    request: StudentRecommendationRequest,
  ): Observable<ApiResponseRecommendationResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.RECOMMENDATION, { studentId });
    const params = new HttpParams()
      .set('reviewerId', reviewerId)
      .set('requesterUserType', requesterUserType);
    return this.http.post<ApiResponseRecommendationResponse>(this.buildUrl(endpoint), request, { params });
  }

  /**
   * GET /student/{studentId}/resume
   * Returns the resume URL for a student. Requires requesterUserType query param.
   */
  getResume(studentId: string, requesterUserType: string): Observable<ApiResponseString> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.RESUME_URL, { studentId });
    const params = new HttpParams().set('requesterUserType', requesterUserType);
    return this.http.get<ApiResponseString>(this.buildUrl(endpoint), { params });
  }

  /**
   * GET /student/{studentId}/profile
   * Swagger: requires requesterUserId + requesterUserType query params.
   */
  getStudentFullProfile(
    studentId: string,
    requesterUserId: string,
    requesterUserType: string,
  ): Observable<ApiResponseObject> {
    const url = this.buildUrl(resolvePathParams(API_ENDPOINTS.STUDENT.FULL_PROFILE, { studentId }));
    const params = new HttpParams()
      .set('requesterUserId', requesterUserId)
      .set('requesterUserType', requesterUserType);
    return this.http.get<ApiResponseObject>(url, { params });
  }


  /**
   * PATCH /student/{studentId}/update
   * Swagger: requires userId query param.
   *
   * Note: backend expects studentId value here (even though the query param is named "userId").
   */
  updateStudentFullProfile(
    studentId: string,
    studentIdForQuery: string,
    request: StudentUpdateRequest | StudentUpdatePayload,
  ): Observable<ApiResponseStudentProfileResponse> {
    const url = this.buildUrl(resolvePathParams(API_ENDPOINTS.STUDENT.UPDATE_FULL_PROFILE, { studentId }));
    const params = new HttpParams().set('userId', studentIdForQuery);
    const payload = normalizeStudentUpdatePayload(request);

    if (hasStudentUpdateFiles(payload.files)) {
      const formData = buildStudentUpdateFormData(payload);
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.patch<ApiResponseStudentProfileResponse>(url, formData, { params, headers });
    }

    return this.http.patch<ApiResponseStudentProfileResponse>(url, payload.request, { params });
  }

  /**
   * PATCH /student/{studentId}/approvalStatus/update
   * Swagger: requires requesterUserType query param.
   * Updates the approval status of a student profile. Only ADMIN users can access this endpoint.
   */
  updateStudentApprovalStatus(
    studentId: string,
    requesterUserType: string,
    request: { approvalStatus: string },
  ): Observable<ApiResponseStudentProfileResponse> {
    const url = this.buildUrl(resolvePathParams(API_ENDPOINTS.STUDENT.UPDATE_APPROVAL_STATUS, { studentId }));
    const params = new HttpParams().set('requesterUserType', requesterUserType);
    return this.http.patch<ApiResponseStudentProfileResponse>(url, request, { params });
  }

  /**
   * DELETE /student/students/{studentId}
   * Deletes student profile by studentId.
   */
  deleteStudent(studentId: string): Observable<void> {
    const url = this.buildUrl(resolvePathParams(API_ENDPOINTS.STUDENT.DELETE, { studentId }));
    return this.http.delete<unknown>(url).pipe(map(() => void 0));
  }

  /**
   * GET /students/{studentId}/alumni
   * Fetch alumni from student database (paginated)
   * Requires campusName and yearOfPassing as query parameters
   */
  getAlumniForStudent(
    studentId: string,
    campusName: string,
    yearOfPassing: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponsePageAlumniResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.ALUMNI, { studentId });
    const url = this.buildUrl(endpoint);
    const params = new HttpParams()
      .set('campusName', campusName)
      .set('yearOfPassing', yearOfPassing) 
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponsePageAlumniResponse>(url, { params });
  }

  /**
   * GET /students/campus/{campusId}/batch
   * Retrieves alumni by campusId and yearOfPassing (batch).
   */
  getAlumniByCampusBatch(
    campusId: string,
    yearOfPassing: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponsePageAlumniResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.ALUMNI_BY_CAMPUS_BATCH, { campusId });
    const url = this.buildUrl(endpoint);
    const params = new HttpParams()
      .set('yearOfPassing', yearOfPassing)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponsePageAlumniResponse>(url, { params });
  }

  /**
   * GET /student/{studentId}/myBatchmates
   * Get batchmates for logged-in student
   * Requires campusName and yearOfPassing as query parameters
   */
  getBatchmates(
    studentId: string,
    campusName: string,
    yearOfPassing: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponseBatchmateResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.BATCHMATES, { studentId });
    const url = this.buildUrl(endpoint);
    const params = new HttpParams()
      .set('campusName', campusName)
      .set('yearOfPassing', yearOfPassing)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponseBatchmateResponse>(url, { params });
  }

  /**
   * GET /student/batch/current
   * Retrieves current batch students filtered by campus name and year of passing.
   */
  getCurrentBatch(
    campusName: string,
    yearOfPassing: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponseBatchmateResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.CURRENT_BATCH);
    const params = new HttpParams()
      .set('campusName', campusName)
      .set('yearOfPassing', yearOfPassing)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponseBatchmateResponse>(url, { params });
  }

  /**
   * GET /placed-students
   * Fetch placed students (paginated)
   */
  getPlacedStudents(
    page = 1,
    limit = 4,
    companyName?: string,
    batch?: string,
  ): Observable<ApiResponsePlacedStudentsResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.PLACED_STUDENTS);
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (companyName) {
      params = params.set('companyName', companyName);
    }
    if (batch) {
      params = params.set('batch', batch);
    }
    return this.http.get<ApiResponsePlacedStudentsResponse>(url, { params });
  }

  /**
   * GET /student/career-checkin
   * Get career check-in by userId
   */
  getCareerCheckIn(studentId: string): Observable<ApiResponseCareerCheckInResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.CAREER_CHECKIN);
    const params = new HttpParams().set('studentId', studentId);
    return this.http.get<ApiResponseCareerCheckInResponse>(url, { params });
  }

  /**
   * POST /student/career-checkin
   * Create or update career check-in
   */
  createOrUpdateCareerCheckIn(
    studentId: string,
    request: CareerCheckInRequest,
  ): Observable<ApiResponseCareerCheckInResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.CAREER_CHECKIN);
    const params = new HttpParams().set('studentId', studentId);
    return this.http.post<ApiResponseCareerCheckInResponse>(url, request, { params });
  }

  /**
   * POST /students/{studentId}/ideas
   * Submit an idea for a student.
   */
  submitIdea(
    studentId: string,
    request: IdeaSubmissionRequest,
  ): Observable<IdeaSubmissionResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.IDEA_SUBMISSION, { studentId });
    const url = this.buildUrl(endpoint);
    return this.http.post<IdeaSubmissionResponse>(url, request);
  }

  /**
   * GET /students/{studentId}/ideas/template
   * Returns template download info (typically a URL or storage key).
   */
  getIdeaTemplateInfo(studentId: string): Observable<IdeaTemplateInfoResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.IDEA_TEMPLATE_INFO, { studentId });
    const url = this.buildUrl(endpoint);
    return this.http.get<IdeaTemplateInfoResponse>(url);
  }

  /**
   * GET /campuses
   * Get all registered campuses (approved and email-verified)
   * Used for populating institution dropdown in student registration and profile
   * Note: This endpoint does not require authentication
   * 
   * TEMPORARILY DISABLED: Using static data from STATIC_CAMPUSES constant instead
   */
  getRegisteredCampuses(): Observable<ApiResponseCampusResponse> {    
    // Return static data wrapped in Observable
    return new Observable<ApiResponseCampusResponse>((subscriber) => {
      subscriber.next({
        success: true,
        message: 'Campuses retrieved successfully',
        data: STATIC_CAMPUSES as unknown as CampusResponse[],
        statusCode: 200,
      });
      subscriber.complete();
    });
  }

  // ------------------------- get all notices -------------
  // ---------------- GET ALL NOTICES ----------------
getAllNotices(
  page: number,
  size: number,
  campusId: string,
  departmentId?: string,
  studentId?: string
): Observable<NoticeListResponse> {

  if (!campusId) {
    return throwError(() => new Error('Campus ID required'));
  }

  const endpoint = resolvePathParams(
    API_ENDPOINTS.CAMPUS.GET_ALL_NOTICES,
    { campusId }
  );

  const url = this.buildUrl(endpoint);

  let params = new HttpParams()
    .set('page', page)
    .set('size', size);

  if (departmentId) {
    params = params.set('departmentId', departmentId);
  }

  if (studentId) {
    params = params.set('studentId', studentId);
  }

  return this.http.get<NoticeListResponse>(url, { params });
}
// ----------------------------- get notice by id -----------------
// ---------------- GET NOTICE BY ID (STUDENT) ----------------
getNoticeById(
  noticeId: string,
  campusId: string,
  departmentId?: string
): Observable<NoticeDetailResponse | null> {

  if (!noticeId) {
    return throwError(() => new Error('Notice ID required'));
  }

  if (!campusId) {
    return throwError(() => new Error('Campus ID required'));
  }

  const endpoint = resolvePathParams(
    API_ENDPOINTS.CAMPUS.GET_NOTICE_BY_ID,
    {
      campusId,
      noticeId
    }
  );

  const url = this.buildUrl(endpoint);

  let params = new HttpParams();

  if (departmentId) {
    params = params.set('departmentId', departmentId);
  }

  return this.http.get<NoticeDetailResponse>(url, { params });
}



  private buildUrl(endpoint: string): string {
    if (!this.baseUrl) {
      return endpoint;
    }

    let url = this.baseUrl.trim();

    // If URL already has protocol, use it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return url + normalizedEndpoint;
    }

    // If URL is relative (starts with /), use it as is
    if (url.startsWith('/')) {
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return url + normalizedEndpoint;
    }

    // If URL looks like a domain/IP address (contains dots or colons), add http:// protocol
    // This handles cases like "13.234.201.92:8082/api/v1" or "example.com/api"
    if (url.includes('.') || (url.includes(':') && !url.startsWith(':'))) {
      url = `http://${url}`;
    }

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return url + normalizedEndpoint;
  }
}

export interface RegisterStudentOptions {
  userId?: string | number;
  userType?: 'ADMIN' | 'STUDENT' | 'CAMPUS' | 'COMPANY' | 'DEPARTMENT';
}

export interface StudentRegisterFiles {
  profilePhoto?: File | null;
  resume?: File | null;
  govtIdProof?: File | null;
  portfolio?: File | null;
}

export interface StudentRegisterPayload {
  request: StudentCompleteRegistrationRequest;
  files?: StudentRegisterFiles;
}

export interface StudentUpdateFiles {
  profilePhoto?: File | null;
  resume?: File | null;
  govtIdProof?: File | null;
  portfolio?: File | null;
}
export interface NoticeItem {
  id: string;
  noticeId?: string;
  campusId?: string;
  departmentId?: string;
  title?: string;
  message?: string;
  createdByType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoticeListResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    content: NoticeItem[];
    totalPages: number;
    totalElements?: number;
  };
}

export interface NoticeDetailResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: NoticeItem;
}

export interface StudentUpdatePayload {
  request: StudentUpdateRequest;
  files?: StudentUpdateFiles;
}

export interface BulkUploadRowResult {
  rowNumber?: number;
  success?: boolean;
  message?: string;
  error?: string;
  studentId?: string;
}

export interface BulkUploadResponse {
  totalRows?: number;
  successfulRows?: number;
  failedRows?: number;
  results?: BulkUploadRowResult[];
}

export interface ApiResponseBulkUploadResponse {
  success: boolean;
  message: string | null;
  data: BulkUploadResponse | null;
  error: string | null;
}

export interface IdeaSubmissionRequest {
  documentUrl: string;
  description: string;
}

export interface IdeaSubmissionResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: unknown;
  statusCode?: number;
  timestamp?: string;
}

export interface IdeaTemplateInfoResponse {
  success: boolean;
  message: string;
  data?: string;
  error?: unknown;
  statusCode?: number;
  timestamp?: string;
}



function resolvePathParams(endpoint: string, params: Record<string, string>): string {
  let out = endpoint;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}

// -------------------- get all notices 


function normalizeStudentRegisterPayload(
  data: StudentCompleteRegistrationRequest | StudentRegisterPayload,
): StudentRegisterPayload {
  if ('request' in data) {
    return data;
  }
  return { request: data };
}


function hasStudentRegisterFiles(files?: StudentRegisterFiles): boolean {
  if (!files) {
    return false;
  }
  return Boolean(files.profilePhoto || files.resume || files.govtIdProof || files.portfolio);
}


function buildStudentRegisterFormData(payload: StudentRegisterPayload): FormData {
  const formData = new FormData();
  formData.append('request', JSON.stringify(payload.request));
  const files = payload.files;
  if (!files) {
    return formData;
  }
  if (files.profilePhoto) {
    formData.append('profilePhoto', files.profilePhoto, files.profilePhoto.name);
  }
  if (files.resume) {
    formData.append('resume', files.resume, files.resume.name);
  }
  if (files.govtIdProof) {
    formData.append('govtIdProof', files.govtIdProof, files.govtIdProof.name);
  }
  if (files.portfolio) {
    formData.append('portfolio', files.portfolio, files.portfolio.name);
  }
  return formData;
}

function normalizeStudentUpdatePayload(
  data: StudentUpdateRequest | StudentUpdatePayload,
): StudentUpdatePayload {
  if (isStudentUpdatePayload(data)) {
    return data;
  }
  return { request: data };
}

function hasStudentUpdateFiles(files?: StudentUpdateFiles): boolean {
  if (!files) {
    return false;
  }
  return Boolean(files.profilePhoto || files.resume || files.govtIdProof || files.portfolio);
}

function buildStudentUpdateFormData(payload: StudentUpdatePayload): FormData {
  const formData = new FormData();
  formData.append('request', JSON.stringify(payload.request));
  const files = payload.files;
  if (!files) {
    return formData;
  }
  if (files.profilePhoto) {
    formData.append('profilePhoto', files.profilePhoto, files.profilePhoto.name);
  }
  if (files.resume) {
    formData.append('resume', files.resume, files.resume.name);
  }
  if (files.govtIdProof) {
    formData.append('govtIdProof', files.govtIdProof, files.govtIdProof.name);
  }
  if (files.portfolio) {
    formData.append('portfolio', files.portfolio, files.portfolio.name);
  }
  return formData;
}

function isStudentUpdatePayload(value: unknown): value is StudentUpdatePayload {
  return !!value && typeof value === 'object' && 'request' in value;
}


