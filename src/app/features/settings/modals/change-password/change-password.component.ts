import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AdminApiService } from '../../../admin/services/admin-api.service';
import { AuthService } from '../../../../core/auth/auth.service';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly adminApi = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly form: FormGroup;
  readonly submitting = signal(false);

  constructor() {
    this.form = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get currentPasswordInvalid(): boolean {
    const control = this.form.get('currentPassword');
    return !!(control && control.invalid && control.touched);
  }

  get newPasswordInvalid(): boolean {
    const control = this.form.get('newPassword');
    return !!(control && control.invalid && control.touched);
  }

  get confirmPasswordInvalid(): boolean {
    const control = this.form.get('confirmPassword');
    return !!(control && control.invalid && control.touched);
  }

  get passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.get('confirmPassword')?.touched === true;
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.userId) {
      this.notify.error('User not authenticated');
      return;
    }

    const formValue = this.form.value as ChangePasswordForm;
    this.submitting.set(true);

    this.adminApi.changePassword(String(currentUser.userId), {
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Password changed successfully');
        this.form.reset();
        this.closed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.notify.error('Failed to change password. Please check your current password.');
      },
    });
  }

  onCancel(): void {
    this.form.reset();
    this.closed.emit();
  }
}

