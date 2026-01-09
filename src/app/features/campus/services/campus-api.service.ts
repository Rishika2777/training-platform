import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, EnumLoginStatus, UserType } from '../../../core/config/app.constants';
import { ApiResponsePlacedStudentsResponse, ApiResponsePageAlumniResponse } from '../../student/models/student.models';

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
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        const unwrapped = unwrapApiResponse<Campus>(raw);
        return unwrapped;
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
   * POST /dashboard/students/placed
   * Add a placed student.
   * Uses multipart/form-data to send the request with file upload.
   */
  addPlacedStudent(formData: FormData): Observable<AddPlacedStudentResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT);
    
    // Let Angular automatically set Content-Type to multipart/form-data with boundary
    return this.http.post<unknown>(url, formData).pipe(
      map((raw) => {
        // The API returns the full response object with success, message, data, error
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddPlacedStudentResponse;
        }
        return null;
      })
    );
  }

  /**
   * GET /dashboard/placed-students
   * Fetch placed students for campus (paginated)
   * Default 6 students per page, sorted by placement date (newest first)
   * Page is 0-indexed (page=0 for first page)
   * Response: { success, message, data: { content: PlacedStudent[], totalPages, totalElements, ... } }
   */
  getPlacedStudents(
    page = 0,
    limit = 6,
    companyName?: string,
    batch?: string,
  ): Observable<ApiResponsePlacedStudentsResponse> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PLACED_STUDENTS);
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (companyName) {
      params = params.set('companyName', companyName);
    }
    if (batch) {
      params = params.set('batch', batch);
    }
    return this.http.get<ApiResponsePlacedStudentsResponse>(url, { params });
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
  getCompaniesVisited(page = 0, limit = 6): Observable<GetCompaniesVisitedResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COMPANIES_VISITED);
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
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
   * POST /courses
   * Add a new course to the campus catalog.
   * Course name must be unique within the campus.
   * Returns the created course with 201 status.
   */
  addCourse(request: AddCourseRequest): Observable<AddCourseResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE);
    console.log('CampusApiService: addCourse - URL:', url);
    console.log('CampusApiService: addCourse - Request:', request);
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<unknown>(url, request, { headers }).pipe(
      map((raw) => {
        console.log('CampusApiService: addCourse - Raw response:', raw);
        if (raw && typeof raw === 'object' && 'data' in raw) {
          const response = raw as AddCourseResponse;
          console.log('CampusApiService: addCourse - Parsed response:', response);
          return response;
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
   * GET /courses
   * Get all courses for the campus.
   * Returns course cards with course name, full title, available seats, and duration. Sorted alphabetically.
   * Response format: { success: true, message: null, data: AddCourseResponseData[], error: null }
   */
  getAllCourses(): Observable<AddCourseResponseData[]> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_COURSES);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: null, data: AddCourseResponseData[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && Array.isArray(response.data)) {
            const courses = response.data as AddCourseResponseData[];
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
   * GET /courses/{courseId}
   * Get course by ID.
   * Retrieves course details by course ID.
   * Response format: { success: true, message: null, data: AddCourseResponseData, error: null }
   */
  getCourseById(courseId: string): Observable<AddCourseResponseData | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COURSE_BY_ID, { courseId });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: null, data: AddCourseResponseData, error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          
          if (response.success && response.data && typeof response.data === 'object') {
            return response.data as AddCourseResponseData;
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
   * DELETE /courses/{courseId}
   * Delete course by ID.
   * Deletes a course from the campus catalog.
   * Response format: { success: true, message: "Course deleted successfully", data: null, error: null }
   */
  deleteCourse(courseId: string): Observable<{ success: boolean; message: string | null; data: null; error: string | null } | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_COURSE, { courseId });
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        // Response format: { success: true, message: "Course deleted successfully", data: null, error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; message?: unknown; data?: unknown; error?: unknown };
          
          if (response.success !== undefined) {
            return {
              success: response.success,
              message: (response.message as string) || null,
              data: null,
              error: (response.error as string) || null,
            };
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
   * POST /api/v1/faculty
   * Add a faculty member (JSON body format - like Thunder/Postman)
   */
  addFaculty(data: { basicInformation: unknown; professionalInformation: unknown }): Observable<AddFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_FACULTY);
    
    // Log the exact request being sent to backend
    console.log('CampusApiService.addFaculty - URL:', url);
    console.log('CampusApiService.addFaculty - Request Data:', JSON.stringify(data, null, 2));
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<unknown>(url, data, {
      headers: headers
    }).pipe(
      map((raw) => {
        // Backend response structure: { success, message, basicInformation: {...}, professionalInformation: [...] }
        // OR: { success, message, data: { basicInformation, professionalInformation }, error }
        // Handle both formats
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;
          
          // Check if response has success field
          if ('success' in response) {
            // Check if response has data wrapper or direct fields
            if (
              'basicInformation' in response &&
              'professionalInformation' in response &&
              typeof response['basicInformation'] === 'object' &&
              typeof response['professionalInformation'] === 'object'
            ) {
              // Response has direct fields (no data wrapper)
              // Convert to expected format with data wrapper for consistency
              return {
                success: response['success'] as boolean,
                message: (response['message'] as string) || '',
                data: {
                  basicInformation: response['basicInformation'],
                  professionalInformation: response['professionalInformation']
                },
                error: (response['error'] as string) || null
              } as AddFacultyResponse;
            } else if (
              'data' in response &&
              typeof response['data'] === 'object' &&
              response['data'] !== null
            ) {
              // Response has data wrapper
              const dataObj = response['data'] as Record<string, unknown>;
              
              if (
                'basicInformation' in dataObj &&
                'professionalInformation' in dataObj &&
                typeof dataObj['basicInformation'] === 'object' &&
                typeof dataObj['professionalInformation'] === 'object'
              ) {
                return raw as AddFacultyResponse;
              }
            }
          }
        }
        
        // If structure doesn't match, still return the raw response for error handling
        return raw as AddFacultyResponse;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/v1/faculty
   * Get all faculty members.
   */
  getAllFaculties(): Observable<GetAllFacultiesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_FACULTY);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as GetAllFacultiesResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/v1/faculty/{facultyId}
   * Get faculty by ID.
   * Response format: { success: true, message: null, data: { basicInformation: {...}, professionalInformation: {...} }, error: null }
   */
  getFacultyById(facultyId: string): Observable<GetFacultyByIdResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_BY_ID, { facultyId });
    
    console.log('CampusApiService.getFacultyById - URL:', url);
    console.log('CampusApiService.getFacultyById - Faculty ID:', facultyId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService.getFacultyById - Raw response:', raw);
        
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;
          
          // Check if response has expected structure: { success, message, data, error }
          if ('success' in response && 'data' in response) {
            const data = response['data'];
            
            // Verify data has basicInformation and professionalInformation
            if (data && typeof data === 'object' && data !== null) {
              const dataObj = data as Record<string, unknown>;
              
              if ('basicInformation' in dataObj && 'professionalInformation' in dataObj) {
                return {
                  success: response['success'] as boolean,
                  message: (response['message'] as string) || null,
                  data: {
                    basicInformation: dataObj['basicInformation'] as BasicInformationResponse,
                    professionalInformation: dataObj['professionalInformation'] as ProfessionalInformationResponse,
                  },
                  error: (response['error'] as string) || null,
                } as GetFacultyByIdResponse;
              }
            }
          }
        }
        
        console.warn('CampusApiService.getFacultyById - Unexpected response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService.getFacultyById - Error occurred:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/v1/faculty/{facultyId}/profile
   * Get faculty profile (detailed view).
   */
  getFacultyProfile(facultyId: string): Observable<GetFacultyProfileResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_PROFILE, { facultyId });
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as GetFacultyProfileResponse;
        }
        return null;
      })
    );
  }

  /**
   * PUT /api/v1/faculty/{facultyId}
   * Update faculty member (multipart/form-data).
   */
  updateFaculty(facultyId: string, formData: FormData): Observable<UpdateFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPDATE_FACULTY, { facultyId });
    return this.http.put<unknown>(url, formData).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as UpdateFacultyResponse;
        }
        return null;
      })
    );
  }

  /**
   * DELETE /api/v1/faculty/{facultyId}
   * Delete faculty member.
   * Response format: { success: true, message: "Faculty deleted successfully", data: null, error: null }
   */
  deleteFaculty(facultyId: string): Observable<DeleteFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_FACULTY, { facultyId });
    
    console.log('CampusApiService.deleteFaculty - URL:', url);
    console.log('CampusApiService.deleteFaculty - Faculty ID:', facultyId);
    
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService.deleteFaculty - Raw response:', raw);
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;
          // Ensure response has expected structure
          if ('success' in response) {
            return {
              success: response['success'] as boolean,
              message: (response['message'] as string) || 'Faculty deleted successfully',
              data: response['data'] as null,
              error: (response['error'] as string) || null,
            } as DeleteFacultyResponse;
          }
        }
        console.warn('CampusApiService.deleteFaculty - Unexpected response format:', raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService.deleteFaculty - Error occurred:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/v1/faculty/check-email?email={email}
   * Check if email already exists.
   */
  checkFacultyEmail(email: string): Observable<CheckEmailResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.CHECK_FACULTY_EMAIL);
    const params = new HttpParams().set('email', email);
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as CheckEmailResponse;
        }
        return null;
      }),
      catchError((error) => {
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
  getAlumniForCarousel(limit = 10): Observable<AlumniDashboardResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALUMNI_CAROUSEL);
    const params = new HttpParams().set('limit', limit.toString());
    
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
  ): Observable<AlumniDashboardResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALUMNI);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (year && year.trim() !== '') {
      params = params.set('year', year.trim());
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
  getAnnouncements(): Observable<AnnouncementsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ANNOUNCEMENTS);
    console.log('CampusApiService: getAnnouncements - URL:', url);
    return this.http.get<unknown>(url).pipe(
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
   * POST /prospectus/upload
   * Upload prospectus files for campus and course.
   */
  uploadProspectus(request: UploadProspectusRequest): Observable<UploadProspectusResponse | null> {
    console.log('🔵🔵🔵 CampusApiService: uploadProspectus METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS);
    
    const httpOptions = {
      headers: { 'Content-Type': 'application/json' }
    };
    
    return this.http.post<unknown>(url, request, httpOptions).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Upload Prospectus Response received ✅✅✅');
        console.log('CampusApiService: Raw response:', raw);
        console.log('CampusApiService: Response type:', typeof raw);
        console.log('CampusApiService: Response is object?', raw && typeof raw === 'object');
        if (raw && typeof raw === 'object') {
          console.log('CampusApiService: Response keys:', Object.keys(raw));
          console.log('CampusApiService: Has data property?', 'data' in raw);
        }
        if (raw && typeof raw === 'object' && 'data' in raw) {
          console.log('CampusApiService: ✅ Response structure is valid');
          return raw as UploadProspectusResponse;
        }
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/campus/{campusId}
   * Get prospectuses by campus.
   */
  getProspectusByCampus(campusId: string): Observable<GetProspectusResponse | null> {
    console.log('CampusApiService: getProspectusByCampus METHOD CALLED ');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_CAMPUS, { campusId });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: Get Prospectus By Campus Response received ');
        console.log('CampusApiService: Raw response:', raw);
        console.log('CampusApiService: Response type:', typeof raw);
        if (raw && typeof raw === 'object') {
          console.log('CampusApiService: Response keys:', Object.keys(raw));
          console.log('CampusApiService: Has data property?', 'data' in raw);
          if ('data' in raw) {
            const responseData = raw as { data: unknown };
            console.log('CampusApiService: Data is array?', Array.isArray(responseData.data));
            console.log('CampusApiService: Data length:', Array.isArray(responseData.data) ? responseData.data.length : 'N/A');
          }
        }
        if (raw && typeof raw === 'object' && 'data' in raw) {
          console.log('CampusApiService:  Response structure is valid');
          return raw as GetProspectusResponse;
        }
        console.warn('CampusApiService:  Response structure does not match expected format');
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/course/{courseId}
   * Get prospectuses by course.
   */
  getProspectusByCourse(courseId: string): Observable<GetProspectusResponse | null> {
    console.log(' CampusApiService: getProspectusByCourse METHOD CALLED ');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE, { courseId });
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService:  Get Prospectus By Course Response received ');
        console.log('CampusApiService: Raw response:', raw);
        console.log('CampusApiService: Response type:', typeof raw);
        if (raw && typeof raw === 'object') {
          console.log('CampusApiService: Response keys:', Object.keys(raw));
          console.log('CampusApiService: Has data property?', 'data' in raw);
          if ('data' in raw) {
            const responseData = raw as { data: unknown };
            console.log('CampusApiService: Data is array?', Array.isArray(responseData.data));
            console.log('CampusApiService: Data length:', Array.isArray(responseData.data) ? responseData.data.length : 'N/A');
          }
        }
        if (raw && typeof raw === 'object' && 'data' in raw) {
          console.log('CampusApiService:  Response structure is valid');
          return raw as GetProspectusResponse;
        }
        console.warn('CampusApiService: Response structure does not match expected format');
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/{prospectusId}
   * Get prospectus by ID.
   */
  getProspectusById(prospectusId: string): Observable<UploadProspectusResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_ID, { prospectusId });
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as UploadProspectusResponse;
        }
        return null;
      })
    );
  }

  /**
   * GET /prospectus/download
   * Download prospectus by prospectusId (query parameter).
   */
  downloadProspectus(prospectusId: string): Observable<Blob> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DOWNLOAD_PROSPECTUS);
    const params = new HttpParams().set('prospectusId', prospectusId);
    return this.http.get(url, { params, responseType: 'blob' });
  }

  /**
   * DELETE /prospectus/{prospectusId}
   * Delete prospectus by ID.
   */
  deleteProspectus(prospectusId: string): Observable<DeleteProspectusResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_PROSPECTUS, { prospectusId });
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as DeleteProspectusResponse;
        }
        return null;
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/rising-stars
   * Get rising stars (current students not placed) with pagination.
   * Default 8 per page.
   */
  getRisingStars(
    campusId: string,
    page = 1,
    size = 8,
  ): Observable<RisingStarsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.RISING_STARS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as RisingStarsResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/success-stories
   * Get success stories (placed students) with pagination.
   * Default 6 per page.
   */
  getSuccessStories(
    campusId: string,
    page = 1,
    size = 6,
  ): Observable<SuccessStoriesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.SUCCESS_STORIES, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
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
   */
  getTestimonials(
    campusId: string,
    page = 1,
    size = 5,
  ): Observable<TestimonialsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.TESTIMONIALS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as TestimonialsResponse;
        }
        return null;
      }),
      catchError((error) => {
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
   * GET /public/landing/campus/{campusId}/rising-stars
   * Get rising stars (current students not placed) with pagination.
   * Default 8 per page.
   */
  getRisingStars(
    campusId: string,
    page = 1,
    size = 8,
  ): Observable<RisingStarsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.RISING_STARS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as RisingStarsResponse;
        }
        return null;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /public/landing/campus/{campusId}/success-stories
   * Get success stories (placed students) with pagination.
   * Default 6 per page.
   */
  getSuccessStories(
    campusId: string,
    page = 1,
    size = 6,
  ): Observable<SuccessStoriesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.SUCCESS_STORIES, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
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
   */
  getTestimonials(
    campusId: string,
    page = 1,
    size = 5,
  ): Observable<TestimonialsResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.TESTIMONIALS, { campusId });
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as TestimonialsResponse;
        }
        return null;
      }),
      catchError((error) => {
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
  createdAt?: string;
  updatedAt?: string;
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
  error: string;
}

export interface FacultyListItem {
  id?: string;
  campusId?: string;
  fullName?: string;
  photoUrl?: string | null;
  email?: string;
  dateOfBirth?: string;
  designation?: string[];
  department?: string[];
  specialization?: string[];
  yearsOfExperience?: number;
  qualifications?: string[];
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
  data: FacultyProfileData;
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
  message: string;
  data: AddFacultyResponseData;
  error: string;
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
  message: string;
  data: UploadProspectusResponseData;
  error: string;
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


