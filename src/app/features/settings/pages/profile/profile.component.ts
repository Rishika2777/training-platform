import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const phone = String(control.value).trim();
  if (phone.length === 0) {
    return null;
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return { phoneNumber: { value: control.value } };
  }
  return null;
}

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, InputComponent, TextareaComponent, ButtonComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileSettingsComponent {
  private readonly fb = inject(FormBuilder);
  profileForm: FormGroup;
  selectedFile: File | null = null;

  constructor() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneNumberValidator]],
      bio: ['']
    });
  }

  isPhoneInvalid(): boolean {
    const phoneControl = this.profileForm.get('phone');
    return !!(phoneControl && phoneControl.invalid && phoneControl.touched);
  }

  isPhoneNotTenDigits(): boolean {
    const phoneControl = this.profileForm.get('phone');
    if (!phoneControl || !phoneControl.value || !phoneControl.touched) {
      return false;
    }
    const phone = String(phoneControl.value).trim();
    if (phone.length === 0) {
      return false;
    }
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length !== 10;
  }

  onFileChange(files: FileList): void {
    const file = files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      const formData = {
        ...this.profileForm.value,
        avatar: this.selectedFile
      };
      console.log('Profile update request:', formData);
      // TODO: Implement API call to update profile
      alert('Profile updated successfully!');
    }
  }

  onCancel(): void {
    this.profileForm.reset();
    this.selectedFile = null;
  }
}
