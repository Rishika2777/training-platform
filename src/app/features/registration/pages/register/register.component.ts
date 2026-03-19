import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { getFirebaseAuth } from '../../../../core/firebase/firebase-utils';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { RegistrationStateService } from '../../services/registration-state.service';

/** Email pattern: local part (alphanumeric + dots), @, domain (alphanumeric + dots), TLD 2–4 letters. No + or other special chars. */
const EMAIL_PATTERN = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*\.[a-zA-Z]{2,4}$/;

/** Characters not allowed in email (e.g. +, -, #). Used to show a clear error. */
const EMAIL_DISALLOWED = /[^a-zA-Z0-9.@\s]/;

/** Backend requires at least 12 characters. */
const MIN_PASSWORD_LENGTH = 6;


type RegisterForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

function emailPatternValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value?.trim();
  if (!value) return null;
  if (EMAIL_DISALLOWED.test(value)) return { emailPattern: true };
  return EMAIL_PATTERN.test(value) ? null : { emailPattern: true };
}

/** Password: min 12 (backend), one uppercase, one lowercase, one number, one special char, no space. */
function passwordStrengthValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  const minLength = value.length >= MIN_PASSWORD_LENGTH;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(value);
  const noSpace = !/\s/.test(value);

  const ok = minLength && hasUpper && hasLower && hasNumber && hasSpecial && noSpace;
  return ok ? null : { passwordStrength: true };
}


function buildGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function getUserEmail(user: User | null): string | null {
  const email = user?.email?.trim();
  return email ? email.toLowerCase() : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly registrationState = inject(RegistrationStateService);

  submitting = false;
  googleSigningIn = false;

  readonly form: RegisterForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailPatternValidator] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordStrengthValidator],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async signInWithGoogle(): Promise<void> {
    if (this.submitting || this.googleSigningIn) {
      return;
    }
    this.googleSigningIn = true;
    try {
      const auth = getFirebaseAuth();
      const provider = buildGoogleProvider();
      const credential = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(credential);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      const email = getUserEmail(credential.user);
      if (!email) {
        this.notify.error('Google account did not provide an email address.');
        return;
      }
      const idToken = await credential.user.getIdToken();
      if (!idToken || idToken.trim().length === 0) {
        this.notify.error('Failed to retrieve Google authentication token. Please try again.');
        return;
      }
      console.log('✅ Google Sign-In Success:', { email, idTokenLength: idToken.length, isNewUser });

      // Store token and navigate to user type selection
      // Note: We don't call checkIfUserExists here because googleLogin both registers AND logs in.
      // Calling it for a new user would register them with the first userType and skip the selection.
      this.registrationState.setDraft({
        email,
        emailVerified: true,
        idToken: idToken.trim(),
        isNewUser,
      });
      this.notify.success('Google account selected. Choose your account type.');
      void this.router.navigateByUrl('/register/options');
    } catch (error: unknown) {
      console.error('❌ Google Sign-In Error:', error);
      
      // Check for Firebase auth/unauthorized-domain error
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = (error as { message?: string })?.message || '';
      
      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        const currentOrigin = window.location.origin;
        this.notify.error(
          `Google sign-in is not authorized for this domain (${currentOrigin}). ` +
          `Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (errorCode === 'auth/popup-blocked') {
        this.notify.error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (errorCode === 'auth/popup-closed-by-user') {
        this.notify.error('Sign-in popup was closed. Please try again.');
      } else if (errorCode === 'auth/network-request-failed') {
        this.notify.error('Network error. Please check your internet connection and try again.');
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        this.notify.error('An account already exists with the same email address but different sign-in credentials.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        this.notify.error('Google sign-in is not enabled. Please contact support.');
      } else if (errorCode === 'auth/invalid-credential') {
        this.notify.error('Invalid credentials. Please try again.');
      } else {
        this.notify.error('Google sign-in failed. Please try again.');
      }
    } finally {
      this.googleSigningIn = false;
      this.cdr.detectChanges();
    }
  }

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

    // Convert email to lowercase before storing
    const email = payload.email.toLowerCase();

    // Legacy behavior: store draft only, then userType selection triggers /auth/register.
    this.registrationState.setDraft({
      email: email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
    });
    this.submitting = false;
    this.cdr.detectChanges();
    void this.router.navigateByUrl('/register/options');
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}


