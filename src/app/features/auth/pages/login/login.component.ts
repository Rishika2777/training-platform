import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { getFirebaseAuth } from '../../../../core/firebase/firebase-utils';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { VerifyOtpComponent } from '../../../../shared/components/verify-otp/verify-otp.component';
import { AuthFacadeService } from '../../services/auth-facade.service';
import { UserType } from '../../../../core/config/app.constants';

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
  private readonly notifications = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authFacade = inject(AuthFacadeService);

  submitting = false;
  verifyingOtp = false;
  resendingOtp = false;
  showOtpModal = false;
  userEmail = '';
  showForgotPasswordModal = false;
  submittingForgotPassword = false;
  googleSigningIn = false;
  showUserTypeModal = false;
  googleIdToken: string | null = null;

  readonly form: LoginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly forgotPasswordForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  submit(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    const payload = this.form.getRawValue();
    // Convert email to lowercase before submission
    payload.email = payload.email.toLowerCase();

    this.auth.login(payload).subscribe({
      next: (response) => {
        this.submitting = false;
        const otpDecision = this.authFacade.getOtpDecisionFromResponse(response);
        if (otpDecision.needsOtp) {
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        this.authFacade.navigateAfterLogin();
      },
      error: (err: unknown) => {
        this.submitting = false;
        const otpDecision = this.authFacade.getOtpDecisionFromError(err);
        if (otpDecision?.needsOtp) {
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        // For other errors, let the error interceptor handle the notification
        this.cdr.detectChanges();
      },
    });
  }

  forgotPassword(): void {
    // Pre-fill email from login form if available
    const loginEmail = this.form.controls.email.value;
    if (loginEmail) {
      this.forgotPasswordForm.controls.email.setValue(loginEmail);
    } else {
      this.forgotPasswordForm.controls.email.setValue('');
    }
    this.showForgotPasswordModal = true;
    this.cdr.detectChanges();
  }

  handleForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid || this.submittingForgotPassword) {
      return;
    }

    this.submittingForgotPassword = true;
    const email = this.forgotPasswordForm.controls.email.value.toLowerCase().trim();

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.submittingForgotPassword = false;
        this.showForgotPasswordModal = false;
        this.forgotPasswordForm.reset();
        this.notifications.success('Password reset token generated. Please check your email.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.submittingForgotPassword = false;
        this.cdr.detectChanges();
      },
    });
  }

  handleForgotPasswordCancel(): void {
    this.showForgotPasswordModal = false;
    this.forgotPasswordForm.reset();
    this.cdr.detectChanges();
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
      .verifyOtp({ email: this.userEmail.toLowerCase(), otp: cleanedOtp }, { persistAuth: true })
      .subscribe({
        next: () => {
          this.verifyingOtp = false;
          this.showOtpModal = false;
          this.authFacade.navigateAfterLogin();
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
    this.auth.resendOtp(this.userEmail.toLowerCase()).subscribe({
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

  async signInWithGoogle(): Promise<void> {
    if (this.submitting || this.googleSigningIn) {
      return;
    }
    this.googleSigningIn = true;
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(credential);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      const email = credential.user?.email?.trim()?.toLowerCase();
      if (!email) {
        this.notifications.error('Google account did not provide an email address.');
        return;
      }
      const idToken = await credential.user.getIdToken();
      if (!idToken || idToken.trim().length === 0) {
        this.notifications.error('Failed to retrieve Google authentication token. Please try again.');
        return;
      }
      console.log('✅ Google Sign-In Success:', { email, idTokenLength: idToken.length, isNewUser });

      // Store the token and try to login with each userType to find existing user
      this.googleIdToken = idToken.trim();
      this.userEmail = email;

      // Firebase isNewUser: true = first-time sign-in (new account), false = returning user
      if (isNewUser) {
        // Brand new Firebase user - skip API calls, go directly to user type selection (registration)
        this.showUserTypeModal = true;
        this.cdr.detectChanges();
      } else {
        // Existing Firebase user - try to find their account in our backend
        await this.tryGoogleLoginWithUserTypes();
      }
      
    } catch (error: unknown) {
      console.error('❌ Google Sign-In Error:', error);
      
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = (error as { message?: string })?.message || '';
      
      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        const currentOrigin = window.location.origin;
        this.notifications.error(
          `Google sign-in is not authorized for this domain (${currentOrigin}). ` +
          `Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (errorCode === 'auth/popup-blocked') {
        this.notifications.error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (errorCode === 'auth/popup-closed-by-user') {
        // User closed popup - don't show error
      } else if (errorCode === 'auth/network-request-failed') {
        this.notifications.error('Network error. Please check your internet connection and try again.');
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        this.notifications.error('An account already exists with the same email address but different sign-in credentials.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        this.notifications.error('Google sign-in is not enabled. Please contact support.');
      } else if (errorCode === 'auth/invalid-credential') {
        this.notifications.error('Invalid credentials. Please try again.');
      } else {
        this.notifications.error('Google sign-in failed. Please try again.');
      }
    } finally {
      this.googleSigningIn = false;
      this.cdr.detectChanges();
    }
  }

  private async tryGoogleLoginWithUserTypes(): Promise<void> {
    if (!this.googleIdToken) {
      return;
    }

    // Store in local variable to satisfy TypeScript null check
    const idToken = this.googleIdToken;
    const userTypes: UserType[] = ['STUDENT', 'CAMPUS', 'COMPANY'];
    let userFound = false;

    // Try each userType sequentially to find existing user
    for (const userType of userTypes) {
      if (this.submitting || userFound) {
        break;
      }

      try {
        const requestPayload = {
          idToken: idToken,
          userType: userType,
        };

        console.log(`🔍 Trying Google login with userType: ${userType}`);

        // Convert observable to promise for easier sequential handling
        const response = await firstValueFrom(this.auth.googleLogin(requestPayload));
        
        // Success! User exists with this userType
        console.log(`✅ User found with userType: ${userType}`);
        userFound = true;
        this.googleIdToken = null;

        // Check if OTP verification is needed
        const otpDecision = this.authFacade.getOtpDecisionFromResponse(response);
        if (otpDecision.needsOtp) {
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        // Use the same navigation logic as manual registration/login
        this.authFacade.navigateAfterLogin();
        this.cdr.detectChanges();
        return;

      } catch (err: unknown) {
        // Check if OTP is needed from error response
        const otpDecision = this.authFacade.getOtpDecisionFromError(err);
        if (otpDecision?.needsOtp) {
          console.log(`✅ User found (needs OTP) with userType: ${userType}`);
          userFound = true;
          this.googleIdToken = null;
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        // User doesn't exist with this userType, try next one
        console.log(`❌ User not found with userType: ${userType}, trying next...`);
        continue;
      }
    }

    // If we tried all userTypes and none worked, user doesn't exist - show selection modal
    if (!userFound) {
      console.log('ℹ️ User not found with any userType, showing selection modal for registration');
      this.showUserTypeModal = true;
      this.cdr.detectChanges();
    }
  }

  handleUserTypeSelection(userType: UserType): void {
    if (!this.googleIdToken || this.submitting) {
      return;
    }

    this.submitting = true;
    this.showUserTypeModal = false;

    const requestPayload = {
      idToken: this.googleIdToken,
      userType: userType,
    };

    this.auth.googleLogin(requestPayload).subscribe({
      next: (response) => {
        this.submitting = false;
        this.googleIdToken = null;

        // Check if OTP verification is needed (same logic as regular login)
        const otpDecision = this.authFacade.getOtpDecisionFromResponse(response);
        if (otpDecision.needsOtp) {
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        // Use the same navigation logic as manual registration/login
        // This checks approvalStatus, emailVerified, onboardingFormSubmit, etc.
        // It will NOT blindly redirect to registration form or home page
        this.authFacade.navigateAfterLogin();
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.googleIdToken = null;
        
        // Check if OTP is needed from error response
        const otpDecision = this.authFacade.getOtpDecisionFromError(err);
        if (otpDecision?.needsOtp) {
          this.userEmail = otpDecision.email;
          this.showOtpModal = true;
          this.handleResendOtp();
          this.cdr.detectChanges();
          return;
        }

        // For other errors, let the error interceptor handle the notification
        this.cdr.detectChanges();
      },
    });
  }

  handleUserTypeModalCancel(): void {
    this.showUserTypeModal = false;
    this.googleIdToken = null;
    this.cdr.detectChanges();
  }
}


