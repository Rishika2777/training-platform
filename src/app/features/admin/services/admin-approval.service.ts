import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../core/api/api-response.utils';
import {
  ApiResponse,
  ApprovalRequest,
  CampusRegistrationResponse,
  CompanyRegistrationResponse,
  StudentRegistrationResponse,
} from '../models/admin-api.models';
import { AdminAuditService } from './admin-audit.service';

@Injectable({ providedIn: 'root' })
export class AdminApprovalService {
  private readonly api = inject(ApiService);
  private readonly audit = inject(AdminAuditService);

  approveStudent(studentId: string, request: ApprovalRequest): Observable<StudentRegistrationResponse> {
    return this.api
      .patch<ApiResponse<StudentRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_STUDENT,
        request,
        { studentId },
      )
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_APPROVE_STUDENT', {
            studentId,
            status: request.status,
          });
        }),
        map((response) => unwrapApiResponse<StudentRegistrationResponse>(response) ?? ({} as StudentRegistrationResponse)),
      );
  }

  approveCompany(companyId: string, request: ApprovalRequest): Observable<CompanyRegistrationResponse> {
    return this.api
      .patch<ApiResponse<CompanyRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_COMPANY,
        request,
        { companyId },
      )
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_APPROVE_COMPANY', {
            companyId,
            status: request.status,
          });
        }),
        map((response) => unwrapApiResponse<CompanyRegistrationResponse>(response) ?? ({} as CompanyRegistrationResponse)),
      );
  }

  approveCampus(campusId: string, request: ApprovalRequest): Observable<CampusRegistrationResponse> {
    return this.api
      .patch<ApiResponse<CampusRegistrationResponse>, ApprovalRequest>(
        API_ENDPOINTS.ADMIN.APPROVE_CAMPUS,
        request,
        { campusId },
      )
      .pipe(
        tap(() => {
          this.audit.logAction('ADMIN_APPROVE_CAMPUS', {
            campusId,
            status: request.status,
          });
        }),
        map((response) => unwrapApiResponse<CampusRegistrationResponse>(response) ?? ({} as CampusRegistrationResponse)),
      );
  }

  getPendingApprovals(): Observable<Record<string, unknown>> {
    return this.api
      .get<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.ADMIN.PENDING_APPROVALS)
      .pipe(map((response) => unwrapApiResponse<Record<string, unknown>>(response) ?? {}));
  }
}
