import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

type RegisterForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

function passwordStrengthValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }

  // At least 1 uppercase, 1 number, 1 special char, min length 12
  const ok =
    value.length >= 12 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

  return ok ? null : { passwordStrength: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  submitting = false;

  readonly form: RegisterForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordStrengthValidator],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    const payload = this.form.getRawValue();
    if (payload.password !== payload.confirmPassword) {
      this.submitting = false;
      this.notify.error('Passwords do not match');
      this.cdr.detectChanges();
      return;
    }

    // Legacy behavior: store draft only, then userType selection triggers /auth/register.
    this.auth.setRegistrationData({
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
    });
    this.submitting = false;
    this.cdr.detectChanges();
    void this.router.navigateByUrl('/register-options');
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}


