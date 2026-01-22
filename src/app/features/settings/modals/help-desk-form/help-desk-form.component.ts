import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-help-desk-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, TextareaComponent, ButtonComponent],
  templateUrl: './help-desk-form.component.html',
  styleUrl: './help-desk-form.component.css',
})
export class HelpDeskFormComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly form: FormGroup;
  readonly submitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  get titleInvalid(): boolean {
    const control = this.form.get('title');
    return !!(control && control.invalid && control.touched);
  }

  get subjectInvalid(): boolean {
    const control = this.form.get('subject');
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

    // TODO: Implement API call to submit help desk request
    setTimeout(() => {
      this.submitting.set(false);
      this.notify.success('Your support request has been submitted! We will get back to you soon.');
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
