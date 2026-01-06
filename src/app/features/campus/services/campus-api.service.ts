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
    
    console.log('🔵🔵🔵 CampusApiService: getCampusById() CALLED 🔵🔵🔵');
    console.log('CampusApiService: CampusId parameter:', campusId);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.BY_ID);
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Making HTTP GET request...');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('✅✅✅ CampusApiService: getCampusById RAW RESPONSE ✅✅✅');
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response:', JSON.stringify(raw, null, 2));
        
        const unwrapped = unwrapApiResponse<Campus>(raw);
        console.log('CampusApiService: After unwrapApiResponse:', JSON.stringify(unwrapped, null, 2));
        console.log('CampusApiService: Has aboutCampus?', unwrapped && 'aboutCampus' in unwrapped);
        if (unwrapped) {
          console.log('CampusApiService: aboutCampus value:', unwrapped.aboutCampus);
        }
        
        return unwrapped;
      })
    );
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
   */
  addPlacedStudent(request: AddPlacedStudentRequest): Observable<AddPlacedStudentResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT);
    console.log('CampusApiService.addPlacedStudent called');
    console.log('Request URL:', url);
    console.log('Request body:', { ...request, photo: request.photo ? `[base64, length: ${request.photo.length}]` : '' });
    
    return this.http.post<unknown>(url, request).pipe(
      map((raw) => {
        console.log('API Service - Raw response received:', raw);
        // The API returns the full response object with success, message, data, error
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddPlacedStudentResponse;
        }
        console.warn('API Service - Response does not have expected structure');
        return null;
      })
    );
  }

  /**
   * GET /dashboard/students/placed
   * Fetch placed students for campus (paginated)
   */
  getPlacedStudents(
    page = 1,
    limit = 4,
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
    console.log('CampusApiService: getPlacedStudents - URL:', url, 'Params:', params.toString());
    return this.http.get<ApiResponsePlacedStudentsResponse>(url, { params });
  }

  /**
   * GET /dashboard/students/batches
   * Get all batches for the campus.
   * Returns list of all available batches.
   */
  getAllBatches(): Observable<BatchesResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_ALL_BATCHES);
    
    console.log('CampusApiService: getAllBatches called');
    console.log('CampusApiService: URL:', url);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: Batches response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as BatchesResponse;
        }
        console.warn('CampusApiService: Batches response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getAllBatches:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getStudentsByBatch called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Students by batch response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as StudentsByBatchResponse;
        }
        console.warn('CampusApiService: Students by batch response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getStudentsByBatch:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /dashboard/companies/visited
   * Add a company visited.
   */
  addCompanyVisited(request: AddCompanyVisitedRequest): Observable<AddCompanyVisitedResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COMPANY_VISITED);
    return this.http.post<unknown>(url, request).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddCompanyVisitedResponse;
        }
        return null;
      })
    );
  }

  /**
   * POST /dashboard/courses
   * Add a course.
   */
  addCourse(request: AddCourseRequest): Observable<AddCourseResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE);
    return this.http.post<unknown>(url, request).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as AddCourseResponse;
        }
        return null;
      })
    );
  }

  /**
   * POST /api/v1/faculty
   * Add a faculty member (JSON body format - like Thunder/Postman)
   */
  addFaculty(data: { basicInformation: unknown; professionalInformation: unknown }): Observable<AddFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_FACULTY);
    
    console.log('CampusApiService: ========== ADD FACULTY API CALL ==========');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Full URL will be:', this.baseUrl + API_ENDPOINTS.CAMPUS.ADD_FACULTY);
    console.log('CampusApiService: Request data (full):', JSON.stringify(data, null, 2));
    console.log('CampusApiService: Basic Information:', JSON.stringify(data.basicInformation, null, 2));
    console.log('CampusApiService: Professional Information:', JSON.stringify(data.professionalInformation, null, 2));
    console.log('CampusApiService: Content-Type: application/json');
    console.log('CampusApiService: Request body type:', typeof data);
    console.log('CampusApiService: Request body keys:', Object.keys(data));
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    console.log('CampusApiService: Headers being sent:', headers.keys());
    
    return this.http.post<unknown>(url, data, {
      headers: headers
    }).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅ Response received:', raw);
        console.log('CampusApiService: Response type:', typeof raw);
        console.log('CampusApiService: Response keys:', raw && typeof raw === 'object' ? Object.keys(raw) : 'N/A');
        
        // Check if response has expected structure
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;
          console.log('CampusApiService: Response structure check:');
          console.log('CampusApiService: - has success:', 'success' in response);
          console.log('CampusApiService: - has message:', 'message' in response);
          console.log('CampusApiService: - has data:', 'data' in response);
          console.log('CampusApiService: - success value:', response['success']);
          console.log('CampusApiService: - message value:', response['message']);
          console.log('CampusApiService: - data value:', response['data']);
          
          // Accept response if it has 'data' field OR if success is true
          if ('data' in response || (response['success'] === true)) {
            console.log('CampusApiService: ✅ Response structure is valid');
            return raw as AddFacultyResponse;
          }
        }
        
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        console.warn('CampusApiService: Returning null - this might cause issues');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌ Error in addFaculty:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response:', error?.error);
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
    console.log('CampusApiService: ========== GET ALL FACULTIES API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_ALL_FACULTY);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Method: GET');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅ GET All Faculties Response received:', raw);
        if (raw && typeof raw === 'object' && 'data' in raw) {
          console.log('CampusApiService: Response structure is valid');
          return raw as GetAllFacultiesResponse;
        }
        console.warn('CampusApiService: ⚠️ GET All Faculties Response does not have expected structure');
        console.warn('CampusApiService: Response type:', typeof raw);
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌ GET All Faculties API Error');
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response:', error?.error);
        // Re-throw error so component can handle it
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/v1/faculty/{facultyId}
   * Get faculty by ID (for edit form).
   */
  getFacultyById(facultyId: string): Observable<GetFacultyByIdResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_BY_ID, { facultyId });
    console.log('CampusApiService.getFacultyById called');
    console.log('Request URL:', url);
    console.log('Faculty ID:', facultyId);
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('API Service - Get Faculty By ID Raw response received:', raw);
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as GetFacultyByIdResponse;
        }
        console.warn('API Service - Get Faculty By ID Response does not have expected structure');
        return null;
      })
    );
  }

  /**
   * GET /api/v1/faculty/{facultyId}/profile
   * Get faculty profile (detailed view).
   */
  getFacultyProfile(facultyId: string): Observable<GetFacultyProfileResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_PROFILE, { facultyId });
    console.log('CampusApiService.getFacultyProfile called');
    console.log('Request URL:', url);
    console.log('Faculty ID:', facultyId);
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('API Service - Get Faculty Profile Raw response received:', raw);
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as GetFacultyProfileResponse;
        }
        console.warn('API Service - Get Faculty Profile Response does not have expected structure');
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
    console.log('CampusApiService.updateFaculty called');
    console.log('Request URL:', url);
    console.log('Faculty ID:', facultyId);
    console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `[File: ${value.name}, size: ${value.size}]` : value]));
    return this.http.put<unknown>(url, formData).pipe(
      map((raw) => {
        console.log('API Service - Update Faculty Raw response received:', raw);
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as UpdateFacultyResponse;
        }
        console.warn('API Service - Update Faculty Response does not have expected structure');
        return null;
      })
    );
  }

  /**
   * DELETE /api/v1/faculty/{facultyId}
   * Delete faculty member.
   */
  deleteFaculty(facultyId: string): Observable<DeleteFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_FACULTY, { facultyId });
    console.log('CampusApiService.deleteFaculty called');
    console.log('Request URL:', url);
    console.log('Faculty ID:', facultyId);
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        console.log('API Service - Delete Faculty Raw response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as DeleteFacultyResponse;
        }
        console.warn('API Service - Delete Faculty Response does not have expected structure');
        return null;
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
    console.log('🔵🔵🔵 CampusApiService: getSectors METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_SECTORS);
    
    console.log('CampusApiService: ========== GET SECTORS API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_SECTORS);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Making HTTP GET request...');
    console.log('CampusApiService: ⚠️ This should appear in Network tab with full response and headers');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Sectors Response received ✅✅✅');
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response:', JSON.stringify(raw, null, 2));
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          console.log('CampusApiService: Response structure:', {
            hasSuccess: 'success' in response,
            hasData: 'data' in response,
            hasMessage: 'message' in response,
            hasError: 'error' in response,
            success: response.success,
            dataType: typeof response.data,
            dataIsArray: Array.isArray(response.data),
          });
          
          if (response.success && Array.isArray(response.data)) {
            const sectors = response.data as string[];
            console.log('CampusApiService: ✅ Sectors array extracted successfully');
            console.log('CampusApiService: Sectors:', JSON.stringify(sectors, null, 2));
            console.log('CampusApiService: Sectors count:', sectors.length);
            return sectors;
          } else {
            console.warn('CampusApiService: ⚠️ Response structure issue:');
            console.warn('CampusApiService:   - success:', response.success);
            console.warn('CampusApiService:   - data type:', typeof response.data);
            console.warn('CampusApiService:   - data is array:', Array.isArray(response.data));
          }
        } else {
          console.warn('CampusApiService: ⚠️ Response is not an object:', raw);
        }
        
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        console.warn('CampusApiService: Returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ ERROR IN GET SECTORS ❌❌❌');
        console.error('CampusApiService: Error type:', typeof error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error statusText:', error?.statusText);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response body:', JSON.stringify(error?.error, null, 2));
        console.error('CampusApiService: Full error object:', error);
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
    console.log('🔵🔵🔵 CampusApiService: getDesignations METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_DESIGNATIONS);
    
    console.log('CampusApiService: ========== GET DESIGNATIONS API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_DESIGNATIONS);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Making HTTP GET request...');
    console.log('CampusApiService: ⚠️ This should appear in Network tab with full response and headers');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Designations Response received ✅✅✅');
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response:', JSON.stringify(raw, null, 2));
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          console.log('CampusApiService: Response structure:', {
            hasSuccess: 'success' in response,
            hasData: 'data' in response,
            hasMessage: 'message' in response,
            hasError: 'error' in response,
            success: response.success,
            dataType: typeof response.data,
            dataIsArray: Array.isArray(response.data),
          });
          
          if (response.success && Array.isArray(response.data)) {
            const designations = response.data as string[];
            console.log('CampusApiService: ✅ Designations array extracted successfully');
            console.log('CampusApiService: Designations:', JSON.stringify(designations, null, 2));
            console.log('CampusApiService: Designations count:', designations.length);
            return designations;
          } else {
            console.warn('CampusApiService: ⚠️ Response structure issue:');
            console.warn('CampusApiService:   - success:', response.success);
            console.warn('CampusApiService:   - data type:', typeof response.data);
            console.warn('CampusApiService:   - data is array:', Array.isArray(response.data));
          }
        } else {
          console.warn('CampusApiService: ⚠️ Response is not an object:', raw);
        }
        
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        console.warn('CampusApiService: Returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ ERROR IN GET DESIGNATIONS ❌❌❌');
        console.error('CampusApiService: Error type:', typeof error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error statusText:', error?.statusText);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response body:', JSON.stringify(error?.error, null, 2));
        console.error('CampusApiService: Full error object:', error);
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
    console.log('🔵🔵🔵 CampusApiService: getCoursesForDropdown METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_COURSES);
    
    console.log('CampusApiService: ========== GET COURSES FOR DROPDOWN API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_COURSES);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Making HTTP GET request...');
    console.log('CampusApiService: ⚠️ This should appear in Network tab with full response and headers');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Courses For Dropdown Response received ✅✅✅');
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response:', JSON.stringify(raw, null, 2));
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          console.log('CampusApiService: Response structure:', {
            hasSuccess: 'success' in response,
            hasData: 'data' in response,
            hasMessage: 'message' in response,
            hasError: 'error' in response,
            success: response.success,
            dataType: typeof response.data,
            dataIsArray: Array.isArray(response.data),
          });
          
          if (response.success && Array.isArray(response.data)) {
            const courses = response.data as string[];
            console.log('CampusApiService: ✅ Courses array extracted successfully');
            console.log('CampusApiService: Courses:', JSON.stringify(courses, null, 2));
            console.log('CampusApiService: Courses count:', courses.length);
            return courses;
          } else {
            console.warn('CampusApiService: ⚠️ Response structure issue:');
            console.warn('CampusApiService:   - success:', response.success);
            console.warn('CampusApiService:   - data type:', typeof response.data);
            console.warn('CampusApiService:   - data is array:', Array.isArray(response.data));
          }
        } else {
          console.warn('CampusApiService: ⚠️ Response is not an object:', raw);
        }
        
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        console.warn('CampusApiService: Returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ ERROR IN GET COURSES FOR DROPDOWN ❌❌❌');
        console.error('CampusApiService: Error type:', typeof error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error statusText:', error?.statusText);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response body:', JSON.stringify(error?.error, null, 2));
        console.error('CampusApiService: Full error object:', error);
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
    console.log('🔵🔵🔵 CampusApiService: getBatchesForDropdown METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_BATCHES);
    
    console.log('CampusApiService: ========== GET BATCHES FOR DROPDOWN API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_BATCHES);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Making HTTP GET request...');
    console.log('CampusApiService: ⚠️ This should appear in Network tab with full response and headers');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Batches For Dropdown Response received ✅✅✅');
        console.log('CampusApiService: Raw response type:', typeof raw);
        console.log('CampusApiService: Raw response:', JSON.stringify(raw, null, 2));
        
        // Response format: { success: true, message: null, data: string[], error: null }
        if (raw && typeof raw === 'object') {
          const response = raw as { success?: boolean; data?: unknown; message?: unknown; error?: unknown };
          console.log('CampusApiService: Response structure:', {
            hasSuccess: 'success' in response,
            hasData: 'data' in response,
            hasMessage: 'message' in response,
            hasError: 'error' in response,
            success: response.success,
            dataType: typeof response.data,
            dataIsArray: Array.isArray(response.data),
          });
          
          if (response.success && Array.isArray(response.data)) {
            const batches = response.data as string[];
            console.log('CampusApiService: ✅ Batches array extracted successfully');
            console.log('CampusApiService: Batches:', JSON.stringify(batches, null, 2));
            console.log('CampusApiService: Batches count:', batches.length);
            return batches;
          } else {
            console.warn('CampusApiService: ⚠️ Response structure issue:');
            console.warn('CampusApiService:   - success:', response.success);
            console.warn('CampusApiService:   - data type:', typeof response.data);
            console.warn('CampusApiService:   - data is array:', Array.isArray(response.data));
          }
        } else {
          console.warn('CampusApiService: ⚠️ Response is not an object:', raw);
        }
        
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        console.warn('CampusApiService: Returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌❌❌ ERROR IN GET BATCHES FOR DROPDOWN ❌❌❌');
        console.error('CampusApiService: Error type:', typeof error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error statusText:', error?.statusText);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response body:', JSON.stringify(error?.error, null, 2));
        console.error('CampusApiService: Full error object:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * POST /prospectus/upload
   * Upload prospectus files for campus and course.
   */
  uploadProspectus(request: UploadProspectusRequest): Observable<UploadProspectusResponse | null> {
    console.log('🔵🔵🔵 CampusApiService: uploadProspectus METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS);
    
    console.log('========== UPLOAD PROSPECTUS API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Full URL will be:', this.baseUrl + API_ENDPOINTS.CAMPUS.UPLOAD_PROSPECTUS);
    console.log('CampusApiService: ⚠️ IMPORTANT: campusId and courseId are DIFFERENT values');
    console.log('CampusApiService: Request payload details:');
    console.log('CampusApiService:   - campusId:', request.campusId, '(type:', typeof request.campusId, ')');
    console.log('CampusApiService:   - courseId:', request.courseId, '(type:', typeof request.courseId, ')');
    console.log('CampusApiService:   - filesCount:', request.files?.length || 0);
    console.log('CampusApiService:   - firstFilePreview:', request.files?.[0]?.substring(0, 100) + '...' || 'N/A');
    console.log('CampusApiService: Complete request object:', JSON.stringify({
      campusId: request.campusId,
      courseId: request.courseId,
      filesCount: request.files?.length || 0
    }, null, 2));
    console.log('CampusApiService: HTTP Client:', this.http);
    console.log('CampusApiService: About to make HTTP POST request...');
    
    const httpOptions = {
      headers: { 'Content-Type': 'application/json' }
    };
    
    console.log('CampusApiService: HTTP Options:', httpOptions);
    console.log('CampusApiService: Making HTTP POST request to:', url);
    console.log('CampusApiService: Request payload size:', JSON.stringify(request).length, 'bytes');
    
    const httpRequest = this.http.post<unknown>(url, request, httpOptions);
    
    console.log('CampusApiService: HTTP POST Observable created');
    console.log('CampusApiService: Observable will execute when subscribed');
    console.log('CampusApiService: Applying pipe operators...');
    
    return httpRequest.pipe(
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
        console.error('CampusApiService: ❌ Error in uploadProspectus:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/campus/{campusId}
   * Get prospectuses by campus.
   */
  getProspectusByCampus(campusId: string): Observable<GetProspectusResponse | null> {
    console.log('🔵🔵🔵 CampusApiService: getProspectusByCampus METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_CAMPUS, { campusId });
    
    console.log('CampusApiService: ========== GET PROSPECTUS BY CAMPUS API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_CAMPUS);
    console.log('CampusApiService: Campus ID parameter:', campusId);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Full URL will be:', this.baseUrl + API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_CAMPUS.replace(':campusId', campusId));
    console.log('CampusApiService: Making HTTP GET request...');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Prospectus By Campus Response received ✅✅✅');
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
          console.log('CampusApiService: ✅ Response structure is valid');
          return raw as GetProspectusResponse;
        }
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌ Error in getProspectusByCampus:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response:', error?.error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /prospectus/course/{courseId}
   * Get prospectuses by course.
   */
  getProspectusByCourse(courseId: string): Observable<GetProspectusResponse | null> {
    console.log('🔵🔵🔵 CampusApiService: getProspectusByCourse METHOD CALLED 🔵🔵🔵');
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE, { courseId });
    
    console.log('CampusApiService: ========== GET PROSPECTUS BY COURSE API CALL ==========');
    console.log('CampusApiService: Base URL:', this.baseUrl);
    console.log('CampusApiService: Endpoint:', API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE);
    console.log('CampusApiService: Course ID parameter:', courseId);
    console.log('CampusApiService: Final URL:', url);
    console.log('CampusApiService: Full URL will be:', this.baseUrl + API_ENDPOINTS.CAMPUS.GET_PROSPECTUS_BY_COURSE.replace(':courseId', courseId));
    console.log('CampusApiService: Making HTTP GET request...');
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: ✅✅✅ Get Prospectus By Course Response received ✅✅✅');
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
          console.log('CampusApiService: ✅ Response structure is valid');
          return raw as GetProspectusResponse;
        }
        console.warn('CampusApiService: ⚠️ Response structure does not match expected format');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: ❌ Error in getProspectusByCourse:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
        console.error('CampusApiService: Error response:', error?.error);
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
    
    console.log('CampusApiService: getRisingStars called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Rising Stars response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as RisingStarsResponse;
        }
        console.warn('CampusApiService: Rising Stars response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getRisingStars:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getSuccessStories called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Success Stories response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as SuccessStoriesResponse;
        }
        console.warn('CampusApiService: Success Stories response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getSuccessStories:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getFaculties called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Faculties response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as FacultiesResponse;
        }
        console.warn('CampusApiService: Faculties response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getFaculties:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getTestimonials called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Testimonials response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as TestimonialsResponse;
        }
        console.warn('CampusApiService: Testimonials response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getTestimonials:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getResearch called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: CampusId:', campusId);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: Research response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as ResearchResponse;
        }
        console.warn('CampusApiService: Research response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getResearch:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getAlumni called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Alumni response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as ApiResponsePageAlumniResponse;
        }
        console.warn('CampusApiService: Alumni response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getAlumni:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getCourses called');
    console.log('CampusApiService: URL:', url);
    console.log('CampusApiService: Params:', params.toString());
    
    return this.http.get<unknown>(url, { params }).pipe(
      map((raw) => {
        console.log('CampusApiService: Courses response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as CoursesResponse;
        }
        console.warn('CampusApiService: Courses response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getCourses:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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
    
    console.log('CampusApiService: getAboutSynkup called');
    console.log('CampusApiService: URL:', url);
    
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        console.log('CampusApiService: About Synkup response received:', raw);
        if (raw && typeof raw === 'object') {
          return raw as AboutSynkupResponse;
        }
        console.warn('CampusApiService: About Synkup response does not have expected structure');
        return null;
      }),
      catchError((error) => {
        console.error('CampusApiService: Error in getAboutSynkup:', error);
        console.error('CampusApiService: Error status:', error?.status);
        console.error('CampusApiService: Error URL:', error?.url);
        console.error('CampusApiService: Error message:', error?.message);
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

export interface AddCompanyVisitedRequest {
  companyLogo: string; // base64 encoded image
  companyName: string;
}

export interface AddCompanyVisitedResponseData {
  id?: string;
  campusId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCompanyVisitedResponse {
  success: boolean;
  message: string;
  data: AddCompanyVisitedResponseData;
  error: string;
}

export interface AddCourseRequest {
  courseName: string;
  courseDuration: string;
  seatsAvailable: string;
  description: string;
}

export interface AddCourseResponseData {
  id?: string;
  campusId?: string;
  courseName?: string;
  courseDuration?: string;
  seatsAvailable?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCourseResponse {
  success: boolean;
  message: string;
  data: AddCourseResponseData;
  error: string;
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

export interface AddFacultyResponseData {
  id?: string;
  campusId?: string;
  fullName?: string;
  photoUrl?: string;
  email?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  professionalInfo?: ProfessionalInfoRequest[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AddFacultyResponse {
  success: boolean;
  message: string;
  data: AddFacultyResponseData;
  error: string;
}

export interface FacultyListItem {
  id?: string;
  fullName?: string;
  photoUrl?: string;
  email?: string;
  designation?: string;
  department?: string;
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


