import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

type LoginForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly roles = inject(RoleService);
  private readonly notifications = inject(NotificationService);

  submitting = false;

  readonly form: LoginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    const payload = this.form.getRawValue();

    this.auth.login(payload).subscribe({
      next: () => {
        this.submitting = false;
        void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      },
      error: () => {
        this.submitting = false;
      },
    });
  }

  forgotPassword(): void {
    this.notifications.info('Forgot password is not available yet. It will be added next.');
  }

  goToRegisterOptions(): void {
    void this.router.navigateByUrl('/register');
  }
}


