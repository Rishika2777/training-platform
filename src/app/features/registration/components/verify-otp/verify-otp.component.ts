import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css',
})
export class VerifyOtpComponent {
  @Input() submitting = false;
  @Input() email = '';

  @Output() submitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() resendOtp = new EventEmitter<void>();

  @Input() resending = false;

  otp = '';

  onOtpChange(value: string): void {
    this.otp = value;
  }

  submit(): void {
    if (!this.otp.trim() || this.submitting) {
      return;
    }
    this.submitted.emit(this.otp.trim());
  }

  cancel(): void {
    this.cancelled.emit();
  }

  onResendOtp(): void {
    if (this.resending || this.submitting) {
      return;
    }
    this.resendOtp.emit();
  }
}

