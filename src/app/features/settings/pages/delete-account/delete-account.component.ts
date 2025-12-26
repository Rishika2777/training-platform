import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.css',
})
export class DeleteAccountComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  deleteForm: FormGroup;

  constructor() {
    this.deleteForm = this.fb.group({
      reason: [''],
      password: ['', Validators.required],
      confirmDelete: [false, Validators.requiredTrue]
    });
  }

  onSubmit(): void {
    if (this.deleteForm.valid && this.deleteForm.get('confirmDelete')?.value) {
      const confirmMessage = 'Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.';
      if (confirm(confirmMessage)) {
        console.log('Account deletion request:', this.deleteForm.value);
        // TODO: Implement API call to delete account
        alert('Your account deletion request has been submitted. Your account will be deleted within 30 days.');
        // TODO: Logout and redirect to home/login
        // this.router.navigate(['/']);
      }
    }
  }

  onCancel(): void {
    this.deleteForm.reset();
  }
}
