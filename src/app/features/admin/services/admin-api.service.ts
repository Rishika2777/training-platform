import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import {
  ApiResponse,
  UserResponse,
  PageUserResponse,
  Pageable,
  ApprovalRequest,
  StudentRegistrationResponse,
  CompanyRegistrationResponse,
  CampusRegistrationResponse,
  ChangePasswordRequest,
} from '../models/admin-api.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiService);

  // User Management Endpoints
  getAllUsers(): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.BASE)
      .pipe(map((response) => response.data ?? []));
  }

  getUserById(userId: string): Observable<UserResponse> {
    return this.api
      .get<ApiResponse<UserResponse>>(API_ENDPOINTS.USERS.BASE + `/${userId}`)
      .pipe(map((response) => response.data ?? ({} as UserResponse)));
  }

  deleteUser(userId: string): Observable<void> {
    return this.api
      .delete<ApiResponse<void>>(API_ENDPOINTS.USERS.BASE + `/${userId}`)
      .pipe(map(() => void 0));
  }

  getUsersByType(userType: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN'): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.BY_TYPE, undefined, { userType })
      .pipe(
        map((response) => {
          if (response && typeof response === 'object') {
            // Handle ApiResponse structure with data property
            if ('data' in response && response.data !== undefined) {
              const data = (response as ApiResponse<UserResponse[]>).data;
              if (Array.isArray(data)) {
                return data;
              }
            }
            // Handle direct array response
            if (Array.isArray(response)) {
              return response;
            }
            // Handle case where response itself is the data
            if ('success' in response && 'data' in response) {
              const apiResponse = response as ApiResponse<UserResponse[]>;
              if (Array.isArray(apiResponse.data)) {
                return apiResponse.data;
              }
            }
          }
          return [];
        }),
      );
  }

  getUsersPaged(pageable: Pageable): Observable<PageUserResponse> {
    const queryParams: Record<string, string | number | boolean | null | undefined> = {};
    if (pageable.page !== undefined) {
      queryParams['page'] = pageable.page;
    }
    if (pageable.size !== undefined) {
      queryParams['size'] = pageable.size;
    }
    if (pageable.sort !== undefined && pageable.sort.length > 0) {
      queryParams['sort'] = pageable.sort.join(',');
    }
    return this.api
      .get<ApiResponse<PageUserResponse>>(API_ENDPOINTS.USERS.PAGED, queryParams)
      .pipe(map((response) => response.data ?? ({} as PageUserResponse)));
  }

  getUserByEmail(email: string): Observable<UserResponse> {
    return this.api
      .get<ApiResponse<UserResponse>>(API_ENDPOINTS.USERS.BY_EMAIL, undefined, { email })
      .pipe(map((response) => response.data ?? ({} as UserResponse)));
  }

  deleteUserByEmail(email: string): Observable<void> {
    return this.api
      .delete<ApiResponse<void>>(API_ENDPOINTS.USERS.BY_EMAIL, { email })
      .pipe(map(() => void 0));
  }

  getActiveUsers(): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.ACTIVE)
      .pipe(map((response) => response.data ?? []));
  }

  verifyUser(userId: string): Observable<UserResponse> {
    return this.api
      .patch<ApiResponse<UserResponse>, Record<string, never>>(API_ENDPOINTS.USERS.VERIFY, {}, { userId })
      .pipe(map((response) => response.data ?? ({} as UserResponse)));
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<UserResponse> {
    return this.api
      .patch<ApiResponse<UserResponse>, Record<string, never>>(
        API_ENDPOINTS.USERS.STATUS,
        {},
        { userId },
        { isActive },
      )
      .pipe(map((response) => response.data ?? ({} as UserResponse)));
  }

  changePassword(userId: string, request: ChangePasswordRequest): Observable<void> {
    return this.api
      .patch<ApiResponse<void>, ChangePasswordRequest>(API_ENDPOINTS.USERS.PASSWORD, request, { userId })
      .pipe(map(() => void 0));
  }

  // Admin Approval Endpoints
  approveStudent(studentId: string, request: ApprovalRequest): Observable<StudentRegistrationResponse> {
    return this.api
      .patch<ApiResponse<StudentRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_STUDENT,
        request,
        { studentId },
      )
      .pipe(map((response) => response.data ?? ({} as StudentRegistrationResponse)));
  }

  approveCompany(companyId: string, request: ApprovalRequest): Observable<CompanyRegistrationResponse> {
    return this.api
      .patch<ApiResponse<CompanyRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_COMPANY,
        request,
        { companyId },
      )
      .pipe(map((response) => response.data ?? ({} as CompanyRegistrationResponse)));
  }

  approveCampus(campusId: string, request: ApprovalRequest): Observable<CampusRegistrationResponse> {
    return this.api
      .patch<ApiResponse<CampusRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_CAMPUS,
        request,
        { campusId },
      )
      .pipe(map((response) => response.data ?? ({} as CampusRegistrationResponse)));
  }

  getPendingApprovals(): Observable<Record<string, unknown>> {
    return this.api
      .get<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.ADMIN.PENDING_APPROVALS)
      .pipe(map((response) => response.data ?? {}));
  }
}


