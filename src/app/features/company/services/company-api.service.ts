import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, catchError, of, throwError } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType } from '../../../core/config/app.constants';
import { unwrapApiResponse as unwrapApiResponseCore } from '../../../core/api/api-response.utils';
import {
  CampusItem,
  CampusSearchItem,
  CampusSearchResponse,
  FollowerCountResponse,
  PromotionsCountResponse,
  GetCampusesResponse,
} from '../models/company.models';

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
    data: CompanyRegisterRequest | CompanyRegisterPayload,
    options?: RegisterCompanyOptions,
  ): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.REGISTER);
    const headers = buildUserHeaders(options);
    const payload = normalizeRegisterPayload(data);

    // Add userType query parameter if provided (component will pass 'ADMIN' when needed)
    let params = new HttpParams();
    if (options?.userType) {
      params = params.set('userType', options.userType);
    }

    // Swagger-style backends often require X-User-Id for registration routes.
    if (hasRegisterFiles(payload.files)) {
      const formData = buildRegisterCompanyFormData(payload);
      const uploadHeaders = headers.set('Accept', 'application/json');
      return this.http.post<unknown>(url, formData, { headers: uploadHeaders, params }).pipe(
        map(extractCompanyRegistrationResponse),
      );
    }

    return this.http.post<unknown>(url, payload.request, { headers, params }).pipe(
      map(extractCompanyRegistrationResponse),
    );
  }

  /**
   * POST /company/bulk-upload
   * Bulk upload companies from Excel file (Admin only).
   * Uploads multiple company registrations from an Excel file (.xlsx).
   * Requires userType=ADMIN query parameter.
   */
  bulkUploadCompanies(file: File): Observable<BulkUploadResponse | null> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.BULK_UPLOAD);
    
    // Create FormData for multipart/form-data
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Add required userType query parameter
    const params = new HttpParams().set('userType', 'ADMIN');
    
    // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    
    return this.http.post<unknown>(url, formData, { headers, params }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        
        const responseObj = raw as Record<string, unknown>;
        
        // Check if response is wrapped in ApiResponse
        if ('success' in responseObj && 'message' in responseObj && 'data' in responseObj) {
          const apiResponse = responseObj as unknown as ApiResponseBulkUploadResponse;
          return apiResponse.data || null;
        }
        
        // If response is directly BulkUploadResponse
        if ('totalRows' in responseObj || 'successfulRows' in responseObj || 'failedRows' in responseObj) {
          return raw as BulkUploadResponse;
        }
        
        console.warn('CompanyApiService: bulkUploadCompanies - Invalid response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CompanyApiService: bulkUploadCompanies - Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /company/company/all (Admin)
   * Swagger: requires `userType=ADMIN` query param.
   * Optional approvalStatus filters server-side.
   */
  getAllCompanies(
    requesterUserType: 'ADMIN',
    approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  ): Observable<readonly CompanyRegistrationResponse[]> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.GET_ALL);
    let params = new HttpParams().set('userType', requesterUserType);
    if (approvalStatus) {
      params = params.set('approvalStatus', approvalStatus);
    }

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
    request: CompanyRegisterRequest | CompanyRegisterPayload,
  ): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.UPDATE, { companyId }));
    const params = new HttpParams().set('userId', userId);
    const payload = normalizeRegisterPayload(request);

    if (hasRegisterFiles(payload.files)) {
      const formData = buildRegisterCompanyFormData(payload);
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.patch<unknown>(url, formData, { params, headers }).pipe(
        map(extractCompanyRegistrationResponse),
      );
    }

    return this.http.patch<unknown>(url, payload.request, { params }).pipe(
      map(extractCompanyRegistrationResponse),
    );
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
  
    return this.http.patch<unknown>(url, request, { params }).pipe(
      tap((raw) => {
        console.log('RAW approval response from backend:', raw);
      }),
      map(extractCompanyRegistrationResponse),
    );
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
   * GET /preferred-campus/{companyId}/campuses
   * Gets preferred campuses for a company.
   */
 getPreferredCampuses(companyId: string): Observable<readonly PreferredCampusResponse[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.GET_PREFERRED_CAMPUSES, { companyId })
  );

  return this.http.get<unknown>(url).pipe(
    map((raw) => {
      const unwrapped = unwrapResponse<
        PreferredCampusResponse[] | { content?: PreferredCampusResponse[] }
      >(raw);

      // Case 1: direct array
      if (Array.isArray(unwrapped)) {
        return unwrapped;
      }

      // Case 2: paginated response
      if (unwrapped?.content && Array.isArray(unwrapped.content)) {
        return unwrapped.content;
      }

      return [];
    })
  );
}



  /**
   * GET /clients/{companyId}/clients
   * Gets clients for a company with pagination.
   * Query parameters: page (default: 0), size (default: 10)
   */
  getClients(companyId: string, page = 0, size = 10): Observable<readonly ClientResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_CLIENTS, { companyId }));
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    console.log('CompanyApiService: getClients called', { url, companyId, page, size });
    return this.http.get<unknown>(url, { params }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP GET request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP GET request failed', error),
        complete: () => console.log('CompanyApiService: HTTP GET request completed')
      }),
      map((raw) => {
        const data = unwrapResponse<ClientResponse[]>(raw);
        console.log('CompanyApiService: Received clients data', data);
        return Array.isArray(data) ? data : [];
      }),
    );
  }

  /**
   * POST /clients/{companyId}/clients
   * Adds a client for a company.
   * Request body: { clientName, photoUrl }
   */
  addClient(
    companyId: string,
    request: ClientRequestInput | ClientUploadPayloadInput,
  ): Observable<ClientResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_CLIENT, { companyId }));
    const payload = normalizeClientPayload(request);
    console.log('CompanyApiService: addClient called', { url, companyId, request: payload.request });

    if (hasClientFiles(payload.files)) {
      const formData = buildClientFormData(payload);
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.post<unknown>(url, formData, { headers }).pipe(
        tap({
          next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
          error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
          complete: () => console.log('CompanyApiService: HTTP POST request completed')
        }),
        map((response) => {
          console.log('CompanyApiService: Received response for addClient', response);
          return extractClientResponse(response);
        })
      );
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    console.log('CompanyApiService: Sending JSON request', payload.request);
    return this.http.post<unknown>(url, payload.request, { headers }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
        complete: () => console.log('CompanyApiService: HTTP POST request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for addClient', response);
        return extractClientResponse(response);
      })
    );
  }

  /**
   * POST /preferred-campus/{companyId}/addCampus
   * Adds a preferred campus for a company.
   * Request body: { campusId, campusName, campusLogoUrl } or multipart with campusLogo
   */
  addPreferredCampus(
    companyId: string,
    request: PreferredCampusRequest | PreferredCampusUploadPayload
  ): Observable<PreferredCampusResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_PREFERRED_CAMPUS, { companyId }));
    const payload = normalizePreferredCampusPayload(request);
    console.log('CompanyApiService: addPreferredCampus called', { url, companyId, request: payload.request });

    if (hasPreferredCampusFiles(payload.files)) {
      const formData = buildPreferredCampusFormData(payload);
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.post<unknown>(url, formData, { headers }).pipe(
        tap({
          next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
          error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
          complete: () => console.log('CompanyApiService: HTTP POST request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for addPreferredCampus', response);
        return extractPreferredCampusResponse(response);
      })
    );
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    console.log('CompanyApiService: Sending JSON request', payload.request);
    return this.http.post<unknown>(url, payload.request, { headers }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
        complete: () => console.log('CompanyApiService: HTTP POST request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for addPreferredCampus', response);
        return extractPreferredCampusResponse(response);
      })
    );
  }

  /**
   * GET /specializations/{companyId}/technologies
   * Gets specializations/technologies for a company.
   */
  getSpecializations(companyId: string): Observable<readonly TechnologyResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_SPECIALIZATIONS, { companyId }));
    console.log('CompanyApiService: getSpecializations called', { url, companyId });
    return this.http.get<unknown>(url).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP GET request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP GET request failed', error),
        complete: () => console.log('CompanyApiService: HTTP GET request completed')
      }),
      map((raw) => {
        console.log('CompanyApiService: Received response for getSpecializations', raw);
        // Extract array from response
        const data = unwrapResponse<TechnologyResponse[]>(raw);
        if (Array.isArray(data)) {
          return data;
        }
        // If unwrapResponse returned null, try raw response directly
        if (raw && typeof raw === 'object') {
          const rawObj = raw as Record<string, unknown>;
          if (Array.isArray(rawObj['data'])) {
            const dataArray = rawObj['data'] as unknown[];
            return dataArray.map((item) => extractTechnologyResponse(item) || item as TechnologyResponse).filter((item): item is TechnologyResponse => item !== null);
          }
        }
        return [];
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
   * DELETE /specializations/{companyId}/technologies/{technologyId}
   * Deletes a technology by technology ID for a company.
   */
  deleteTechnology(companyId: string, technologyId: string): Observable<boolean> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.DELETE_TECHNOLOGY, { companyId, technologyId }));
    console.log('CompanyApiService: deleteTechnology called', { url, companyId, technologyId });
    
    return this.http.delete<unknown>(url).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP DELETE request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP DELETE request failed', error),
        complete: () => console.log('CompanyApiService: HTTP DELETE request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for deleteTechnology', response);
        // Check if response indicates success
        if (response && typeof response === 'object') {
          const resp = response as { success?: boolean; data?: string; message?: string };
          return resp.success === true || resp.data === 'Technology deleted successfully';
        }
        return true; // Assume success if we get a response
      }),
      catchError((error) => {
        console.error('CompanyApiService: Error deleting technology:', error);
        return of(false);
      })
    );
  }

  /**
   * POST /specializations/{companyId}/technology
   * Adds a new technology for a company with name, description, and icon.
   */
 addTechnology(companyId: string, request: TechnologyRequest, iconFile?: File): Observable<TechnologyResponse | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.ADD_TECHNOLOGY, { companyId })
  );

  const formData = new FormData();
  formData.append('request', JSON.stringify(request));

  if (iconFile) {
    formData.append('iconFile', iconFile, iconFile.name);
  }

  return this.http.post<unknown>(url, formData).pipe(
    map((response) => extractTechnologyResponse(response))
  );
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

  /**
   * GET /company-landing/{companyId}/target-campuses
   * Gets target campuses for a company.
   * @param companyId - The company ID
   * @param page - Page number (0-indexed, default: 0)
   * @param size - Page size (default: 10)
   */
  getTargetCampuses(companyId: string, page = 0, size = 10): Observable<readonly TargetCampusResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_TARGET_CAMPUSES, { companyId }));
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const data = unwrapResponse<TargetCampusResponse[]>(raw);
        return Array.isArray(data) ? data : [];
      }),
    );
  }

  /**
   * POST /vacancy?companyId={companyId}
   * Creates a new vacancy for a company.
   * Request body: VacancyRequest
   */
  addVacancy(companyId: string, request: VacancyRequest): Observable<VacancyResponse | null> {
    const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.ADD_VACANCY);
    const params = new HttpParams().set('companyId', companyId);
    
    console.log('CompanyApiService: addVacancy called', { url, companyId, request });
    
    // Set headers for JSON request
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    console.log('CompanyApiService: Sending JSON request', request);
    console.log('CompanyApiService: interviewMode in request:', request.interviewMode);
    console.log('CompanyApiService: Full request JSON:', JSON.stringify(request, null, 2));
    
    return this.http.post<unknown>(url, request, { headers, params }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
        complete: () => console.log('CompanyApiService: HTTP POST request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for addVacancy', response);
        return extractVacancyResponse(response);
      })
    );
  }

  /**
   * GET /vacancy/company/{companyId}?page={page}&size={size}
   * Gets all vacancies for a company with pagination.
   * Query parameters: page (default: 0), size (default: 10)
   */
  getVacancies(companyId: string, page = 0, size = 10): Observable<readonly VacancyResponse[]> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.GET_VACANCIES, { companyId }));
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    console.log('CompanyApiService: getVacancies called', { url, companyId, page, size });
    return this.http.get<unknown>(url, { params }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP GET request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP GET request failed', error),
        complete: () => console.log('CompanyApiService: HTTP GET request completed')
      }),
      map((raw) => {
        console.log('CompanyApiService: Received response for getVacancies', raw);
        // Extract array from response
        const data = unwrapResponse<VacancyResponse[]>(raw);
        if (Array.isArray(data)) {
          // Normalize the response to handle capital letter fields
          return data.map(normalizeVacancyResponse);
        }
        // If unwrapResponse returned null, try raw response directly
        if (raw && typeof raw === 'object') {
          const rawObj = raw as Record<string, unknown>;
          if (Array.isArray(rawObj['data'])) {
            const dataArray = rawObj['data'] as unknown[];
            return dataArray.map((item) => normalizeVacancyResponse(extractVacancyResponse(item) || item as VacancyResponse));
          }
        }
        return [];
      }),
    );
  }

 // ------------------ DELETE VACANCY ------------

