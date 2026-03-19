import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, RegisterRequest, RegistrationDraft } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { RegistrationUserType } from '../../models/registration.models';
import { VerifyOtpComponent } from '../../../../shared/components/verify-otp/verify-otp.component';
import { RegistrationStateService } from '../../services/registration-state.service';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';

interface Option {
  label: string;
  displayLabel: string;
  userType: RegistrationUserType;
  route: string;
}

function generateRandomPhoneNumber(): string {
  const nineDigits = Math.floor(100000000 + Math.random() * 900000000);
  return `9${nineDigits}`;
}

@Component({
  selector: 'app-register-options',
  standalone: true,
  imports: [CommonModule, ModalComponent, VerifyOtpComponent],
  templateUrl: './register-options.component.html',
  styleUrl: './register-options.component.css',
})
export class RegisterOptionsComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly registrationState = inject(RegistrationStateService);
  private readonly notify = inject(NotificationService);
  private readonly roles = inject(RoleService);
  private readonly authFacade = inject(AuthFacadeService);

  submitting = false;
  verifyingOtp = false;
  resendingOtp = false;
  showOtpModal = false;
  pendingRoute: string | null = null;
  userEmail = '';
  selectedUserType: RegistrationUserType | null = null;
  isGoogleLogin = false; // Track if OTP is for Google login vs manual registration

  readonly options: readonly Option[] = [
    { label: 'Campus', displayLabel: 'Institute', userType: 'CAMPUS', route: '/register/campus' },
    { label: 'Student', displayLabel: 'Aspirants', userType: 'STUDENT', route: '/register/student' },
    { label: 'Company', displayLabel: 'Employer/Recruiter', userType: 'COMPANY', route: '/register/company' },
  ];

  select(option: Option): void {
    if (this.submitting) {
      return;
    }
    const draft = this.registrationState.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/register');
      return;
    }

    this.submitting = true;
    const email = draft.email.toLowerCase();
    this.userEmail = email;
    this.pendingRoute = option.route;
    this.selectedUserType = option.userType;

    if (draft.idToken && draft.idToken.trim().length > 0) {
      const requestPayload = {
        idToken: draft.idToken.trim(),
        userType: option.userType as 'CAMPUS' | 'COMPANY' | 'STUDENT',
      };
      console.log('🔐 Google Login Request:', { userType: requestPayload.userType, idTokenLength: requestPayload.idToken.length });
      
      this.auth
        .googleLogin(requestPayload)
        .subscribe({
          next: (response) => {
            this.submitting = false;
            this.registrationState.clearDraft();
            
            // Check if OTP verification is needed (same logic as regular login)
            const otpDecision = this.authFacade.getOtpDecisionFromResponse(response);
            if (otpDecision.needsOtp) {
              this.userEmail = otpDecision.email;
              this.isGoogleLogin = true; // Mark as Google login flow
              this.showOtpModal = true;
              this.handleResendOtp();
              this.cdr.detectChanges();
              return;
            }

            // Use the same navigation logic as manual registration/login
            // This checks approvalStatus, emailVerified, onboardingFormSubmit, etc.
            this.authFacade.navigateAfterLogin();
            this.cdr.detectChanges();
          },
          error: (err: unknown) => {
            this.submitting = false;
            this.cdr.detectChanges();
            console.error('❌ Google Login Error:', err);
            
            if (err instanceof HttpErrorResponse) {
              console.error('Error details:', {
                status: err.status,
                statusText: err.statusText,
                error: err.error,
                url: err.url,
              });
              
              // Handle specific error cases
              if (err.status === 400) {
                this.notify.error('Invalid Google token. Please try signing in again.');
                void this.router.navigateByUrl('/register');
                return;
              }
              if (err.status === 401 || err.status === 403) {
                const message = this.getRegisterErrorMessage(err);
                this.notify.error(message);
                return;
              }
              if (err.status === 500) {
                const errorBody = err.error as { message?: string; data?: unknown };
                const errorMsg = errorBody?.message || 'Server error during Google sign-in. Please try again.';
                this.notify.error(errorMsg);
                console.error('Server error response:', errorBody);
                return;
              }
            }
            
            const message = this.getRegisterErrorMessage(err);
            this.notify.error(message);
          },
        });
      return;
    }

    this.auth
      .register(this.buildRegisterRequest(draft, option.userType), { persistAuth: false })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.isGoogleLogin = false; // Mark as manual registration flow
          this.showOtpModal = true;
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          this.submitting = false;
          this.cdr.detectChanges();
          const message = this.getRegisterErrorMessage(err);
          this.notify.error(message);
          if (err instanceof HttpErrorResponse && err.status === 400) {
            void this.router.navigateByUrl('/register');
          }
        },
      });
  }

  private buildRegisterRequest(draft: RegistrationDraft, userType: RegistrationUserType): RegisterRequest {
    const request: RegisterRequest = {
      email: draft.email.toLowerCase(),
      phoneNumber: generateRandomPhoneNumber(),
      userType: userType,
      emailVerified: draft.emailVerified === true,
    };
    if (draft.password && draft.confirmPassword) {
      request.password = draft.password;
      request.confirmPassword = draft.confirmPassword;
    }
    return request;
  }

  private getRegisterErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse) || !err.error || typeof err.error !== 'object') {
      return 'Registration failed. Please try again.';
    }
    const body = err.error as { message?: string; data?: Record<string, string> };
    if (body.data && typeof body.data === 'object') {
      const messages = Object.values(body.data).filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
    return 'Registration failed. Please try again.';
  }

  handleOtpSubmit(otp: string): void {
    const cleanedOtp = otp.trim();
    if (this.verifyingOtp || !cleanedOtp || !this.userEmail) {
      return;
    }

    this.verifyingOtp = true;
    this.auth
      .verifyOtp({ email: this.userEmail.toLowerCase(), otp: cleanedOtp }, { persistAuth: true })
      .subscribe({
        next: () => {
          this.verifyingOtp = false;
          this.showOtpModal = false;
          
          if (this.isGoogleLogin) {
            // Google login flow - use same navigation logic as login
            // This checks approvalStatus, emailVerified, onboardingFormSubmit, etc.
            this.authFacade.navigateAfterLogin();
          } else if (this.pendingRoute) {
            // Manual registration flow - navigate to registration form
            void this.router.navigateByUrl(this.pendingRoute);
          }
          
          // Reset state
          this.pendingRoute = null;
          this.selectedUserType = null;
          this.isGoogleLogin = false;
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
    this.pendingRoute = null;
    this.selectedUserType = null;
    this.isGoogleLogin = false;
    this.cdr.detectChanges();
  }

  handleResendOtp(): void {
    if (this.resendingOtp) {
      return;
    }

    const draft = this.registrationState.getDraft();
    if (!draft) {
      return;
    }

    this.resendingOtp = true;
    this.auth.resendOtp(draft.email.toLowerCase()).subscribe({
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

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}


