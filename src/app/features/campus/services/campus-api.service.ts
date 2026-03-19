import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType, STORAGE_KEYS } from '../../../core/config/app.constants';
import { unwrapApiResponse as unwrapApiResponseCore } from '../../../core/api/api-response.utils';
import { stripUndefined } from '../../../core/api/api-request.utils';
import { ApiResponsePlacedStudentsResponse, ApiResponsePageAlumniResponse, PlacedStudentResponse, ApiResponsePageStudent } from '../../student/models/student.models';
import { StorageService } from '../../../core/storage/storage.service';
import { RoleService } from '../../../core/rbac/role.service';

/**
 * Placeholder for campus API calls.
 * We'll map legacy `Synkup_FE/app/features/campus/services/*` here.
 */
@Injectable({ providedIn: 'root' })
export class CampusApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.CAMPUS_API_BASE_URL || this.config.API_BASE_URL;
  private readonly storage = inject(StorageService);
  private readonly roleService = inject(RoleService);

  /**
   * Get campus ID from storage if not provided.
   * This ensures all API calls are filtered by the logged-in campus.
   */
  private getCampusId(providedCampusId?: string): string | undefined {
    // If campus ID is explicitly provided, use it (for admin or special cases)
    if (providedCampusId) {
      return providedCampusId;
    }
    // Otherwise, get from storage (set during login)
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID);
    return storedCampusId || undefined;
  }

  /**
   * Get department ID from storage if not provided. Only set for DEPARTMENT userType at login.
   */
  private getDepartmentId(providedDepartmentId?: string): string | undefined {
    if (providedDepartmentId?.trim()) {
      return providedDepartmentId.trim();
    }
    const stored = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID);
    return stored || undefined;
  }

  /**
   * POST /campus/register
   * Registers campus. Supports JSON or multipart/form-data (when photo is provided).
   * Multipart: request (JSON string) + photo (binary).
   */
  registerCampus(
    data: CampusRegisterRequest,
    options?: RegisterCampusOptions,
    photo?: File | null,
  ): Observable<CampusRegistrationResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.REGISTER);
    let params = new HttpParams();
    if (options?.userType) {
      params = params.set('userType', options.userType);
    }

    if (photo && photo instanceof File) {
      const formData = new FormData();
      formData.append('request', JSON.stringify(data));
      formData.append('photo', photo, photo.name || 'photo');
      const headers = buildUserHeaders(options).append('Accept', 'application/json');
      return this.http.post<unknown>(url, formData, { headers, params }).pipe(
        map(extractCampusRegistrationResponse),
      );
    }

    const headers = buildUserHeaders(options).append('Content-Type', 'application/json').append('Accept', 'application/json');
    return this.http.post<unknown>(url, data, { headers, params }).pipe(
      map(extractCampusRegistrationResponse),
    );
  }

  /**
   * POST /campus/bulk-upload
   * Bulk upload campuses from Excel file (Admin only).
   * Uploads multiple campus registrations from an Excel file (.xlsx or .xls).
   * Returns detailed results for each row including success/failure status.
   */
  bulkUploadCampuses(file: File): Observable<BulkCampusUploadResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.BULK_UPLOAD);
    
    // Create FormData for multipart/form-data
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    
    return this.http.post<unknown>(url, formData, { headers }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        
        const responseObj = raw as Record<string, unknown>;
        
        // Check if response is wrapped in ApiResponse
        if ('success' in responseObj && 'message' in responseObj && 'data' in responseObj) {
          const apiResponse = responseObj as unknown as ApiResponseBulkCampusUploadResponse;
          return apiResponse.data || null;
        }
        
        // If response is directly BulkCampusUploadResponse
        if ('results' in responseObj || 'totalRows' in responseObj) {
          return raw as BulkCampusUploadResponse;
        }
        
        console.warn('CampusApiService: bulkUploadCampuses - Invalid response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: bulkUploadCampuses - Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/getAll
   * Public endpoint (no auth required).
   * When approvalStatus is provided (admin context), filters server-side.
   */
  getAllCampuses(approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'): Observable<readonly Campus[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL);
    let params = new HttpParams();
    if (approvalStatus) {
      params = params.set('approvalStatus', approvalStatus);
    }
    return this.http.get<unknown>(url, { params }).pipe(map(extractCampusList));
  }

  /**
   * GET /public/landing/campuses/carousel
   * Retrieves campuses for carousel display. Limited to specified number.
   */
  getCampusesCarousel(limit = 10): Observable<ApiResponseListCarouselItemResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.CAMPUSES_CAROUSEL);
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        return raw as ApiResponseListCarouselItemResponse;
      }),
      catchError((error) => {
        console.error('CampusApiService: getCampusesCarousel - Error:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * GET /public/landing/companies/carousel
   * Retrieves companies for carousel display. Limited to specified number.
   */
  getCompaniesCarousel(limit = 10): Observable<ApiResponseListCarouselItemResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.COMPANIES_CAROUSEL);
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        return raw as ApiResponseListCarouselItemResponse;
      }),
      catchError((error) => {
        console.error('CampusApiService: getCompaniesCarousel - Error:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * GET /campus/getCampusBySearch
   * Autocomplete API for campus names.
   * If query has more than 2 characters, returns campuses that start with or contain those characters.
   * If query is empty or has 0-2 characters, returns 20 campuses sorted by name.
   * Returns 20 results per page with pagination support for infinite scrolling.
   */
  getCampusBySearch(
    campusName?: string,
    page = 0,
    size = 20,
  ): Observable<ApiResponsePageCampusAutocompleteResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_CAMPUS_BY_SEARCH);
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    if (campusName && campusName.trim().length > 0) {
      params = params.set('campusName', campusName.trim());
    }
        
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        
        const response = raw as Record<string, unknown>;
        
        // Check if response is wrapped with data property
        if ('data' in response) {
          const data = response['data'];
          
          // If data is an array directly (Spring Page format)
          if (Array.isArray(data)) {
            return {
              success: true,
              message: null,
              data: {
                content: data as CampusAutocompleteResponse[],
                totalPages: response['totalPages'] as number,
                totalElements: response['totalElements'] as number,
                first: response['first'] as boolean,
                last: response['last'] as boolean,
                size: response['size'] as number,
                number: response['number'] as number,
                numberOfElements: response['numberOfElements'] as number,
              },
              error: null,
            } as ApiResponsePageCampusAutocompleteResponse;
          }
          
          // If data is an object with content property
          if (data && typeof data === 'object' && 'content' in data) {
            const dataObj = data as Record<string, unknown>;
            return {
              success: response['success'] as boolean ?? true,
              message: (response['message'] as string) || null,
              data: {
                content: dataObj['content'] as CampusAutocompleteResponse[],
                totalPages: dataObj['totalPages'] as number,
                totalElements: dataObj['totalElements'] as number,
                first: dataObj['first'] as boolean,
                last: dataObj['last'] as boolean,
                size: dataObj['size'] as number,
                number: dataObj['number'] as number,
                numberOfElements: dataObj['numberOfElements'] as number,
              },
              error: (response['error'] as string) || null,
            } as ApiResponsePageCampusAutocompleteResponse;
          }
        }
        
        // Check if response is a Spring Page object directly (has content property at root)
        if ('content' in response && Array.isArray(response['content'])) {
          return {
            success: true,
            message: null,
            data: {
              content: response['content'] as CampusAutocompleteResponse[],
              totalPages: response['totalPages'] as number,
              totalElements: response['totalElements'] as number,
              first: response['first'] as boolean,
              last: response['last'] as boolean,
              size: response['size'] as number,
              number: response['number'] as number,
              numberOfElements: response['numberOfElements'] as number,
            },
            error: null,
          } as ApiResponsePageCampusAutocompleteResponse;
        }
        
        // Fallback: try to cast as-is
        return raw as ApiResponsePageCampusAutocompleteResponse;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error fetching campuses by search:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}
   * Public endpoint (no auth required).
   */
  getCampusById(campusId: string): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.BY_ID, { campusId });
        
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const unwrapped = unwrapApiResponse<Campus>(raw);
        return unwrapped;
      })
    );
  }

  /**
   * GET /company/getCompanyBySearch
   * Autocomplete API for company names.
   * Searches companies by name (case-insensitive partial match) and returns companyId, companyName, and companyAddress.
   * Supports pagination with page and size parameters.
   * 
   * @param searchTerm - Search term for company name (optional)
   * @param page - Page number (0-indexed, default: 0)
   * @param size - Page size (default: 20)
   * @returns Observable with array of companies
   */
  getCompanyBySearch(
    searchTerm?: string,
    page = 0,
    size = 20,
  ): Observable<CompanySearchResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.COMPANY.GET_COMPANY_BY_SEARCH);
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    if (searchTerm && searchTerm.trim().length > 0) {
      params = params.set('searchTerm', searchTerm.trim());
    }
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        
        const response = raw as Record<string, unknown>;
        
        // Response structure: { success: true, message: string, data: CompanySearchItem[], statusCode: number, timestamp: string }
        if ('success' in response && 'data' in response) {
          const data = response['data'];
          
          // Data is an array of companies
          if (Array.isArray(data)) {
            return {
              success: response['success'] as boolean,
              message: (response['message'] as string) || 'Companies retrieved successfully',
              data: data as CompanySearchItem[],
              statusCode: typeof response['statusCode'] === 'number' ? response['statusCode'] : 200,
              timestamp: (response['timestamp'] as string) || undefined,
            } as CompanySearchResponse;
          }
        }
        
        // Fallback: try to cast as-is
        return raw as CompanySearchResponse;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error fetching companies by search:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/campus/{campusId}/sidebar
   * Get campus sidebar info (name and rank).
   * Retrieves campus name and rank for sidebar display in the dashboard.
   * Response format: { success: true, message: null, data: { campusName, campusRank }, error: null }
   */
  getCampusSidebar(campusId?: string): Observable<CampusSidebarResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getCampusSidebar - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get campus sidebar'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_CAMPUS_SIDEBAR, { campusId: finalCampusId });
    
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const unwrapped = unwrapApiResponse<CampusSidebarResponse>(raw);
        return unwrapped;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error getting campus sidebar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}
   * Get campus details by ID (Public landing endpoint).
   * Retrieves campus details by campus ID. Public endpoint.
   * Response format: { message: null, data: { id, campusId, email, campusName, ... } }
   */
  getPublicCampusById(campusId: string): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.PUBLIC_CAMPUS_BY_ID, { campusId });
    
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Response structure: { message: null, data: { id, campusId, email, campusName, ... } }
        if (raw && typeof raw === 'object' && raw !== null) {
          const response = raw as Record<string, unknown>;
          
          // Check if response has 'data' field (public landing endpoint structure)
          if ('data' in response && response['data']) {
            const campusData = response['data'] as Campus;
            return campusData;
          }
          
          // If no 'data' field, check if it's a direct campus object
          if ('campusId' in response || 'id' in response || 'campusName' in response) {
            return raw as Campus;
          }
        }
        
        console.warn('CampusApiService: getPublicCampusById - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error getting public campus by ID:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/about
   * Get About Campus content.
   * Retrieves the About Campus content from the campus profile.
   * Response format: { success: true, message: null, data: "about text", error: null }
   */
getAboutCampus(
  campusId: string,
  departmentId?: string
): Observable<string | null> {

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ABOUT_CAMPUS, { campusId });

  let params = new HttpParams();

  //  Add departmentId when present
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {

      if (raw && typeof raw === 'object' && raw !== null) {
        const response = raw as Record<string, unknown>;

        if ('success' in response && 'data' in response) {
          const aboutText = response['data'];

          if (typeof aboutText === 'string') {
            return aboutText;
          } else if (aboutText !== null && aboutText !== undefined) {
            return String(aboutText);
          }
        }
      }

      console.warn('CampusApiService: getAboutCampus - Unexpected response:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: getAboutCampus error:', error);
      return throwError(() => error);
    })
  );
}


  /**
   * PUT /campus/{campusId}/update
   * Updates campus profile.
   * Swagger: requires email query parameter.
   */
  updateCampus(campusId: string, email: string, request: CampusRegisterRequest): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE, { campusId });
    const params = new HttpParams().set('email', email);
    return this.http.put<unknown>(url, request, { params }).pipe(map((raw) => unwrapApiResponse<Campus>(raw)));
  }

  /**
   * PUT /campus/profile
   * Updates campus profile. Supports JSON or multipart/form-data (when photo is provided).
   * Multipart: request (JSON string) + photo (binary).
   */
  updateCampusProfile(
    email: string,
    request: CampusProfileUpdateRequest,
    photo?: File | null,
  ): Observable<Campus | null> {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      console.error('CampusApiService: updateCampusProfile - Email is required');
      return throwError(() => new Error('Email is required to update campus profile'));
    }

    const url = this.buildUrl('/campus/profile');
    const params = new HttpParams().set('email', trimmedEmail);
    const payload = stripUndefined(request);

    if (photo && photo instanceof File) {
      const formData = new FormData();
      formData.append('request', JSON.stringify(payload));
      formData.append('photo', photo, photo.name || 'photo');
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.put<unknown>(url, formData, { headers, params }).pipe(
        map((raw) => unwrapApiResponse<Campus>(raw)),
        catchError((error) => {
          console.error('CampusApiService: Error updating campus profile:', error);
          return throwError(() => error);
        }),
      );
    }

    return this.http.put<unknown>(url, payload, { params }).pipe(
      map((raw) => unwrapApiResponse<Campus>(raw)),
      catchError((error) => {
        console.error('CampusApiService: Error updating campus profile:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * PUT /campus/admin/{campusId}
   * Updates campus by ID (Admin only).
   * Swagger: Admin endpoint, no query parameters required.
   */
  updateCampusByAdmin(campusId: string, request: CampusRegisterRequest): Observable<Campus | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_BY_ADMIN, { campusId });
    return this.http.put<unknown>(url, request).pipe(map((raw) => unwrapApiResponse<Campus>(raw)));
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
      .patch<unknown>(url, request)
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
   * POST /dashboard/{campusId}/students/placed
   * Add a placed student.
   * Creates a new placed student card from JSON request with multipart/form-data for file upload.
   * Request format: [studentName, studentPhoto (File), courseId, courseName, batch, placementCompanyId, placementCompanyName, designation, sector]
   */
  addPlacedStudent(
  formData: FormData,
  departmentId?: string | null,
  campusId?: string
): Observable<AddPlacedStudentResponse | null> {

  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    console.error('CampusApiService: addPlacedStudent - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to add placed student'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT, {
    campusId: finalCampusId
  });

  let params = new HttpParams();
  if (departmentId && String(departmentId).trim()) {
    params = params.set('departmentId', String(departmentId).trim());
  }

  return this.http.post<unknown>(url, formData, { params: params.keys().length ? params : undefined }).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj && 'data' in responseObj) {
          return {
            success: responseObj['success'] as boolean,
            message: (responseObj['message'] as string) || 'Placed student added successfully',
            data: responseObj['data'] as AddPlacedStudentResponseData,
            error: (responseObj['error'] as string) || null,
          };
        }
      }

      console.warn('CampusApiService: addPlacedStudent - Response format unexpected:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: addPlacedStudent - Error occurred:', error);
      return throwError(() => error);
    })
  );
}



  /**
   * GET /dashboard/{campusId}/placed-students
   * Get Placed Students.
   * Retrieves placed students for the campus with pagination. Default 6 students per page, sorted by placement date (newest first).
   * Response: { success: true, message: "Placed students fetched successfully", data: { content: [...], ... }, error: null }
   */
 getPlacedStudents(
  page = 0,
  limit = 6,
  companyName?: string,
  batch?: string,
  campusId?: string,
  departmentId?: string   // 🔥 NEW PARAM (LAST me hi add karna)
): Observable<ApiResponsePlacedStudentsResponse> {

  // campus flow same rahega
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: getPlacedStudents - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to get placed students'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.GET_PLACED_STUDENTS,
    { campusId: finalCampusId }
  );

  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  if (companyName) {
    params = params.set('companyName', companyName);
  }

  if (batch) {
    params = params.set('batch', batch);
  }

  // 🔥 NEW — department support
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) =>
      buildPagedApiResponse<PlacedStudentResponse>(
        raw,
        'Placed students fetched successfully',
        false,
      ) as ApiResponsePlacedStudentsResponse,
    ),
    catchError((error) => {
      console.error('CampusApiService: getPlacedStudents - Error occurred:', error);
      console.error('CampusApiService: getPlacedStudents - Error status:', error?.status);
      console.error('CampusApiService: getPlacedStudents - Error URL:', error?.url);
      console.error('CampusApiService: getPlacedStudents - Error response:', error?.error);
      return throwError(() => error);
    })
  );
}


  /**
   * GET /dashboard/{campusId}/placed-students
   * Get Placed Students for the campus with pagination.
   * Default 6 students per page, sorted by placement date (newest first).
   * 
   * @param campusId - Required campus ID (path parameter)
   * @param page - Page number (0-based, default: 0)
   * @param limit - Number of records per page (default: 6)
   * @returns Observable of ApiResponsePageStudent
   */
  /**
   * GET /dashboard/students/batches
   * Get all available batches for the campus.
   * This endpoint should return batches that have students in the current campus.
   * Optionally accepts campusId as query parameter if backend requires it.
   */
  getAllBatches(campusId?: string): Observable<BatchesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_BATCHES);
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    
    let params = new HttpParams();
    if (finalCampusId) {
      params = params.set('campusId', finalCampusId);
    }
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        
        if (raw && typeof raw === 'object') {
          const response = raw as BatchesResponse;
          return response;
        }
        
        console.warn('CampusApiService: getAllBatches - Response is not an object');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getAllBatches - Error:', error);
        console.error('CampusApiService: getAllBatches - Error status:', error?.status);
        console.error('CampusApiService: getAllBatches - Error URL:', error?.url);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/campus/{campusId}/students/batch
   * Get students by batch with pagination.
   * Maximum 6 students per page. Supports sorting by name, batch, or performance.
   * Note: API uses 0-indexed pagination (page=0 for first page)
   */
 getStudentsByBatch(
  batch: string,
  page = 0,
  size = 6,
  sortBy?: string,
  campusId?: string,
  departmentId?: string   // 🔥 NEW PARAM
): Observable<StudentsByBatchResponse | null> {

  // Automatically inject campus ID from storage if not provided
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: getStudentsByBatch - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to get students by batch'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_STUDENTS_BY_BATCH, { campusId: finalCampusId });

  let params = new HttpParams()
    .set('batch', batch)
    .set('page', page.toString())
    .set('size', size.toString());

  if (sortBy) {
    params = params.set('sortBy', sortBy);
  }

  // 🔥 department support (same pattern as placed students)
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        return raw as StudentsByBatchResponse;
      }
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: Error getting students by batch:', error);
      return throwError(() => error);
    })
  );
}


  /**
   * GET /student/campus/{campusId}
   * Get students by campus ID with autocomplete search.
   * 
   * Behavior:
   * - If search query is empty or < 2 characters: Returns first 20 students (default pagination 0-20)
   * - If search query has 2+ characters: Searches by student name (firstName/lastName) and returns matching results
   * 
   * Response format: { success: true, message: "Students fetched successfully", data: { content: [...], ...pagination... }, error: null }
   */
  getStudentsByCampusId(
    search = '',
    campusId?: string,
  ): Observable<StudentByCampusResponse> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getStudentsByCampusId - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get students'));
    }
    
    const url = this.buildUrl(
      resolvePathParams(API_ENDPOINTS.STUDENT.GET_STUDENTS_BY_CAMPUS, { campusId: finalCampusId })
    );
    
    let params = new HttpParams();
    if (search && search.trim().length >= 2) {
      params = params.set('search', search.trim());
    }
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const response = buildPagedApiResponse<StudentByCampusItem>(
          raw,
          'Students fetched successfully',
          true,
        ) as StudentByCampusResponse;

        if (response.data.content.length === 0 && response.data.totalElements === 0) {
          console.warn('CampusApiService: getStudentsByCampusId - ⚠️ No students found for campus ID:', finalCampusId);
          console.warn('CampusApiService: getStudentsByCampusId - This could mean:');
          console.warn('  1. No students are registered for this campus yet');
          console.warn('  2. Students exist but are not associated with this campus ID');
          console.warn('  3. Check if students need to be registered first');
        }

        return response;
      }),
      catchError((error) => {
        console.error('CampusApiService: getStudentsByCampusId - Error occurred:', error);
        console.error('CampusApiService: getStudentsByCampusId - Error status:', error?.status);
        console.error('CampusApiService: getStudentsByCampusId - Error URL:', error?.url);
        console.error('CampusApiService: getStudentsByCampusId - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /student/{studentId}/campus/{campusId}/batch-info
   * Get student campus and batch information.
   * Retrieves campus and batch information for a specific student by campus ID.
   * Returns campus ID, student ID, campus name, campus address, and batch (year of passing).
   */
  getStudentCampusBatchInfo(
    studentId: string,
    campusId?: string,
  ): Observable<StudentCampusBatchInfoResponse | null> {
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      return throwError(() => new Error('Campus ID is required to get student batch info'));
    }
    
    if (!studentId || studentId.trim().length === 0) {
      return throwError(() => new Error('Student ID is required'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.STUDENT.GET_STUDENT_CAMPUS_BATCH_INFO, { 
      studentId: studentId.trim(),
      campusId: finalCampusId 
    });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const dataObj = responseObj['data'] as Record<string, unknown>;
            
            const response: StudentCampusBatchInfoResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Student campus batch information retrieved successfully',
              data: {
                campusId: dataObj['campusId'] as string,
                studentId: dataObj['studentId'] as string,
                campusName: dataObj['campusName'] as string,
                campusAddress: dataObj['campusAddress'] as string,
                batch: dataObj['batch'] as string, // Year of passing
              },
              statusCode: typeof responseObj['statusCode'] === 'number' ? responseObj['statusCode'] : 200,
              timestamp: (responseObj['timestamp'] as string) || undefined,
            };
            
            return response;
          }
        }
        
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /dashboard/campus/{campusId}/companies
   * Add a company visited.
   * Request: multipart/form-data with companyName (string) and logo (file)
   * Response: { success: true, message: string, data: AddCompanyVisitedResponseData, error: null }
   */
 addCompanyVisited(
  campusId: string,
  formData: FormData,
  departmentId?: string
): Observable<AddCompanyVisitedResponse | null> {

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.ADD_COMPANY_VISITED,
    { campusId }
  );

  // 🔥 departmentId query param me jayega
  let params = new HttpParams();

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.post<unknown>(url, formData, {
    observe: 'response',
    params,
  }).pipe(
    map((httpResponse) => {
      const raw = httpResponse.body;

      if (httpResponse.status === 201 || httpResponse.status === 200) {
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;

          return {
            success: response['success'] as boolean,
            message: (response['message'] as string) || 'Company visited added successfully',
            data: response['data'] as AddCompanyVisitedResponseData,
            error: (response['error'] as string) || null,
          };
        }

        return {
          success: true,
          message: 'Company visited added successfully',
          data: {} as AddCompanyVisitedResponseData,
          error: null,
        };
      }

      return null;
    }),
    catchError((error) => {
      console.error('ADD COMPANY VISITED ERROR:', error);
      return throwError(() => error);
    })
  );
}

  /**
   * GET /dashboard/{campusId}/companies
   * Get companies visited with pagination.
   * Path param: campusId (required)
   * Query params: page (default 0), limit (default 6)
   * Response: Spring Page object with content array and pagination metadata at root level
   */
  getCompaniesVisited(page = 0, limit = 6, campusId?: string): Observable<GetCompaniesVisitedResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getCompaniesVisited - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get companies visited'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COMPANIES_VISITED, { campusId: finalCampusId });
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (Array.isArray(raw)) {
          const contentArray = raw as CompanyVisitedItem[];
          const response = raw as unknown as Record<string, unknown>;
          const totalPages = typeof response['totalPages'] === 'number' ? (response['totalPages'] as number) : 1;
          const totalElements =
            typeof response['totalElements'] === 'number' ? (response['totalElements'] as number) : contentArray.length;
          return {
            success: true,
            message: 'Companies fetched successfully',
            data: {
              content: contentArray,
              pageable: response['pageable'] as PageableInfo | undefined,
              totalPages,
              totalElements,
            },
            error: null,
          } as GetCompaniesVisitedResponse;
        }

        if (isRecord(raw)) {
          if (Array.isArray(raw['content'])) {
            const contentArray = raw['content'] as CompanyVisitedItem[];
            const totalPages = typeof raw['totalPages'] === 'number' ? (raw['totalPages'] as number) : 1;
            const totalElements =
              typeof raw['totalElements'] === 'number' ? (raw['totalElements'] as number) : contentArray.length;
            return {
              success: true,
              message: 'Companies fetched successfully',
              data: {
                content: contentArray,
                pageable: raw['pageable'] as PageableInfo | undefined,
                totalPages,
                totalElements,
              },
              error: null,
            } as GetCompaniesVisitedResponse;
          }

          if ('success' in raw && 'data' in raw) {
            const data = raw['data'];
            if (isRecord(data) && Array.isArray(data['content'])) {
              return buildPagedApiResponse<CompanyVisitedItem>(
                raw,
                'Companies fetched successfully',
                true,
              ) as GetCompaniesVisitedResponse;
            }
            if (Array.isArray(data)) {
              const contentArray = data as CompanyVisitedItem[];
              return {
                success: Boolean(raw['success']),
                message: (raw['message'] as string) || 'Companies fetched successfully',
                data: {
                  content: contentArray,
                  pageable: undefined,
                  totalPages: 1,
                  totalElements: contentArray.length,
                },
                error: (raw['error'] as string) || null,
              } as GetCompaniesVisitedResponse;
            }
            if (isRecord(data) && ('companyName' in data || 'id' in data)) {
              const contentArray = [data as CompanyVisitedItem];
              return {
                success: Boolean(raw['success']),
                message: (raw['message'] as string) || 'Companies fetched successfully',
                data: {
                  content: contentArray,
                  pageable: undefined,
                  totalPages: 1,
                  totalElements: 1,
                },
                error: (raw['error'] as string) || null,
              } as GetCompaniesVisitedResponse;
            }
          }
        }

        console.warn('CampusApiService: getCompaniesVisited - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService:  getCompaniesVisited - ERROR OCCURRED ❌❌❌');
        console.error('CampusApiService: Error type:', error?.constructor?.name);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error response:', error?.error);
        console.error('CampusApiService: Full error object:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /campus/{campusId}/courses
   * Add a new course to the campus catalog.
   * Course name must be unique within the campus.
   * Returns the created course with 201 status.
   */
addCourse(
  request: AddCourseRequest,
  campusId?: string,
  departmentId?: string
): Observable<AddCourseResponse | null> {
  // Automatically inject campus ID from storage if not provided
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: addCourse - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to add a course'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE, { campusId: finalCampusId });

  //  departmentId ko query param me bhejna hai
  let params = new HttpParams();
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  // Headers (same as before)
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  return this.http.post<unknown>(url, request, { headers, params }).pipe(
    map((raw) => {
      // Backend response format: { success: true, message: string, data: {...}, error: null }
      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj && 'data' in responseObj) {
          const response: AddCourseResponse = {
            success: responseObj['success'] as boolean,
            message: (responseObj['message'] as string) || 'Course added successfully',
            data: responseObj['data'] as AddCourseResponseData,
            error: (responseObj['error'] as string) || null,
          };

          // Ensure campusId exists
          if (response.data && !response.data.campusId) {
            response.data.campusId = finalCampusId;
          }

          return response;
        }
      }

      console.warn('CampusApiService: addCourse - Response format unexpected:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: addCourse - Error occurred:', error);
      console.error('CampusApiService: addCourse - Error status:', error?.status);
      console.error('CampusApiService: addCourse - Error URL:', error?.url);
      console.error('CampusApiService: addCourse - Error response:', error?.error);
      return throwError(() => error);
    })
  );
}


  /**
   * GET /campus/{campusId}/courses
   * Get all courses for the campus.
   * Returns course cards with course name, full title, available seats, and duration. Sorted alphabetically.
   * Response format: { success: true, message: null, data: AddCourseResponseData[], error: null }
   */
 getAllCourses(
  campusId?: string,
  departmentId?: string   // 🔥 NEW PARAM ADD
): Observable<AddCourseResponseData[]> {

  // campus flow same rahega (NO CHANGE)
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: getAllCourses - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to get courses'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_COURSES, { campusId: finalCampusId });

  // 🔥 departmentId param add
  let params = new HttpParams();

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  const headers = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  return this.http.get<unknown>(url, { headers, params }).pipe(
    map((raw) => {

      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj && 'data' in responseObj) {
          const success = responseObj['success'] as boolean;
          const data = responseObj['data'];

          if (success && Array.isArray(data)) {
            return data as AddCourseResponseData[];
          }
        }
      }

      console.warn('CampusApiService: getAllCourses - Response format unexpected:', raw);
      return [];
    }),
    catchError((error) => {
      console.error('CampusApiService: getAllCourses - Error occurred:', error);
      return throwError(() => error);
    })
  );
}

   /**
   * GET /dashboard/{campusId}/placed-students
   * Get Placed Students for the campus with pagination.
   * Default 6 students per page, sorted by placement date (newest first).
   * 
   * @param campusId - Required campus ID (path parameter)
   * @param page - Page number (0-based, default: 0)
   * @param limit - Number of records per page (default: 6)
   * @returns Observable of ApiResponsePageStudent
   */
   getDashboardPlacedStudents(
    campusId: string,
    page = 0,
    limit = 6,
    year?: number,
  ): Observable<ApiResponsePageStudent> {
    if (!campusId) {
      console.error('CampusApiService: getDashboardPlacedStudents - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get placed students'));
    }

    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PLACED_STUDENTS, { campusId });
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    // Add year parameter if provided
    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }

    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        const base = buildPagedApiResponse<PlacedStudentResponse>(
          raw,
          'Placed students retrieved successfully',
          false,
        ) as ApiResponsePageStudent;

        if (isRecord(raw)) {
          if (typeof raw['statusCode'] === 'number') {
            base.statusCode = raw['statusCode'] as number;
          }
          if (typeof raw['timestamp'] === 'string') {
            base.timestamp = raw['timestamp'] as string;
          }
        }
        return base;
      }),
      catchError((error) => {
        console.error('CampusApiService: getDashboardPlacedStudents - Error occurred:', error);
        console.error('CampusApiService: getDashboardPlacedStudents - Error status:', error?.status);
        console.error('CampusApiService: getDashboardPlacedStudents - Error URL:', error?.url);
        console.error('CampusApiService: getDashboardPlacedStudents - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/{campusId}/companies
   * Get Companies Visited
   * Frontend: "Companies Visited GET" – retrieves companies that have visited the campus with pagination.
   * Default 6 companies per page, sorted by visited date (newest first).
   * 
   * @param campusId - Required campus ID (path parameter)
   * @param page - Page number (0-based, default: 0)
   * @param limit - Number of records per page (default: 6)
   * @returns Observable of GetCompaniesVisitedResponse
   */
  getDashboardCompanies(
    campusId: string,
    page = 0,
    limit = 6,
  ): Observable<GetCompaniesVisitedResponse> {
    if (!campusId) {
      console.error('CampusApiService: getDashboardCompanies - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get companies'));
    }

    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COMPANIES_VISITED, { campusId });
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) =>
        buildPagedApiResponse<CompanyVisitedItem>(
          raw,
          'Companies retrieved successfully',
          true,
        ) as GetCompaniesVisitedResponse,
      ),
      catchError((error) => {
        console.error('CampusApiService: getDashboardCompanies - Error occurred:', error);
        console.error('CampusApiService: getDashboardCompanies - Error status:', error?.status);
        console.error('CampusApiService: getDashboardCompanies - Error URL:', error?.url);
        console.error('CampusApiService: getDashboardCompanies - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/courses/{courseId}
   * Get course by ID.
   * Retrieves course details by course ID. Validates that the course belongs to the specified campus.
   * Response format: { success: true, message: null, data: AddCourseResponseData, error: null }
   */
  getCourseById(courseId: string, campusId?: string): Observable<AddCourseResponseData | null> {
    if (!courseId || !courseId.trim()) {
      console.error('CampusApiService: getCourseById - Course ID is required');
      return throwError(() => new Error('Course ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getCourseById - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get course'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COURSE_BY_ID, { 
      campusId: finalCampusId,
      courseId: courseId.trim()
    });
    
    // Add cache-control headers to ensure requests show in Network tab
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    
    return this.http.get<unknown>(url, { headers }).pipe(
      map((raw) => {
        
        // Backend response format: { success: true, message: null, data: AddCourseResponseData, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const success = responseObj['success'] as boolean;
            const data = responseObj['data'];
            
            if (success && data && typeof data === 'object') {
              const course = data as AddCourseResponseData;
              return course;
            }
          }
        }
        
        console.warn('CampusApiService: getCourseById - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getCourseById - Error occurred:', error);
        console.error('CampusApiService: getCourseById - Error status:', error?.status);
        console.error('CampusApiService: getCourseById - Error URL:', error?.url);
        console.error('CampusApiService: getCourseById - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/courses/check-name
   * Check course name exists.
   * Checks if a course name already exists in the campus. Used for real-time validation in the frontend.
   * Response format: { success: true, message: null, data: true, error: null }
   */
  checkCourseNameExists(courseName: string, campusId?: string): Observable<boolean> {
    if (!courseName || !courseName.trim()) {
      console.error('CampusApiService: checkCourseNameExists - Course name is required');
      return throwError(() => new Error('Course name is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: checkCourseNameExists - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to check course name'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.CHECK_COURSE_NAME, { campusId: finalCampusId });
    const params = new HttpParams().set('courseName', courseName.trim());
    
    
    // Add cache-control headers to ensure requests show in Network tab
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    
    return this.http.get<unknown>(url, { params, headers }).pipe(
      map((raw) => {
        
        // Backend response format: { success: true, message: null, data: true, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const success = responseObj['success'] as boolean;
            const data = responseObj['data'];
            
            if (success && typeof data === 'boolean') {
              const exists = data as boolean;
              return exists;
            }
          }
        }
        
        console.warn('CampusApiService: checkCourseNameExists - Response format unexpected:', raw);
        return false;
      }),
      catchError((error) => {
        console.error('CampusApiService: checkCourseNameExists - Error occurred:', error);
        console.error('CampusApiService: checkCourseNameExists - Error status:', error?.status);
        console.error('CampusApiService: checkCourseNameExists - Error URL:', error?.url);
        console.error('CampusApiService: checkCourseNameExists - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * DELETE /campus/{campusId}/courses/{courseId}
   * Delete course by ID.
   * Deletes a course from the campus catalog. Validates that the course belongs to the specified campus.
   * Response format: { success: true, message: "Course deleted successfully", data: null, error: null }
   */
  deleteCourse(
  courseId: string,
  campusId?: string,
  departmentId?: string
): Observable<{ success: boolean; message: string | null; data: null; error: string | null } | null> {

  if (!courseId || !courseId.trim()) {
    console.error('CampusApiService: deleteCourse - Course ID is required');
    return throwError(() => new Error('Course ID is required'));
  }

  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: deleteCourse - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to delete course'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_COURSE, {
    campusId: finalCampusId,
    courseId: courseId.trim()
  });

  // 🔥 IMPORTANT — departmentId query param
  let params = new HttpParams();
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  const headers = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  return this.http.delete<unknown>(url, { headers, params }).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const responseObj = raw as Record<string, unknown>;
        return {
          success: responseObj['success'] as boolean,
          message: (responseObj['message'] as string) || null,
          data: null,
          error: (responseObj['error'] as string) || null,
        };
      }
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: deleteCourse - Error occurred:', error);
      return throwError(() => error);
    })
  );
}








  /**
   * POST /campus/{campusId}/faculty
   * Add a new faculty member. Supports JSON (no photo) or multipart/form-data (with photo upload).
   * When photo is provided, uses multipart with `request` (JSON string) and `photo` (binary).
   * When no photo, uses application/json body.
   *
   * Response: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  addFaculty(
    data: { basicInformation: unknown; professionalInformation: unknown },
    campusId?: string,
    departmentId?: string,
    photo?: File | null
  ): Observable<AddFacultyResponse | null> {
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: addFaculty - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to add faculty'));
    }

    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_FACULTY, { campusId: finalCampusId });

    let params = new HttpParams();
    if (departmentId && departmentId.trim()) {
      params = params.set('departmentId', departmentId.trim());
    }
    const httpParams = params.keys().length ? params : undefined;

    if (photo && photo instanceof File) {
      const formData = new FormData();
      formData.append('request', JSON.stringify(data));
      formData.append('photo', photo, photo.name || 'photo');
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.post<unknown>(url, formData, { headers, params: httpParams }).pipe(
        map((raw) => this.parseAddFacultyResponse(raw)),
        catchError((err) => this.handleAddFacultyError(err))
      );
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    return this.http.post<unknown>(url, data, { headers, params: httpParams }).pipe(
      map((raw) => this.parseAddFacultyResponse(raw)),
      catchError((err) => this.handleAddFacultyError(err))
    );
  }

  private parseAddFacultyResponse(raw: unknown): AddFacultyResponse | null {
    if (!raw || typeof raw !== 'object') return null;
    const responseObj = raw as Record<string, unknown>;
    if (!('success' in responseObj) || !('data' in responseObj)) return null;
    const dataObj = responseObj['data'] as Record<string, unknown>;
    if (
      !dataObj ||
      typeof dataObj !== 'object' ||
      !('basicInformation' in dataObj) ||
      !('professionalInformation' in dataObj) ||
      typeof dataObj['basicInformation'] !== 'object' ||
      typeof dataObj['professionalInformation'] !== 'object'
    ) {
      console.warn('CampusApiService: addFaculty - Response format unexpected:', raw);
      return null;
    }
    return {
      success: responseObj['success'] as boolean,
      message: (responseObj['message'] as string) || 'Faculty member added successfully',
      data: {
        basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
        professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
      },
      error: (responseObj['error'] as string) || null,
    };
  }

  private handleAddFacultyError(error: unknown): Observable<never> {
    console.error('CampusApiService: addFaculty - Error occurred:', error);
    const err = error as { status?: number; url?: string; error?: unknown };
    if (err?.status != null) console.error('CampusApiService: addFaculty - Error status:', err.status);
    if (err?.url) console.error('CampusApiService: addFaculty - Error URL:', err.url);
    if (err?.error != null) console.error('CampusApiService: addFaculty - Error response:', err.error);
    return throwError(() => error);
  }
  // ----------------------- add create notice ------------
/**
 * POST /notice-board/campus/{campusId}
 * Create notice for campus / department
 */
createNotice(
  title: string,
  description: string,
  departmentId?: string,
  campusId?: string
): Observable<unknown> {

  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID is required'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.CREATE_NOTICE,
    { campusId: finalCampusId }
  );

  let params = new HttpParams();

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.post(
    url,
    {
      title: title,
      description: description
    },
    { params }
  ).pipe(
    catchError((error) => {
      console.error('Notice creation failed:', error);
      return throwError(() => error);
    })
  );
}

// ----------------------- update notice --------------
updateNotice(
  noticeId: string,
  title: string,
  description: string,
  departmentId?: string,
  campusId?: string
): Observable<UpdateNoticeResponse | null> {

  if (!noticeId || !noticeId.trim()) {
    return throwError(() => new Error('Notice ID required'));
  }

  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_NOTICE, {
    campusId: finalCampusId,
    noticeId: noticeId.trim()
  });

  const requestBody: {
    title: string;
    description: string;
    departmentId?: string;
  } = {
    title: title.trim(),
    description: description.trim()
  };

  if (departmentId && departmentId.trim()) {
    requestBody.departmentId = departmentId.trim();
  }

  return this.http.put<unknown>(url, requestBody).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;
        return {
          success: res['success'] as boolean,
          message: res['message'] as string,
          data: res['data'],
          error: res['error'] as string
        };
      }
      return null;
    })
  );
}




// ---------------- GET ALL NOTICES ----------------

// ---------------- GET ALL NOTICES ----------------

getAllNotices(
  page = 0,
  limit = 6,
  campusId?: string,
  departmentId?: string
): Observable<{
  success: boolean;
  message: string | null;
  data: {
    content: NoticeItem[];
    totalPages: number;
    totalElements: number;
  };
  error: string | null;
} | null> {

  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.GET_ALL_NOTICES,
    { campusId: finalCampusId }
  );

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', limit.toString());

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (!raw || typeof raw !== 'object' || raw === null) return null;
      const res = raw as Record<string, unknown>;
      if (!('success' in res) || !('data' in res)) return null;

      const data = res['data'];

      const mapItem = (item: Record<string, unknown>): NoticeItem => ({
        id: (item['id'] as string) ?? '',
        noticeId: (item['noticeId'] as string) ?? '',
        campusId: (item['campusId'] as string) ?? '',
        departmentId: item['departmentId'] as string | undefined,
        title: (item['title'] as string) ?? '',
        message: (item['description'] as string) ?? '',
        createdByType: (item['createdByType'] as string) ?? '',
        createdAt: (item['createdAt'] as string) ?? '',
        updatedAt: (item['updatedAt'] as string) ?? ''
      });

      // Paginated response: data = { content, totalPages, totalElements, ... }
      if (data && typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>)['content'])) {
        const paginated = data as Record<string, unknown>;
        const content = (paginated['content'] as Record<string, unknown>[]) ?? [];
        const totalPages = typeof paginated['totalPages'] === 'number' ? paginated['totalPages'] : 1;
        const totalElements = typeof paginated['totalElements'] === 'number' ? paginated['totalElements'] : content.length;
        const mapped: NoticeItem[] = content.map((item) => mapItem(item as Record<string, unknown>));
        return {
          success: res['success'] as boolean,
          message: (res['message'] as string) ?? null,
          data: { content: mapped, totalPages, totalElements },
          error: (res['error'] as string) ?? null
        };
      }

      // Legacy: data is array
      if (Array.isArray(data)) {
        const mapped: NoticeItem[] = (data as Record<string, unknown>[]).map((item) => mapItem(item));
        return {
          success: res['success'] as boolean,
          message: (res['message'] as string) ?? null,
          data: { content: mapped, totalPages: 1, totalElements: mapped.length },
          error: (res['error'] as string) ?? null
        };
      }

      return null;
    })
  );
}






