import { EnumLoginStatus, UserRole, UserType } from '../config/app.constants';

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

  /**
   * Approval status for user registration/approval flow.
   */
  approvalStatus?: EnumLoginStatus;

  profileCompleted?: boolean;
  profileServiceId?: string;
  studentId?: string;
  campusId?: string;
  companyId?: string;
  departmentId?: string;
  redirectTo?: string;

  /** Display name from profile (company/campus name, or user name). */
  displayName?: string;
  /** Profile/avatar image URL. */
  imageUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}