deleteVacancy(companyId: string, vacancyId: string): Observable<boolean> {
  const path = API_ENDPOINTS.COMPANY.DELETE_VACANCY.replace(':vacancyId', vacancyId);
  const url = buildUrl(this.baseUrl, path);

  return this.http.delete<unknown>(url, {
    params: new HttpParams().set('companyId', companyId),
  }).pipe(
    map(() => true),
    catchError((error) => {
      console.error('CompanyApiService: deleteVacancy error', error);
      return of(false);
    })
  );
}

  /**
   * POST /apply/vacancy/{vacancyId}?companyId={companyId}&studentId={studentId}
   * Apply to a vacancy. No request body required.
   * Path parameter: vacancyId
   * Query parameters: companyId, studentId
   */
  applyVacancy(vacancyId: string, companyId: string, studentId: string): Observable<{ success: boolean; message: string; statusCode: number; timestamp: string } | null> {
    const path = resolvePathParams(API_ENDPOINTS.COMPANY.APPLY_VACANCY, { vacancyId });
    const url = buildUrl(this.baseUrl, path);
    
    const params = new HttpParams()
      .set('companyId', companyId)
      .set('studentId', studentId);
    
    const headers = new HttpHeaders({
      'Accept': '*/*',
      'Content-Type': 'application/json'
    });
    
    // POST with empty body as per API spec
    return this.http.post<unknown>(url, {}, { headers, params }).pipe(
      map((response) => {
        if (!response || typeof response !== 'object') {
          return null;
        }
        
        const responseObj = response as Record<string, unknown>;
        
        // Check if response matches expected format
        if ('success' in responseObj && 'message' in responseObj && 'statusCode' in responseObj) {
          return {
            success: responseObj['success'] as boolean,
            message: responseObj['message'] as string,
            statusCode: responseObj['statusCode'] as number,
            timestamp: responseObj['timestamp'] as string
          };
        }
        
        // Try unwrapResponse pattern
        const unwrapped = unwrapResponse<{ success: boolean; message: string; statusCode: number; timestamp: string }>(response);
        if (unwrapped) {
          return unwrapped;
        }
        
        console.warn('CompanyApiService: applyVacancy - Unexpected response format:', response);
        return null;
      }),
      catchError((error) => {
        console.error('CompanyApiService: applyVacancy error', error);
        return throwError(() => error);
      })
    );
  }


  /**
   * POST /benefits-offer/{companyId}
   * Submit a new benefits offer form with all benefit details.
   * Request body: BenefitsOfferRequest
   */
  addBenefitsOffer(companyId: string, request: BenefitsOfferRequest): Observable<BenefitsOfferResponse | null> {
    const url = buildUrl(this.baseUrl, resolvePathParams(API_ENDPOINTS.COMPANY.ADD_BENEFITS_OFFER, { companyId }));
    console.log('CompanyApiService: addBenefitsOffer called', { url, companyId, request });
    
    // Set headers for JSON request
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    console.log('CompanyApiService: Sending JSON request', request);
    return this.http.post<unknown>(url, request, { headers }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: HTTP POST request successful', response),
        error: (error) => console.error('CompanyApiService: HTTP POST request failed', error),
        complete: () => console.log('CompanyApiService: HTTP POST request completed')
      }),
      map((response) => {
        console.log('CompanyApiService: Received response for addBenefitsOffer', response);
        return extractBenefitsOfferResponse(response);
      })
    );
  }

  /**
 * GET /company-landing/{companyId}/benefits-offer
 * Fetch benefits offer for company landing page
 */
