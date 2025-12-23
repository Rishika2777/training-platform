import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_ENDPOINTS, UserRole, UserType } from '../config/app.constants';
import { ApiService } from '../api/api.service';
import { AuthStateService } from './auth-state.service';
import { UserData } from '../models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  phoneNumber?: string;
  userType?: UserType;
  name?: string; // optional if backend supports it
}

export interface RegisterOptions {
  persistAuth?: boolean;
}

export interface RegistrationDraft {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
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
  profileCompleted?: boolean;
  profileServiceId?: string;
  redirectTo?: string;
}

interface AuthPayloadUser {
  userId?: string | number;
  email?: string;
  userType?: string;
  roles?: readonly string[];
  permissions?: readonly string[];
  profileCompleted?: boolean;
  profileServiceId?: string;
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
    value === 'USER'
  );
}

function isUserType(value: string): value is UserType {
  return value === 'CAMPUS' || value === 'COMPANY' || value === 'STUDENT';
}

function defaultRoleForUserType(userType: UserType): UserRole {
  if (userType === 'CAMPUS') {
    return 'CAMPUS_ADMIN';
  }
  if (userType === 'COMPANY') {
    return 'COMPANY_ADMIN';
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

function unwrapResponse<T>(raw: T | ApiResponse<T>): T {
  const maybeWrapped = raw as ApiResponse<T>;
  return maybeWrapped && typeof maybeWrapped === 'object' && 'data' in maybeWrapped && maybeWrapped.data
    ? maybeWrapped.data
    : (raw as T);
}

function mergeUserPayload(payload: AuthPayload): AuthPayload {
  const u = payload.user;
  if (!u) {
    return payload;
  }
  return {
    ...payload,
    userId: payload.userId ?? u.userId,
    email: payload.email ?? u.email,
    userType: payload.userType ?? u.userType,
    roles: payload.roles ?? u.roles,
    permissions: payload.permissions ?? u.permissions,
    profileCompleted: payload.profileCompleted ?? u.profileCompleted,
    profileServiceId: payload.profileServiceId ?? u.profileServiceId,
    redirectTo: payload.redirectTo ?? u.redirectTo,
  };
}

function buildUserData(payload: AuthPayload): UserData | null {
  const p = mergeUserPayload(payload);
  if (!p.userId && !p.email && !p.userType && !p.role && !p.roles) {
    return null;
  }
  const userType = p.userType && isUserType(p.userType) ? p.userType : null;
  const roles = normalizeRoles(p.userType, p.roles);

  return {
    userId: p.userId,
    email: p.email,
    userType,
    role: roles[0] ?? null,
    roles,
    permissions: [...(p.permissions ?? [])],
    profileCompleted: p.profileCompleted,
    profileServiceId: p.profileServiceId,
    redirectTo: p.redirectTo,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly authState = inject(AuthStateService);

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
      tap((response) => this.persistAuthFromResponse(response)),
    );
  }

  register(user: RegisterRequest, options?: RegisterOptions): Observable<unknown> {
    const persist = options?.persistAuth === true;
    return this.api.post<unknown, RegisterRequest>(API_ENDPOINTS.AUTH.REGISTER, user).pipe(
      tap((response) => {
        if (persist) {
          this.persistAuthFromResponse(response);
        }
      }),
    );
  }

  verifyEmail(token: string): Observable<unknown> {
    return this.api.get<unknown>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
  }

  verifyOtp(otp: string, options?: { persistAuth?: boolean }): Observable<unknown> {
    const persist = options?.persistAuth === true;
    return this.api.post<unknown, { otp: string }>(API_ENDPOINTS.AUTH.VERIFY_OTP, { otp }).pipe(
      tap((response) => {
        if (persist) {
          this.persistAuthFromResponse(response);
        }
      }),
    );
  }

  me(): Observable<UserData | null> {
    return this.api.get<unknown>(API_ENDPOINTS.AUTH.ME).pipe(
      map((raw) => {
        const payload = unwrapResponse<AuthPayload>(raw as AuthPayload | ApiResponse<AuthPayload>);
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
      tap((response) => this.persistAuthFromResponse(response)),
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

  private persistAuthFromResponse(response: unknown): void {
    // Allow either wrapped { data: {...} } or direct payload
    const payload = unwrapResponse<AuthPayload>(response as AuthPayload | ApiResponse<AuthPayload>);
    if (!payload) {
      return;
    }

    if (payload.accessToken) {
      this.authState.setTokens(payload.accessToken, payload.refreshToken ?? null);
    }

    const user = buildUserData(payload);
    if (user) {
      this.authState.setUser(user);
    }
  }
}


