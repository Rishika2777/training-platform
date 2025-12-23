import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, UserType } from '../../../core/config/app.constants';

/**
 * Student API (ported from legacy `Synkup_FE/app/features/student/services/student.service.js`).
 */
@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.STUDENT_API_BASE_URL || this.config.API_BASE_URL;

  registerStudent(
    data: StudentRegisterRequest,
    options?: RegisterStudentOptions,
  ): Observable<StudentRegisterResult> {
    const url = this.baseUrl + API_ENDPOINTS.STUDENT.REGISTER;
    const params = buildParams(options);

    return this.http.post<unknown>(url, data, { params }).pipe(map(extractStudentRegisterResult));
  }
}

export interface StudentRegisterRequest {
  fullName: string;
  email: string;
  about?: string;
}

export interface RegisterStudentOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface StudentRegisterResult {
  studentId: string | null;
  raw: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

function buildParams(options?: RegisterStudentOptions): HttpParams {
  if (!options || (!options.userId && !options.userType)) {
    return new HttpParams();
  }
  let params = new HttpParams();
  if (options.userId !== undefined) {
    params = params.set('userId', String(options.userId));
  }
  if (options.userType) {
    params = params.set('userType', String(options.userType));
  }
  return params;
}

function unwrapResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const maybe = raw as ApiResponse<T>;
  return maybe.data ?? null;
}

function readStringProp(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const value = rec[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function extractStudentRegisterResult(raw: unknown): StudentRegisterResult {
  // Legacy backend may return { studentId }, { id }, or { data: { studentId } }.
  const directStudentId = readStringProp(raw, 'studentId') ?? readStringProp(raw, 'id');
  const wrapped = unwrapResponse<unknown>(raw);
  const wrappedStudentId = readStringProp(wrapped, 'studentId') ?? readStringProp(wrapped, 'id');

  return {
    studentId: directStudentId ?? wrappedStudentId,
    raw,
  };
}