getBenefitsOffer(companyId: string): Observable<BenefitsOfferResponse | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.GET_BENEFITS_OFFER, { companyId })
  );

  return this.http.get<unknown>(url).pipe(
    map((raw) => extractBenefitsOfferResponse(raw))
  );
}

  /**
   * POST /vision/{companyId}
   * Create vision & achievements
   * Submits a new vision & achievements form for a company.
   */
  addVisionPerformance(companyId: string, request: VisionRequest): Observable<VisionResponse | null> {
    const url = buildUrl(
      this.baseUrl,
      resolvePathParams(API_ENDPOINTS.COMPANY.ADD_VISION_PERFORMANCE, { companyId })
    );
    
    console.log('CompanyApiService: addVisionPerformance called', { url, companyId, request });
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.post<unknown>(url, request, { headers }).pipe(
      tap({
        next: (response) => console.log('CompanyApiService: addVisionPerformance success', response),
        error: (error) => console.error('CompanyApiService: addVisionPerformance error', error),
      }),
      map((raw) => {
        const wrapped = unwrapResponse<VisionResponse>(raw);
        if (wrapped) return wrapped;

        if (raw && typeof raw === 'object') {
          const rawObj = raw as Record<string, unknown>;
          if (rawObj['data']) {
            return rawObj['data'] as VisionResponse;
          }
        }

        return null;
      })
    );
  }

  /**
 * GET /company-landing/{companyId}/vision
 * Fetch Vision & Achievement for landing page
 */
getCompanyVision(companyId: string): Observable<VisionResponse | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams('/company-landing/:companyId/vision', { companyId })
  );

  return this.http.get<unknown>(url).pipe(
    map((raw) => {
      const wrapped = unwrapResponse<VisionResponse>(raw);
      if (wrapped) return wrapped;

      if (raw && typeof raw === 'object') {
        const rawObj = raw as Record<string, unknown>;
        if (rawObj['data']) {
          return rawObj['data'] as VisionResponse;
        }
      }

      return null;
    })
  );
}

  /**
   * GET /company-landing/{companyId}/overview/stats
   * Target campuses count and campus visits/placement drives count for the given year.
   */
  getOverviewStats(companyId: string, year?: number): Observable<CompanyOverviewStatsResponse | null> {
    const url = buildUrl(
      this.baseUrl,
      resolvePathParams(API_ENDPOINTS.COMPANY.GET_OVERVIEW_STATS, { companyId })
    );
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year.toString());
    }
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const wrapped = unwrapResponse<CompanyOverviewStatsResponse>(raw);
        if (wrapped) return wrapped;
        if (raw && typeof raw === 'object') {
          const rawObj = raw as Record<string, unknown>;
          if (rawObj['data']) {
            return rawObj['data'] as CompanyOverviewStatsResponse;
          }
        }
        return null;
      })
    );
  }




  /**
   * POST /company-invitation
   * Submit a campus invitation to participate in placement drive.
   * Request body: CompanyInvitationRequest
   */
 submitCompanyInvitation(
  companyId: string,
  request: CompanyInvitationRequest
): Observable<CompanyInvitationResponse | null> {

  const url = buildUrl(this.baseUrl, API_ENDPOINTS.COMPANY.SUBMIT_INVITATION);

  const params = new HttpParams().set('companyId', companyId);

  return this.http.post<unknown>(url, request, { params }).pipe(
    map((response) => extractCompanyInvitationResponse(response))
  );
}


  /**
   * GET /campuses
   * Get all registered campuses for dropdown
   * This makes an actual HTTP call so it shows in network tab
   */

