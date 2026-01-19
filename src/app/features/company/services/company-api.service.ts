import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType } from '../../../core/config/app.constants';

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
  ): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.REGISTER);
    const headers = buildUserHeaders(options);

    // Swagger-style backends often require X-User-Id for registration routes.
    return this.http.post<unknown>(url, data, { headers }).pipe(map(extractCompanyRegistrationResponse));
  }

  /**
   * GET /company/company/all (Admin)
   * Swagger: requires `userType=ADMIN` query param.
   */
  getAllCompanies(requesterUserType: 'ADMIN'): Observable<readonly CompanyRegistrationResponse[]> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.GET_ALL);
    const params = new HttpParams().set('userType', requesterUserType);

    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const data = unwrapResponse<unknown>(raw);
        return Array.isArray(data) ? (data as CompanyRegistrationResponse[]) : [];
      }),
    );
  }

  /**
   * GET /company/{companyId}
   */
  getCompanyById(companyId: string): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.BY_ID, { companyId }));
    return this.http.get<unknown>(url).pipe(map(extractCompanyRegistrationResponse));
  }

  /**
   * PUT /company/{companyId}/update
   * Updates company profile.
   * Swagger: requires userId query parameter for ownership verification.
   */
  updateCompany(
    companyId: string,
    userId: string,
    request: CompanyRegisterRequest,
  ): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.UPDATE, { companyId }));
    const params = new HttpParams().set('userId', userId);
    return this.http.patch<unknown>(url, request, { params }).pipe(map(extractCompanyRegistrationResponse));
  }

  /**
   * PATCH /company/{companyId}/approvalStatus/update (Admin)
   * Swagger: requires `requesterUserType=ADMIN` query param.
   */
  updateCompanyApprovalStatus(
    companyId: string,
    requesterUserType: 'ADMIN',
    request: UpdateApprovalStatusRequest,
  ): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(
      this.baseUrl,
      resolvePathParams(API_ENDPOINTS.COMPANY.UPDATE_APPROVAL_STATUS, { companyId }),
    );
    const params = new HttpParams().set('requesterUserType', requesterUserType);
    return this.http.patch<unknown>(url, request, { params }).pipe(map(extractCompanyRegistrationResponse));
  }

  /**
   * DELETE /company/delete/{companyId}
   * Deletes company profile by companyId.
   */
  deleteCompany(companyId: string): Observable<void> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.DELETE, { companyId }));
    return this.http.delete<unknown>(url).pipe(map(() => void 0));
  }

  /**
   * GET /company/getCompanyBySearch
   * Autosearch companies by name (partial, case-insensitive).
   */
  getCompanyBySearch(
    searchTerm?: string,
    page = 0,
    size = 20,
  ): Observable<CompanyAutoSearchResponse | null> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.GET_COMPANY_BY_SEARCH);
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (searchTerm && searchTerm.trim()) {
      params = params.set('searchTerm', searchTerm.trim());
    }
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          const resp = raw as CompanyAutoSearchResponse;
          return resp;
        }
        return null;
      })
    );
  }

  /**
   * GET /company/{companyId}/preferred-campuses
   * Gets preferred campuses for a company.
   */
  getPreferredCampuses(companyId: string): Observable<readonly PreferredCampusResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_PREFERRED_CAMPUSES, { companyId }));
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const data = unwrapResponse<PreferredCampusResponse[]>(raw);
        return Array.isArray(data) ? data : [];
      }),
    );
  }

  /**
   * GET /company/{companyId}/clients
   * Gets clients for a company with pagination.
   */
  getClients(companyId: string, page = 0, size = 10): Observable<readonly ClientResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_CLIENTS, { companyId }));
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const data = unwrapResponse<ClientResponse[]>(raw);
        return Array.isArray(data) ? data : [];
      }),
    );
  }

  /**
   * POST /company/{companyId}/clients
   * Adds a client for a company.
   */
  addClient(companyId: string, request: ClientRequest): Observable<ClientResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_CLIENT, { companyId }));
    return this.http.post<unknown>(url, request).pipe(map(extractClientResponse));
  }

  /**
   * POST /preferred-campus/{companyId}/addCampus
   * Adds a preferred campus for a company.
   */
  addPreferredCampus(companyId: string, request: PreferredCampusRequest): Observable<PreferredCampusResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_PREFERRED_CAMPUS, { companyId }));
    return this.http.post<unknown>(url, request).pipe(map(extractPreferredCampusResponse));
  }

  /**
   * GET /specializations/{companyId}/technologies
   * Gets specializations/technologies for a company.
   */
  getSpecializations(companyId: string): Observable<readonly SpecializationResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_SPECIALIZATIONS, { companyId }));
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const data = unwrapResponse<SpecializationResponse[]>(raw);
        return Array.isArray(data) ? data : [];
      }),
    );
  }

  /**
   * POST /specializations/{companyId}/technologies/{technologyId}
   * Adds a specialization/technology for a company.
   */
  addSpecialization(companyId: string, technologyId: string): Observable<SpecializationResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_SPECIALIZATION, { companyId, technologyId }));
    return this.http.post<unknown>(url, {}).pipe(map(extractSpecializationResponse));
  }

  /**
   * GET /company-landing/{companyId}/key-people
   * Gets key people for a company.
   * @param companyId - The company ID
   * @param page - Page number (0-indexed, default: 0)
   * @param size - Page size (default: 10)
   */
  getKeyPeople(companyId: string, page = 0, size = 10): Observable<readonly KeyPersonResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_KEY_PEOPLE, { companyId }));
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const data = unwrapResponse<KeyPersonResponse[]>(raw);
        return Array.isArray(data) ? data : [];
      }),
    );
  }
}

