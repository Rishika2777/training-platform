import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import { ReportType } from '../../../admin/models/admin-api.models';

@Component({
  selector: 'app-bug-report-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, TextareaComponent, ButtonComponent],
  templateUrl: './bug-report-form.component.html',
  styleUrl: './bug-report-form.component.css',
})
export class BugReportFormComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly authApi = inject(AuthApiService);

  readonly form: FormGroup;
  readonly submitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  get titleInvalid(): boolean {
    const control = this.form.get('title');
    return !!(control && control.invalid && control.touched);
  }

  get descriptionInvalid(): boolean {
    const control = this.form.get('description');
    return !!(control && control.invalid && control.touched);
  }

  
  onSubmit(event?: Event | MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const payload = {
      title: this.form.get('title')?.value ?? '',
      description: this.form.get('description')?.value ?? '',
      type: ReportType.BUG,
    };

    this.authApi.reportIssue(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Bug report submitted successfully! We will investigate it soon.');
        setTimeout(() => {
          this.form.reset();
          this.closed.emit();
        }, 1500);
      },
      error: () => {
        this.submitting.set(false);
        this.notify.error('Failed to submit bug report. Please try again.');
      },
    });
  }

  onCancel(): void {
    this.form.reset();
    this.closed.emit();
  }
}
