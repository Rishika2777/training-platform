import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StudentFormComponent } from '../../../../shared/components/forms/student-form/student-form.component';
import type { StudentFormValue } from '../../../../shared/components/forms/student-form/student-form.models';
import { createEmptyStudentFormValue } from '../../../../shared/components/forms/student-form/student-form.utils';
import {
  StudentApiService,
  StudentRegisterFiles,
  StudentRegisterPayload,
} from '../../../student/services/student-api.service';
import { mapStudentFormValueToRegisterRequest, CampusResponse } from '../../../student/models/student.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';
import { LOGIN_STATUS } from '../../../../core/config/app.constants';
import { RegistrationStateService } from '../../services/registration-state.service';

@Component({
  selector: 'app-register-student',
  standalone: true,
  imports: [CommonModule, StudentFormComponent, RegistrationPageLayoutComponent],
  templateUrl: './register-student.component.html',
  styleUrl: './register-student.component.css',
})
export class RegisterStudentComponent implements OnInit {
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly registrationState = inject(RegistrationStateService);

  submitting = false;

  private readonly initialEmail =
    this.auth.getCurrentUser()?.email ?? this.registrationState.getDraft()?.email ?? '';

  readonly emailLocked = this.initialEmail.trim().length > 0;

  campuses: CampusResponse[] = [];

  formValue: StudentFormValue = createEmptyStudentFormValue({
    email: this.initialEmail,
  });

  ngOnInit(): void {
    this.loadCampuses();
  }

  loadCampuses(): void {
    console.log('Loading campuses...');
    this.studentApi.getRegisteredCampuses().subscribe({
      next: (response) => {
        console.log('Campuses API response:', response);
        const items = unwrapApiResponse<CampusResponse[]>(response);
        if (Array.isArray(items)) {
          this.campuses = items;
          console.log(`Loaded ${this.campuses.length} campuses`);
          this.cdr.detectChanges();
        } else {
          console.warn('Campuses API returned no data or invalid format:', response);
        }
      },
      error: (error) => {
        console.error('Failed to load campuses:', error);
        // Show user-friendly error message
        this.notify.error('Failed to load institutions. Please refresh the page.');
      },
    });
  }

  submit(value: StudentFormValue): void {
    if (this.submitting) {
      return;
    }
    const user = this.auth.getCurrentUser();
    if (!user?.userId) {
      this.notify.error('Missing auth context. Please sign in and try again.');
      void this.router.navigateByUrl('/login');
      return;
    }

    this.submitting = true;
    const registerRequest = mapStudentFormValueToRegisterRequest(value, String(user.userId));
    const registerPayload = this.buildRegisterPayload(value, registerRequest);
    this.studentApi
      .registerStudent(registerPayload)
      .subscribe({
        next: (response) => {
          this.submitting = false;

          const data = response.data ?? null;
          const approvalStatus = data?.approvalStatus ?? null;

          if (approvalStatus === 'PENDING'|| approvalStatus === LOGIN_STATUS.PENDING_APPROVAL) {
            this.notify.success(
              'Form submitted successfully. Please wait until admin approves your profile.',
            );
            void this.router.navigateByUrl('/login');
            return;
          }

          if (approvalStatus === LOGIN_STATUS.REJECTED) {
            this.notify.error('Your profile was rejected. Please contact support or try again.');
            void this.router.navigateByUrl('/login');
            return;
          }

          // Approved (or unknown): proceed to home.
          this.notify.success('Student profile created successfully.');
          void this.router.navigateByUrl('/student/home');
        },
        error: (error) => {
          this.submitting = false;
          // Extract and display validation errors
          const errorMessage = this.extractValidationErrorMessage(error);
          if (errorMessage) {
            this.notify.error(errorMessage);
          }
          this.cdr.detectChanges();
        },
      });
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    void this.router.navigateByUrl('/register/options');
  }

  private extractValidationErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: unknown };
      const errorResponse = httpError.error;
      
      if (errorResponse && typeof errorResponse === 'object') {
        const response = errorResponse as {
          message?: string;
          data?: Record<string, string>;
          error?: string;
        };
        
        // Extract field-specific validation errors from data
        if (response.data && typeof response.data === 'object') {
          const fieldErrors: string[] = [];
          for (const [field, message] of Object.entries(response.data)) {
            if (typeof message === 'string' && message.trim()) {
              // Format field name: convert camelCase to Title Case
              const fieldName = field
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())
                .trim();
              fieldErrors.push(`${fieldName}: ${message}`);
            }
          }
          
          if (fieldErrors.length > 0) {
            const baseMessage = response.message || 'Validation failed';
            // Join with semicolon for better toaster display
            return `${baseMessage} - ${fieldErrors.join('; ')}`;
          }
        }
        
        // Fallback to message or error field
        if (response.message && typeof response.message === 'string') {
          return response.message;
        }
        if (response.error && typeof response.error === 'string') {
          return response.error;
        }
      }
    }
    
    return 'Failed to register student profile. Please try again.';
  }

  private buildRegisterPayload(
    value: StudentFormValue,
    request: ReturnType<typeof mapStudentFormValueToRegisterRequest>,
  ): StudentRegisterPayload {
    return {
      request,
      files: this.buildRegisterFiles(value),
    };
  }

  private buildRegisterFiles(value: StudentFormValue): StudentRegisterFiles {
    return {
      profilePhoto: value.photoFiles?.item(0) ?? null,
      resume: value.additional.resumeFiles?.item(0) ?? null,
      govtIdProof: value.additional.govtIdProofFiles?.item(0) ?? null,
      portfolio: null,
    };
  }
}


