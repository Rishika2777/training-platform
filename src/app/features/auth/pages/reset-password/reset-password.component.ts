import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ROUTES } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

const MIN_PASSWORD_LENGTH = 6;

/** Min 6 chars, one uppercase, one lowercase, one number, one special character, no spaces. */
function passwordStrength(control: AbstractControl): { passwordStrength: true } | null {
  const v = control.value as string;
  if (!v || typeof v !== 'string') return null;
  if (v.length < MIN_PASSWORD_LENGTH) return { passwordStrength: true };
  if (!/[A-Z]/.test(v)) return { passwordStrength: true };
  if (!/[a-z]/.test(v)) return { passwordStrength: true };
  if (!/[0-9]/.test(v)) return { passwordStrength: true };
  if (!/[^\w\s]/.test(v)) return { passwordStrength: true };
  if (/\s/.test(v)) return { passwordStrength: true };
  return null;
}

type ResetPasswordForm = FormGroup<{
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

function matchPasswords(group: AbstractControl): { mismatch: true } | null {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirmPassword')?.value as string | undefined;
  if (!password || !confirm) return null;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loginRoute = ROUTES.LOGIN;
  /** From reset link path: /reset-password/:userId */
  userId: string | null = null;
  /** From query: ?token=... (legacy) */
  token: string | null = null;
  submitting = false;
  invalidToken = false;

  readonly form: ResetPasswordForm = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH), passwordStrength],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: matchPasswords }
  );

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const uid = params.get('userId');
      this.userId = typeof uid === 'string' && uid.trim().length > 0 ? uid.trim() : null;
      this.updateInvalidToken();
      this.cdr.detectChanges();
    });
    this.route.queryParams.subscribe((params) => {
      const t = params['token'];
      this.token = typeof t === 'string' && t.trim().length > 0 ? t.trim() : null;
      this.updateInvalidToken();
      this.cdr.detectChanges();
    });
  }

  private updateInvalidToken(): void {
    this.invalidToken = !this.userId && !this.token;
  }

  save(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }
    const password = this.form.controls.password.value;
    const confirmPassword = this.form.controls.confirmPassword.value;

    if (this.userId) {
      this.submitResetByUserId(password, confirmPassword);
    } else if (this.token) {
      this.submitResetByToken(password);
    }
  }

  private submitResetByUserId(password: string, confirmPassword: string): void {
    if (!this.userId) return;
    this.submitting = true;
    this.auth.resetPasswordByUserId(this.userId, { password, confirmPassword }).subscribe({
      next: () => {
        this.submitting = false;
        this.notifications.success('Password updated. You can sign in with your new password.');
        void this.router.navigateByUrl(this.loginRoute);
        this.cdr.detectChanges();
      },
      error: () => {
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private submitResetByToken(password: string): void {
    if (!this.token) return;
    this.submitting = true;
    this.auth.resetPassword(this.token, password).subscribe({
      next: () => {
        this.submitting = false;
        this.notifications.success('Password updated. You can sign in with your new password.');
        void this.router.navigateByUrl(this.loginRoute);
        this.cdr.detectChanges();
      },
      error: () => {
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToLogin(): void {
    void this.router.navigateByUrl(this.loginRoute);
  }
}
