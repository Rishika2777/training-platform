export interface LoginRequestModel {
  email: string;
  password: string;
}

// Re-export from admin models for consistency
export type { LoginRequest } from '../../admin/models/admin-api.models';
