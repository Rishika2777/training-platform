import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

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
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]],
      bio: ['']
    });
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
