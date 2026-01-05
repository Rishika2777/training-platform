import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { RegistrationUserType } from '../../models/registration.models';
import { VerifyOtpComponent } from '../../components/verify-otp/verify-otp.component';

interface Option {
  label: string;
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
  imports: [CommonModule, ButtonComponent, ModalComponent, VerifyOtpComponent],
  templateUrl: './register-options.component.html',
  styleUrl: './register-options.component.css',
})
export class RegisterOptionsComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  submitting = false;
  verifyingOtp = false;
  resendingOtp = false;
  showOtpModal = false;
  pendingRoute: string | null = null;
  userEmail = '';
  selectedUserType: RegistrationUserType | null = null;

  readonly options: readonly Option[] = [
    { label: 'Campus', userType: 'CAMPUS', route: '/register-campus' },
    { label: 'Student', userType: 'STUDENT', route: '/register-student' },
    { label: 'Company', userType: 'COMPANY', route: '/register-company' },
  ];

  select(option: Option): void {
    if (this.submitting) {
      return;
    }
    const draft = this.auth.getRegistrationData();
    if (!draft) {
      void this.router.navigateByUrl('/register');
      return;
    }

    this.submitting = true;
    this.userEmail = draft.email;
    this.pendingRoute = option.route;
    this.selectedUserType = option.userType;
    
    this.auth
      .register(
        {
          email: draft.email,
          phoneNumber: generateRandomPhoneNumber(),
          password: draft.password,
          confirmPassword: draft.confirmPassword,
          userType: option.userType,
        },
        { persistAuth: false },
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          // Open OTP verification modal after registering
          this.showOtpModal = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
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
          if (this.pendingRoute) {
            void this.router.navigateByUrl(this.pendingRoute);
            this.pendingRoute = null;
            this.selectedUserType = null;
          }
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
    this.cdr.detectChanges();
  }

  handleResendOtp(): void {
    if (this.resendingOtp) {
      return;
    }

    const draft = this.auth.getRegistrationData();
    if (!draft) {
      return;
    }

    this.resendingOtp = true;
    this.auth.resendOtp(draft.email).subscribe({
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