// ----------------- get notice by id ---------------

// ----------------- get notice by id ---------------


getNoticeById(
  noticeId: string,
  campusId?: string,
  departmentId?: string
): Observable<NoticeDetailResponse | null> {

  if (!noticeId || !noticeId.trim()) {
    return throwError(() => new Error('Notice ID required'));
  }

  const finalCampusId = campusId || this.getCampusId();

  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.GET_NOTICE_BY_ID,
    {
      campusId: finalCampusId,
      noticeId: noticeId.trim()
    }
  );

  let params = new HttpParams();

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(

    map((raw) => {

      if (!raw || typeof raw !== 'object') return null;

      const res = raw as Record<string, unknown>;
      const data = res['data'] as Record<string, unknown> | undefined;

      if (!data) return null;

      return {
        success: (res['success'] as boolean) ?? true,
        message: (res['message'] as string) ?? null,
        error: (res['error'] as string) ?? null,
        data: {
          id: data['id'] as string,
          noticeId: data['noticeId'] as string,
          campusId: data['campusId'] as string,
          departmentId: data['departmentId'] as string | undefined,
          title: (data['title'] as string) ?? '',
          message: (data['description'] as string) ?? '', // 🔥 FIX HERE
          createdByType: data['createdByType'] as string,
          createdAt: data['createdAt'] as string,
          updatedAt: data['updatedAt'] as string,
        }
      };
    }),

    catchError((error) => {
      console.error('getNoticeById error:', error);
      return throwError(() => error);
    })
  );
}




