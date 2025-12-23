import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, UserType } from '../../../core/config/app.constants';

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
  ): Observable<CampusRegisterResult> {
    const url = this.baseUrl + API_ENDPOINTS.CAMPUS.REGISTER;
    const params = buildParams(options);

    return this.http.post<unknown>(url, data, { params }).pipe(map(extractCampusRegisterResult));
  }
}

export interface CampusRegisterRequest {
  campusName: string;
  campusLogoUrl?: string;
  rank?: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDept?: string;
  adminDesignation?: string;
  website?: string;
  about?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface RegisterCampusOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface CampusRegisterResult {
  campusId: string | null;
  raw: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

function buildParams(options?: RegisterCampusOptions): HttpParams {
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

function extractCampusRegisterResult(raw: unknown): CampusRegisterResult {
  // Legacy backend may return { campusId }, { id }, or { data: { campusId } }.
  const directCampusId = readStringProp(raw, 'campusId') ?? readStringProp(raw, 'id');
  const wrapped = unwrapResponse<unknown>(raw);
  const wrappedCampusId = readStringProp(wrapped, 'campusId') ?? readStringProp(wrapped, 'id');

  return {
    campusId: directCampusId ?? wrappedCampusId,
    raw,
  };
}


