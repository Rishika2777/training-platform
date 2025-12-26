import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-password-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './password.component.html',
  styleUrl: './password.component.css',
})
export class PasswordSettingsComponent {
  private readonly fb = inject(FormBuilder);
  passwordForm: FormGroup;
  forgotPasswordForm: FormGroup;

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.passwordForm.valid) {
      console.log('Password change request:', this.passwordForm.value);
      // TODO: Implement API call to change password
      alert('Password updated successfully!');
      this.passwordForm.reset();
    }
  }

  onCancel(): void {
    this.passwordForm.reset();
  }

  onForgotPassword(): void {
    if (this.forgotPasswordForm.valid) {
      console.log('Forgot password request:', this.forgotPasswordForm.value);
      // TODO: Implement API call to send reset link
      alert('Password reset link has been sent to your email!');
      this.forgotPasswordForm.reset();
    }
  }
}