// ----------------------- delete notice -----------------
// ---------------- DELETE NOTICE ----------------

deleteNotice(
  noticeId: string,
  campusId?: string,
  departmentId?: string
): Observable<{ success: boolean; message: string | null; data: null; error: string | null } | null> {

  if (!noticeId || !noticeId.trim()) {
    console.error('CampusApiService: deleteNotice - Notice ID is required');
    return throwError(() => new Error('Notice ID is required'));
  }

  // faculty jaisa auto campus inject
  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    console.error('CampusApiService: deleteNotice - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to delete notice'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.DELETE_NOTICE,
    {
      campusId: finalCampusId,
      noticeId: noticeId.trim()
    }
  );

  // 👇 departmentId query param (important)
  let params = new HttpParams();

  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.delete<unknown>(url, { params }).pipe(
    map((raw) => {

      // Backend response expected:
      // { success: true, message: "...", data: null, error: null }

      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj) {
          return {
            success: responseObj['success'] as boolean,
            message: (responseObj['message'] as string) || 'Notice deleted successfully',
            data: null,
            error: (responseObj['error'] as string) || null,
          };
        }
      }

      console.warn('CampusApiService: deleteNotice - Unexpected response format:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: deleteNotice - Error occurred:', error);
      console.error('Status:', error?.status);
      console.error('URL:', error?.url);
      console.error('Response:', error?.error);
      return throwError(() => error);
    })
  );
}



