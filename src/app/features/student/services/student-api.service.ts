import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN } from '../../../core/config/app.constants';
import {
  ApiResponseListStudentProfileResponse,
  ApiResponseStudentRegistrationResponse,
  StudentCompleteRegistrationRequest,
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