export interface CompanyRegisterRequest {
  companyName: string;
  companyLogoUrl?: string;
  adminName: string;
  adminDesignation: string;
  adminEmail: string;
  adminPhone: string;
  websiteUrl: string;
  otherWebsiteUrl: string;
  registerNumber: string;
  keyPeople?: readonly KeyPersonRequest[];
  aboutCompany: string;
  companyAddress: string;
}

export interface RegisterCompanyOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface CompanyRegistrationResponse {
  companyId?: string;
  email?: string;
  userId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  adminName?: string;
  adminDesignation?: string;
  adminEmail?: string;
  adminPhone?: string;
  websiteUrl?: string;
  otherWebsiteUrl?: string;
  registerNumber?: string;
  keyPeople?: readonly KeyPersonResponse[];
  aboutCompany?: string;
  companyAddress?: string;
  approvalStatus?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateApprovalStatusRequest {
  approvalStatus: EnumLoginStatus;
}

export interface KeyPersonRequest {
  name: string;
  photoUrl?: string;
  designation: string;
}

export interface KeyPersonResponse {
  keyPersonId?: string;
  name?: string;
  photoUrl?: string;
  designation?: string;
}

export interface PreferredCampusRequest {
  campusName: string;
  campusLogoUrl?: string;
}

export interface PreferredCampusResponse {
  preferredCampusId?: string;
  campusId?: string;
  campusName?: string;
  campusLogoUrl?: string;
}

export interface CompanyAutoSearchItem {
  companyId?: string;
  companyName?: string;
  companyAddress?: string;
}

export interface CompanyAutoSearchResponse {
  success?: boolean;
  message?: string | null;
  data?: {
    content?: CompanyAutoSearchItem[];
    totalPages?: number;
    totalElements?: number;
    page?: number;
    size?: number;
  };
  error?: string | null;
}

export interface ClientRequest {
  clientName: string;
  clientLogoUrl?: string;
}

export interface ClientResponse {
  clientId?: string;
  clientName?: string;
  clientLogoUrl?: string;
}

export interface SpecializationRequest {
  technologyId: string;
}

export interface SpecializationResponse {
  specializationId?: string;
  companyId?: string;
  technologyId?: string;
  technologyName?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

function unwrapResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const maybe = raw as ApiResponse<T>;
  return maybe.data ?? null;
}

function extractCompanyRegistrationResponse(raw: unknown): CompanyRegistrationResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as CompanyRegistrationResponse;
}

function extractPreferredCampusResponse(raw: unknown): PreferredCampusResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as PreferredCampusResponse;
}

function extractClientResponse(raw: unknown): ClientResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as ClientResponse;
}

function extractSpecializationResponse(raw: unknown): SpecializationResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as SpecializationResponse;
}

function buildUserHeaders(options?: RegisterCompanyOptions): HttpHeaders {
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

function buildUrl(baseUrl: string, endpoint: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return endpoint;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }
  if (trimmed.startsWith('/')) {
    return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }
  if (trimmed.includes('.') || (trimmed.includes(':') && !trimmed.startsWith(':'))) {
    return `http://${trimmed}` + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }
  return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
}

function resolvePathParams(endpoint: string, params: Record<string, string>): string {
  let out = endpoint;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}