createDepartment(
  campusId: string,
  formData: FormData
): Observable<AddDepartmentResponse | null> {

  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    console.error('CampusApiService: createDepartment - Campus ID missing');
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.CREATE_DEPARTMENT, {
    campusId: finalCampusId,
  });

  return this.http.post<unknown>(url, formData).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        const response: AddDepartmentResponse = {
          success: res['success'] as boolean,
          message: (res['message'] as string) || 'Department created',
          data: res['data'],
          error: res['error'] as string | null,
        };

        return response;
      }
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: createDepartment error:', error);
      return throwError(() => error);
    })
  );
}

// ------------------------ get department by campus id ---------------


getDepartments(
  campusId: string,
  page = 0,
  limit = 3
): Observable<GetDepartmentsResponse> {
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_DEPARTMENTS, { campusId });

  const params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) =>
      buildPagedApiResponse<DepartmentItem>(
        raw,
        'Departments retrieved successfully',
        true
      ) as GetDepartmentsResponse
    ),
    catchError((error) => {
      console.error('CampusApiService: getDepartments - Error:', error);
      return throwError(() => error);
    })
  );
}

// ------------- get department all --------------
getAllDepartmentsByCampus(
  campusId: string
): Observable<GetAllDepartmentsResponse | null> {

  if (!campusId) {
    console.error('CampusApiService: getAllDepartmentsByCampus - Campus ID required');
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_DEPARTMENTS, { campusId });

  return this.http.get<unknown>(url).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        return {
          success: res['success'] as boolean,
          message: res['message'] as string | null,
          data: (res['data'] as DepartmentDropdownItem[]) || [],
          error: res['error'] as string | null,
        };
      }
      return null;
    }),
    catchError((error) => {
      console.error('getAllDepartmentsByCampus error:', error);
      return throwError(() => error);
    })
  );
}

// ------------------- get department by id ---------------
getDepartmentById(
  departmentId: string
): Observable<DepartmentDetailItem | null> {

  if (!departmentId) {
    console.error('CampusApiService: getDepartmentById - departmentId required');
    return throwError(() => new Error('departmentId required'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.GET_DEPARTMENT_BY_ID,
    { departmentId }
  );

  return this.http.get<unknown>(url).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        return res['data'] as DepartmentDetailItem;
      }
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: getDepartmentById - Error:', error);
      return throwError(() => error);
    })
  );
}

// --------------------- delete department --------------

deleteDepartment(
  departmentId: string,
  campusEmail?: string
): Observable<DeleteDepartmentResponse | null> {

  if (!departmentId || !departmentId.trim()) {
    console.error('CampusApiService: deleteDepartment - Department ID required');
    return throwError(() => new Error('Department ID required'));
  }

  if (!campusEmail || !campusEmail.trim()) {
    console.error('CampusApiService: deleteDepartment - Campus email required');
    return throwError(() => new Error('Campus email required'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_DEPARTMENT, {
    departmentId: departmentId.trim(),
  });

  const params = new HttpParams().set('campusEmail', campusEmail.trim());

  return this.http.delete<unknown>(url, { params }).pipe(
    map((raw) => {

      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        const response: DeleteDepartmentResponse = {
          success: res['success'] as boolean,
          message: (res['message'] as string) || 'Department deleted successfully',
          data: null,
          error: (res['error'] as string) || null,
        };

        return response;
      }

      console.warn('CampusApiService: deleteDepartment - Unexpected response format', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: deleteDepartment - Error:', error);
      return throwError(() => error);
    })
  );
}

// ------------------------- update department ------------

updateDepartment(
  departmentId: string,
  data: {
    departmentName?: string;
    email?: string;
    phone?: string;
    aboutDepartment?: string;
    photo?: File | null;
  },
  campusEmail?: string   // campusEmail required as query param
): Observable<AddDepartmentResponse | null> {

  // ---------- validation ----------
  if (!departmentId || !departmentId.trim()) {
    console.error('CampusApiService: updateDepartment - Department ID required');
    return throwError(() => new Error('Department ID required'));
  }

  if (!campusEmail || !campusEmail.trim()) {
    console.error('CampusApiService: updateDepartment - Campus email required');
    return throwError(() => new Error('Campus email required'));
  }

  // ---------- endpoint ----------
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_DEPARTMENT, {
    departmentId: departmentId.trim(),
  });

  // ---------- query param ----------
  const params = new HttpParams().set('campusEmail', campusEmail.trim());

  // ---------- multipart body ----------
  const formData = new FormData();

  if (data.departmentName) {
    formData.append('departmentName', data.departmentName);
  }

  if (data.email) {
    formData.append('email', data.email);
  }

  if (data.phone) {
    formData.append('phone', data.phone);
  }

  if (data.aboutDepartment) {
    formData.append('aboutDepartment', data.aboutDepartment);
  }

  if (data.photo) {
    formData.append('photo', data.photo);
  }

  // ---------- API call ----------
  return this.http.put<unknown>(url, formData, { params }).pipe(
    map((raw) => {

      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        const response: AddDepartmentResponse = {
          success: res['success'] as boolean,
          message: (res['message'] as string) || 'Department updated successfully',
          data: res['data'],
          error: (res['error'] as string) || null,
        };

        return response;
      }

      console.warn('CampusApiService: updateDepartment - Unexpected response', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: updateDepartment - Error:', error);
      console.error('Status:', error?.status);
      console.error('URL:', error?.url);
      console.error('Response:', error?.error);
      return throwError(() => error);
    })
  );
}






// ---------------------- get department by email ----------------

getDepartmentByEmail(
  email: string
): Observable<DepartmentByEmailResponse | null> {

  if (!email) {
    console.error('CampusApiService: email required');
    return throwError(() => new Error('email required'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_DEPARTMENT_BY_EMAIL);

  const params = new HttpParams().set('email', email);

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        return {
          success: res['success'] as boolean,
          message: res['message'] as string | null,
          data: res['data'] as {
            departmentId: string;
            email: string;
            userId: string | null;
          },
          error: res['error'] as string | null,
        };
      }
      return null;
    }),
    catchError((error) => {
      console.error('getDepartmentByEmail error:', error);
      return throwError(() => error);
    })
  );
}









  /**
   * PUT /campus/{campusId}/faculty/{facultyId}
   * Updates faculty member details. Supports JSON or multipart/form-data (when photo is provided).
   * Optional departmentId query param.
   *
   * Response: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  updateFaculty(
    facultyId: string,
    data: {
      basicInformation?: { fullName?: string; email?: string; dateOfBirth?: string; phoneNumber?: string };
      professionalInformation?: {
        designation?: string[];
        department?: string[];
        specialization?: string[];
        yearsOfExperience?: number[];
        qualifications?: string[];
        certificates?: string[];
      };
      department?: string[];
      specialization?: string[];
      yearsOfExperience?: number[];
      qualifications?: string[];
      certificates?: string[];
      photo?: string;
    },
    campusId?: string,
    departmentId?: string,
    photo?: File | null
  ): Observable<UpdateFacultyResponse | null> {
    if (!facultyId || !facultyId.trim()) {
      console.error('CampusApiService: updateFaculty - Faculty ID is required');
      return throwError(() => new Error('Faculty ID is required'));
    }

    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: updateFaculty - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to update faculty'));
    }

    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_FACULTY, {
      campusId: finalCampusId,
      facultyId: facultyId.trim(),
    });

    let params = new HttpParams();
    if (departmentId && departmentId.trim()) {
      params = params.set('departmentId', departmentId.trim());
    }
    const httpParams = params.keys().length ? { params } : {};

    // Build request body: FacultyUpdateRequest supports basicInformation + professionalInformation
    const requestBody: Record<string, unknown> = {};
    if (data['basicInformation'] && typeof data['basicInformation'] === 'object') {
      requestBody['basicInformation'] = data['basicInformation'];
    }
    if (data['professionalInformation'] && typeof data['professionalInformation'] === 'object') {
      requestBody['professionalInformation'] = data['professionalInformation'];
    } else if (data.department || data.specialization || data.yearsOfExperience || data.qualifications || data.certificates) {
      requestBody['professionalInformation'] = {
        department: data.department,
        specialization: data.specialization,
        yearsOfExperience: data.yearsOfExperience,
        qualifications: data.qualifications,
        certificates: data.certificates,
      };
    }
    if (!photo && data['photo'] && typeof data['photo'] === 'string' && (data['photo'] as string).trim()) {
      requestBody['photo'] = (data['photo'] as string).trim();
    }

    if (photo && photo instanceof File) {
      const formData = new FormData();
      formData.append('request', JSON.stringify(requestBody));
      formData.append('photo', photo, photo.name || 'photo');
      const headers = new HttpHeaders({ Accept: 'application/json' });
      return this.http.put<unknown>(url, formData, { headers, ...httpParams }).pipe(
        map((raw) => this.parseUpdateFacultyResponse(raw)),
        catchError((err) => this.handleUpdateFacultyError(err))
      );
    }

    return this.http.put<unknown>(url, requestBody, httpParams).pipe(
      map((raw) => this.parseUpdateFacultyResponse(raw)),
      catchError((err) => this.handleUpdateFacultyError(err))
    );
  }

  private parseUpdateFacultyResponse(raw: unknown): UpdateFacultyResponse | null {
    if (!raw || typeof raw !== 'object') return null;
    const responseObj = raw as Record<string, unknown>;
    if (!('success' in responseObj) || !('data' in responseObj)) return null;
    const data = responseObj['data'];
    if (!data || typeof data !== 'object') return null;
    const dataObj = data as Record<string, unknown>;
    if (!('basicInformation' in dataObj) || !('professionalInformation' in dataObj)) {
      console.warn('CampusApiService: updateFaculty - Response format unexpected:', raw);
      return null;
    }
    return {
      success: responseObj['success'] as boolean,
      message: (responseObj['message'] as string) || null,
      data: {
        basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
        professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
      },
      error: (responseObj['error'] as string) || null,
    };
  }

  private handleUpdateFacultyError(error: unknown): Observable<never> {
    console.error('CampusApiService: updateFaculty - Error occurred:', error);
    const err = error as { status?: number; url?: string; error?: unknown };
    if (err?.status != null) console.error('CampusApiService: updateFaculty - Error status:', err.status);
    if (err?.url) console.error('CampusApiService: updateFaculty - Error URL:', err.url);
    if (err?.error != null) console.error('CampusApiService: updateFaculty - Error response:', err.error);
    return throwError(() => error);
  }

  /**
   * GET /campus/{campusId}/faculty
   * Retrieves all faculty members for the campus. Returns list sorted alphabetically by name.
   * 
   * Response: { success: true, message: string, data: FacultyListItem[], error: null }
   */
