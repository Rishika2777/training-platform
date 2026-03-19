import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../core/api/api-response.utils';
import { ApiResponse, ChangePasswordRequest, PageUserResponse, Pageable, UserResponse } from '../models/admin-api.models';
import { AdminAuditService } from './admin-audit.service';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(ApiService);
  private readonly audit = inject(AdminAuditService);

  getAllUsers(): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.BASE)
      .pipe(map((response) => {
        const data = unwrapApiResponse<UserResponse[]>(response);
        return Array.isArray(data) ? data : [];
      }));
  }

  getUserById(userId: string): Observable<UserResponse> {
    return this.api
      .get<ApiResponse<UserResponse>>(API_ENDPOINTS.USERS.BASE + `/${userId}`)
      .pipe(map((response) => unwrapApiResponse<UserResponse>(response) ?? ({} as UserResponse)));
  }

  deleteUser(userId: string): Observable<void> {
    return this.api
      .delete<ApiResponse<void>>(API_ENDPOINTS.USERS.BASE + `/${userId}`)
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_DELETE_USER', { userId });
        }),
        map(() => void 0),
      );
  }

  getUsersByType(userType: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN'): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.BY_TYPE, undefined, { userType })
      .pipe(map((response) => {
        const data = unwrapApiResponse<UserResponse[]>(response);
        return Array.isArray(data) ? data : [];
      }));
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
      .pipe(map((response) => unwrapApiResponse<PageUserResponse>(response) ?? ({} as PageUserResponse)));
  }

  getUserByEmail(email: string): Observable<UserResponse> {
    return this.api
      .get<ApiResponse<UserResponse>>(API_ENDPOINTS.USERS.BY_EMAIL, undefined, { email })
      .pipe(map((response) => unwrapApiResponse<UserResponse>(response) ?? ({} as UserResponse)));
  }

  deleteUserByEmail(email: string): Observable<void> {
    return this.api
      .delete<ApiResponse<void>>(API_ENDPOINTS.USERS.BY_EMAIL, { email })
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_DELETE_USER_BY_EMAIL', { email });
        }),
        map(() => void 0),
      );
  }

  getActiveUsers(): Observable<UserResponse[]> {
    return this.api
      .get<ApiResponse<UserResponse[]>>(API_ENDPOINTS.USERS.ACTIVE)
      .pipe(map((response) => {
        const data = unwrapApiResponse<UserResponse[]>(response);
        return Array.isArray(data) ? data : [];
      }));
  }

  verifyUser(userId: string): Observable<UserResponse> {
    return this.api
      .patch<ApiResponse<UserResponse>, Record<string, never>>(API_ENDPOINTS.USERS.VERIFY, {}, { userId })
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_VERIFY_USER', { userId });
        }),
        map((response) => unwrapApiResponse<UserResponse>(response) ?? ({} as UserResponse)),
      );
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<UserResponse> {
    return this.api
      .patch<ApiResponse<UserResponse>, Record<string, never>>(
        API_ENDPOINTS.USERS.STATUS,
        {},
        { userId },
        { isActive },
      )
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_UPDATE_USER_STATUS', { userId, isActive });
        }),
        map((response) => unwrapApiResponse<UserResponse>(response) ?? ({} as UserResponse)),
      );
  }

  changePassword(userId: string, request: ChangePasswordRequest): Observable<void> {
    return this.api
      .patch<ApiResponse<void>, ChangePasswordRequest>(API_ENDPOINTS.USERS.PASSWORD, request, { userId })
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_CHANGE_PASSWORD', { userId });
        }),
        map(() => void 0),
      );
  }
}
