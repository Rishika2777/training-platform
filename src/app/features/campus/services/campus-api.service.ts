import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType } from '../../../core/config/app.constants';

/**
 * Placeholder for campus API calls.
 * We'll map legacy `Synkup_FE/app/features/campus/services/*` here.
 */
@Injectable({ providedIn: 'root' })
export class CampusApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.CAMPUS_API_BASE_URL || this.config.API_BASE_URL;

  registerCampus(
    data: CampusRegisterRequest,
    options?: RegisterCampusOptions,
  ): Observable<CampusRegistrationResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.REGISTER);
    const headers = buildUserHeaders(options);

    // Swagger indicates X-User-Id header required; we send it when available.
    // Response can be wrapped or unwrapped depending on backend version.
    return this.http
      .post<unknown>(url, data, { headers })
      .pipe(map(extractCampusRegistrationResponse));
  }

  /**
   * GET /campus/getAll
   * Public endpoint (no auth required).
   */
  getAllCampuses(): Observable<readonly Campus[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL);
    return this.http.get<unknown>(url).pipe(map(extractCampusList));
  }

  /**
   * GET /campus/{campusId}
   * Public endpoint (no auth required).
   */
  getCampusById(campusId: string): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.BY_ID, { campusId });
    return this.http.get<unknown>(url).pipe(map((raw) => unwrapApiResponse<Campus>(raw)));
  }

  /**
   * PUT /campus/{campusId}/approval (Admin)
   */
  updateCampusApprovalStatus(
    campusId: string,
    request: UpdateCampusApprovalStatusRequest,
  ): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.APPROVAL, { campusId });
    return this.http
      .put<unknown>(url, request)
      .pipe(map((raw) => unwrapApiResponse<Campus>(raw)));
  }

  /**
   * DELETE /campus/admin/{campusId} (Admin)
   * Deletes campus by campusId.
   */
  deleteCampusByAdmin(campusId: string): Observable<void> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE, { campusId });
    return this.http.delete<unknown>(url).pipe(map(() => void 0));
  }

  /**
   * POST /dashboard/students/placed
   * Add a placed student.
   */
  addPlacedStudent(request: AddPlacedStudentRequest): Observable<AddPlacedStudentResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT);
    console.log('CampusApiService.addPlacedStudent called');
    console.log('Request URL:', url);
    console.log('Request body:', { ...request, photo: request.photo ? `[base64, length: ${request.photo.length}]` : '' });
    
    return this.http.post<unknown>(url, request).pipe(
      map((raw) => {
        console.log('API Service - Raw response received:', raw);
        // The API returns the full response object with success, message, data, error
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddPlacedStudentResponse;
        }
        console.warn('API Service - Response does not have expected structure');
        return null;
      })
    );
  }

  /**
   * POST /dashboard/companies/visited
   * Add a company visited.
   */
  addCompanyVisited(request: AddCompanyVisitedRequest): Observable<AddCompanyVisitedResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COMPANY_VISITED);
    return this.http.post<unknown>(url, request).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddCompanyVisitedResponse;
        }
        return null;
      })
    );
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const resolved = resolvePathParams(endpoint, params);

    if (!this.baseUrl) {
      return resolved;
    }

    let url = this.baseUrl.trim();

    // If URL already has protocol, use it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const normalizedEndpoint = resolved.startsWith('/') ? resolved : `/${resolved}`;
      return url + normalizedEndpoint;
    }

    // If URL is relative (starts with /), use it as is
    if (url.startsWith('/')) {
      const normalizedEndpoint = resolved.startsWith('/') ? resolved : `/${resolved}`;
      return url + normalizedEndpoint;
    }

    // If URL looks like a domain/IP address (contains dots or colons), add http:// protocol
    if (url.includes('.') || (url.includes(':') && !url.startsWith(':'))) {
      url = `http://${url}`;
    }

    const normalizedEndpoint = resolved.startsWith('/') ? resolved : `/${resolved}`;
    return url + normalizedEndpoint;
  }
}

export interface CampusRegisterRequest {
  campusName: string;
  campusLogoUrl: string;
  campusRank: number;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminDepartment: string;
  adminDesignation: string;
  websiteUrl: string;
  aboutCampus: string;
  campusAddress: string;
}

export interface RegisterCampusOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface CampusRegistrationResponse {
  campusId?: string;
  userId?: string;
  campusName?: string;
  campusLogoUrl?: string;
  campusRank?: number;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDepartment?: string;
  adminDesignation?: string;
  websiteUrl?: string;
  aboutCampus?: string;
  campusAddress?: string;
  approvalStatus?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateCampusApprovalStatusRequest {
  approvalStatus: EnumLoginStatus;
}

export interface Campus {
  id?: string;
  campusId?: string;
  userId?: string;
  email?: string;
  campusName?: string;
  photoUrl?: string;
  campusRank?: number;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDepartment?: string;
  adminDesignation?: string;
  campusWebsiteUrl?: string;
  otherWebsiteUrl?: string;
  aboutCampus?: string;
  campusAddress?: string;
  campusTagline?: string;
  researchInfo?: string;
  approvalStatus?: string;
  rejectionComment?: string;
  approvedBy?: string;
  approvalDate?: string;
  createdAt?: string;
  updatedAt?: string;
  public?: boolean;
  verifiedPhoneNo?: boolean;
}

export interface AddPlacedStudentRequest {
  studentName: string;
  photo: string;
  courseId: string;
  batch: string;
  placementCompanyId: string;
  designation: string;
  sector: string;
}

export interface AddPlacedStudentResponseData {
  id?: string;
  userId?: string;
  campusId?: string;
  courseId?: string;
  studentName?: string;
  photoUrl?: string;
  batch?: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
  placementCompanyId?: string;
  placementDate?: string;
  designation?: string;
  sector?: string;
  createdAt?: string;
  updatedAt?: string;
  placed?: boolean;
}

export interface AddPlacedStudentResponse {
  success: boolean;
  message: string;
  data: AddPlacedStudentResponseData;
  error: string;
}

export interface AddCompanyVisitedRequest {
  companyLogo: string; // base64 encoded image
  companyName: string;
}

export interface AddCompanyVisitedResponseData {
  id?: string;
  campusId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCompanyVisitedResponse {
  success: boolean;
  message: string;
  data: AddCompanyVisitedResponseData;
  error: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

function buildUserHeaders(options?: RegisterCampusOptions): HttpHeaders {
  let headers = new HttpHeaders();
  if (!options) {
    return headers;
  }
  if (options.userId !== undefined) {
    headers = headers.set('X-User-Id', String(options.userId));
  }
  if (options.userType) {
    headers = headers.set('X-User-Type', String(options.userType));
  }
  return headers;
}

function unwrapApiResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const maybe = raw as ApiResponse<T>;
  // Prefer wrapped .data, but allow direct object response too.
  if ('data' in maybe) {
    return (maybe.data ?? null) as T | null;
  }
  return raw as T;
}

function extractCampusRegistrationResponse(raw: unknown): CampusRegistrationResponse | null {
  const wrapped = unwrapApiResponse<unknown>(raw);
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as CampusRegistrationResponse;
}

function extractCampusList(raw: unknown): readonly Campus[] {
  const wrapped = unwrapApiResponse<unknown>(raw);
  if (Array.isArray(wrapped)) {
    return wrapped as Campus[];
  }
  if (Array.isArray(raw)) {
    return raw as Campus[];
  }
  return [];
}

function resolvePathParams(endpoint: string, params?: Record<string, string>): string {
  if (!params) {
    return endpoint;
  }
  let out = endpoint;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}


