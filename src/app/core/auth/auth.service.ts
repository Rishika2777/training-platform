import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_ENDPOINTS, EnumLoginStatus, LOGIN_STATUS, STORAGE_KEYS, UserRole, UserType } from '../config/app.constants';
import { ApiService } from '../api/api.service';
import { ApiResponseEnvelope, unwrapApiResponse } from '../api/api-response.utils';
import { AuthStateService } from './auth-state.service';
import { UserData } from '../models/user.model';
import { StorageService } from '../storage/storage.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  userType?: UserType;
  name?: string; // optional if backend supports it
  emailVerified?: boolean;
}

export interface RegisterOptions {
  persistAuth?: boolean;
}

export interface RegistrationDraft {
  email: string;
  password?: string;
  confirmPassword?: string;
  emailVerified?: boolean;
  /** Firebase ID token from Google Sign-In; when set, use POST /auth/google after user type selection. */
  idToken?: string;
  /** Firebase additionalUserInfo.isNewUser — true when user signed in for the first time. */
  isNewUser?: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
  userType: UserType;
}

export interface ResendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyPhoneRequest {
  phoneNumber: string;
}

interface AuthPayload {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthPayloadUser;
  userId?: string | number;
  email?: string;
  userType?: string;
  role?: string;
  roles?: readonly string[];
  permissions?: readonly string[];
  approvalStatus?: string;
  emailVerified?: boolean;
  onboardingFormSubmit?: boolean;
  profileCompleted?: boolean;
  profileServiceId?: string;
  studentId?: string;
  campusId?: string;
  companyId?: string;
  departmentId?: string;
  redirectTo?: string;
}

interface AuthPayloadUser {
  userId?: string | number;
  email?: string;
  userType?: string;
  roles?: readonly string[];
  permissions?: readonly string[];
  approvalStatus?: string;
  emailVerified?: boolean;
  onboardingFormSubmit?: boolean;
  profileCompleted?: boolean;
  profileServiceId?: string;
  studentId?: string;
  campusId?: string;
  companyId?: string;
  departmentId?: string;
  redirectTo?: string;
}

function uniqueStrings(values: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v || seen.has(v)) {
      continue;
    }
    seen.add(v);
    result.push(v);
  }
  return result;
}

function isUserRole(value: string): value is UserRole {
  return (
    value === 'SUPER_ADMIN' ||
    value === 'ADMIN' ||
    value === 'CAMPUS_ADMIN' ||
    value === 'STUDENT' ||
    value === 'COMPANY_ADMIN' ||
    value === 'USER'||
    value === 'DEPARTMENT'
  );
}

function isUserType(value: string): value is UserType {
  return value === 'CAMPUS' || value === 'COMPANY' || value === 'STUDENT' || value === 'DEPARTMENT';
}

function defaultRoleForUserType(userType: UserType): UserRole {
  if (userType === 'CAMPUS') {
    return 'CAMPUS_ADMIN';
  }
  if (userType === 'COMPANY') {
    return 'COMPANY_ADMIN';
  }
  if (userType === 'DEPARTMENT') {
    return 'DEPARTMENT';
  }
  return 'STUDENT';
}

function normalizeRoles(userType?: string, backendRoles?: readonly string[]): UserRole[] {
  const base: string[] = [];
  if (userType && isUserType(userType)) {
    base.push(defaultRoleForUserType(userType));
  }
  const merged = uniqueStrings([...base, ...(backendRoles ?? [])]);
  return merged.filter((r): r is UserRole => isUserRole(r));
}

function mergeUserPayload(payload: AuthPayload): AuthPayload {
  const u = payload.user;
  // Map campusId to profileServiceId if profileServiceId is not present
  const profileServiceId = payload.profileServiceId ?? u?.profileServiceId ?? payload.campusId;
  
  if (!u) {
    return {
      ...payload,
      profileServiceId,
    };
  }
  return {
    ...payload,
    userId: payload.userId ?? u.userId,
    email: payload.email ?? u.email,
    userType: payload.userType ?? u.userType,
    roles: payload.roles ?? u.roles,
    permissions: payload.permissions ?? u.permissions,
    approvalStatus: payload.approvalStatus ?? u.approvalStatus,
    profileCompleted: payload.profileCompleted ?? u.profileCompleted,
    profileServiceId: payload.profileServiceId ?? u.profileServiceId,
    studentId: payload.studentId ?? u.studentId,
    campusId: payload.campusId ?? u.campusId,
    companyId: payload.companyId ?? u.companyId,
    departmentId: payload.departmentId ?? u.departmentId,
    redirectTo: payload.redirectTo ?? u.redirectTo,
  };
}

