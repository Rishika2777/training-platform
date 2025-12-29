import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  createEmptyStudentFormValue,
  StudentFormComponent,
  StudentFormValue,
} from '../../../../shared/components/forms/student-form/student-form.component';
import { StudentApiService } from '../../../student/services/student-api.service';
import { mapStudentFormValueToRegisterRequest } from '../../../student/models/student.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';
import { LOGIN_STATUS } from '../../../../core/config/app.constants';

@Component({
  selector: 'app-register-student',
  standalone: true,
  imports: [CommonModule, StudentFormComponent, RegistrationPageLayoutComponent],
  templateUrl: './register-student.component.html',
  styleUrl: './register-student.component.css',
})
export class RegisterStudentComponent {
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  submitting = false;

  private readonly initialEmail =
    this.auth.getCurrentUser()?.email ?? this.auth.getRegistrationData()?.email ?? '';

  readonly emailLocked = this.initialEmail.trim().length > 0;

  formValue: StudentFormValue = createEmptyStudentFormValue({
    email: this.initialEmail,
  });

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
    this.studentApi
      .registerStudent(registerRequest)
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
        error: () => {
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    void this.router.navigateByUrl('/register-options');
  }
}


