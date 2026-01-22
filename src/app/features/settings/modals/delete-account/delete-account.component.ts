import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AdminApiService } from '../../../admin/services/admin-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { Router } from '@angular/router';
import { ROUTES } from '../../../../core/config/app.constants';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.css',
})
export class DeleteAccountComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly adminApi = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly form: FormGroup;
  readonly submitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    // Pre-fill email from logged-in user
    const currentUser = this.auth.getCurrentUser();
    if (currentUser?.email) {
      this.form.patchValue({ email: currentUser.email });
    }
  }

  get emailInvalid(): boolean {
    const control = this.form.get('email');
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(event?: Event | MouseEvent): void {
    // Prevent default form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.get('email')?.value;
    if (!email) {
      this.notify.error('Email is required');
      return;
    }

    this.submitting.set(true);

    this.adminApi.deleteUserByEmail(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Your account has been deleted successfully.');
        
        // Close modal after a delay to show notification
        setTimeout(() => {
          this.form.reset();
          this.closed.emit();
          
          // Clear auth state (localStorage, tokens, user data) and redirect to login
          setTimeout(() => {
            // Clear all authentication data from localStorage and signals
            this.authState.clearAuth();
            
            // Navigate to login page
            this.router.navigateByUrl(ROUTES.LOGIN).then(() => {
              // Reload page to ensure clean state
              window.location.reload();
            });
          }, 500);
        }, 2000);
      },
      error: (error) => {
        this.submitting.set(false);
        
        // Extract error message from response if available
        let errorMessage = 'Failed to delete account. Please try again.';
        
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
