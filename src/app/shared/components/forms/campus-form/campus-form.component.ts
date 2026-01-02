import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';

export interface CampusFormValue {
  campusName: string;
  campusLogoUrl: string;
  campusLogoFiles: FileList | null;
  rank: string;

  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminDept: string;
  adminDesignation: string;

  website: string;
  about: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

@Component({
  selector: 'app-campus-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, TextareaComponent],
  templateUrl: './campus-form.component.html',
  styleUrl: './campus-form.component.css',
})
export class CampusFormComponent {
  @Input() submitting = false;
  @Input() title = 'Campus Registration';
  @Input() mode: 'create' | 'review' = 'create';
  @Input() adminEmailLocked = false;
  @Input() approveDisabled = false;
  @Input() isEditMode = false;

  @Input() value: CampusFormValue = {
    campusName: '',
    campusLogoUrl: '',
    campusLogoFiles: null,
    rank: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminDept: '',
    adminDesignation: '',
    website: '',
    about: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  };

  @Output() valueChange = new EventEmitter<CampusFormValue>();
  @Output() submitted = new EventEmitter<CampusFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();

  submitAttempted = false;

  get isReviewMode(): boolean {
    return this.mode === 'review';
  }

  get isFieldsDisabled(): boolean {
    return this.submitting || (this.isReviewMode && !this.isEditMode);
  }

  patch(patch: Partial<CampusFormValue>): void {
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    const next: CampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  isInvalid(
    field:
      | 'campusName'
      | 'campusLogoFiles'
      | 'rank'
      | 'adminName'
      | 'adminEmail'
      | 'adminPhone'
      | 'adminDept'
      | 'adminDesignation'
      | 'website'
      | 'about'
      | 'address'
  ): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    if (field === 'campusLogoFiles') {
      return !this.value.campusLogoFiles || this.value.campusLogoFiles.length === 0;
    }
    if (field === 'adminPhone') {
      return this.isAdminPhoneInvalid();
    }
    const raw = this.value[field];
    return typeof raw !== 'string' || raw.trim().length === 0;
  }

  isAdminPhoneInvalid(): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const phone = this.value.adminPhone.trim();
    if (phone.length === 0) {
      return true;
    }
    // Check if phone is exactly 10 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length !== 10;
  }

  isAdminPhoneNotTenDigits(): boolean {
    const phone = this.value.adminPhone.trim();
    if (phone.length === 0) {
      return false;
    }
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length !== 10;
  }

  private isFormValid(): boolean {
    const isEditModeValidation = this.isReviewMode && this.isEditMode;
    return (
      !this.isInvalid('campusName') &&
      (isEditModeValidation || !this.isInvalid('campusLogoFiles')) &&
      !this.isInvalid('rank') &&
      !this.isInvalid('adminName') &&
      !this.isInvalid('adminEmail') &&
      !this.isInvalid('adminPhone') &&
      !this.isInvalid('adminDept') &&
      !this.isInvalid('adminDesignation') &&
      !this.isInvalid('website') &&
      !this.isInvalid('about') &&
      !this.isInvalid('address')
    );
  }

  submit(): void {
    // In review mode, use explicit Approve/Reject buttons instead of form submit validation.
    // But allow submission when edit mode is enabled.
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    this.submitAttempted = true;
    if (!this.isFormValid()) {
      return;
    }
    this.submitted.emit(this.value);
  }

  approve(): void {
    if (!this.isReviewMode) {
      return;
    }
    this.reviewAction.emit('APPROVED');
  }

  reject(): void {
    if (!this.isReviewMode) {
      return;
    }
    this.reviewAction.emit('REJECTED');
  }
}


