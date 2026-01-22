// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

// Authentication Models
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  userType?: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN';
}

export interface AuthResponse {
  userId?: string;
  email?: string;
  userType?: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN';
  roles?: string[];
  permissions?: string[];
  approvalStatus?: 'PENDING_REGISTRATION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  emailVerified?: boolean;
  onboardingFormSubmit?: boolean;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  tokenType?: string;
  profileCompleted?: boolean;
  profileServiceId?: string;
  redirectTo?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordWithEmailRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface SelectUserTypeRequest {
  userType: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN';
}

export interface ProfileCompletionRequest {
  profileServiceId: string;
}

// User Management Models
export interface UserResponse {
  userId?: string;
  email?: string;
  userType?: 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string;
  failedLoginAttempts?: number;
  accountLockedUntil?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Pageable {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}

export interface PageableObject {
  offset?: number;
  sort?: SortObject;
  paged?: boolean;
  pageNumber?: number;
  pageSize?: number;
  unpaged?: boolean;
}

export interface PageUserResponse {
  totalPages?: number;
  totalElements?: number;
  first?: boolean;
  last?: boolean;
  size?: number;
  content?: UserResponse[];
  number?: number;
  sort?: SortObject;
  numberOfElements?: number;
  pageable?: PageableObject;
  empty?: boolean;
}

// Admin Models
export interface ApprovalRequest {
  status: string;
  comment?: string;
}

export interface StudentRegistrationResponse {
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  about?: string;
  approvalStatus?: string;
  createdAt?: string;
}

export interface CompanyRegistrationResponse {
  companyId?: string;
  userId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  adminName?: string;
  adminDesignation?: string;
  adminEmail?: string;
  adminPhone?: string;
  websiteUrl?: string;
  otherWebsiteUrl?: string;
  registerNumber?: string;
  approvalStatus?: string;
  createdAt?: string;
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
  websiteUrl?: string;
  approvalStatus?: string;
  createdAt?: string;
}