getCampuses(): Observable<GetCampusesResponse> {
  const url = buildUrl(this.baseUrl, API_ENDPOINTS.STUDENT.GET_REGISTERED_CAMPUSES);
  console.log('CompanyApiService: getCampuses called', { url });

  return this.http.get<unknown>(url).pipe(
    tap({
      next: (response) => console.log('CompanyApiService: getCampuses response', response),
      error: (error) => console.error('CompanyApiService: getCampuses error', error),
    }),
    map((raw) => {
      const wrapped = raw as { success?: boolean; data?: unknown };

      let data: CampusItem[] = [];

      if (wrapped?.data && Array.isArray(wrapped.data)) {
        data = wrapped.data as CampusItem[];
      } else {
        const unwrapped = unwrapResponse<CampusItem[]>(raw);
        if (unwrapped && Array.isArray(unwrapped)) {
          data = unwrapped;
        }
      }

      return {
        success: wrapped?.success ?? true,
        data,
      };
    })
  );
}

/**
 * GET /campus/getCampusBySearch
 * Search campuses by name
 */
getCampusesBySearch(
  searchTerm: string,
  page = 0,
  size = 20
): Observable<CampusSearchResponse> {
  const url = buildUrl(this.baseUrl, API_ENDPOINTS.CAMPUS.GET_CAMPUS_BY_SEARCH);

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  if (searchTerm && searchTerm.trim()) {
    params = params.set('searchTerm', searchTerm.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      const wrapped = raw as CampusSearchResponse;

      return {
        success: wrapped?.success ?? true,
        data: {
          content: Array.isArray(wrapped?.data?.content)
            ? (wrapped.data!.content as CampusSearchItem[])
            : [],
        },
      };
    })
  );
}


// Search campuses for Company Invite (autocomplete)
searchCampuses(
  campusName: string,
  page = 0,
  size = 20
): Observable<CampusSearchResponse> {
  const url = buildUrl(this.baseUrl, API_ENDPOINTS.CAMPUS.GET_CAMPUS_BY_SEARCH);

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  if (campusName && campusName.trim()) {
    params = params.set('campusName', campusName.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      const wrapped = raw as CampusSearchResponse;

      return {
        success: wrapped?.success ?? true,
        data: {
          content: Array.isArray(wrapped?.data?.content)
            ? (wrapped!.data!.content as CampusSearchItem[])
            : [],
        },
      };
    })
  );
}



    /**
   * GET /company/{companyId}/testimonials
   */
  getTestimonials(
  companyId: string,
  page = 1,
  limit = 1
): Observable<PaginatedTestimonials | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.GET_TESTIMONIALS, { companyId })
  );

  const params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const rec = raw as { data?: { content?: unknown[]; totalPages?: number; totalElements?: number; number?: number; size?: number } };
      const d = rec.data;
      if (!d) return null;
      return {
        content: Array.isArray(d.content) ? (d.content as TestimonialResponse[]) : [],
        totalPages: d.totalPages ?? 1,
        totalElements: d.totalElements ?? 0,
        number: d.number ?? 0,
        size: d.size ?? limit,
      };
    })
  );
}

// --------------------- POST API submit company recommendation -------------

submitCompanyRecommendation(
  companyId: string,
  reviewerId: string,
  requesterUserType: 'STUDENT' | 'COMPANY' | 'CAMPUS',
  request: CompanyRecommendationRequest
): Observable<CompanyRecommendationResponse | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.SUBMIT_RECOMMENDATION, { companyId })
  );

  const params = new HttpParams()
    .set('reviewerId', reviewerId)
    .set('requesterUserType', requesterUserType)
    .set('target', 'company'); // Routes to COMPANY backend (student uses same path, no target param)

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  // Build body explicitly to match Swagger: { publicCompanyId?, wouldRecommend }
  const body: CompanyRecommendationRequest = {
    wouldRecommend: request.wouldRecommend,
    ...(request.publicCompanyId && { publicCompanyId: request.publicCompanyId }),
  };

  return this.http.post<unknown>(url, body, { params, headers }).pipe(
    map(raw => unwrapResponse<CompanyRecommendationResponse>(raw)),
    catchError(err => {
      console.error('submitCompanyRecommendation error', err);
      return of(null);
    })
  );
}




  /**
   * POST /company/{companyId}/feedback?requesterUserType={STUDENT|CAMPUS}
   * Submit feedback for a company profile.
   */
submitCompanyFeedback(
  companyId: string,
  reviewerId: string,
  requesterUserType: 'STUDENT' | 'COMPANY' | 'CAMPUS',
  request: CompanyFeedbackRequest
): Observable<CompanyFeedbackResponse | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.SUBMIT_FEEDBACK, { companyId })
  );

  const params = new HttpParams()
    .set('reviewerId', reviewerId)
    .set('requesterUserType', requesterUserType);

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  return this.http.post<unknown>(url, request, { params, headers }).pipe(
    map(raw => unwrapResponse<CompanyFeedbackResponse>(raw)),
    catchError(err => {
      console.error('submitCompanyFeedback error', err);
      return throwError(() => err);
    })
  );
}



  // ------------------- get follow 
  getFollowerCount(companyId: string): Observable<FollowerCountResponse> {
    const path = API_ENDPOINTS.COMPANY.GET_FOLLOWERS_COUNT.replace(':companyId', companyId);
    const url = buildUrl(this.baseUrl, path);
  
    return this.http.get<FollowerCountResponse>(url);
  }


  // ---------------------- PROMOTIONS COUNT -----------------

  getPromotionsCount(companyId: string): Observable<PromotionsCountResponse> {
    const path = API_ENDPOINTS.COMPANY.PROMOTIONS_COUNT.replace(':companyId', companyId);
    const url = buildUrl(this.baseUrl, path);
  
    return this.http.get<PromotionsCountResponse>(url);
  }
  
  
  // -------------------------- PUBLIC LANDING (USING PUBLIC COMPANY ID) ------------------


  getPublicCompanyProfile(publicCompanyId: string): Observable<CompanyRegistrationResponse | null> {
    const url = buildUrl(
      this.baseUrl,
      resolvePathParams('/public-landing/:publicCompanyId/company-profile', { publicCompanyId })
    );
  
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const wrapped = unwrapResponse<CompanyRegistrationResponse>(raw);
        if (wrapped) return wrapped;
  
        if (raw && typeof raw === 'object') {
          const obj = raw as { data?: unknown };
          if (obj.data) {
            return obj.data as CompanyRegistrationResponse;
          }
        }
        return null;
      })
    );
  }
  
