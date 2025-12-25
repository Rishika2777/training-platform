import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  createEmptyStudentFormValue,
  StudentFormComponent,
  StudentFormValue,
} from '../../../../shared/components/forms/student-form/student-form.component';
import {
  StudentApiService,
  mapStudentFormValueToRegisterRequest,
} from '../../../student/services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { catchError, map, of, switchMap } from 'rxjs';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';

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

  submitting = false;

  formValue: StudentFormValue = createEmptyStudentFormValue({
    email: this.auth.getCurrentUser()?.email ?? '',
  });

  submit(value: StudentFormValue): void {
    if (this.submitting) {
      return;
    }
    const user = this.auth.getCurrentUser();
    if (!user?.userId || !user.userType) {
      this.notify.error('Missing auth context. Please sign in and try again.');
      void this.router.navigateByUrl('/login');
      return;
    }

    this.submitting = true;
    const registerRequest = mapStudentFormValueToRegisterRequest(value, String(user.userId));
    this.studentApi
      .registerStudent(registerRequest, { userId: user.userId, userType: user.userType })
      .pipe(
        switchMap((result) => {
          const studentId = result.studentId;
          if (!studentId) {
            return of(null);
          }

          this.storage.set(STORAGE_KEYS.STUDENT_ID, studentId);
          const current = this.authState.user();
          if (current && !current.profileServiceId) {
            this.authState.setUser({ ...current, profileServiceId: studentId });
          }

          return this.auth.completeProfile(studentId).pipe(
            map(() => studentId),
            catchError(() => of(studentId)),
          );
        }),
      )
      .subscribe({
        next: (studentId) => {
          this.submitting = false;
          if (!studentId) {
            this.notify.success('Saved.');
            void this.router.navigateByUrl('/student/home');
            return;
          }
          this.notify.success('Student profile created successfully.');
          void this.router.navigateByUrl('/student/home');
        },
        error: () => {
          this.submitting = false;
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


