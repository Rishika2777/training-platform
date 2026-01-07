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
   */
  addPlacedStudent(request: AddPlacedStudentRequest): Observable<AddPlacedStudentResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT);
    
    return this.http.post<unknown>(url, request).pipe(
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
    
    // Create headers object - Angular will merge with interceptor's Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<unknown>(url, data, {
      headers: headers
    }).pipe(
      map((raw) => {
        // Check if response has expected structure: { success, message, data: { basicInformation, professionalInformation }, error }
        if (raw && typeof raw === 'object') {
          const response = raw as Record<string, unknown>;
          
          // Validate response structure matches expected format
          if (
            'success' in response &&
            'message' in response &&
            'data' in response &&
            typeof response['data'] === 'object' &&
            response['data'] !== null
          ) {
            const dataObj = response['data'] as Record<string, unknown>;
            
            // Check if data has basicInformation and professionalInformation
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
        
        return null;
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
   * Get faculty by ID (for edit form).
   */
  getFacultyById(facultyId: string): Observable<GetFacultyByIdResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.GET_FACULTY_BY_ID, { facultyId });
    return this.http.get<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'data' in raw) {
          return raw as GetFacultyByIdResponse;
        }
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
   */
  deleteFaculty(facultyId: string): Observable<DeleteFacultyResponse | null> {
    const url = this.buildUrl(API_ENDPOINTS.CAMPUS.DELETE_FACULTY, { facultyId });
    return this.http.delete<unknown>(url).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object') {
          return raw as DeleteFacultyResponse;
        }
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
            return designations;
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

export interface BasicInformationResponse {
  fullName: string;
  email: string;
  dateOfBirth: string;
  phoneNumber: string;
}

export interface ProfessionalInformationResponse {
  designation: string[];
  department: string[];
  specialization: string[];
  yearsOfExperience: number[];
  qualifications: string[];
  certificates: string[];
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