getAllFaculties(
  campusId?: string,
  departmentId?: string,
  page?: number,
  pageSize?: number
): Observable<GetAllFacultiesResponse | null> {

  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: getAllFaculties - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to get faculty members'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_FACULTY, {
    campusId: finalCampusId
  });

  const userType = this.roleService.getUserType();
  let params = new HttpParams();
  if (userType === 'DEPARTMENT') {
    const finalDepartmentId = this.getDepartmentId(departmentId);
    if (finalDepartmentId) {
      params = params.set('departmentId', finalDepartmentId);
    }
  }
  if (page != null && page >= 0) {
    params = params.set('page', String(page));
  }
  if (pageSize != null && pageSize > 0) {
    params = params.set('size', String(pageSize));
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {

      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj && 'data' in responseObj) {
          const data = responseObj['data'];

          if (Array.isArray(data)) {
            return {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: data as FacultyListItem[],
              error: (responseObj['error'] as string) || null,
              totalPages: 1,
            } as GetAllFacultiesResponse;
          }

          // Paginated response: data = { content, totalPages, ... }
          if (data && typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>)['content'])) {
            const paginated = data as Record<string, unknown>;
            const content = paginated['content'] as FacultyListItem[];
            const totalPages = typeof paginated['totalPages'] === 'number'
              ? paginated['totalPages']
              : 1;
            return {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: content,
              error: (responseObj['error'] as string) || null,
              totalPages,
            } as GetAllFacultiesResponse;
          }
        }
      }

      console.warn('CampusApiService: getAllFaculties - Response format unexpected:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: getAllFaculties - Error occurred:', error);
      return throwError(() => error);
    })
  );
}


  /**
   * GET /campus/{campusId}/faculty/{facultyId}
   * Get faculty by ID.
   * Retrieves basic faculty information by faculty ID. Validates that the faculty belongs to the specified campus.
   * 
   * Response: { success: true, message: null, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  getFacultyById(facultyId: string, campusId?: string): Observable<GetFacultyByIdResponse | null> {
    if (!facultyId || !facultyId.trim()) {
      console.error('CampusApiService: getFacultyById - Faculty ID is required');
      return throwError(() => new Error('Faculty ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getFacultyById - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get faculty by ID'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_BY_ID, { 
      campusId: finalCampusId,
      facultyId: facultyId.trim()
    });
    
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Backend response structure: { success: true, message: null, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has expected structure: { success, message, data, error }
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            
            // Verify data has basicInformation and professionalInformation
            if (data && typeof data === 'object' && data !== null) {
              const dataObj = data as Record<string, unknown>;
              
              if ('basicInformation' in dataObj && 'professionalInformation' in dataObj) {
                const response: GetFacultyByIdResponse = {
                  success: responseObj['success'] as boolean,
                  message: (responseObj['message'] as string) || null,
                  data: {
                    basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
                    professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
                  },
                  error: (responseObj['error'] as string) || null,
                };
                
                return response;
              }
            }
          }
        }
        
        console.warn('CampusApiService: getFacultyById - Unexpected response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getFacultyById - Error occurred:', error);
        console.error('CampusApiService: getFacultyById - Error status:', error?.status);
        console.error('CampusApiService: getFacultyById - Error URL:', error?.url);
        console.error('CampusApiService: getFacultyById - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/faculty/{facultyId}/profile
   * Get faculty profile (detailed view).
   * Retrieves detailed faculty profile optimized for modal display. Includes formatted fields like designation display and experience display. Validates that the faculty belongs to the specified campus.
   * 
   * Response: { success: true, message: null, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  getFacultyProfile(facultyId: string, campusId?: string): Observable<GetFacultyProfileResponse | null> {
    if (!facultyId || !facultyId.trim()) {
      console.error('CampusApiService: getFacultyProfile - Faculty ID is required');
      return throwError(() => new Error('Faculty ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getFacultyProfile - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get faculty profile'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_PROFILE, { 
      campusId: finalCampusId,
      facultyId: facultyId.trim()
    });
    
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Backend response structure: { success: true, message: null, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            
            // Verify data has basicInformation and professionalInformation
            if (data && typeof data === 'object' && data !== null) {
              const dataObj = data as Record<string, unknown>;
              
              if ('basicInformation' in dataObj && 'professionalInformation' in dataObj) {
                const response: GetFacultyProfileResponse = {
                  success: responseObj['success'] as boolean,
                  message: (responseObj['message'] as string) || null,
                  data: {
                    basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
                    professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
                  },
                  error: (responseObj['error'] as string) || null,
                };
                
                return response;
              }
            }
          }
        }
        
        console.warn('CampusApiService: getFacultyProfile - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getFacultyProfile - Error occurred:', error);
        console.error('CampusApiService: getFacultyProfile - Error status:', error?.status);
        console.error('CampusApiService: getFacultyProfile - Error URL:', error?.url);
        console.error('CampusApiService: getFacultyProfile - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }


  /**
   * DELETE /campus/{campusId}/faculty/{facultyId}
   * Delete faculty member.
   * Deletes a faculty member and removes associated photo file. Validates that the faculty belongs to the specified campus.
   * 
   * Response: { success: true, message: "Faculty deleted successfully", data: null, error: null }
   */
  deleteFaculty(facultyId: string, campusId?: string): Observable<DeleteFacultyResponse | null> {
    if (!facultyId || !facultyId.trim()) {
      console.error('CampusApiService: deleteFaculty - Faculty ID is required');
      return throwError(() => new Error('Faculty ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: deleteFaculty - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to delete faculty'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_FACULTY, { 
      campusId: finalCampusId,
      facultyId: facultyId.trim()
    });
    
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        
        // Backend response structure: { success: true, message: "Faculty deleted successfully", data: null, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Ensure response has expected structure
          if ('success' in responseObj) {
            const response: DeleteFacultyResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Faculty deleted successfully',
              data: null,
              error: (responseObj['error'] as string) || null,
            };
            
            return response;
          }
        }
        
        console.warn('CampusApiService: deleteFaculty - Unexpected response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: deleteFaculty - Error occurred:', error);
        console.error('CampusApiService: deleteFaculty - Error status:', error?.status);
        console.error('CampusApiService: deleteFaculty - Error URL:', error?.url);
        console.error('CampusApiService: deleteFaculty - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/faculty/check-email?email={email}
   * Checks if a faculty email already exists in the campus. Used for real-time validation in the frontend.
   * 
   * Response: { success: true, message: "email is available and can be used for registration.", data: false, error: null }
   * Note: data is boolean - false means email is available, true means email already exists
   */
  checkFacultyEmail(email: string, campusId?: string): Observable<CheckEmailResponse | null> {
    if (!email || !email.trim()) {
      console.error('CampusApiService: checkFacultyEmail - Email is required');
      return throwError(() => new Error('Email is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: checkFacultyEmail - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to check faculty email'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.CHECK_FACULTY_EMAIL, { campusId: finalCampusId });
    const params = new HttpParams().set('email', email.trim());
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        
        // Backend response structure: { success: true, message: string, data: boolean, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: CheckEmailResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Check completed successfully',
              data: responseObj['data'] as boolean, // boolean: false = available, true = exists
              error: (responseObj['error'] as string) || null,
            };
            
            return response;
          }
        }
        
        console.warn('CampusApiService: checkFacultyEmail - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: checkFacultyEmail - Error occurred:', error);
        console.error('CampusApiService: checkFacultyEmail - Error status:', error?.status);
        console.error('CampusApiService: checkFacultyEmail - Error URL:', error?.url);
        console.error('CampusApiService: checkFacultyEmail - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  

  // --------------  get public id ------------

  // ================== PUBLIC CAMPUS LANDING (GUEST) ==================

getPublicCampusAbout(
  publicCampusId: string,
  publicDepartmentId?: string   // 🔥 renamed for clarity
): Observable<string | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_ABOUT,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  // 🔥 Use publicDepartmentId for PUBLIC landing
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map(raw => unwrapApiResponse<string>(raw)),
    catchError(error => {
      console.error(
        'CampusApiService: getPublicCampusAbout error:',
        error
      );
      return throwError(() => error);
    })
  );
}


// ---------------- COURSES ----------------
getPublicCampusCourses(
  publicCampusId: string,
  page = 1,
  size = 4,
  publicDepartmentId?: string   // 🔥 NEW PARAM
): Observable<unknown[]> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_COURSES,
      { publicCampusId }
    )
  );

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  // 🔥 department support WITHOUT breaking campus public flow
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  console.log(
    'CampusApiService: getPublicCampusCourses - URL:',
    url,
    'Params:',
    { page, size, publicCampusId, publicDepartmentId }
  );

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) => {

      console.log(
        'CampusApiService: getPublicCampusCourses - Raw response:',
        raw
      );

      // unwrap first
      const unwrapped = unwrapApiResponse<unknown[]>(raw);

      if (Array.isArray(unwrapped)) {
        return unwrapped;
      }

      // fallback extraction
      if (raw && typeof raw === 'object') {
        const rec = raw as Record<string, unknown>;

        if (rec['data'] && typeof rec['data'] === 'object') {
          const data = rec['data'] as Record<string, unknown>;

          if (Array.isArray(data['content'])) {
            return data['content'] as unknown[];
          }

          if (Array.isArray(data['data'])) {
            return data['data'] as unknown[];
          }

          if (Array.isArray(rec['data'])) {
            return rec['data'] as unknown[];
          }
        }

        if (Array.isArray(rec['content'])) {
          return rec['content'] as unknown[];
        }

        if (Array.isArray(rec['data'])) {
          return rec['data'] as unknown[];
        }
      }

      console.warn(
        'CampusApiService: getPublicCampusCourses - Empty response fallback'
      );

      return [];
    })
  );
}

// ---------------- FACULTIES ----------------
getPublicCampusFaculties(
  publicCampusId: string,
  page = 1,
  size = 6,
  publicDepartmentId?: string   // 🔥 renamed for clarity
): Observable<unknown[]> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_FACULTIES,
      { publicCampusId }
    )
  );

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  // 🔥 PUBLIC department filter support
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) => unwrapApiResponse<unknown[]>(raw) ?? [])
  );
}


// ---------------- TESTIMONIALS ----------------
getPublicCampusTestimonials(
  publicCampusId: string,
  page = 0,
  size = 5,
  publicDepartmentId?: string   // 🔥 public department support
): Observable<{ content: unknown[]; totalPages: number } | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_TESTIMONIALS,
      { publicCampusId }
    )
  );

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  // 🔥 PUBLIC department filter
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null;
      const rec = raw as Record<string, unknown>;
      const data = rec['data'] as Record<string, unknown> | undefined;
      if (!data) return null;
      const content = Array.isArray(data['content']) ? data['content'] : [];
      const totalPages = typeof data['totalPages'] === 'number' ? data['totalPages'] : 1;
      return { content, totalPages };
    })
  );
}


// ---------------- FOLLOWERS COUNT ----------------
getPublicCampusFollowers(
  publicCampusId: string,
  publicDepartmentId?: string   // 🔥 NEW
): Observable<{ campusId: string; followerCount: number } | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_FOLLOWERS,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  // 🔥 PUBLIC department filter support
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) =>
      unwrapApiResponse<{ campusId: string; followerCount: number }>(raw)
    )
  );
}


// ---------------- PROMOTIONS COUNT ----------------
// ---------------- PROMOTIONS COUNT ----------------
getPublicCampusPromotions(
  publicCampusId: string,
  publicDepartmentId?: string   // 🔥 NEW
): Observable<{ campusId: string; promotionCount: number } | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_PROMOTIONS,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  // 🔥 PUBLIC department filter
  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) =>
      unwrapApiResponse<{ campusId: string; promotionCount: number }>(raw)
    )
  );
}



// ---------------- RISING STARS ----------------
// ---------------- RISING STARS ----------------
getPublicCampusRisingStars(
  publicCampusId: string,
  publicDepartmentId?: string   // 🔥 NEW
): Observable<unknown[]> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_RISING_STARS,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map(raw => unwrapApiResponse<unknown[]>(raw) ?? [])
  );
}


// ---------------- RESEARCH ----------------
getPublicCampusResearch(
  publicCampusId: string,
  publicDepartmentId?: string   
): Observable<unknown | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_RESEARCH,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  if (publicDepartmentId && publicDepartmentId.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map(raw => unwrapApiResponse<unknown>(raw))
  );
}


// ---------------- PLACEMENT INSIGHTS ----------------
getPublicCampusPlacementInsights(
  publicCampusId: string,
  page = 1,
  size = 9
): Observable<unknown[]> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(API_ENDPOINTS.CAMPUS.PUBLIC_GET_PLACEMENT_INSIGHTS, { publicCampusId })
  );

  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http.get<unknown>(url, { params }).pipe(
    map(raw => unwrapApiResponse<unknown[]>(raw) ?? [])
  );
}

// ---------------- ALUMNI ----------------
getPublicCampusAlumni(
  publicCampusId: string,
  page = 1,
  size = 7,
  publicDepartmentId?: string
): Observable<unknown[]> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_ALUMNI,
      { publicCampusId }
    )
  );

  let params = new HttpParams()
    .set('page', String(page))
    .set('size', String(size));

  //  Add department filter only if provided (PUBLIC department landing)
  if (publicDepartmentId?.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw: unknown) =>
      unwrapApiResponse<unknown[]>(raw) ?? []
    )
  );
}



// ---------------- CONTACT INFO ----------------
getPublicCampusContactInfo(
  publicCampusId: string,
  publicDepartmentId?: string   // 🔥 NEW
): Observable<unknown | null> {

  const url = buildUrl(
    this.baseUrl,
    resolvePathParams(
      API_ENDPOINTS.CAMPUS.PUBLIC_GET_CONTACT_INFO,
      { publicCampusId }
    )
  );

  let params = new HttpParams();

  // 🔥 Add department filter for public department landing
  if (publicDepartmentId?.trim()) {
    params = params.set(
      'publicDepartmentId',
      publicDepartmentId.trim()
    );
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map(raw => {
      const unwrapped = unwrapApiResponse<unknown>(raw);
      return unwrapped ?? raw;
    })
  );
}

// ================== END PUBLIC CAMPUS ==================





getCampusFollowersCount(campusId: string, departmentId?: string) {
  // Backend API:
  // GET /public/landing/campus/{campusId}/followers
  // departmentId optional query param

  const url = this.buildUrl(
    '/public/landing/campus/:campusId/followers',
    { campusId }
  );

  let params = new HttpParams();

  // 🔥 only add when department dashboard se call ho
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params });
}



getCampusPromotionsCount(campusId: string, departmentId?: string): Observable<number> {
  const url = this.buildUrl(
    '/public/landing/campus/:campusId/promotions',
    { campusId }
  );

  let params = new HttpParams();

  // 🔥 add only if departmentId present
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<{
    success: boolean;
    data?: {
      promotionCount?: number;
    };
  }>(url, { params }).pipe(
    map(res => res.data?.promotionCount ?? 0)
  );
}







getGuestCampusPromotions(publicCampusId: string): Observable<{ data: number }> {
  const url = buildUrl(
    this.baseUrl,
    resolvePathParams('/guest/landing/:publicCampusId/promotions', { publicCampusId })
  );

  return this.http.get<{ data: number }>(url);
}




getGuestCampusFollowers(publicCampusId: string): Observable<{ count: number }> {
  const url = this.buildUrl(
    '/guest/landing/:publicCampusId/followers',
    { publicCampusId }
  );
  return this.http.get<{ count: number }>(url);
}


  /**
   * GET /dashboard/meta/sectors
   * Get sectors for dropdown (e.g., "Consulting", "Finance", "IT Services", "Product Companies")
   * Response format: { success: true, message: null, data: string[], error: null }
   */
  getSectors(): Observable<string[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_SECTORS);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && Array.isArray(response.data)) {
            const sectors = response.data as string[];
            return sectors;
          }
        }
        
        return [];
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/meta/designations
   * Get designations for dropdown.
   * Response format: { success: true, message: null, data: string[], error: null }
   */
  getDesignations(): Observable<string[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_DESIGNATIONS);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && Array.isArray(response.data)) {
            const designations = response.data as string[];
            
            // Filter out invalid entries (like "string", empty strings, null, undefined)
            const validDesignations = designations
              .filter((d) => 
                d && 
                typeof d === 'string' && 
                d.trim() !== '' && 
                d.toLowerCase() !== 'string' &&
                d.trim() !== 'null' &&
                d.trim() !== 'undefined'
              )
              .map((d) => d.trim());
            
            // Remove duplicates and sort alphabetically
            const uniqueDesignations = Array.from(new Set(validDesignations)).sort();
            
            return uniqueDesignations;
          }
        }
        
        console.warn('Designations API returned unexpected format:', raw);
        return [];
      }),
      catchError((error) => {
        console.error('Error loading designations from API:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/meta/courses
   * Get courses for dropdown (e.g., "BCA", "MCA", "B.Tech")
   * Response format: { success: true, message: null, data: string[], error: null }
   */
  getCoursesForDropdown(): Observable<string[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COURSES);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && Array.isArray(response.data)) {
            const courses = response.data as string[];
            return courses;
          }
        }
        
        return [];
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/meta/batches
   * Get batches for dropdown (e.g., "2023", "2024")
   * Response format: { success: true, message: null, data: string[], error: null }
   */
  getBatchesForDropdown(): Observable<string[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_BATCHES);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && Array.isArray(response.data)) {
            const batches = response.data as string[];
            return batches;
          } else if (Array.isArray(raw)) {
            // Handle case where API directly returns array
            return raw as string[];
          } else if (response.data && !Array.isArray(response.data)) {
            console.warn('CampusApiService: getBatchesForDropdown - Data is not an array:', response.data);
          }
        }
        
        console.warn('CampusApiService: getBatchesForDropdown - No valid batches found, returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: getBatchesForDropdown - Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/alumni/carousel
   * Get alumni for carousel display. Limited to specified number.
   * Response format: { success: true, message: null, data: AlumniData[], error: null }
   */
  getAlumniForCarousel(limit = 10, campusId?: string): Observable<AlumniDashboardResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALUMNI_CAROUSEL);
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    let params = new HttpParams().set('limit', limit.toString());
    if (finalCampusId) {
      params = params.set('campusId', finalCampusId);
    }
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AlumniDashboardResponse;
        }
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getAlumniForCarousel - Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/alumni
   * Get alumni filtered by graduation year.
   * Response format: { success: true, message: null, data: AlumniData[], error: null }
   * If year is not provided, returns all alumni for the campus.
   */
  getAlumniForDashboard(
    year?: string,
    page = 1,
    limit = 6,
    campusId?: string,
  ): Observable<AlumniDashboardResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALUMNI);
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (year && year.trim() !== '') {
      params = params.set('year', year.trim());
    }
    if (finalCampusId) {
      params = params.set('campusId', finalCampusId);
    }
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AlumniDashboardResponse;
        }
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getAlumniForDashboard - Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/announcements
   * Retrieves all announcements for the campus dashboard.
   * Response format: { success: true, message: null, data: AnnouncementItem[], error: null }
   */
  getAnnouncements(campusId?: string): Observable<AnnouncementsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ANNOUNCEMENTS);
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    let params = new HttpParams();
    if (finalCampusId) {
      params = params.set('campusId', finalCampusId);
    }
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AnnouncementsResponse;
        }
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getAnnouncements - Error:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * GET /dashboard/announcements/synkup
   * Retrieves system-wide announcements from Synkup. Public endpoint.
   * Response format: { success: true, message: null, data: AnnouncementItem[], error: null }
   */
  getSynkupAnnouncements(limit = 10): Observable<AnnouncementsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_SYNKUP_ANNOUNCEMENTS);
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AnnouncementsResponse;
        }
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getSynkupAnnouncements - Error:', error);
        return throwError(() => error);
      }),
    );
  }

  // ----------------------- get news --------------
  /**
 * GET ALL NEWS (Read only for campus dashboard)
 * Endpoint: GET /common/news
 */
