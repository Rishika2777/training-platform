import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LOGIN_STATUS } from '../../../../core/config/app.constants';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { VerifyOtpComponent } from '../../../registration/components/verify-otp/verify-otp.component';

type LoginForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent, ModalComponent, VerifyOtpComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly roles = inject(RoleService);
  private readonly notifications = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  submitting = false;
  verifyingOtp = false;
  resendingOtp = false;
  showOtpModal = false;
  userEmail = '';

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
      next: (response) => {
        this.submitting = false;
        const emailVerified = this.auth.extractEmailVerified(response);
        const email = this.auth.extractEmailFromResponse(response);

        if (emailVerified === false && email) {
          this.userEmail = email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        this.handleLoginResponse();
      },
      error: () => {
        this.submitting = false;
      },
    });
  }

  private handleLoginResponse(): void {
    const user = this.roles.getCurrentUser();
    if (!user) {
      return;
    }

    // Skip approval status checks for admin users
    if (this.roles.isAdmin()) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }

    const approvalStatus = user.approvalStatus;
    const userType = user.userType ?? null;

    if (approvalStatus === LOGIN_STATUS.PENDING_REGISTRATION) {
      const registrationRoute = this.roles.getRegistrationRouteForUserType(userType);
      void this.router.navigateByUrl(registrationRoute);
      return;
    }

    if (approvalStatus === LOGIN_STATUS.PENDING_APPROVAL) {
      this.notifications.info('Admin still haven\'t reviewed your form. Please wait for approval.');
      return;
    }

    if (approvalStatus === LOGIN_STATUS.APPROVED) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }

    if (approvalStatus === LOGIN_STATUS.REJECTED) {
      this.notifications.error('The admin rejected your form. Please contact admin for more information.');
      return;
    }

    // Fallback: if no approval status, navigate to home (for backward compatibility)
    void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
  }

  forgotPassword(): void {
    this.notifications.info('Forgot password is not available yet. It will be added next.');
  }

  goToRegisterOptions(): void {
    void this.router.navigateByUrl('/register');
  }

  handleOtpSubmit(otp: string): void {
    const cleanedOtp = otp.trim();
    if (this.verifyingOtp || !cleanedOtp || !this.userEmail) {
      return;
    }

    this.verifyingOtp = true;
    this.auth
      .verifyOtp({ email: this.userEmail, otp: cleanedOtp }, { persistAuth: true })
      .subscribe({
        next: () => {
          this.verifyingOtp = false;
          this.showOtpModal = false;
          this.handleLoginResponse();
          this.cdr.detectChanges();
        },
        error: () => {
          this.verifyingOtp = false;
          this.cdr.detectChanges();
        },
      });
  }

  handleOtpCancel(): void {
    this.showOtpModal = false;
    this.cdr.detectChanges();
  }

  handleResendOtp(): void {
    if (this.resendingOtp || !this.userEmail) {
      return;
    }

    this.resendingOtp = true;
    this.auth.resendOtp(this.userEmail).subscribe({
      next: () => {
        this.resendingOtp = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.resendingOtp = false;
        this.cdr.detectChanges();
      },
    });
  }
}


