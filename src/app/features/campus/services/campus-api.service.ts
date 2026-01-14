import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, throwError, tap } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType, STORAGE_KEYS } from '../../../core/config/app.constants';
import { ApiResponsePlacedStudentsResponse, ApiResponsePageAlumniResponse, PlacedStudentResponse } from '../../student/models/student.models';
import { StorageService } from '../../../core/storage/storage.service';

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
    
    console.log('CampusApiService: Getting campus by ID - URL:', url, 'campusId:', campusId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getCampusById raw response:', raw);
        const unwrapped = unwrapApiResponse<Campus>(raw);
        console.log('CampusApiService: getCampusById unwrapped response:', unwrapped);
        if (unwrapped) {
          console.log('CampusApiService: aboutCampus field value:', unwrapped.aboutCampus);
        }
        return unwrapped;
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
    
    console.log('CampusApiService: Getting public campus by ID - URL:', url, 'campusId:', campusId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getPublicCampusById raw response:', raw);
        
        // Response structure: { message: null, data: { id, campusId, email, campusName, ... } }
        if (raw && typeof raw === 'object' && raw !== null) {
          const response = raw as Record<string, unknown>;
          
          // Check if response has 'data' field (public landing endpoint structure)
          if ('data' in response && response['data']) {
            const campusData = response['data'] as Campus;
            console.log('CampusApiService: getPublicCampusById - Extracted campus data:', campusData);
            console.log('CampusApiService: getPublicCampusById - Campus ID from response:', campusData.campusId || campusData.id);
            return campusData;
          }
          
          // If no 'data' field, check if it's a direct campus object
          if ('campusId' in response || 'id' in response || 'campusName' in response) {
            console.log('CampusApiService: getPublicCampusById - Direct campus object');
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
   * POST /dashboard/{campusId}/students/placed
   * Add a placed student.
   * Creates a new placed student card from JSON request with multipart/form-data for file upload.
   * Request format: [studentName, studentPhoto (File), courseId, courseName, batch, placementCompanyId, placementCompanyName, designation, sector]
   */
  addPlacedStudent(formData: FormData, campusId?: string): Observable<AddPlacedStudentResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: addPlacedStudent - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to add placed student'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT, { campusId: finalCampusId });
    console.log('CampusApiService: addPlacedStudent - URL:', url);
    console.log('CampusApiService: addPlacedStudent - Campus ID:', finalCampusId);
    console.log('CampusApiService: addPlacedStudent - FormData keys:', Array.from(formData.keys()));
    
    // Let Angular automatically set Content-Type to multipart/form-data with boundary
    return this.http.post<unknown>(url, formData).pipe(
      map((raw) => {
        console.log('CampusApiService: addPlacedStudent - Raw response:', raw);
        
        // Backend response format: { success: true, message: "Placed student added successfully", data: {...}, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: AddPlacedStudentResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Placed student added successfully',
              data: responseObj['data'] as AddPlacedStudentResponseData,
              error: (responseObj['error'] as string) || null,
            };
            
            console.log('CampusApiService: addPlacedStudent - Parsed response:', response);
            return response;
          }
        }
        
        console.warn('CampusApiService: addPlacedStudent - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: addPlacedStudent - Error occurred:', error);
        console.error('CampusApiService: addPlacedStudent - Error status:', error?.status);
        console.error('CampusApiService: addPlacedStudent - Error URL:', error?.url);
        console.error('CampusApiService: addPlacedStudent - Error response:', error?.error);
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
  ): Observable<ApiResponsePlacedStudentsResponse> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getPlacedStudents - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get placed students'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PLACED_STUDENTS, { campusId: finalCampusId });
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (companyName) {
      params = params.set('companyName', companyName);
    }
    if (batch) {
      params = params.set('batch', batch);
    }
    
    console.log('CampusApiService: getPlacedStudents - URL:', url);
    console.log('CampusApiService: getPlacedStudents - Campus ID:', finalCampusId);
    console.log('CampusApiService: getPlacedStudents - Page:', page, 'Limit:', limit);
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getPlacedStudents - Raw response:', raw);
        
        // Backend response format: { success: true, message: "Placed students fetched successfully", data: { content: [...], ... }, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const dataObj = responseObj['data'] as Record<string, unknown>;
            const response: ApiResponsePlacedStudentsResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Placed students fetched successfully',
              data: {
                content: (Array.isArray(dataObj['content']) ? dataObj['content'] : []) as PlacedStudentResponse[],
                totalPages: typeof dataObj['totalPages'] === 'number' ? dataObj['totalPages'] : undefined,
                totalElements: typeof dataObj['totalElements'] === 'number' ? dataObj['totalElements'] : undefined,
                first: typeof dataObj['first'] === 'boolean' ? dataObj['first'] : undefined,
                last: typeof dataObj['last'] === 'boolean' ? dataObj['last'] : undefined,
                size: typeof dataObj['size'] === 'number' ? dataObj['size'] : undefined,
                number: typeof dataObj['number'] === 'number' ? dataObj['number'] : undefined,
                numberOfElements: typeof dataObj['numberOfElements'] === 'number' ? dataObj['numberOfElements'] : undefined,
                empty: typeof dataObj['empty'] === 'boolean' ? dataObj['empty'] : undefined,
              },
              error: (responseObj['error'] as string) || undefined,
            };
            
            console.log('CampusApiService: getPlacedStudents - Parsed response:', response);
            return response;
          }
        }
        
        console.warn('CampusApiService: getPlacedStudents - Response format unexpected:', raw);
        // Return a default response structure
        return {
          success: false,
          message: 'Unexpected response format',
          data: { content: [] },
          error: 'Invalid response structure',
        } as ApiResponsePlacedStudentsResponse;
      }),
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
   * GET /dashboard/students/batches
   * Get all batches for the campus.
   * Returns list of all available batches.
   */
  getAllBatches(): Observable<BatchesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_BATCHES);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as BatchesResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /dashboard/students/batch
   * Get students by batch with pagination.
   * Maximum 6 students per page. Supports sorting by name, batch, or performance.
   */
  getStudentsByBatch(
    batch: string,
    page = 1,
    size = 6,
    sortBy?: string,
  ): Observable<StudentsByBatchResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_STUDENTS_BY_BATCH);
    let params = new HttpParams()
      .set('batch', batch)
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as StudentsByBatchResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /dashboard/companies
   * Add a company visited.
   * Request: multipart/form-data with companyName (string) and logo (file)
   * Response: { success: true, message: string, data: AddCompanyVisitedResponseData, error: null }
   */
  addCompanyVisited(formData: FormData): Observable<AddCompanyVisitedResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COMPANY_VISITED);
    
    console.log('CampusApiService: ========== ADD COMPANY VISITED API CALL ==========');
    console.log('CampusApiService: addCompanyVisited - URL:', url);
    console.log('CampusApiService: addCompanyVisited - FormData keys:', Array.from(formData.keys()));
    console.log('CampusApiService: FormData companyName:', formData.get('companyName'));
    console.log('CampusApiService: FormData logo:', formData.get('logo'));
    
    return this.http.post<unknown>(url, formData, { observe: 'response' }).pipe(
      map((httpResponse) => {
        console.log('CampusApiService: ========== ADD COMPANY VISITED RESPONSE RECEIVED ==========');
        console.log('CampusApiService: HTTP Status:', httpResponse.status);
        console.log('CampusApiService: HTTP Status Text:', httpResponse.statusText);
        console.log('CampusApiService: Response Headers:', httpResponse.headers.keys());
        
        const raw = httpResponse.body;
        console.log('CampusApiService: addCompanyVisited - Raw response body:', raw);
        console.log('CampusApiService: Raw response type:', typeof raw);
        
        // For 201 Created or 200 OK, treat as success even if response format is unexpected
        if (httpResponse.status === 201 || httpResponse.status === 200) {
          if (raw && typeof raw === 'object' && raw !== null) {
            const response = raw as Record<string, unknown>;
            console.log('CampusApiService: Response keys:', Object.keys(response));
            console.log('CampusApiService: Response success:', response['success']);
            console.log('CampusApiService: Response message:', response['message']);
            console.log('CampusApiService: Response data:', response['data']);
            
            // Check if response has expected structure: { success, message, data, error }
            if ('success' in response && 'data' in response) {
              const result = {
                success: response['success'] as boolean,
                message: (response['message'] as string) || 'Company visited added successfully',
                data: response['data'] as AddCompanyVisitedResponseData,
                error: (response['error'] as string) || null,
              } as AddCompanyVisitedResponse;
              
              console.log('CampusApiService: ✅ Parsed response:', result);
              return result;
            } else {
              // HTTP 201/200 but unexpected response format - still treat as success
              console.warn('CampusApiService: ⚠️ Response structure invalid but HTTP 201/200 - treating as success');
              const result = {
                success: true,
                message: 'Company visited added successfully',
                data: raw as AddCompanyVisitedResponseData,
                error: null,
              } as AddCompanyVisitedResponse;
              console.log('CampusApiService: ✅ Returning success response:', result);
              return result;
            }
          } else {
            // HTTP 201/200 but no body or invalid body - still treat as success
            console.warn('CampusApiService: ⚠️ No response body but HTTP 201/200 - treating as success');
            const result = {
              success: true,
              message: 'Company visited added successfully',
              data: {} as AddCompanyVisitedResponseData,
              error: null,
            } as AddCompanyVisitedResponse;
            console.log('CampusApiService: ✅ Returning success response:', result);
            return result;
          }
        } else {
          // Unexpected status code
          console.warn('CampusApiService: ❌ Unexpected HTTP status:', httpResponse.status);
          return null;
        }
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ ADD COMPANY VISITED - ERROR OCCURRED ❌❌❌');
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
   * GET /dashboard/companies
   * Get companies visited with pagination.
   * Query params: page (default 0), limit (default 6)
   * Response: Spring Page object with content array and pagination metadata at root level
   */
  getCompaniesVisited(page = 0, limit = 6, campusId?: string): Observable<GetCompaniesVisitedResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COMPANIES_VISITED);
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (finalCampusId) {
      params = params.set('campusId', finalCampusId);
    }
    
    console.log('CampusApiService: ========== GET COMPANIES VISITED API CALL ==========');
    console.log('CampusApiService: getCompaniesVisited - URL:', url);
    console.log('CampusApiService: getCompaniesVisited - Params:', { page, limit });
    console.log('CampusApiService: Full URL with params:', `${url}?page=${page}&limit=${limit}`);
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: ========== GET COMPANIES VISITED RESPONSE RECEIVED ==========');
        console.log('CampusApiService: getCompaniesVisited - Raw response:', raw);
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response is array?', Array.isArray(raw));
        console.log('CampusApiService: Raw response is object?', typeof raw === 'object' && raw !== null);
        
        if (raw && typeof raw === 'object' && raw !== null) {
          // Check if response is an array (Spring Page can return array directly)
          if (Array.isArray(raw)) {
            const contentArray = raw as CompanyVisitedItem[];
            console.log('CampusApiService: Response is array, length:', contentArray.length);
            console.log('CampusApiService: Content array:', contentArray);
            
            // If it's just an array, we need to check for pagination info in a different way
            // But based on the API doc, it should have pagination metadata
            // Let's check if there are additional properties on the response object
            const response = raw as unknown as Record<string, unknown>;
            
            if ('totalPages' in response || 'totalElements' in response || 'pageable' in response) {
              // It's a Spring Page object with array-like structure
              const totalPages = (response['totalPages'] as number) ?? 1;
              const totalElements = (response['totalElements'] as number) ?? contentArray.length;
              const pageable = response['pageable'] as PageableInfo | undefined;
              const size = (response['size'] as number) ?? limit;
              
              console.log('CampusApiService: Found pagination metadata:', { totalPages, totalElements, size });
              
              const result = {
                success: true,
                message: 'Companies fetched successfully',
                data: {
                  content: contentArray,
                  pageable: pageable,
                  totalPages: totalPages,
                  totalElements: totalElements,
                },
                error: null,
              } as GetCompaniesVisitedResponse;
              
              console.log('CampusApiService: ✅ Parsed response (array with metadata):', result);
              return result;
            } else {
              // Pure array response - create pagination info
              const result = {
                success: true,
                message: 'Companies fetched successfully',
                data: {
                  content: contentArray,
                  pageable: undefined,
                  totalPages: 1,
                  totalElements: contentArray.length,
                },
                error: null,
              } as GetCompaniesVisitedResponse;
              
              console.log('CampusApiService: ✅ Parsed response (pure array):', result);
              return result;
            }
          } else {
            // Response is an object - check for Spring Page structure
            const response = raw as Record<string, unknown>;
            console.log('CampusApiService: Response keys:', Object.keys(response));
            
            // Check if it has content array (Spring Page structure)
            if ('content' in response && Array.isArray(response['content'])) {
              const contentArray = response['content'] as CompanyVisitedItem[];
              const pageable = response['pageable'] as PageableInfo | undefined;
              const totalPages = (response['totalPages'] as number) ?? 1;
              const totalElements = (response['totalElements'] as number) ?? contentArray.length;
              const size = (response['size'] as number) ?? limit;
              
              console.log('CampusApiService: Found Spring Page structure');
              console.log('CampusApiService: Content array length:', contentArray.length);
              console.log('CampusApiService: Pagination:', { totalPages, totalElements, size });
              console.log('CampusApiService: Content array:', contentArray);
              
              const result = {
                success: true,
                message: 'Companies fetched successfully',
                data: {
                  content: contentArray,
                  pageable: pageable,
                  totalPages: totalPages,
                  totalElements: totalElements,
                },
                error: null,
              } as GetCompaniesVisitedResponse;
              
              console.log('CampusApiService: ✅ Parsed response (Spring Page object):', result);
              return result;
            }
            
            // Check if it's a wrapped response with success/data
            if ('success' in response && 'data' in response) {
              const data = response['data'] as Record<string, unknown>;
              
              if (data && typeof data === 'object' && 'content' in data && Array.isArray(data['content'])) {
                const contentArray = data['content'] as CompanyVisitedItem[];
                const pageable = data['pageable'] as PageableInfo | undefined;
                const totalPages = (data['totalPages'] as number) ?? 1;
                const totalElements = (data['totalElements'] as number) ?? contentArray.length;
                
                const result = {
                  success: response['success'] as boolean,
                  message: (response['message'] as string) || 'Companies fetched successfully',
                  data: {
                    content: contentArray,
                    pageable: pageable,
                    totalPages: totalPages,
                    totalElements: totalElements,
                  },
                  error: (response['error'] as string) || null,
                } as GetCompaniesVisitedResponse;
                
                console.log('CampusApiService: ✅ Parsed response (wrapped format):', result);
                return result;
              }
            }
            
            console.warn('CampusApiService: ⚠️ Response structure not recognized');
            console.warn('CampusApiService: Response keys:', Object.keys(response));
          }
        } else {
          console.warn('CampusApiService: ⚠️ Response is not a valid object or array');
          console.warn('CampusApiService: Raw response:', raw);
        }
        
        console.warn('CampusApiService: ❌ getCompaniesVisited - Unexpected response format, returning null');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ getCompaniesVisited - ERROR OCCURRED ❌❌❌');
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
  addCourse(request: AddCourseRequest, campusId?: string): Observable<AddCourseResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: addCourse - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to add a course'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE, { campusId: finalCampusId });
    console.log('CampusApiService: addCourse - URL:', url);
    console.log('CampusApiService: addCourse - Campus ID:', finalCampusId);
    console.log('CampusApiService: addCourse - Request:', request);
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<unknown>(url, request, { headers }).pipe(
      map((raw) => {
        console.log('CampusApiService: addCourse - Raw response:', raw);
        
        // Backend response format: { success: true, message: string, data: {...}, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: AddCourseResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Course added successfully',
              data: responseObj['data'] as AddCourseResponseData,
              error: (responseObj['error'] as string) || null,
            };
            
            console.log('CampusApiService: addCourse - Parsed response:', response);
            
            // Ensure campusId is included in response data (backend should return it, but ensure it's there)
            if (response.data && !response.data.campusId) {
              response.data.campusId = finalCampusId;
              console.log('CampusApiService: addCourse - Added campusId to response data:', finalCampusId);
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
  getAllCourses(campusId?: string): Observable<AddCourseResponseData[]> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getAllCourses - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get courses'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_COURSES, { campusId: finalCampusId });
    console.log('CampusApiService: getAllCourses - URL:', url);
    console.log('CampusApiService: getAllCourses - Campus ID:', finalCampusId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getAllCourses - Raw response:', raw);
        
        // Backend response format: { success: true, message: null, data: AddCourseResponseData[], error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const success = responseObj['success'] as boolean;
            const data = responseObj['data'];
            
            if (success && Array.isArray(data)) {
              const courses = data as AddCourseResponseData[];
              console.log('CampusApiService: getAllCourses - Parsed courses:', courses);
              return courses;
            }
          }
        }
        
        console.warn('CampusApiService: getAllCourses - Response format unexpected:', raw);
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: getAllCourses - Error occurred:', error);
        console.error('CampusApiService: getAllCourses - Error status:', error?.status);
        console.error('CampusApiService: getAllCourses - Error URL:', error?.url);
        console.error('CampusApiService: getAllCourses - Error response:', error?.error);
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
    console.log('CampusApiService: getCourseById - URL:', url);
    console.log('CampusApiService: getCourseById - Campus ID:', finalCampusId);
    console.log('CampusApiService: getCourseById - Course ID:', courseId.trim());
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getCourseById - Raw response:', raw);
        
        // Backend response format: { success: true, message: null, data: AddCourseResponseData, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const success = responseObj['success'] as boolean;
            const data = responseObj['data'];
            
            if (success && data && typeof data === 'object') {
              const course = data as AddCourseResponseData;
              console.log('CampusApiService: getCourseById - Parsed course:', course);
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
    
    console.log('CampusApiService: checkCourseNameExists - URL:', url);
    console.log('CampusApiService: checkCourseNameExists - Campus ID:', finalCampusId);
    console.log('CampusApiService: checkCourseNameExists - Course Name:', courseName.trim());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: checkCourseNameExists - Raw response:', raw);
        
        // Backend response format: { success: true, message: null, data: true, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const success = responseObj['success'] as boolean;
            const data = responseObj['data'];
            
            if (success && typeof data === 'boolean') {
              const exists = data as boolean;
              console.log('CampusApiService: checkCourseNameExists - Course name exists:', exists);
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
  deleteCourse(courseId: string, campusId?: string): Observable<{ success: boolean; message: string | null; data: null; error: string | null } | null> {
    if (!courseId || !courseId.trim()) {
      console.error('CampusApiService: deleteCourse - Course ID is required');
      return throwError(() => new Error('Course ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: deleteCourse - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to delete course'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_COURSE, { 
      campusId: finalCampusId,
      courseId: courseId.trim()
    });
    console.log('CampusApiService: deleteCourse - URL:', url);
    console.log('CampusApiService: deleteCourse - Campus ID:', finalCampusId);
    console.log('CampusApiService: deleteCourse - Course ID:', courseId.trim());
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: deleteCourse - Raw response:', raw);
        
        // Backend response format: { success: true, message: "Course deleted successfully", data: null, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj) {
            const response = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || null,
              data: null,
              error: (responseObj['error'] as string) || null,
            };
            
            console.log('CampusApiService: deleteCourse - Parsed response:', response);
            return response;
          }
        }
        
        console.warn('CampusApiService: deleteCourse - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: deleteCourse - Error occurred:', error);
        console.error('CampusApiService: deleteCourse - Error status:', error?.status);
        console.error('CampusApiService: deleteCourse - Error URL:', error?.url);
        console.error('CampusApiService: deleteCourse - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /campus/{campusId}/faculty
   * Add a new faculty member (JSON)
   * Adds a new faculty member from JSON request. Use this endpoint when photo URL is provided directly instead of file upload.
   * 
   * Request body structure:
   * {
   *   basicInformation: {
   *     fullName: string,
   *     email: string,
   *     photourl: string | null,
   *     dateOfBirth: string,
   *     gender: string,
   *     phoneNumber: string
   *   },
   *   professionalInformation: {
   *     designation: string,
   *     department: string,
   *     specialization: string[],
   *     yearsOfExperience: number,
   *     qualifications: string[],
   *     certificates: string[]
   *   }
   * }
   * 
   * Response: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  addFaculty(
    data: { basicInformation: unknown; professionalInformation: unknown },
    campusId?: string
  ): Observable<AddFacultyResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: addFaculty - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to add faculty'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_FACULTY, { campusId: finalCampusId });
    
    // Log the exact request being sent to backend
    console.log('CampusApiService: addFaculty - URL:', url);
    console.log('CampusApiService: addFaculty - Campus ID:', finalCampusId);
    console.log('CampusApiService: addFaculty - Request Data:', JSON.stringify(data, null, 2));
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.post<unknown>(url, data, {
      headers: headers
    }).pipe(
      map((raw) => {
        console.log('CampusApiService: addFaculty - Raw response:', raw);
        
        // Backend response structure: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const dataObj = responseObj['data'] as Record<string, unknown>;
            
            // Verify data has basicInformation and professionalInformation
            if (
              dataObj &&
              typeof dataObj === 'object' &&
              'basicInformation' in dataObj &&
              'professionalInformation' in dataObj &&
              typeof dataObj['basicInformation'] === 'object' &&
              typeof dataObj['professionalInformation'] === 'object'
            ) {
              const response: AddFacultyResponse = {
                success: responseObj['success'] as boolean,
                message: (responseObj['message'] as string) || 'Faculty member added successfully',
                data: {
                  basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
                  professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
                },
                error: (responseObj['error'] as string) || null,
              };
              
              console.log('CampusApiService: addFaculty - Parsed response:', response);
              return response;
            }
          }
        }
        
        console.warn('CampusApiService: addFaculty - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: addFaculty - Error occurred:', error);
        console.error('CampusApiService: addFaculty - Error status:', error?.status);
        console.error('CampusApiService: addFaculty - Error URL:', error?.url);
        console.error('CampusApiService: addFaculty - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * PUT /campus/{campusId}/faculty/{facultyId}
   * Updates faculty member details with validation. Supports partial updates. Photo update is optional.
   * Validates that the faculty belongs to the specified campus.
   * 
   * Request Body: {
   *   department?: string[],
   *   specialization?: string[],
   *   yearsOfExperience?: number[],
   *   qualifications?: string[],
   *   certificates?: string[],
   *   photo?: string
   * }
   * 
   * Response: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  updateFaculty(
    facultyId: string,
    data: {
      department?: string[];
      specialization?: string[];
      yearsOfExperience?: number[];
      qualifications?: string[];
      certificates?: string[];
      photo?: string;
    },
    campusId?: string
  ): Observable<UpdateFacultyResponse | null> {
    if (!facultyId || !facultyId.trim()) {
      console.error('CampusApiService: updateFaculty - Faculty ID is required');
      return throwError(() => new Error('Faculty ID is required'));
    }
    
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: updateFaculty - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to update faculty'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_FACULTY, { 
      campusId: finalCampusId,
      facultyId: facultyId.trim()
    });
    
    console.log('CampusApiService: updateFaculty - URL:', url);
    console.log('CampusApiService: updateFaculty - Campus ID:', finalCampusId);
    console.log('CampusApiService: updateFaculty - Faculty ID:', facultyId.trim());
    console.log('CampusApiService: updateFaculty - Request data:', data);
    
    // Prepare request body - only include fields that are provided
    const requestBody: {
      department?: string[];
      specialization?: string[];
      yearsOfExperience?: number[];
      qualifications?: string[];
      certificates?: string[];
      photo?: string;
    } = {};
    
    if (data.department && Array.isArray(data.department) && data.department.length > 0) {
      requestBody.department = data.department;
    }
    if (data.specialization && Array.isArray(data.specialization) && data.specialization.length > 0) {
      requestBody.specialization = data.specialization;
    }
    if (data.yearsOfExperience && Array.isArray(data.yearsOfExperience) && data.yearsOfExperience.length > 0) {
      requestBody.yearsOfExperience = data.yearsOfExperience;
    }
    if (data.qualifications && Array.isArray(data.qualifications) && data.qualifications.length > 0) {
      requestBody.qualifications = data.qualifications;
    }
    if (data.certificates && Array.isArray(data.certificates) && data.certificates.length > 0) {
      requestBody.certificates = data.certificates;
    }
    if (data.photo && typeof data.photo === 'string' && data.photo.trim()) {
      requestBody.photo = data.photo.trim();
    }
    
    return this.http.put<unknown>(url, requestBody).pipe(
      map((raw) => {
        console.log('CampusApiService: updateFaculty - Raw response:', raw);
        
        // Backend response structure: { success: true, message: string, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has expected structure: { success, message, data, error }
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            
            // Verify data has basicInformation and professionalInformation
            if (data && typeof data === 'object' && data !== null) {
              const dataObj = data as Record<string, unknown>;
              
              if ('basicInformation' in dataObj && 'professionalInformation' in dataObj) {
                const response: UpdateFacultyResponse = {
                  success: responseObj['success'] as boolean,
                  message: (responseObj['message'] as string) || null,
                  data: {
                    basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
                    professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
                  },
                  error: (responseObj['error'] as string) || null,
                };
                
                console.log('CampusApiService: updateFaculty - Parsed response:', response);
                return response;
              }
            }
          }
        }
        
        console.warn('CampusApiService: updateFaculty - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: updateFaculty - Error occurred:', error);
        console.error('CampusApiService: updateFaculty - Error status:', error?.status);
        console.error('CampusApiService: updateFaculty - Error URL:', error?.url);
        console.error('CampusApiService: updateFaculty - Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /campus/{campusId}/faculty
   * Retrieves all faculty members for the campus. Returns list sorted alphabetically by name.
   * 
   * Response: { success: true, message: string, data: FacultyListItem[], error: null }
   */
  getAllFaculties(campusId?: string): Observable<GetAllFacultiesResponse | null> {
    // Automatically inject campus ID from storage if not provided
    const finalCampusId = this.getCampusId(campusId);
    if (!finalCampusId) {
      console.error('CampusApiService: getAllFaculties - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to get faculty members'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_FACULTY, { campusId: finalCampusId });
    
    console.log('CampusApiService: getAllFaculties - URL:', url);
    console.log('CampusApiService: getAllFaculties - Campus ID:', finalCampusId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getAllFaculties - Raw response:', raw);
        
        // Backend response structure: { success: true, message: string, data: FacultyListItem[], error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            
            // Verify data is an array
            if (Array.isArray(data)) {
              const response: GetAllFacultiesResponse = {
                success: responseObj['success'] as boolean,
                message: (responseObj['message'] as string) || null,
                data: data as FacultyListItem[],
                error: (responseObj['error'] as string) || null,
              };
              
              console.log('CampusApiService: getAllFaculties - Parsed response:', response);
              console.log('CampusApiService: getAllFaculties - Data array length:', response.data.length);
              return response;
            }
          }
        }
        
        console.warn('CampusApiService: getAllFaculties - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getAllFaculties - Error occurred:', error);
        console.error('CampusApiService: getAllFaculties - Error status:', error?.status);
        console.error('CampusApiService: getAllFaculties - Error URL:', error?.url);
        console.error('CampusApiService: getAllFaculties - Error response:', error?.error);
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
    
    console.log('CampusApiService: getFacultyById - URL:', url);
    console.log('CampusApiService: getFacultyById - Campus ID:', finalCampusId);
    console.log('CampusApiService: getFacultyById - Faculty ID:', facultyId.trim());
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getFacultyById - Raw response:', raw);
        
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
                
                console.log('CampusApiService: getFacultyById - Parsed response:', response);
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
    
    console.log('CampusApiService: getFacultyProfile - URL:', url);
    console.log('CampusApiService: getFacultyProfile - Campus ID:', finalCampusId);
    console.log('CampusApiService: getFacultyProfile - Faculty ID:', facultyId.trim());
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getFacultyProfile - Raw response:', raw);
        
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
                
                console.log('CampusApiService: getFacultyProfile - Parsed response:', response);
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
    
    console.log('CampusApiService: deleteFaculty - URL:', url);
    console.log('CampusApiService: deleteFaculty - Campus ID:', finalCampusId);
    console.log('CampusApiService: deleteFaculty - Faculty ID:', facultyId.trim());
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: deleteFaculty - Raw response:', raw);
        
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
            
            console.log('CampusApiService: deleteFaculty - Parsed response:', response);
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
    
    console.log('CampusApiService: checkFacultyEmail - URL:', url);
    console.log('CampusApiService: checkFacultyEmail - Campus ID:', finalCampusId);
    console.log('CampusApiService: checkFacultyEmail - Email:', email.trim());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: checkFacultyEmail - Raw response:', raw);
        
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
            
            console.log('CampusApiService: checkFacultyEmail - Parsed response:', response);
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
            
            console.log('Designations loaded from API:', uniqueDesignations.length, 'items');
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
    console.log('CampusApiService: getBatchesForDropdown - URL:', url);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getBatchesForDropdown - Raw response:', raw);
        console.log('CampusApiService: getBatchesForDropdown - Response type:', typeof raw);
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          console.log('CampusApiService: getBatchesForDropdown - Response structure:', {
            success: response.success,
            hasData: !!response.data,
            dataType: typeof response.data,
            isDataArray: Array.isArray(response.data),
            dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
          });
          
          if (response.success && Array.isArray(response.data)) {
            const batches = response.data as string[];
            console.log('CampusApiService: getBatchesForDropdown - Extracted batches:', batches);
            return batches;
          } else if (Array.isArray(raw)) {
            // Handle case where API directly returns array
            console.log('CampusApiService: getBatchesForDropdown - Response is direct array');
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
    
    console.log('CampusApiService: getAlumniForCarousel - URL:', url, 'Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getAlumniForCarousel - Raw response:', raw);
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
    
    console.log('CampusApiService: getAlumniForDashboard - URL:', url, 'Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getAlumniForDashboard - Raw response:', raw);
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
    console.log('CampusApiService: getAnnouncements - URL:', url, 'campusId:', campusId);
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getAnnouncements - Raw response:', raw);
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
    console.log('CampusApiService: getSynkupAnnouncements - URL:', url, 'Params:', params.toString());
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getSynkupAnnouncements - Raw response:', raw);
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

  /**
   * POST /campus/{campusId}/prospectus/upload
   * Upload prospectus documents for a campus-course combination.
   * Campus ID is provided as path variable. Supports multiple files (PDF, DOCX, JPG, PNG, max 50MB each).
   * Files are stored in folder structure: campus/prospectus/{campusId}. Automatic versioning for existing prospectuses.
   * 
   * @param campusId - Campus ID (path parameter)
   * @param formData - FormData containing courseName (string) and files (File[])
   */
  uploadProspectus(campusId: string, formData: FormData): Observable<UploadProspectusResponse | null> {
    if (!campusId || !campusId.trim()) {
      console.error('CampusApiService: uploadProspectus - Campus ID is required');
      return throwError(() => new Error('Campus ID is required to upload prospectus'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS, { campusId: campusId.trim() });
    console.log('CampusApiService: uploadProspectus - URL:', url);
    console.log('CampusApiService: uploadProspectus - Campus ID:', campusId.trim());
    console.log('CampusApiService: uploadProspectus - FormData keys:', Array.from(formData.keys()));
    
    // Don't set Content-Type header - browser will set it automatically with boundary for multipart/form-data
    return this.http.post<unknown>(url, formData).pipe(
      map((raw) => {
        console.log('CampusApiService: uploadProspectus - Raw response:', raw);
        
        // Backend response format: { success: true, message: "...", data: {...}, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj && 'data' in responseObj) {
            const response: UploadProspectusResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Prospectus uploaded successfully',
              data: responseObj['data'] as UploadProspectusResponseData,
              error: (responseObj['error'] as string) || null,
            };
            
            console.log('CampusApiService: uploadProspectus - Parsed response:', response);
            return response;
          }
        }
        
        console.warn('CampusApiService: uploadProspectus - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: uploadProspectus - Error occurred:', error);
        console.error('CampusApiService: uploadProspectus - Error status:', error?.status);
        console.error('CampusApiService: uploadProspectus - Error URL:', error?.url);
        console.error('CampusApiService: uploadProspectus - Error response:', error?.error);
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
    console.log('CampusApiService: getProspectusByCampus - URL:', url);
    console.log('CampusApiService: getProspectusByCampus - Campus ID:', campusId.trim());
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getProspectusByCampus - Raw response:', raw);
        
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
            
            console.log('CampusApiService: getProspectusByCampus - Parsed response:', response);
            console.log('CampusApiService: getProspectusByCampus - Data array length:', response.data.length);
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
  getProspectusByCourse(campusId: string, courseName: string): Observable<GetProspectusResponse | null> {
    if (!campusId || !campusId.trim()) {
      console.error('CampusApiService: getProspectusByCourse - Campus ID is required');
      return throwError(() => new Error('Campus ID is required'));
    }
    
    if (!courseName || !courseName.trim()) {
      console.error('CampusApiService: getProspectusByCourse - Course name is required');
      return throwError(() => new Error('Course name is required'));
    }
    
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE, { campusId: campusId.trim() });
    const params = new HttpParams().set('courseName', courseName.trim());
    
    console.log('CampusApiService: getProspectusByCourse - URL:', url);
    console.log('CampusApiService: getProspectusByCourse - Campus ID:', campusId.trim());
    console.log('CampusApiService: getProspectusByCourse - Course Name:', courseName.trim());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getProspectusByCourse - Raw response:', raw);
        
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
            
            console.log('CampusApiService: getProspectusByCourse - Parsed response:', response);
            console.log('CampusApiService: getProspectusByCourse - Data array length:', response.data.length);
            return response;
          }
        }
        
        console.warn('CampusApiService: getProspectusByCourse - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: getProspectusByCourse - Error occurred:', error);
        console.error('CampusApiService: getProspectusByCourse - Error status:', error?.status);
        console.error('CampusApiService: getProspectusByCourse - Error URL:', error?.url);
        console.error('CampusApiService: getProspectusByCourse - Error response:', error?.error);
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
    console.log('CampusApiService: getProspectusById - URL:', url);
    console.log('CampusApiService: getProspectusById - Campus ID:', finalCampusId);
    console.log('CampusApiService: getProspectusById - Prospectus ID:', prospectusId.trim());
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: getProspectusById - Raw response:', raw);
        
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
            
            console.log('CampusApiService: getProspectusById - Parsed response:', response);
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
    
    console.log('CampusApiService: downloadProspectus - URL:', url);
    console.log('CampusApiService: downloadProspectus - Campus ID:', campusId.trim());
    console.log('CampusApiService: downloadProspectus - Course Name:', courseName.trim());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: downloadProspectus - Raw response:', raw);
        
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
            
            console.log('CampusApiService: downloadProspectus - Parsed response:', response);
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
  deleteProspectus(prospectusId: string, campusId?: string): Observable<DeleteProspectusResponse | null> {
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
    console.log('CampusApiService: deleteProspectus - URL:', url);
    console.log('CampusApiService: deleteProspectus - Campus ID:', finalCampusId);
    console.log('CampusApiService: deleteProspectus - Prospectus ID:', prospectusId.trim());
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: deleteProspectus - Raw response:', raw);
        
        // Backend response format: { success: true, message: "Prospectus deleted successfully", data: null, error: null }
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure
          if ('success' in responseObj) {
            const response: DeleteProspectusResponse = {
              success: responseObj['success'] as boolean,
              message: (responseObj['message'] as string) || 'Prospectus deleted successfully',
              data: null,
              error: (responseObj['error'] as string) || null,
            };
            
            console.log('CampusApiService: deleteProspectus - Parsed response:', response);
            return response;
          }
        }
        
        console.warn('CampusApiService: deleteProspectus - Response format unexpected:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: deleteProspectus - Error occurred:', error);
        console.error('CampusApiService: deleteProspectus - Error status:', error?.status);
        console.error('CampusApiService: deleteProspectus - Error URL:', error?.url);
        console.error('CampusApiService: deleteProspectus - Error response:', error?.error);
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
    
    console.log('CampusApiService: getRisingStars - URL:', url, 'page:', page, 'size:', size);
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: getRisingStars - Raw response:', raw);
        
        if (raw && typeof raw === 'object' && raw !== null) {
          const responseObj = raw as Record<string, unknown>;
          
          // Check if response has the expected structure: { success: true, message: null, data: {...} }
          if ('success' in responseObj && 'data' in responseObj) {
            const data = responseObj['data'];
            
            if (data && typeof data === 'object') {
              const dataObj = data as Record<string, unknown>;
              
              // Verify data has content array
              if ('content' in dataObj && Array.isArray(dataObj['content'])) {
                const response: RisingStarsResponse = {
                  success: responseObj['success'] as boolean,
                  message: (responseObj['message'] as string) || null,
                  data: {
                    content: dataObj['content'] as RisingStarData[],
                    pageable: dataObj['pageable'] as any,
                    last: dataObj['last'] as boolean,
                    totalPages: dataObj['totalPages'] as number,
                    totalElements: dataObj['totalElements'] as number,
                    first: dataObj['first'] as boolean,
                    size: dataObj['size'] as number,
                    number: dataObj['number'] as number,
                    sort: dataObj['sort'] as any,
                    numberOfElements: dataObj['numberOfElements'] as number,
                  },
                  error: (responseObj['error'] as string) || null,
                };
                
                console.log('CampusApiService: getRisingStars - Parsed response:', response);
                console.log('CampusApiService: getRisingStars - Content length:', response.data?.content?.length || 0);
                return response;
              }
            }
          }
        }
        
        console.warn('CampusApiService: getRisingStars - Response format unexpected:', raw);
        return null;
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
    size = 5,
  ): Observable<TestimonialsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.TESTIMONIALS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    console.log('CampusApiService: Getting testimonials - URL:', url, 'page:', page, 'size:', size);
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Testimonials raw response:', raw);
        if (raw && typeof raw === 'object') {
          const response = raw as TestimonialsResponse;
          console.log('CampusApiService: Testimonials parsed response:', response);
          return response;
        }
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Testimonials API error:', error);
        return throwError(() => error);
      })
    );
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
    page = 1,
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
   * POST /public/landing/feedback
   * Submit feedback from contact form.
   * Requires name, contact, and message. Feedback will be saved and can be approved by admin to display as testimonial.
   * Response: 201 Created with { success: true, message: string, data: FeedbackData, error: null }
   */
  submitFeedback(request: FeedbackRequest): Observable<FeedbackResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.FEEDBACK);
    
    console.log('CampusApiService: ========== SUBMIT FEEDBACK API CALL ==========');
    console.log('CampusApiService: submitFeedback - URL:', url);
    console.log('CampusApiService: submitFeedback - Endpoint:', API_ENDPOINTS.CAMPUS.FEEDBACK);
    console.log('CampusApiService: submitFeedback - Base URL:', this.baseUrl);
    console.log('CampusApiService: submitFeedback - Request:', JSON.stringify(request, null, 2));
    console.log('CampusApiService: submitFeedback - About to make HTTP POST request...');
    
    // Set Content-Type header explicitly for JSON
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    console.log('CampusApiService: submitFeedback - Headers:', headers.keys());
    console.log('CampusApiService: submitFeedback - Making HTTP POST to:', url);
    
    const httpCall = this.http.post<unknown>(url, request, { headers });
    console.log('CampusApiService: submitFeedback - HTTP call observable created:', httpCall);
    
    return httpCall.pipe(
      tap(() => {
        console.log('CampusApiService: submitFeedback - ✅ HTTP POST request sent to server');
        console.log('CampusApiService: submitFeedback - Request URL:', url);
        console.log('CampusApiService: submitFeedback - Request body:', JSON.stringify(request, null, 2));
      }),
      map((raw) => {
        console.log('CampusApiService: submitFeedback - Raw response:', raw);
        // Handle response body directly (Angular HttpClient handles 201/200 automatically)
        if (raw && typeof raw === 'object') {
          const response = raw as FeedbackResponse;
          console.log('CampusApiService: submitFeedback - Parsed response:', response);
          return response;
        }
        console.warn('CampusApiService: submitFeedback - Invalid response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: submitFeedback - Error in pipe:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /public/landing/campus/{campusId}/visit
   * Submit a campus visit request via JSON.
   * Use 'attachmentUrls' field for file URLs/names. Supports recruitment type (Internship/Full-time/Both), visit date/time, positions, package, and requirements.
   */
  submitVisitCampusRequest(campusId: string, request: VisitCampusRequest): Observable<VisitCampusResponse | null> {
    console.log('CampusApiService: ========== SUBMIT VISIT CAMPUS REQUEST API CALL ==========');
    console.log('CampusApiService: Input campusId:', campusId);
    console.log('CampusApiService: Input request:', JSON.stringify(request, null, 2));
    
    const endpoint = API_ENDPOINTS.CAMPUS.VISIT_CAMPUS;
    console.log('CampusApiService: Endpoint template:', endpoint);
    
    const url = this.buildUrl(endpoint, { campusId });
    console.log('CampusApiService: Built URL:', url);
    console.log('CampusApiService: Base URL:', this.baseUrl);
    
    // Validate URL
    if (!url || url.trim() === '') {
      console.error('CampusApiService: ❌ Invalid URL generated:', url);
      return throwError(() => new Error('Invalid API URL'));
    }
    
    // Set Content-Type header explicitly for JSON
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    console.log('CampusApiService: Headers:', headers.keys());
    console.log('CampusApiService: Request body (stringified):', JSON.stringify(request, null, 2));
    console.log('CampusApiService: About to make HTTP POST request to:', url);
    console.log('CampusApiService: Full request details:', {
      method: 'POST',
      url: url,
      headers: Object.fromEntries(headers.keys().map(key => [key, headers.get(key)])),
      body: request
    });
    
    const httpCall = this.http.post<unknown>(url, request, { headers });
    console.log('CampusApiService: HTTP call observable created');
    
    return httpCall.pipe(
      tap(() => {
        console.log('CampusApiService: ✅ HTTP POST request sent to server');
        console.log('CampusApiService: Request URL:', url);
      }),
      map((raw) => {
        console.log('CampusApiService: submitVisitCampusRequest - Raw response:', raw);
        
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
            console.log('CampusApiService: submitVisitCampusRequest - Parsed response:', response);
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
  campusId?: string;
  companyName?: string;
  logourl?: string; // Note: backend returns "logourl" not "logoUrl"
  visitedDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
  studentId?: string;
  userId?: string;
  studentName?: string;
  name?: string;
  fullName?: string;
  testimonial?: string;
  review?: string;
  text?: string;
  quote?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  createdAt?: string;
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

export interface RisingStarData {
  id?: string;
  studentId?: string;
  userId?: string;
  studentName?: string;
  firstName?: string;
  lastName?: string;
  batch?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  photoUrl?: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
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
  name: string;
  contact: string;
  message: string;
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
  visitTime: VisitTime;
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

export interface PlacementInsightsData {
  placementPercentage?: number;
  yearlyTrends?: YearlyTrend[];
}

export interface PlacementInsightsResponse {
  success?: boolean;
  message?: string | null;
  data?: PlacementInsightsData;
  error?: string | null;
}

export interface BatchesResponse {
  success: boolean;
  message: string | null;
  data: string[];
  error: string | null;
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

export interface AnnouncementItem {
  id?: string;
  campusId?: string;
  title?: string;
  content?: string;
  type?: string;
  eventDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  message: string | null;
  data: AnnouncementItem[];
  error: string | null;
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