/**
 * GET /public-landing/{publicCompanyId}/vision
 * Fetch Vision for public landing page
 */
getPublicCompanyVision(publicCompanyId: string): Observable<VisionResponse | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams('/public-landing/:publicCompanyId/vision', { publicCompanyId })
  );

  return this.http.get<unknown>(url).pipe(
    map((raw) => {
      const wrapped = unwrapResponse<VisionResponse>(raw);
      if (wrapped) return wrapped;

      if (raw && typeof raw === 'object') {
        const rawObj = raw as Record<string, unknown>;
        if (rawObj['data']) {
          return rawObj['data'] as VisionResponse;
        }
      }

      return null;
    })
  );
}


getPublicVacancies(publicCompanyId: string): Observable<readonly VacancyResponse[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_VACANCIES, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<VacancyResponse[]>(raw) ?? [])
  );
}

getPublicTestimonials(
  publicCompanyId: string,
  page = 1,
  size = 5
): Observable<PaginatedTestimonials | null> {

  page = Math.max(1, page);

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_TESTIMONIALS, { publicCompanyId })
  );

  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const rec = raw as { data?: { content?: unknown[]; totalPages?: number; totalElements?: number; number?: number; size?: number } };
      const d = rec.data;
      if (!d) return null;
      return {
        content: Array.isArray(d.content) ? (d.content as TestimonialResponse[]) : [],
        totalPages: d.totalPages ?? 1,
        totalElements: d.totalElements ?? 0,
        number: d.number ?? 0,
        size: d.size ?? 1,
      } as PaginatedTestimonials;
    })
  );
}


getPublicTargetCampuses(publicCompanyId: string): Observable<readonly TargetCampusResponse[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_TARGET_CAMPUSES, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<TargetCampusResponse[]>(raw) ?? [])
  );
}

getPublicKeyPeople(publicCompanyId: string): Observable<readonly KeyPersonResponse[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_KEY_PEOPLE, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<KeyPersonResponse[]>(raw) ?? [])
  );
}

getPublicFollowers(publicCompanyId: string): Observable<{ companyId: string; followerCount: number } | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_FOLLOWERS, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<{ companyId: string; followerCount: number }>(raw))
  );
}

getPublicPromotions(publicCompanyId: string): Observable<{ companyId: string; promotionCount: number } | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_PROMOTIONS, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<{ companyId: string; promotionCount: number }>(raw))
  );
}

getPublicClients(publicCompanyId: string): Observable<readonly ClientResponse[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_CLIENTS, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<ClientResponse[]>(raw) ?? [])
  );
}

getPublicBenefitsOffer(publicCompanyId: string): Observable<BenefitsOfferResponse | null> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.COMPANY.PUBLIC_GET_BENEFITS_OFFER, { publicCompanyId })
  );
  return this.http.get<unknown>(url).pipe(
    map((raw) => unwrapResponse<BenefitsOfferResponse>(raw))
  );
}

// ---------------------------------- END PUBLIC ID --------------------



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

export interface CompanyRegisterFiles {
  companyLogo?: File | null;
  keyPerson1Photo?: File | null;
  keyPerson2Photo?: File | null;
  keyPerson3Photo?: File | null;
}

export interface CompanyRegisterPayload {
  request: CompanyRegisterRequest;
  files?: CompanyRegisterFiles;
}

export interface RegisterCompanyOptions {
  userId?: string | number;
  userType?: UserType | 'ADMIN';
}

export interface CompanyRecommendationRequest {
  publicCompanyId?: string;
  wouldRecommend: boolean;
}

export interface CompanyRecommendationResponse {
  success?: boolean;
  message?: string;
  data?: {
    recommendationId?: string;
    companyId?: string;
    reviewerId?: string;
    wouldRecommend?: boolean;
    createdAt?: string;
  };
}

export interface CompanyFeedbackRequest {
  reviewerName: string;
  feedbackText: string;
  reviewerEmail?: string;
  reviewerDesignation?: string;
}

