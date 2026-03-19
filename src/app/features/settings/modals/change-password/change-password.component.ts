import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthApiService } from '../../../auth/services/auth-api.service';

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
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
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

    if (!newPassword || !confirmPassword) {
      return null;
    }

    const mismatch = newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value;
    
    if (mismatch) {
      // Set error on confirmPassword field so it shows as invalid
      // Preserve existing errors
      const existingErrors = confirmPassword.errors || {};
      confirmPassword.setErrors({ ...existingErrors, passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Clear the passwordMismatch error if passwords match
      if (confirmPassword.hasError('passwordMismatch')) {
        const errors = { ...confirmPassword.errors };
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return null;
    }
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
    const confirmPassword = this.form.get('confirmPassword');
    const newPassword = this.form.get('newPassword');
    
    if (!confirmPassword || !newPassword) {
      return false;
    }

    // Show error if passwords don't match and both fields have values
    const hasMismatch = newPassword.value && confirmPassword.value && 
                       newPassword.value !== confirmPassword.value &&
                       confirmPassword.touched;
    
    return hasMismatch || confirmPassword.hasError('passwordMismatch') === true;
  }

  onNewPasswordChange(value: string): void {
    this.form.patchValue({ newPassword: value });
    // If confirmPassword has a value, mark it as touched to show validation
    if (this.form.get('confirmPassword')?.value) {
      this.form.get('confirmPassword')?.markAsTouched();
    }
    this.form.updateValueAndValidity();
  }

  onConfirmPasswordChange(value: string): void {
    this.form.patchValue({ confirmPassword: value });
    this.form.get('confirmPassword')?.markAsTouched();
    this.form.updateValueAndValidity();
  }

  onSubmit(event?: Event | MouseEvent): void {
    // Prevent default form submission to avoid page reload
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.email) {
      this.notify.error('User not authenticated');
      return;
    }

    const formValue = this.form.value as ChangePasswordForm;
    this.submitting.set(true);

    this.authApi.resetPasswordWithEmail({
      emailId: currentUser.email,
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Password changed successfully. Please login again with your new password.');
        
        // Close modal after a delay to show notification
        setTimeout(() => {
          this.form.reset();
          this.closed.emit();
          
          // Reload the page after closing modal to ensure user re-authenticates
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }, 2000);
      },
      error: (error) => {
        this.submitting.set(false);
        
        // Extract error message from response if available
        let errorMessage = 'Failed to change password. Please check your current password.';
        
        if (error && typeof error === 'object') {
          if ('error' in error && error.error) {
            const errorObj = error.error as { message?: string; error?: string };
            errorMessage = errorObj.message || errorObj.error || errorMessage;
          } else if ('message' in error) {
            errorMessage = String(error.message);
          }
        }
        
        this.notify.error(errorMessage);
      },
    });
  }

  onCancel(): void {
    this.form.reset();
    this.closed.emit();
  }
}