getAllNews(): Observable<NewsResponse[]> {

  const url = this.buildUrl('/common/news');

  return this.http.get<unknown>(url).pipe(
    map((raw) => {

      // Backend wrapped response
      if (raw && typeof raw === 'object') {
        const response = raw as Record<string, unknown>;

        // case: { success:true, data:[...] }
        if ('data' in response && Array.isArray(response['data'])) {
          return response['data'] as NewsResponse[];
        }

        // case: direct array
        if (Array.isArray(raw)) {
          return raw as NewsResponse[];
        }
      }

      return [];
    }),
    catchError((error) => {
      console.error('CampusApiService: getAllNews error:', error);
      return throwError(() => error);
    })
  );
}


  /**
   * POST /campus/{campusId}/prospectus/upload
   * Upload prospectus documents for a campus-course combination.
   * Campus ID is provided as path variable. Supports multiple files (PDF, DOCX, JPG, PNG, max 50MB each).
   * Files are stored in folder structure: campus/prospectus/{campusId}. Automatic versioning for existing prospectuses.
   * 
   * @param campusId - Campus ID (path parameter)
   * @param formData - FormData containing courseName (string) and files (File[])
   */
uploadProspectus(
  campusId?: string,
  formData?: FormData,
  departmentId?: string
): Observable<UploadProspectusResponse | null> {

  // Automatically inject campus ID from storage if not provided
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: uploadProspectus - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to upload prospectus'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS, {
    campusId: finalCampusId
  });

  // departmentId query param me jayega (same as addCourse)
  let params = new HttpParams();
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  // FormData ke liye Content-Type manually set nahi karna
  const headers = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  return this.http.post<unknown>(url, formData, { headers, params }).pipe(
    map((raw: unknown) => {

      if (raw && typeof raw === 'object') {
        const response = raw as UploadProspectusResponse;
        return response;
      }

      return null;
    }),
    catchError((error: unknown) => {
      console.error('CampusApiService: uploadProspectus - Error occurred:', error);

      const err = error as {
        status?: number;
        url?: string;
        error?: unknown;
      };

      console.error('CampusApiService: uploadProspectus - Error status:', err?.status);
      console.error('CampusApiService: uploadProspectus - Error URL:', err?.url);
      console.error('CampusApiService: uploadProspectus - Error response:', err?.error);

      return throwError(() => error);
    })
  );
}



  /**
   * GET /campus/{campusId}/prospectus
   * Get prospectuses by campus.
   * Retrieves all prospectuses for a specific campus.
   */
  getProspectusByCampus(campusId: string): Observable<GetProspectusResponse | null> {
    if (!campusId || !campusId.trim()) {
      console.error('CampusApiService: getProspectusByCampus - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get prospectus'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_CAMPUS, { campusId: campusId.trim() });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Backend response format: { success: true, message: null, data: [...], error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            const response: GetProspectusResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: Array.isArray(data) ? (data as ProspectusData[]) : [],
              error: (responseObj['error'] as string) || null,
            };
            
            return response;
          }
        }
        
        console.warn('CampusApiService: getProspectusByCampus - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getProspectusByCampus - Error occurred:', error);
        console.error('CampusApiService: getProspectusByCampus - Error status:', error?.status);
        console.error('CampusApiService: getProspectusByCampus - Error URL:', error?.url);
        console.error('CampusApiService: getProspectusByCampus - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/prospectus/course
   * Get prospectuses by campus and course name.
   * Retrieves all prospectuses for a specific course in a campus using course name.
   * Campus ID is provided as path variable, course name as query parameter.
   */
 /**
 * GET /campus/{campusId}/prospectus/course
 * Get prospectuses by campus + course + department
 */
getProspectusByCourse(
  campusId: string,
  courseName: string,
  departmentId?: string
): Observable<GetProspectusResponse | null> {

  const finalCampusId = this.getCampusId(campusId);

  if (!finalCampusId) {
    console.error('CampusApiService: getProspectusByCourse - Campus ID required');
    return throwError(() => new Error('Campus ID required'));
  }

  const url = this.buildUrl(
    API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE,
    { campusId: finalCampusId }
  );

  let params = new HttpParams()
    .set('courseName', courseName);

  // 🔥 SAME AS uploadProspectus
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {
      if (raw && typeof raw === 'object') {
        const res = raw as Record<string, unknown>;

        return {
          success: res['success'] as boolean,
          message: res['message'] as string | null,
          data: (res['data'] as ProspectusData[]) || [],
          error: res['error'] as string | null,
        };
      }
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: getProspectusByCourse error:', error);
      return throwError(() => error);
    })
  );
}

  /**
   * GET /campus/{campusId}/prospectus/{prospectusId}
   * Get prospectus by ID.
   * Retrieves prospectus details by prospectus ID. Validates that the prospectus belongs to the specified campus.
   */
  getProspectusById(prospectusId: string, campusId?: string): Observable<UploadProspectusResponse | null> {
    if (!prospectusId || !prospectusId.trim()) {
      console.error('CampusApiService: getProspectusById - Prospectus ID is required');
      return throwError(() => new Error('Prospectus ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getProspectusById - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get prospectus'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_ID, { 
      campusId: finalCampusId,
      prospectusId: prospectusId.trim()
    });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        
        // Backend response format: { success: true, message: "string", data: {...}, error: "string" }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: UploadProspectusResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: responseObj['data'] as UploadProspectusResponseData,
              error: (responseObj['error'] as string) || null,
            };
            
            return response;
          }
        }
        
        console.warn('CampusApiService: getProspectusById - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getProspectusById - Error occurred:', error);
        console.error('CampusApiService: getProspectusById - Error status:', error?.status);
        console.error('CampusApiService: getProspectusById - Error URL:', error?.url);
        console.error('CampusApiService: getProspectusById - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/download
   * Download prospectus by prospectusId (query parameter).
   */
  /**
   * GET /campus/{campusId}/prospectus/download
   * Download prospectus.
   * Retrieves prospectus for download by campus and course name. Returns the latest version if multiple versions exist.
   * 
   * @param campusId - Campus ID (path parameter)
   * @param courseName - Course name (query parameter)
   * @returns Observable of UploadProspectusResponse (single prospectus object, not array)
   */
  downloadProspectus(campusId: string, courseName: string): Observable<UploadProspectusResponse | null> {
    if (!campusId || !campusId.trim()) {
      console.error('CampusApiService: downloadProspectus - Campus ID is required');
      return throwError(() => new Error('Campus ID is required'));
    }
    
    if (!courseName || !courseName.trim()) {
      console.error('CampusApiService: downloadProspectus - Course name is required');
      return throwError(() => new Error('Course name is required'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DOWNLOAD_PROSPECTUS, { campusId: campusId.trim() });
    const params = new HttpParams().set('courseName', courseName.trim());
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        
        // Backend response format: { success: true, message: null, data: {...}, error: null }
        // Note: Returns single prospectus object, not array
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: UploadProspectusResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: responseObj['data'] as UploadProspectusResponseData,
              error: (responseObj['error'] as string) || null,
            };
            
            return response;
          }
        }
        
        console.warn('CampusApiService: downloadProspectus - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: downloadProspectus - Error occurred:', error);
        console.error('CampusApiService: downloadProspectus - Error status:', error?.status);
        console.error('CampusApiService: downloadProspectus - Error URL:', error?.url);
        console.error('CampusApiService: downloadProspectus - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * DELETE /campus/{campusId}/prospectus/{prospectusId}
   * Delete prospectus.
   * Deletes a prospectus and removes all associated files. Validates that the prospectus belongs to the specified campus.
   */
 deleteProspectus(
  prospectusId: string,
  campusId?: string,
  departmentId?: string
): Observable<DeleteProspectusResponse | null> {

  if (!prospectusId || !prospectusId.trim()) {
    console.error('CampusApiService: deleteProspectus - Prospectus ID is required');
    return throwError(() => new Error('Prospectus ID is required'));
  }

  // Automatically inject campus ID from storage if not provided
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: deleteProspectus - Campus ID is required');
    return throwError(() => new Error('Campus ID is required to delete prospectus'));
  }

  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_PROSPECTUS, {
    campusId: finalCampusId,
    prospectusId: prospectusId.trim()
  });

  // 🔥 ADD QUERY PARAM (same pattern as addCourse & uploadProspectus)
  let params = new HttpParams();
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.delete<unknown>(url, { params }).pipe(
    map((raw) => {

      // Backend response format:
      // { success: true, message: "Prospectus deleted successfully", data: null, error: null }

      if (raw && typeof raw === 'object' && raw !== null) {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj) {
          const response: DeleteProspectusResponse = {
            success: responseObj['success'] as boolean,
            message:
              (responseObj['message'] as string) ||
              'Prospectus deleted successfully',
            data: null,
            error: (responseObj['error'] as string) || null,
          };

          return response;
        }
      }

      console.warn(
        'CampusApiService: deleteProspectus - Response format unexpected:',
        raw
      );
      return null;
    }),
    catchError((error) => {
      console.error(
        'CampusApiService: deleteProspectus - Error occurred:',
        error
      );
      console.error(
        'CampusApiService: deleteProspectus - Error status:',
        error?.status
      );
      console.error(
        'CampusApiService: deleteProspectus - Error URL:',
        error?.url
      );
      console.error(
        'CampusApiService: deleteProspectus - Error response:',
        error?.error
      );
      return throwError(() => error);
    })
  );
}


  /**
   * GET /public/landing/campus/{campusId}/rising-stars
   * Get rising stars (current students not placed) with pagination.
   * Default 8 per page.
   * API uses 0-based pagination (page=0 for first page).
   */
  getRisingStars(
    campusId: string,
    page = 0,
    size = 8,
  ): Observable<RisingStarsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.RISING_STARS, { campusId });
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (!isRecord(raw)) {
          console.warn('CampusApiService: getRisingStars - Response format unexpected:', raw);
          return null;
        }

        const response = buildPagedApiResponse<RisingStarData>(
          raw,
          'Rising stars retrieved successfully',
          true,
        ) as RisingStarsResponse;

        if (isRecord(raw['data'])) {
          const dataObj = raw['data'] as Record<string, unknown>;
          if (isRecord(dataObj['sort'])) {
            response.data = response.data ?? { content: [] };
            (response.data as Record<string, unknown>)['sort'] = dataObj['sort'];
          }
        }

        return response;
      }),
      catchError((error) => {
        console.error('CampusApiService: getRisingStars - Error occurred:', error);
        console.error('CampusApiService: getRisingStars - Error status:', error?.status);
        console.error('CampusApiService: getRisingStars - Error URL:', error?.url);
        console.error('CampusApiService: getRisingStars - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/success-stories
   * Get success stories (placed students) with pagination.
   * Default 6 per page.
   * @param batch - Optional batch filter (e.g., "2024")
   */
  getSuccessStories(
    campusId: string,
    page = 1,
    size = 6,
    batch?: string,
  ): Observable<SuccessStoriesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.SUCCESS_STORIES, { campusId });
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    // Add batch parameter if provided
    if (batch && batch.trim()) {
      params = params.set('batch', batch.trim());
    }
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as SuccessStoriesResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/faculties
   * Get faculty members with pagination.
   * Default 6 per page.
   */
  getFaculties(
    campusId: string,
    page = 1,
    size = 6,
  ): Observable<FacultiesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.FACULTIES, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as FacultiesResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/testimonials
   * Get student testimonials/reviews with pagination.
   * Default 5 per page.
   * Note: API uses 0-based page indexing (page=0 for first page)
   */
  getTestimonials(
  campusId: string,
  page = 0,
  size = 10,
  departmentId?: string   // 🔥 NEW PARAM
): Observable<TestimonialsResponse | null> {
  
  const endpoint = API_ENDPOINTS.CAMPUS.TESTIMONIALS;
  const url = this.buildUrl(endpoint, { campusId });

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  // 🔥 departmentId add exactly like promotions/followers
  if (departmentId && departmentId.trim()) {
    params = params.set('departmentId', departmentId.trim());
  }

  return this.http.get<unknown>(url, { params }).pipe(
    map((raw) => {

      // Backend format: { success, message, data, error }
      if (raw && typeof raw === 'object') {
        const responseObj = raw as Record<string, unknown>;

        if ('success' in responseObj && 'data' in responseObj) {
          const response: TestimonialsResponse = {
            success: Boolean(responseObj['success']),
            message:
              responseObj['message'] !== null && responseObj['message'] !== undefined
                ? String(responseObj['message'])
                : null,
            data: responseObj['data'] as TestimonialsResponse['data'],
            error:
              responseObj['error'] !== null && responseObj['error'] !== undefined
                ? String(responseObj['error'])
                : null
          };

          return response;
        }
      }

      console.warn('CampusApiService: Testimonials - Invalid response format:', raw);
      return null;
    }),
    catchError((error) => {
      console.error('CampusApiService: Testimonials API error:', error);
      console.error('CampusApiService: Error status:', error?.status);
      console.error('CampusApiService: Error URL:', error?.url);
      return throwError(() => error);
    })
  );
}




// --------------------- get rising start by department id 
getDepartmentRisingStars(departmentId: string): Observable<RisingStarsResponse> {
  const url = this.buildUrl(
    '/public/landing/department/:departmentId/rising-stars',
    { departmentId }
  );

  return this.http.get<RisingStarsResponse>(url);
}

getPublicRisingStars(publicCampusId: string): Observable<RisingStarsResponse> {
  const url = this.buildUrl(
    '/public/landing/campus/:campusId/rising-stars',
    { campusId: publicCampusId }
  );

  return this.http.get<RisingStarsResponse>(url);
}


  /**
   * GET /public/landing/campus/{campusId}/research
   * Get research and innovation information.
   */
  getResearch(campusId: string): Observable<ResearchResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.RESEARCH, { campusId });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as ResearchResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/alumni
   * Get alumni community with pagination.
   * Default 7 per page.
   */
  getAlumni(
    campusId: string,
    page = 1,
    size = 7,
  ): Observable<ApiResponsePageAlumniResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ALUMNI, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as ApiResponsePageAlumniResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/courses
   * Get courses offered with pagination.
   * Default 4 per page.
   */
  getCourses(
    campusId: string,
    page = 1,
    size = 4,
  ): Observable<CoursesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.COURSES, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as CoursesResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/placement-insights
   * Get placement insights.
   * Gets placement statistics and companies with pagination. Default 9 companies per page.
   */
  getPlacementInsights(
    campusId: string,
    page = 0,
    size = 9,
  ): Observable<PlacementInsightsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.PLACEMENT_INSIGHTS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as PlacementInsightsResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/analytics
   * Get analytics dashboard.
   * Gets dashboard statistics - student counts, placements, trends.
   */
  getAnalytics(campusId: string): Observable<AnalyticsDashboardResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ANALYTICS, { campusId });

    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AnalyticsDashboardResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/about
   * Get About Synkup content.
   * Retrieves the About Synkup content displayed on the landing page.
   */
  getAboutSynkup(): Observable<AboutSynkupResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ABOUT_SYNKUP);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as AboutSynkupResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /public/landing/campus/{campusId}/feedback
   * Submit feedback from contact form for a specific campus.
   * Requires campusId, name, contact, and message. Feedback will be saved and can be approved by admin to display as testimonial.
   * Response: 201 Created with { success: true, message: string, data: FeedbackData, error: null }
   */