export interface CompanyFeedbackResponse {
  feedbackId?: string;
  companyId?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  reviewerDesignation?: string;
  // Swagger response uses `feedbackText`
  feedbackText?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CompanyRegistrationResponse {
  companyId?: string;
  email?: string;
  userId?: string;
  publicCompanyId?: string;
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
  campusId: string;
  campusName: string;
  campusLogoUrl?: string;
}

export interface PreferredCampusUploadFiles {
  campusLogo?: File | null;
}

export interface PreferredCampusUploadPayload {
  request: PreferredCampusRequest;
  files?: PreferredCampusUploadFiles;
}

export interface PreferredCampusResponse {
  campusId?: string;
  companyId?: string;
    publicCampusId?: string; 
  campusName?: string;
  campusLogoUrl?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  photoUrl?: string;
}

export interface LegacyClientRequest {
  clientName: string;
  photourl?: string;
}

export type ClientRequestInput = ClientRequest | LegacyClientRequest;

export interface ClientUploadFiles {
  photo?: File | null;
}

export interface ClientUploadPayload {
  request: ClientRequest;
  files?: ClientUploadFiles;
}

export interface ClientUploadPayloadInput {
  request: ClientRequestInput;
  files?: ClientUploadFiles;
}

export interface ClientResponse {
  clientId?: string;
  companyId?: string;
     publicCompanyId?: string; 
  clientName?: string;
  photoUrl?: string;    // API field for photo (camelCase)
  photourl?: string;    // API field for photo (legacy lowercase)
  clientLogo?: string;  // API might return this
  logoUrl?: string;     // fallback
  name?: string;        // optional
  createdAt?: string | null;
  updatedAt?: string | null;
}
export interface VacancyRequest {
  jobTitle: string;
  jobLocation: string;
  department: string;
  jobType: string;
  salary: string;
  numberOfOpenings: string; // Backend uses camelCase
  contractDuration: string; // Backend uses camelCase
  jobDescription: string; // Backend uses camelCase
  requiredQualifications: string[]; // Backend REQUEST expects array of strings (response returns objects, but request is strings)
  streamsEligible: string[]; // Backend uses plural "streamsEligible" (matching request/response format)
  minimumCgpaPercentage: string; // Backend uses camelCase
  yearOfPassing: string; // Backend uses camelCase
  selectionProcess: string[];
  interviewMode: string; // Backend expects a single string value (e.g., "Both", "Online", "Offline")
}

export interface VacancyResponse {
  vacancyId?: string;
  companyId?: string;
  jobTitle?: string;
  jobLocation?: string;
  department?: string;
  jobType?: string;
  salary?: string;
  numberofopenings?: string;
  numberOfOpenings?: string; // API response uses this format
  contractduration?: string;
  contractDuration?: string; // API response may use this format
  jobdescription?: string;
  jobDescription?: string; // API response uses this format
  requiredqualifications?: string[];
  requiredQualifications?: string[]; // API response uses this format
  streamseligible?: string[];
  streamEligible?: string[]; // API response uses singular "streamEligible" not "streamsEligible"
  streamsEligible?: string[]; // Keep for backward compatibility
  minimumcgpaPercentage?: string;
  minimumCgpaPercentage?: string; // API response uses this format
  yearofPassing?: string;
  yearOfPassing?: string; // API response uses this format
  selectionProcess?: string[];
  interviewMode?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  // API response may also include capital letter fields
  JobTitle?: string;
  JobLocation?: string;
  JobType?: string;
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

export interface TechnologyRequest {
  technologyName: string;
  description: string;
  iconUrl?: string;
}

export interface TechnologyResponse {
  technologyId?: string;
  companyId?: string;
  technologyName?: string;
  description?: string;
  iconUrl?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}
export interface VisionRequest {
  vision: string;
  metricName: string;
  value: string;
  year: string;
}

export interface VisionResponse {
  visionId?: string;
  companyId?: string;
  vision?: string;
  metricName?: string;
  value?: string;
  year?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CompanyOverviewStatsResponse {
  companyId?: string;
  year?: number;
  targetCampusesCount?: number;
  campusVisitsOrDrivesThisYear?: number;
}

export interface BenefitsOfferRequest {
  internToJobRate: string;
  startingSalaryRange: string;
  performanceBonus: string;
  healthcare: string;
  mentorBuddySystem: string;
  workLifeBalancePerks: string;
  appreciationDayOff: string;
  trainingAndUpskilling: string;
  sickLeaves: string;
  referralBonus: string;
}


export interface BenefitsOfferResponse {
  benefitsOfferId?: string;
  companyId?: string;
  internToJobRate?: string;
  startingSalaryRange?: string;
  performanceBonus?: string;
  healthcare?: string;
  mentorBuddySystem?: string;
  workLifeBalancePerks?: string;
  appreciationDayOff?: string;
  trainingAndUpskilling?: string;
  sickLeaves?: string;
  referralBonus?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CompanyInvitationRequest {
  campusId: string;
  campusName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhoneNo: string;
  contactPersonDesignation: string;
  campusWebsiteUrl: string;
  campusAddress: string;
  campusProspectusUrl?: string;
  academicYear: string;
  programsOffered: string[];
  proposedDateForPlacementDrive: string;
  preferredSkills: string[];
  facilitiesAvailableForRecruitmentProcess: string;
  inviteCompany: boolean;
}

export interface CompanyInvitationResponse {
  invitationId?: string;
  companyId?: string;
  campusId?: string;
  campusName?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhoneNo?: string;
  contactPersonDesignation?: string;
  campusWebsiteUrl?: string;
  campusAddress?: string;
  campusProspectusUrl?: string;
  academicYear?: string;
  programsOffered?: string[];
  proposedDateForPlacementDrive?: string;
  preferredSkills?: string[];
  facilitiesAvailableForRecruitmentProcess?: string;
  inviteCompany?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TargetCampusResponse {
  campusId?: string;
  campusName?: string;
  campusLogo?: string;
  campusLogoUrl?: string;
  address?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}
export interface TestimonialResponse {
  testimonialId?: string;
  // Backend returns these (per your network screenshot)
  reviewerName?: string;
  reviewerEmail?: string;
  reviewerDesignation?: string;
  quote?: string;
  photoUrl?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaginatedTestimonials {
  content: TestimonialResponse[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}


function unwrapResponse<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  return unwrapApiResponseCore<T>(raw);
}

// public id 
function extractCompanyRegistrationResponse(raw: unknown): CompanyRegistrationResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  // First unwrap
  const level1 = unwrapResponse<unknown>(raw) ?? raw;

  if (!level1 || typeof level1 !== 'object') {
    return null;
  }

  // Handle possible double-wrap: { success, data: { success, data: {...} } }
  const maybeWrappedAgain = level1 as { data?: unknown };

  if (maybeWrappedAgain.data && typeof maybeWrappedAgain.data === 'object') {
    return maybeWrappedAgain.data as CompanyRegistrationResponse;
  }

  return level1 as CompanyRegistrationResponse;
}


function extractPreferredCampusResponse(raw: unknown): PreferredCampusResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as PreferredCampusResponse;
}

function extractClientResponse(raw: unknown): ClientResponse | null {
  console.log('extractClientResponse: raw response', raw);
  
  // First try to unwrap from standard API response format { success, data, ... }
  const wrapped = unwrapResponse<ClientResponse>(raw);
  if (wrapped && typeof wrapped === 'object') {
    console.log('extractClientResponse: extracted from unwrapResponse', wrapped);
    return wrapped;
  }
  
  // If unwrapResponse returned null, try raw response directly
  if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    
    // Check if it's already a ClientResponse-like object (has clientId, clientName, or photoUrl/photourl)
    if (rawObj['clientId'] || rawObj['clientName'] || rawObj['photoUrl'] || rawObj['photourl']) {
      console.log('extractClientResponse: found direct ClientResponse', rawObj);
      return rawObj as ClientResponse;
    }
    
    // Check if data field exists and extract from it
    if (rawObj['data'] && typeof rawObj['data'] === 'object') {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractClientResponse: extracted from data field', data);
      return data as ClientResponse;
    }
    
    // Check if response has nested structure
    if (rawObj['success'] !== undefined && rawObj['data']) {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractClientResponse: extracted from success.data', data);
      return data as ClientResponse;
    }
  }
  