function isEnumLoginStatus(value: string): value is EnumLoginStatus {
  return value === 'PENDING_REGISTRATION' || value === 'PENDING_APPROVAL' || value === 'APPROVED' || value === 'REJECTED';
}

function buildUserData(payload: AuthPayload): UserData | null {
  const p = mergeUserPayload(payload);
  if (!p.userId && !p.email && !p.userType && !p.role && !p.roles) {
    return null;
  }
  const userType = p.userType && isUserType(p.userType) ? p.userType : null;
  const roles = normalizeRoles(p.userType, p.roles);
  const approvalStatus = p.approvalStatus && isEnumLoginStatus(p.approvalStatus) ? p.approvalStatus : undefined;

  return {
    userId: p.userId,
    email: p.email,
    userType,
    role: roles[0] ?? null,
    roles,
    permissions: [...(p.permissions ?? [])],
    approvalStatus,
    profileCompleted: p.profileCompleted,
    profileServiceId: p.profileServiceId,
    studentId: p.studentId,
    campusId: p.campusId,
    companyId: p.companyId,
    departmentId: p.departmentId,
    redirectTo: p.redirectTo,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);

  // Temporary storage for registration flow steps (client-only UX)
  private registrationData: RegistrationDraft | null = null;

  setRegistrationData(data: RegistrationDraft): void {
    this.registrationData = data;
  }

  getRegistrationData(): RegistrationDraft | null {
    return this.registrationData;
  }

  login(credentials: LoginRequest): Observable<unknown> {
    return this.api.post<unknown, LoginRequest>(API_ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap({
        next: (response) => {
          // Login should always persist tokens + user context.
          this.persistAuthFromResponse(response, { persistTokens: true });
        },
      }),
      map((response) => response),
    );
  }

  /**
   * Authenticate or register with Google using Firebase ID token.
   * Call after user selects userType (e.g. on register-options page).
   */
  googleLogin(request: GoogleLoginRequest): Observable<unknown> {
    return this.api.post<unknown, GoogleLoginRequest>(API_ENDPOINTS.AUTH.GOOGLE, request).pipe(
      tap({
        next: (response) => {
          this.persistAuthFromResponse(response, { persistTokens: true });
        },
      }),
      map((response) => response),
    );
  }

  /**
   * Verify phone number with backend after Firebase OTP verification.
   * Called after frontend has verified OTP via Firebase. Updates isPhoneVerified in database.
   */
  verifyPhone(request: VerifyPhoneRequest): Observable<unknown> {
    return this.api.post<unknown, VerifyPhoneRequest>(API_ENDPOINTS.AUTH.VERIFY_PHONE, request);
  }

  extractEmailVerified(response: unknown): boolean | undefined {
    const payload = this.extractAuthPayload(response);
    return payload?.emailVerified;
  }

  extractEmailFromResponse(response: unknown): string | undefined {
    const payload = this.extractAuthPayload(response);
    return payload?.email;
  }

  register(user: RegisterRequest, options?: RegisterOptions): Observable<unknown> {
    const persistTokens = options?.persistAuth === true;
    return this.api.post<unknown, RegisterRequest>(API_ENDPOINTS.AUTH.REGISTER, user).pipe(
      tap((response) => {
        // Always persist user context (userId/email/userType) so multi-step registration pages can work,
        // but only persist tokens when explicitly asked (e.g., after OTP verification).
        this.persistAuthFromResponse(response, { persistTokens });
      }),
    );
  }

  verifyEmail(token: string): Observable<unknown> {
    return this.api.get<unknown>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
  }

  resendOtp(email: string): Observable<void> {
    return this.api
      .post<ApiResponseEnvelope<void>, ResendOtpRequest>(API_ENDPOINTS.AUTH.RESEND_OTP, { email })
      .pipe(map(() => void 0));
  }

  verifyOtp(request: VerifyOtpRequest, options?: { persistAuth?: boolean }): Observable<unknown> {
    const persistTokens = options?.persistAuth === true;
    return this.api.post<unknown, VerifyOtpRequest>(API_ENDPOINTS.AUTH.VERIFY_OTP, request).pipe(
      tap((response) => {
        this.persistAuthFromResponse(response, { persistTokens });
      }),
    );
  }

  me(): Observable<UserData | null> {
    return this.api.get<unknown>(API_ENDPOINTS.AUTH.ME).pipe(
      map((raw) => {
        const payload = unwrapApiResponse<AuthPayload>(raw);
        if (!payload) {
          return null;
        }
        return buildUserData(payload);
      }),
      tap((user) => {
        if (user) {
          this.authState.setUser(user);
        }
      }),
    );
  }

  selectUserType(userType: UserType): Observable<unknown> {
    return this.api.post<unknown, { userType: UserType }>(API_ENDPOINTS.AUTH.SELECT_USER_TYPE, { userType });
  }

  completeProfile(profileServiceId: string): Observable<unknown> {
    return this.api.post<unknown, { profileServiceId: string }>(API_ENDPOINTS.AUTH.PROFILE_COMPLETE, {
      profileServiceId,
    });
  }

  refreshToken(refreshToken: string): Observable<unknown> {
    return this.api.post<unknown, { refreshToken: string }>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken }).pipe(
      tap((response) => this.persistAuthFromResponse(response, { persistTokens: true })),
    );
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.api.post<unknown, { email: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  }

  resetPassword(resetToken: string, newPassword: string): Observable<unknown> {
    return this.api.post<unknown, { resetToken: string; newPassword: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      resetToken,
      newPassword,
    });
  }

  /**
   * Reset password from forget-password flow using userId from the reset link.
   * POST /auth/reset-password/{userId}
   */
  resetPasswordByUserId(
    userId: string,
    body: { password: string; confirmPassword: string }
  ): Observable<unknown> {
    return this.api.post<unknown, { password: string; confirmPassword: string }>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD_BY_USER_ID,
      body,
      { userId }
    );
  }

  logout(): Observable<unknown> {
    return this.api.post<unknown, Record<string, never>>(API_ENDPOINTS.AUTH.LOGOUT, {}).pipe(
      tap({
        next: () => this.authState.clearAuth(),
        error: () => this.authState.clearAuth(),
      }),
    );
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  getCurrentUser(): UserData | null {
    return this.authState.user();
  }

  private persistAuthFromResponse(
    response: unknown,
    options?: { persistTokens?: boolean },
  ): void {
    const payload = this.extractAuthPayload(response);
    if (!payload) {
      return;
    }

    const persistTokens = options?.persistTokens === true;
    if (persistTokens) {
      // Check if approvalStatus is APPROVED before saving tokens
      const mergedPayload = mergeUserPayload(payload);
      const approvalStatus = mergedPayload.approvalStatus;
      const roles = mergedPayload.roles ?? [];
      
      // Check if user has admin roles (ADMIN or SUPER_ADMIN)
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
      
      // Only save tokens if approvalStatus is APPROVED or user is admin
      const shouldSaveTokens = approvalStatus === LOGIN_STATUS.APPROVED || isAdmin;
      
      if (shouldSaveTokens) {
        // Extract accessToken (handle both camelCase and snake_case)
        const accessToken = payload.accessToken ?? (payload as { access_token?: string }).access_token;
        const refreshToken = payload.refreshToken ?? (payload as { refresh_token?: string }).refresh_token;

        if (accessToken) {
          this.authState.setTokens(accessToken, refreshToken ?? null);
        }
      }
    }

    // Persist user context even when tokens are not persisted (multi-step registration UX).
    const user = buildUserData(payload);
    if (user) {
      this.authState.setUser(user);
      
      // Store campusId in storage if available (for campus and department users)
      // Use campusId if available, otherwise fall back to profileServiceId
      if (user.userType === 'CAMPUS' || user.userType === 'DEPARTMENT') {
        const campusId = user.campusId || user.profileServiceId;
        if (campusId) {
          this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
        }
      }
      
      // Store companyId in storage if available (for company users)
      // Use companyId if available, otherwise fall back to profileServiceId
      if (user.userType === 'COMPANY') {
        const companyId = user.companyId || user.profileServiceId;
        if (companyId) {
          this.storage.set(STORAGE_KEYS.COMPANY_ID, companyId);
        }
      }

      // Store studentId in storage if available (for student users)
      if (user.userType === 'STUDENT') {
        const studentId = user.studentId || user.profileServiceId;
        if (studentId) {
          this.storage.set(STORAGE_KEYS.STUDENT_ID, String(studentId));
        }
      }

      // Store departmentId in storage if available (for department users)
      if (user.userType === 'DEPARTMENT' && user.departmentId) {
        this.storage.set(STORAGE_KEYS.DEPARTMENT_ID, user.departmentId);
      }
    }
  }

  private extractAuthPayload(response: unknown): AuthPayload | null {
    // Handle ApiResponse<AuthResponse> structure: { success, message, data: { ... } }
    if (!response || typeof response !== 'object') {
      return null;
    }
    const payload = unwrapApiResponse<AuthPayload>(response);
    if (payload) {
      return payload;
    }

    // Direct payload (backward compatibility)
    const rec = response as Record<string, unknown>;
    if ('accessToken' in rec || 'access_token' in rec || 'user' in rec || 'userId' in rec || 'email' in rec) {
      return response as AuthPayload;
    }

    return null;
  }
}


