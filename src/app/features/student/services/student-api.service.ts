import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN } from '../../../core/config/app.constants';
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
} from '../models/student.models';

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
    data: StudentCompleteRegistrationRequest,
  ): Observable<ApiResponseStudentRegistrationResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.REGISTER);
    return this.http.post<ApiResponseStudentRegistrationResponse>(url, data);
  }

  getAllStudents(requesterUserType: 'ADMIN'): Observable<ApiResponseListStudentProfileResponse> {
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.ALL_STUDENTS);
    const params = new HttpParams().set('requesterUserType', requesterUserType);
    return this.http.get<ApiResponseListStudentProfileResponse>(url, {
      params,
      withCredentials: false,
    });
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
    request: StudentUpdateRequest,
  ): Observable<ApiResponseStudentProfileResponse> {
    const url = this.buildUrl(resolvePathParams(API_ENDPOINTS.STUDENT.UPDATE_FULL_PROFILE, { studentId }));
    const params = new HttpParams().set('userId', studentIdForQuery);
    return this.http.patch<ApiResponseStudentProfileResponse>(url, request, { params });
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
   */
  getAlumniForStudent(
    studentId: string,
    yearOfPassing: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponsePageAlumniResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.ALUMNI, { studentId });
    const url = this.buildUrl(endpoint);
    const params = new HttpParams()
      .set('yearOfPassing', yearOfPassing)
      .set('page', page.toString())
      .set('limit', limit.toString());
    console.log('StudentApiService: getAlumniForStudent - URL:', url, 'Params:', params.toString());
    return this.http.get<ApiResponsePageAlumniResponse>(url, { params });
  }

  /**
   * GET /batchmates/{studentId}/batchmates
   * Get batchmates (same batch and section)
   */
  getBatchmates(
    studentId: string,
    page = 1,
    limit = 12,
  ): Observable<ApiResponseBatchmateResponse> {
    const endpoint = resolvePathParams(API_ENDPOINTS.STUDENT.BATCHMATES, { studentId });
    const url = this.buildUrl(endpoint);
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    console.log('StudentApiService: getBatchmates - URL:', url, 'Params:', params.toString());
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
    console.log('StudentApiService: getPlacedStudents - URL:', url, 'Params:', params.toString());
    return this.http.get<ApiResponsePlacedStudentsResponse>(url, { params });
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

function resolvePathParams(endpoint: string, params: Record<string, string>): string {
  let out = endpoint;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}


