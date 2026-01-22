import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';

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

  readonly form: FormGroup;
  readonly submitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      stepsToReproduce: ['', [Validators.required]],
      expectedBehavior: ['', [Validators.required]],
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

  get stepsToReproduceInvalid(): boolean {
    const control = this.form.get('stepsToReproduce');
    return !!(control && control.invalid && control.touched);
  }

  get expectedBehaviorInvalid(): boolean {
    const control = this.form.get('expectedBehavior');
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

    // TODO: Implement API call to submit bug report
    setTimeout(() => {
      this.submitting.set(false);
      this.notify.success('Bug report submitted successfully! We will investigate it soon.');
      setTimeout(() => {
        this.form.reset();
        this.closed.emit();
      }, 1500);
    }, 1000);
  }

  onCancel(): void {
    this.form.reset();
    this.closed.emit();
  }
}
