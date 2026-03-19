import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ResetPasswordWithEmailRequest,
  SelectUserTypeRequest,
  ProfileCompletionRequest,
  ReportIssueRequest,
} from '../../admin/models/admin-api.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiService);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api
      .post<ApiResponse<AuthResponse>, LoginRequest>(API_ENDPOINTS.AUTH.LOGIN, credentials)
      .pipe(map((response) => response.data ?? ({} as AuthResponse)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api
      .post<ApiResponse<AuthResponse>, RegisterRequest>(API_ENDPOINTS.AUTH.REGISTER, request)
      .pipe(map((response) => response.data ?? ({} as AuthResponse)));
  }

  verifyEmail(token: string): Observable<void> {
    return this.api
      .get<ApiResponse<void>>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token })
      .pipe(map(() => void 0));
  }

  refreshToken(request: RefreshTokenRequest): Observable<AuthResponse> {
    return this.api
      .post<ApiResponse<AuthResponse>, RefreshTokenRequest>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, request)
      .pipe(map((response) => response.data ?? ({} as AuthResponse)));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<string> {
    return this.api
      .post<ApiResponse<string>, ForgotPasswordRequest>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, request)
      .pipe(map((response) => response.data ?? ''));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.api
      .post<ApiResponse<void>, ResetPasswordRequest>(API_ENDPOINTS.AUTH.RESET_PASSWORD, request)
      .pipe(map(() => void 0));
  }

  resetPasswordWithEmail(request: ResetPasswordWithEmailRequest): Observable<void> {
    return this.api
      .post<ApiResponse<void>, ResetPasswordWithEmailRequest>(API_ENDPOINTS.AUTH.RESET_PASSWORD, request)
      .pipe(map(() => void 0));
  }

  selectUserType(request: SelectUserTypeRequest): Observable<void> {
    return this.api
      .post<ApiResponse<void>, SelectUserTypeRequest>(API_ENDPOINTS.AUTH.SELECT_USER_TYPE, request)
      .pipe(map(() => void 0));
  }

  completeProfile(request: ProfileCompletionRequest): Observable<void> {
    return this.api
      .post<ApiResponse<void>, ProfileCompletionRequest>(API_ENDPOINTS.AUTH.PROFILE_COMPLETE, request)
      .pipe(map(() => void 0));
  }

  logout(): Observable<void> {
    return this.api
      .post<ApiResponse<void>, Record<string, never>>(API_ENDPOINTS.AUTH.LOGOUT, {})
      .pipe(map(() => void 0));
  }

  getCurrentUser(): Observable<unknown> {
    return this.api.get<ApiResponse<unknown>>(API_ENDPOINTS.AUTH.ME);
  }

  reportIssue(request: ReportIssueRequest): Observable<void> {
    return this.api
      .post<ApiResponse<void>, ReportIssueRequest>(API_ENDPOINTS.CONTACT.CONTACT_SUPPORT, request)
      .pipe(map(() => void 0));
  }
}