  console.warn('extractClientResponse: could not extract ClientResponse from', raw);
    return null;
}

function extractSpecializationResponse(raw: unknown): SpecializationResponse | null {
  const wrapped = unwrapResponse<unknown>(raw) ?? raw;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  return wrapped as SpecializationResponse;
}

function extractTechnologyResponse(raw: unknown): TechnologyResponse | null {
  console.log('extractTechnologyResponse: raw response', raw);
  
  // First try to unwrap from standard API response format { success, data, ... }
  const wrapped = unwrapResponse<TechnologyResponse>(raw);
  if (wrapped && typeof wrapped === 'object') {
    console.log('extractTechnologyResponse: extracted from unwrapResponse', wrapped);
    return wrapped;
  }
  
  // If unwrapResponse returned null, try raw response directly
  if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    
    // Check if it's already a TechnologyResponse-like object
    if (rawObj['technologyId'] || rawObj['technologyName']) {
      console.log('extractTechnologyResponse: found direct TechnologyResponse', rawObj);
      return rawObj as TechnologyResponse;
    }
    
    // Check if data field exists and extract from it
    if (rawObj['data'] && typeof rawObj['data'] === 'object') {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractTechnologyResponse: extracted from data field', data);
      return data as TechnologyResponse;
    }
    
    // Check if response has nested structure
    if (rawObj['success'] !== undefined && rawObj['data']) {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractTechnologyResponse: extracted from success.data', data);
      return data as TechnologyResponse;
    }
  }
  
  console.warn('extractTechnologyResponse: could not extract TechnologyResponse from', raw);
  return null;
}

function extractVacancyResponse(raw: unknown): VacancyResponse | null {
  console.log('extractVacancyResponse: raw response', raw);
  
  // First try to unwrap from standard API response format { success, data, ... }
  const wrapped = unwrapResponse<VacancyResponse>(raw);
  if (wrapped && typeof wrapped === 'object') {
    console.log('extractVacancyResponse: extracted from unwrapResponse', wrapped);
    return wrapped;
  }
  
  // If unwrapResponse returned null, try raw response directly
  if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    
    // Check if it's already a VacancyResponse-like object
    if (rawObj['vacancyId'] || rawObj['jobTitle'] || rawObj['JobTitle']) {
      console.log('extractVacancyResponse: found direct VacancyResponse', rawObj);
      return rawObj as VacancyResponse;
    }
    
    // Check if data field exists and extract from it
    if (rawObj['data'] && typeof rawObj['data'] === 'object') {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractVacancyResponse: extracted from data field', data);
      return data as VacancyResponse;
    }
    
    // Check if response has nested structure
    if (rawObj['success'] !== undefined && rawObj['data']) {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractVacancyResponse: extracted from success.data', data);
      return data as VacancyResponse;
    }
  }
  
  console.warn('extractVacancyResponse: could not extract VacancyResponse from', raw);
  return null;
}

/** Normalizes benefits offer response to camelCase (handles PascalCase from backend). */
function normalizeBenefitsOfferResponse(obj: Record<string, unknown>): BenefitsOfferResponse {
  const get = (camel: string, pascal: string) =>
    (obj[camel] ?? obj[pascal]) as string | undefined;
  return {
    benefitsOfferId: (obj['benefitsOfferId'] ?? obj['BenefitsOfferId']) as string | undefined,
    companyId: (obj['companyId'] ?? obj['CompanyId']) as string | undefined,
    internToJobRate: get('internToJobRate', 'InternToJobRate'),
    startingSalaryRange: get('startingSalaryRange', 'StartingSalaryRange'),
    performanceBonus: get('performanceBonus', 'PerformanceBonus'),
    healthcare: get('healthcare', 'Healthcare'),
    mentorBuddySystem: get('mentorBuddySystem', 'MentorBuddySystem'),
    workLifeBalancePerks: get('workLifeBalancePerks', 'WorkLifeBalancePerks'),
    appreciationDayOff: get('appreciationDayOff', 'AppreciationDayOff'),
    trainingAndUpskilling: get('trainingAndUpskilling', 'TrainingAndUpskilling'),
    sickLeaves: get('sickLeaves', 'SickLeaves'),
    referralBonus: get('referralBonus', 'ReferralBonus'),
    createdAt: (obj['createdAt'] ?? obj['CreatedAt']) as string | null | undefined,
    updatedAt: (obj['updatedAt'] ?? obj['UpdatedAt']) as string | null | undefined,
  };
}

/**
 * Normalizes VacancyResponse to handle API response format variations
 * (capital letters like JobTitle, JobLocation, etc.)
 */
function extractBenefitsOfferResponse(raw: unknown): BenefitsOfferResponse | null {
  console.log('extractBenefitsOfferResponse: raw response', raw);
  
  // First try to unwrap from standard API response format { success, data, ... }
  const wrapped = unwrapResponse<BenefitsOfferResponse>(raw);
  if (wrapped && typeof wrapped === 'object') {
    console.log('extractBenefitsOfferResponse: extracted from unwrapResponse', wrapped);
    return normalizeBenefitsOfferResponse(wrapped as Record<string, unknown>);
  }
  
  // If unwrapResponse returned null, try raw response directly
  if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    
    // Check if it's already a BenefitsOfferResponse-like object
    if (rawObj['benefitsOfferId'] || rawObj['companyId']) {
      console.log('extractBenefitsOfferResponse: found direct BenefitsOfferResponse', rawObj);
      return normalizeBenefitsOfferResponse(rawObj);
    }
    
    // Check if data field exists and extract from it
    if (rawObj['data'] && typeof rawObj['data'] === 'object') {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractBenefitsOfferResponse: extracted from data field', data);
      return normalizeBenefitsOfferResponse(data);
    }
    
    // Check if response has nested structure
    if (rawObj['success'] !== undefined && rawObj['data']) {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractBenefitsOfferResponse: extracted from success.data', data);
      return normalizeBenefitsOfferResponse(data);
    }
  }
  
  console.warn('extractBenefitsOfferResponse: could not extract BenefitsOfferResponse from', raw);
  return null;
}

