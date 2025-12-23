import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, UserType } from '../../../core/config/app.constants';

/**
 * Placeholder for company API calls.
 * We'll map legacy `Synkup_FE/app/features/company/services/*` here.
 */
@Injectable({ providedIn: 'root' })
export class CompanyApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.COMPANY_API_BASE_URL || this.config.API_BASE_URL;

  registerCompany(
    data: CompanyRegisterRequest,
    options?: RegisterCompanyOptions,
  ): Observable<CompanyRegisterResult> {
    const url = this.baseUrl + API_ENDPOINTS.COMPANY.REGISTER;
    const params = buildParams(options);

    return this.http.post<unknown>(url, data, { params }).pipe(map(extractCompanyRegisterResult));
  }
}

export interface CompanyRegisterRequest {
  companyName: string;
  website?: string;
  description?: string;
}

export interface RegisterCompanyOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface CompanyRegisterResult {
  companyId: string | null;
  raw: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

function buildParams(options?: RegisterCompanyOptions): HttpParams {
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

function extractCompanyRegisterResult(raw: unknown): CompanyRegisterResult {
  // Legacy backend may return { companyId }, { id }, or { data: { companyId } }.
  const directCompanyId = readStringProp(raw, 'companyId') ?? readStringProp(raw, 'id');
  const wrapped = unwrapResponse<unknown>(raw);
  const wrappedCompanyId = readStringProp(wrapped, 'companyId') ?? readStringProp(wrapped, 'id');

  return {
    companyId: directCompanyId ?? wrappedCompanyId,
    raw,
  };
}