submitCampusFeedback(
  campusId: string,
  reviewerId: string,
  requesterUserType: 'STUDENT' | 'COMPANY' | 'CAMPUS' | 'DEPARTMENT',
  payload: {
    reviewerName: string;
    feedbackText: string;
  }
) {
  const url = this.buildUrl(
    '/public/landing/campus/:campusId/feedback',
    { campusId }
  );

  return this.http.post<{
    success: boolean;
    message?: string;
    error?: string;
  }>(
    url,
    payload,
    {
      params: {
        reviewerId,
        requesterUserType
      }
    }
  );
}




  // ------------------ recommendation get api ---------

submitCampusRecommendation(
  publicCampusId: string,
  reviewerId: string,
  requesterUserType: 'STUDENT' | 'COMPANY',
  wouldRecommend: boolean
) {
  const url = this.buildUrl(
    '/public/landing/campus/:campusId/recommendation',
    { campusId: publicCampusId }
  );

  return this.http.post<{
    success: boolean;
    message?: string;
    error?: string;
  }>(
    url,
    { wouldRecommend },
    {
      params: {
        reviewerId,
        requesterUserType
      }
    }
  );
}



  /**
   * POST /public/landing/campus/{campusId}/visit
   * Submit a campus visit request via JSON.
   * Use 'attachmentUrls' field for file URLs/names. Supports recruitment type (Internship/Full-time/Both), visit date/time, positions, package, and requirements.
   */
  submitVisitCampusRequest(campusId: string, request: VisitCampusRequest, attachments: File[] = []): Observable<VisitCampusResponse | null> {
    
    const endpoint = API_ENDPOINTS.CAMPUS.VISIT_CAMPUS;
    
    const url = this.buildUrl(endpoint, { campusId });
    
    // Validate URL
    if (!url || url.trim() === '') {
      console.error('CampusApiService: ❌ Invalid URL generated:', url);
      return throwError(() => new Error('Invalid API URL'));
    }
    
    // Create FormData for multipart/form-data
    const formData = new FormData();
    
    // Add request as JSON string in 'request' field
    const requestJson = JSON.stringify(request);
    formData.append('request', requestJson);
    
    // Add attachment files to 'attachment' field (backend expects MultipartFile[])
    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => {
        formData.append('attachment', file, file.name);
      });
    }
    
    // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    const headers = new HttpHeaders({
      'Accept': 'application/json'
      // Note: Do NOT set 'Content-Type' - browser will set it automatically with boundary
    });
    
    const httpCall = this.http.post<unknown>(url, formData, { headers });
    
    return httpCall.pipe(
      map((raw) => {
        
        // Handle response - backend returns { success, message, data, error }
        if (raw && typeof raw === 'object') {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response is already in the correct format
          if ('success' in responseObj && 'message' in responseObj && 'data' in responseObj) {
            const response: VisitCampusResponse = {
              success: Boolean(responseObj['success']),
              message: String(responseObj['message'] || ''),
              data: responseObj['data'] as VisitCampusData,
              error: responseObj['error'] !== null && responseObj['error'] !== undefined ? String(responseObj['error']) : null
            };
            return response;
          }
        }
        
        console.warn('CampusApiService: submitVisitCampusRequest - Invalid response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌ submitVisitCampusRequest - ERROR IN PIPE');
        console.error('CampusApiService: Error object:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error statusText:', error?.statusText);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error error:', error?.error);
        console.error('CampusApiService: Full error details:', JSON.stringify(error, null, 2));
        return throwError(() => error);
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

export interface CampusProfileUpdateRequest {
  [key: string]: unknown;
  campusName?: string;
  campusLogoUrl?: string;
  campusRank?: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDepartment?: string;
  adminDesignation?: string;
  websiteUrl?: string;
  campusWebsiteUrl?: string;
  aboutCampus?: string;
  campusAddress?: string;
}
export interface UpdateNoticeResponse {
  success: boolean;
  message: string | null;
  data: unknown;
  error: string | null;
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
  userType?: UserType | 'ADMIN';
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
}

export interface CampusSidebarResponse {
  campusName: string;
  campusRank: number;
}

export interface CampusAutocompleteResponse {
  id?: string; // API returns 'id' not 'campusId'
  campusId?: string; // Support both for compatibility
  campusName?: string;
  campusAddress?: string;
}

export interface ApiResponsePageCampusAutocompleteResponse {
  success?: boolean;
  message?: string | null;
  data?: {
    content?: CampusAutocompleteResponse[];
    totalPages?: number;
    totalElements?: number;
    first?: boolean;
    last?: boolean;
    size?: number;
    number?: number;
    numberOfElements?: number;
    pageable?: PageableInfo;
  };
  error?: string | null;
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
  courseName?: string | null;
  studentName?: string;
  photoUrl?: string;
  photourl?: string; // Backend may return lowercase 'photourl'
  batch?: string;
  rollNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  placementCompanyId?: string;
  placementCompanyName?: string | null;
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
  error: string | null;
}

// Request is sent as FormData with:
// - companyName: string
// - logo: File (multipart/form-data)
// No interface needed for FormData

export interface AddCompanyVisitedResponseData {
  id?: string;
  campusId?: string;
  companyName?: string;
  logoUrl?: string; // Backend returns "logoUrl" not "companyLogoUrl"
  visitedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCompanyVisitedResponse {
  success: boolean;
  message: string;
  data: AddCompanyVisitedResponseData;
  error: string | null;
}

export interface CompanyVisitedItem {
  id?: string;
    publicCompanyId?: string;
  departmentId?: string;
  departmentName?: string;
  campusId?: string;
  companyName?: string;
  logourl?: string; // Backend may return "logourl"
  logoUrl?: string; // Backend may also return "logoUrl"
  visitedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanySearchItem {
  companyId: string;
  companyName: string;
  companyAddress: string;
}

export interface CompanySearchResponse {
  success: boolean;
  message: string;
  data: CompanySearchItem[];
  statusCode?: number;
  timestamp?: string;
}

export interface PageableInfo {
  pageNumber?: number;
  pageSize?: number;
  sort?: {
    empty?: boolean;
    sorted?: boolean;
    unsorted?: boolean;
  };
  offset?: number;
  paged?: boolean;
  unpaged?: boolean;
}

export interface GetCompaniesVisitedResponseData {
  content: CompanyVisitedItem[];
  pageable?: PageableInfo;
  totalPages?: number;
  totalElements?: number;
}

export interface GetCompaniesVisitedResponse {
  success: boolean;
  message: string;
  data: GetCompaniesVisitedResponseData;
  error: string | null;
}

export interface AddCourseRequest {
  courseName: string;
  duration: number;
  totalSeats: number;
  description: string;
}

export interface AddCourseResponseData {
  id?: string;
  campusId?: string;
   departmentId?: string;
  courseName?: string;
  duration?: number;
  totalSeats?: number;
  availableSeats?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCourseResponse {
  success: boolean;
  message: string;
  data: AddCourseResponseData;
  error: string | null;
}

export interface ProfessionalInfoRequest {
  designation: string;
  department: string;
  specialization: string;
  yearsOfExperience: string;
  qualifications: string;
  certificates: string; // base64 encoded file
}
export interface AddDepartmentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string | null;
}

export interface DepartmentItem {
   id: string;              
  departmentId?: string; 
  departmentName: string;
  email: string;
  phone: string;
  aboutDepartment?: string;
  photoUrl?: string;
  campusId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetDepartmentsResponse {
  success: boolean;
  message: string;
  data: {
    content: DepartmentItem[];
    totalPages: number;
    totalElements?: number;
  };
  error?: string | null;
}
export interface DepartmentDropdownItem {
  id: string;              
  departmentId: string;    
  departmentName: string;
}

export interface DepartmentDetailItem {
  id: string;
  departmentId: string;
  campusId: string;
  departmentName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  aboutDepartment?: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}


export interface GetAllDepartmentsResponse {
  success: boolean;
  message: string | null;
  data: DepartmentDropdownItem[];
  error: string | null;
}

export interface DeleteDepartmentResponse {
  success: boolean;
  message: string | null;
  data: null;
  error: string | null;
}


export interface DepartmentByEmailResponse {
  success: boolean;
  message: string | null;
  data: {
    departmentId: string;
    email: string;
    userId: string | null;
  } | null;
  error: string | null;
}



export interface AddFacultyRequest {
  fullName: string;
  photo: string; // base64 encoded image
  email: string;
  dateOfBirth: string;
  phoneNumber: string;
  professionalInfo: ProfessionalInfoRequest[];
}

export interface BasicInformationResponse {
  id?: string;
  campusId?: string;
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  photoUrl?: string | null;
  photourl?: string | null; // Backend may return lowercase 'photourl'
  gender?: string; // From request body
  createdAt?: string;
  updatedAt?: string;
  createdDt?: string; // Backend may return 'createdDt' instead of 'createdAt'
  updatedDt?: string; // Backend may return 'updatedDt' instead of 'updatedAt'
}

export interface ProfessionalInformationResponse {
  designation?: string[]; // Enum values like ["PRINCIPAL"]
  designationDisplay?: string[]; // Display values like ["Principal"]
  department?: string[]; // e.g., ["Computer Science"]
  specialization?: string[]; // e.g., ["Machine Learning", "Data Science"]
  yearsOfExperience?: number[]; // Array of numbers, e.g., [22]
  experienceDisplay?: string[]; // Display strings, e.g., ["22 years of teaching experience"]
  qualifications?: string[]; // e.g., ["PhD in Education", "M.Ed"]
  certificates?: string[]; // e.g., ["CBSE Principal Certification"]
}

export interface AddFacultyResponseData {
  basicInformation: BasicInformationResponse;
  professionalInformation: ProfessionalInformationResponse;
}

export interface AddFacultyResponse {
  success: boolean;
  message: string;
  data: AddFacultyResponseData;
  error: string | null;
}

export interface FacultyListItem {
  id?: string;
  campusId?: string;
  fullName?: string;
  photoUrl?: string | null;
  email?: string;
  dateOfBirth?: string;
  designation?: string[]; // e.g., ["PRINCIPAL"]
  department?: string[]; // e.g., ["Computer Science"]
  specialization?: string[]; // e.g., ["Software Engineering", "Artificial Intelligence"]
  yearsOfExperience?: number[]; // Array of numbers, e.g., [10] (backend returns as array)
  qualifications?: string[]; // e.g., ["B.Tech"]
}

export interface GetAllFacultiesResponse {
  success: boolean;
  message: string | null;
  data: FacultyListItem[];
  error: string | null;
  /** Set when API returns paginated shape (data.content, totalPages). */
  totalPages?: number;
}

export interface GetFacultyByIdResponse {
  success: boolean;
  message: string | null;
  data: AddFacultyResponseData;
  error: string | null;
}

export interface GetFacultyProfileResponse {
  success: boolean;
  message: string | null;
  data: AddFacultyResponseData; // Same structure as GetFacultyByIdResponse: { basicInformation: {...}, professionalInformation: {...} }
  error: string | null;
}

export interface FacultyProfileData {
  id?: string;
  campusId?: string;
  fullName?: string;
  photoUrl?: string;
  email?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  professionalInfo?: ProfessionalInfoResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfessionalInfoResponse {
  id?: string;
  designation?: string;
  department?: string;
  specialization?: string;
  yearsOfExperience?: string;
  qualifications?: string;
  certificateUrl?: string;
}

export interface UpdateFacultyResponse {
  success: boolean;
  message: string | null;
  data: AddFacultyResponseData;
  error: string | null;
}

export interface DeleteFacultyResponse {
  success: boolean;
  message: string;
  data: null;
  error: string | null;
}

export interface CheckEmailResponse {
  success: boolean;
  message: string;
  data: boolean; // Swagger shows: data: false (boolean, not object)
  error: string | null;
}

export interface UploadProspectusRequest {
  campusId: string;
  courseId: string;
  files: string[]; // base64 encoded files
}

export interface UploadProspectusResponseData {
  id?: string;
  campusId?: string;
  courseId?: string;
  fileUrls?: string[];
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadProspectusResponse {
  success: boolean;
  message: string | null;
  data: UploadProspectusResponseData;
  error: string | null;
}

export interface ProspectusData {
  id?: string;
  campusId?: string;
  courseId?: string;
  fileUrls?: string[];
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetProspectusResponse {
  success: boolean;
  message: string | null;
  data: ProspectusData[];
  error: string | null;
}

export interface DeleteProspectusResponse {
  success: boolean;
  message: string;
  data: null;
  error: string | null;
}

export interface RisingStarData {
  id?: string;
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  batch?: string;
  courseId?: string;
  courseName?: string;
  email?: string;
  phone?: string;
}

export interface RisingStarsResponse {
  pageSize?: number;
  sort?: {
    sorted?: boolean;
    empty?: boolean;
    unsorted?: boolean;
  };
  sorted?: boolean;
  empty?: boolean;
  unsorted?: boolean;
  offset?: number;
  paged?: boolean;
  unpaged?: boolean;
  last?: boolean;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  size?: number;
  number?: number;
  numberOfElements?: number;
  content?: RisingStarData[];
  error?: string | null;
}

export interface SuccessStoryData {
  id?: string;
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  batch?: string;
  companyName?: string;
  company?: string;
  designation?: string;
  lpa?: string;
  placementDate?: string;
  courseId?: string;
  courseName?: string;
}

export interface SuccessStoriesResponse {
  pageSize?: number;
  sort?: {
    sorted?: boolean;
    empty?: boolean;
    unsorted?: boolean;
  };
  sorted?: boolean;
  empty?: boolean;
  unsorted?: boolean;
  offset?: number;
  paged?: boolean;
  unpaged?: boolean;
  last?: boolean;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  size?: number;
  number?: number;
  numberOfElements?: number;
  content?: SuccessStoryData[];
  error?: string | null;
}

export interface FacultyData {
  id?: string;
  facultyId?: string;
  userId?: string;
  fullName?: string;
  name?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  designation?: string;
  department?: string;
  email?: string;
  phoneNumber?: string;
  specialization?: string;
  yearsOfExperience?: string;
  qualifications?: string;
}

export interface FacultiesResponse {
  pageSize?: number;
  sort?: {
    sorted?: boolean;
    empty?: boolean;
    unsorted?: boolean;
  };
  sorted?: boolean;
  empty?: boolean;
  unsorted?: boolean;
  offset?: number;
  paged?: boolean;
  unpaged?: boolean;
  last?: boolean;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  size?: number;
  number?: number;
  numberOfElements?: number;
  content?: FacultyData[];
  error?: string | null;
}

export interface TestimonialData {
  id?: string;
  campusId?: string;
  name?: string;
  reviewerName?: string;
  contact?: string;
  message?: string;
  createdAt?: string;
  // Legacy fields for backward compatibility
  studentId?: string;
  userId?: string;
  studentName?: string;
  fullName?: string;
  testimonial?: string;
  review?: string;
  text?: string;
  quote?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  updatedAt?: string;
}

export interface TestimonialsResponse {
  success?: boolean;
  message?: string | null;
  data?: {
    content?: TestimonialData[];
    pageable?: {
      pageNumber?: number;
      pageSize?: number;
      sort?: {
        sorted?: boolean;
        empty?: boolean;
        unsorted?: boolean;
      };
      offset?: number;
      paged?: boolean;
      unpaged?: boolean;
    };
    last?: boolean;
    totalElements?: number;
    totalPages?: number;
    first?: boolean;
    size?: number;
    number?: number;
    sort?: {
      sorted?: boolean;
      empty?: boolean;
      unsorted?: boolean;
    };
    numberOfElements?: number;
  };
  error?: string | null;
}



export interface RisingStarsResponse {
  success?: boolean;
  message?: string | null;
  data?: {
    content?: RisingStarData[];
    pageable?: {
      pageNumber?: number;
      pageSize?: number;
      sort?: {
        sorted?: boolean;
        empty?: boolean;
        unsorted?: boolean;
      };
      offset?: number;
      paged?: boolean;
      unpaged?: boolean;
    };
    last?: boolean;
    totalElements?: number;
    totalPages?: number;
    first?: boolean;
    size?: number;
    number?: number;
    sort?: {
      sorted?: boolean;
      empty?: boolean;
      unsorted?: boolean;
    };
    numberOfElements?: number;
  };
  error?: string | null;
}

export interface ResearchData {
  researchInfo?: string;
  description?: string;
}

export interface ResearchResponse {
  success?: boolean;
  message?: string | null;
  data?: ResearchData;
  error?: string | null;
}

export interface AboutSynkupData {
  id?: string | null;
  title?: string;
  content?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
}

export interface AboutSynkupResponse {
  success?: boolean;
  message?: string | null;
  data?: AboutSynkupData;
  error?: string | null;
}

export interface FeedbackRequest {
  reviewerName: string;
  feedbackText: string;
  userId: string;
  userType: string;
}


export interface FeedbackData {
  id?: string;
  name?: string;
  contact?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data: FeedbackData;
  error: string | null;
}

export interface VisitTime {
  hour: number;
  minute: number;
  second: number;
  nano: number;
}

export interface VisitCampusRequest {
  companyName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  numberOfPositions: number;
  packageAmount: string;
  recruitmentType: 'INTERNSHIP' | 'FULL_TIME' | 'BOTH';
  visitDate: string; // Format: YYYY-MM-DD
  visitTime: string; // Format: HH:mm:ss (backend expects string, not VisitTime object)
  attachmentUrls: string[];
  additionalRequirements?: string;
}

export interface VisitCampusData {
  id?: string;
  campusId?: string;
  companyName?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  numberOfPositions?: number;
  packageAmount?: string;
  recruitmentType?: string;
  visitDate?: string;
  visitTime?: string;
  attachmentUrls?: string[];
  additionalRequirements?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VisitCampusResponse {
  success: boolean;
  message: string;
  data: VisitCampusData;
  error: string | null;
}

export interface CourseData {
  id?: string;
  courseId?: string;
  campusId?: string;
  courseName?: string;
  name?: string;
  courseDuration?: string;
  duration?: string;
  seatsAvailable?: string;
  seats?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoursesResponse {
  sort?: {
    sorted?: boolean;
    empty?: boolean;
    unsorted?: boolean;
  };
  sorted?: boolean;
  empty?: boolean;
  unsorted?: boolean;
  offset?: number;
  paged?: boolean;
  unpaged?: boolean;
  last?: boolean;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  size?: number;
  number?: number;
  numberOfElements?: number;
  content?: CourseData[];
  error?: string | null;
}

export interface YearlyTrend {
  year?: string;
  placedCount?: number;
  totalStudents?: number;
}

export interface SectorBreakdownItem {
  sector?: string;
  count?: number;
  percentage?: number;
}

export interface PlacementInsightsData {
  placementPercentage?: number;
  yearlyTrends?: YearlyTrend[];
  sectorBreakdown?: SectorBreakdownItem[];
}

export interface PlacementInsightsResponse {
  success?: boolean;
  message?: string | null;
  data?: PlacementInsightsData;
  error?: string | null;
}

export interface AnalyticsDashboardData {
  totalStudents?: number;
  totalPlacedStudents?: number;
  placementPercentage?: number;
  totalCompanies?: number;
  totalFaculty?: number;
  totalCourses?: number;
  studentDemographics?: Record<string, number>;
  placementTrends?: { yearlyData?: YearlyTrend[] };
}

export interface AnalyticsDashboardResponse {
  success?: boolean;
  message?: string | null;
  data?: AnalyticsDashboardData;
  error?: string | null;
}

export interface BatchesResponse {
  success: boolean;
  message: string | null;
  data: string[];
  error: string | null;
}

export interface StudentByCampusItem {
  id?: string;
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  batch?: string;
  yearOfPassing?: string; // Year of passing from student registration form
  courseId?: string;
  courseName?: string;
  email?: string;
  phoneNumber?: string;
  campusId?: string;
}

export interface StudentByCampusResponse {
  success: boolean;
  message: string;
  data: {
    content: StudentByCampusItem[];
    pageable?: PageableInfo;
    totalPages?: number;
    totalElements?: number;
    first?: boolean;
    last?: boolean;
    size?: number;
    number?: number;
    numberOfElements?: number;
    empty?: boolean;
  };
  error?: string;
}

export interface StudentCampusBatchInfoData {
  campusId: string;
  studentId: string;
  campusName: string;
  campusAddress: string;
  batch: string; // Year of passing
}

export interface StudentCampusBatchInfoResponse {
  success: boolean;
  message: string;
  data: StudentCampusBatchInfoData;
  statusCode?: number;
  timestamp?: string;
}

export interface StudentByBatchData {
  id?: string;
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  batch?: string;
  courseId?: string;
  courseName?: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
}

export interface StudentsByBatchResponse {
  success: boolean;
  message: string | null;
  data: {
    content?: StudentByBatchData[];
    pageable?: {
      pageNumber?: number;
      pageSize?: number;
      sort?: {
        sorted?: boolean;
        empty?: boolean;
        unsorted?: boolean;
      };
      offset?: number;
      paged?: boolean;
      unpaged?: boolean;
    };
    offset?: number;
    paged?: boolean;
    unpaged?: boolean;
    last?: boolean;
    totalElements?: number;
    totalPages?: number;
    first?: boolean;
    size?: number;
    number?: number;
    sort?: {
      sorted?: boolean;
      empty?: boolean;
      unsorted?: boolean;
    };
    numberOfElements?: number;
  };
  error: string | null;
}

export interface AlumniDashboardData {
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  designation?: string;
  companyName?: string;
  yearOfPassing?: string;
  batch?: string;
}

export interface AlumniDashboardResponse {
  success: boolean;
  message: string | null;
  data: AlumniDashboardData[];
  error: string | null;
}

export interface CarouselItemResponse {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  companyId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  campusId?: string;
  campusName?: string;
  campusLogoUrl?: string;
}

export interface ApiResponseListCarouselItemResponse {
  success: boolean;
  message: string | null;
  data: CarouselItemResponse[];
  error: string | null;
  statusCode?: number;
  timestamp?: string;
}

export interface AnnouncementItem {
  id?: string;
  campusId?: string;
  title?: string;
  content?: string;
  type?: string;
  eventDate?: string;
  createdAt?: string;
  updatedAt?: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
}

export interface AnnouncementsResponse {
  success: boolean;
  message: string | null;
  data: AnnouncementItem[];
  error: string | null;
}
export interface NewsResponse {
  id: string;
  title: string;
  description: string;
  createDate: string;
}
export interface NoticeItem {
  id: string;
  noticeId: string;
  campusId: string;
  departmentId?: string;
    title?: string;  
  message: string;
  createdByType: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeDetailResponse {
  success: boolean;
  message: string | null;
  error: string | null;
  data: {
    id: string;
    noticeId: string;
    campusId: string;
    departmentId?: string;
    title?: string;    
    message: string;
    createdByType: string;
    createdAt: string;
    updatedAt: string;
  };
}


export interface DeleteNoticeResponse {
  success: boolean;
  message: string | null;
  data: null;
  error: string | null;
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
  if (raw === null || raw === undefined) {
    return null;
  }
  return unwrapApiResponseCore<T>(raw);
}

interface PagedApiResponse<T> {
  success: boolean;
  message: string;
  data: {
    content: T[];
    pageable?: PageableInfo;
    totalPages?: number;
    totalElements?: number;
    first?: boolean;
    last?: boolean;
    size?: number;
    number?: number;
    numberOfElements?: number;
    empty?: boolean;
  };
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function extractPagedMeta(dataObj: Record<string, unknown>, includePageable: boolean): PagedApiResponse<unknown>['data'] {
  const base = {
    content: Array.isArray(dataObj['content']) ? (dataObj['content'] as unknown[]) : [],
    totalPages: typeof dataObj['totalPages'] === 'number' ? dataObj['totalPages'] : undefined,
    totalElements: typeof dataObj['totalElements'] === 'number' ? dataObj['totalElements'] : undefined,
    first: typeof dataObj['first'] === 'boolean' ? dataObj['first'] : undefined,
    last: typeof dataObj['last'] === 'boolean' ? dataObj['last'] : undefined,
    size: typeof dataObj['size'] === 'number' ? dataObj['size'] : undefined,
    number: typeof dataObj['number'] === 'number' ? dataObj['number'] : undefined,
    numberOfElements: typeof dataObj['numberOfElements'] === 'number' ? dataObj['numberOfElements'] : undefined,
    empty: typeof dataObj['empty'] === 'boolean' ? dataObj['empty'] : undefined,
    sort: isRecord(dataObj['sort']) ? (dataObj['sort'] as Record<string, unknown>) : undefined,
  };
  if (!includePageable) {
    return base;
  }
  return {
    ...base,
    pageable: dataObj['pageable'] as PageableInfo | undefined,
  };
}

function buildPagedApiResponse<T>(
  raw: unknown,
  defaultMessage: string,
  includePageable: boolean,
): PagedApiResponse<T> {
  if (isRecord(raw) && 'success' in raw && 'data' in raw) {
    const responseObj = raw as Record<string, unknown>;
    let dataObj: Record<string, unknown>;
    if (Array.isArray(responseObj['data'])) {
      dataObj = { content: responseObj['data'] };
    } else if (isRecord(responseObj['data'])) {
      dataObj = responseObj['data'] as Record<string, unknown>;
    } else {
      dataObj = {};
    }
    return {
      success: Boolean(responseObj['success']),
      message: (responseObj['message'] as string) || defaultMessage,
      data: extractPagedMeta(dataObj, includePageable) as PagedApiResponse<T>['data'],
      error: (responseObj['error'] as string) || undefined,
    };
  }

  console.warn('CampusApiService: paged response format unexpected:', raw);
  return {
    success: false,
    message: 'Unexpected response format',
    data: { content: [] },
    error: 'Invalid response structure',
  };
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

export interface BulkCampusUploadRowResult {
  rowNumber?: number;
  campusName?: string;
  success?: boolean;
  message?: string;
  error?: string;
  campusId?: string;
}

export interface BulkCampusUploadResponse {
  totalRows?: number;
  successfulRows?: number;
  failedRows?: number;
  results?: BulkCampusUploadRowResult[];
}

export interface ApiResponseBulkCampusUploadResponse {
  success: boolean;
  message: string | null;
  data: BulkCampusUploadResponse | null;
  error: string | null;
}


function buildUrl(baseUrl: string, endpoint: string): string {
  const trimmed = baseUrl?.trim() ?? '';

  if (!trimmed) return endpoint;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }

  if (trimmed.startsWith('/')) {
    return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }

  if (trimmed.includes('.') || trimmed.includes(':')) {
    return `http://${trimmed}` + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }

  return trimmed + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
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



