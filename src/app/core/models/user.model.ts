import { UserRole, UserType } from '../config/app.constants';

export type UserId = string | number;

export interface UserData {
  userId?: UserId;
  email?: string;

  /**
   * Backend user type (drives UX: menu selection, home routing).
   */
  userType?: UserType | null;

  /**
   * Kept for compatibility with legacy logic that reads `role`.
   */
  role?: UserRole | null;

  /**
   * List of roles for RBAC checks (frontend UX).
   */
  roles: UserRole[];

  permissions: string[];

  profileCompleted?: boolean;
  profileServiceId?: string;
  redirectTo?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}