function extractCompanyInvitationResponse(raw: unknown): CompanyInvitationResponse | null {
  console.log('extractCompanyInvitationResponse: raw response', raw);
  
  // First try to unwrap from standard API response format { success, data, ... }
  const wrapped = unwrapResponse<CompanyInvitationResponse>(raw);
  if (wrapped && typeof wrapped === 'object') {
    console.log('extractCompanyInvitationResponse: extracted from unwrapResponse', wrapped);
    return wrapped;
  }
  
  // If unwrapResponse returned null, try raw response directly
  if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    
    // Check if it's already a CompanyInvitationResponse-like object
    if (rawObj['invitationId'] || rawObj['campusId']) {
      console.log('extractCompanyInvitationResponse: found direct CompanyInvitationResponse', rawObj);
      return rawObj as CompanyInvitationResponse;
    }
    
    // Check if data field exists and extract from it
    if (rawObj['data'] && typeof rawObj['data'] === 'object') {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractCompanyInvitationResponse: extracted from data field', data);
      return data as CompanyInvitationResponse;
    }
    
    // Check if response has nested structure
    if (rawObj['success'] !== undefined && rawObj['data']) {
      const data = rawObj['data'] as Record<string, unknown>;
      console.log('extractCompanyInvitationResponse: extracted from success.data', data);
      return data as CompanyInvitationResponse;
    }
  }
  
  console.warn('extractCompanyInvitationResponse: could not extract CompanyInvitationResponse from', raw);
  return null;
}

function normalizeVacancyResponse(vacancy: VacancyResponse | Record<string, unknown>): VacancyResponse {
  const normalized: VacancyResponse = { ...vacancy };
  
  // Handle capital letter fields from API response
  if ('JobTitle' in vacancy && !normalized.jobTitle) {
    normalized.jobTitle = vacancy.JobTitle as string;
  }
  if ('JobLocation' in vacancy && !normalized.jobLocation) {
    normalized.jobLocation = vacancy.JobLocation as string;
  }
  if ('JobType' in vacancy && !normalized.jobType) {
    normalized.jobType = vacancy.JobType as string;
  }
  if ('numberOfOpenings' in vacancy && !normalized.numberofopenings) {
    normalized.numberofopenings = vacancy.numberOfOpenings as string;
  }
  if ('contractDuration' in vacancy && !normalized.contractduration) {
    normalized.contractduration = vacancy.contractDuration as string;
  }
  if ('jobDescription' in vacancy && !normalized.jobdescription) {
    normalized.jobdescription = vacancy.jobDescription as string;
  }
  if ('requiredQualifications' in vacancy && !normalized.requiredqualifications) {
    normalized.requiredqualifications = vacancy.requiredQualifications as string[];
  }
  // Handle both singular (backend format) and plural (legacy) field names
  if ('streamEligible' in vacancy && !normalized.streamseligible) {
    normalized.streamseligible = vacancy.streamEligible as string[];
  }
  if ('streamsEligible' in vacancy && !normalized.streamseligible) {
    normalized.streamseligible = vacancy.streamsEligible as string[];
  }
  if ('minimumCgpaPercentage' in vacancy && !normalized.minimumcgpaPercentage) {
    normalized.minimumcgpaPercentage = vacancy.minimumCgpaPercentage as string;
  }
  if ('yearOfPassing' in vacancy && !normalized.yearofPassing) {
    normalized.yearofPassing = vacancy.yearOfPassing as string;
  }
  
  return normalized;
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

function normalizeRegisterPayload(
  data: CompanyRegisterRequest | CompanyRegisterPayload,
): CompanyRegisterPayload {
  if ('request' in data) {
    return data;
  }
  return { request: data };
}

function hasRegisterFiles(files?: CompanyRegisterFiles): boolean {
  if (!files) {
    return false;
  }
  return Boolean(
    files.companyLogo ||
      files.keyPerson1Photo ||
      files.keyPerson2Photo ||
      files.keyPerson3Photo,
  );
}

function buildRegisterCompanyFormData(payload: CompanyRegisterPayload): FormData {
  const formData = new FormData();
  formData.append('request', JSON.stringify(payload.request));

  const files = payload.files;
  if (!files) {
    return formData;
  }
  if (files.companyLogo) {
    formData.append('companyLogo', files.companyLogo, files.companyLogo.name);
  }
  if (files.keyPerson1Photo) {
    formData.append('keyPerson1Photo', files.keyPerson1Photo, files.keyPerson1Photo.name);
  }
  if (files.keyPerson2Photo) {
    formData.append('keyPerson2Photo', files.keyPerson2Photo, files.keyPerson2Photo.name);
  }
  if (files.keyPerson3Photo) {
    formData.append('keyPerson3Photo', files.keyPerson3Photo, files.keyPerson3Photo.name);
  }
  return formData;
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

function normalizeClientRequest(request: ClientRequestInput): ClientRequest {
  const photoUrl = 'photoUrl' in request && request.photoUrl !== undefined
    ? request.photoUrl
    : ('photourl' in request ? request.photourl : undefined);
  return photoUrl !== undefined
    ? { clientName: request.clientName, photoUrl }
    : { clientName: request.clientName };
}

function normalizeClientPayload(
  request: ClientRequestInput | ClientUploadPayloadInput
): ClientUploadPayload {
  if ('request' in request) {
    return { request: normalizeClientRequest(request.request), files: request.files };
  }
  return { request: normalizeClientRequest(request) };
}

function hasClientFiles(files?: ClientUploadFiles): boolean {
  if (!files) {
    return false;
  }
  return Boolean(files.photo);
}

function buildClientFormData(payload: ClientUploadPayload): FormData {
  const formData = new FormData();
  formData.append('request', JSON.stringify(payload.request));
  const photo = payload.files?.photo ?? null;
  if (photo) {
    formData.append('photo', photo, photo.name);
  }
  return formData;
}

function normalizePreferredCampusPayload(
  request: PreferredCampusRequest | PreferredCampusUploadPayload
): PreferredCampusUploadPayload {
  if ('request' in request) {
    return request;
  }
  return { request };
}

function hasPreferredCampusFiles(files?: PreferredCampusUploadFiles): boolean {
  if (!files) {
    return false;
  }
  return Boolean(files.campusLogo);
}

function buildPreferredCampusFormData(payload: PreferredCampusUploadPayload): FormData {
  const formData = new FormData();
  formData.append('request', JSON.stringify(payload.request));
  const logo = payload.files?.campusLogo ?? null;
  if (logo) {
    formData.append('campusLogo', logo, logo.name);
  }
  return formData;
}

export interface BulkUploadRowResult {
  rowNumber?: number;
  companyName?: string;
  success?: boolean;
  message?: string;
  error?: string;
  companyId?: string;
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

function resolvePathParams(endpoint: string, params: Record<string, string>): string {
  let out = endpoint;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}
