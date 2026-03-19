import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import { isValidUrl } from '../../../../core/validators/url.validator';

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
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, TextareaComponent],
  templateUrl: './campus-form.component.html',
  styleUrl: './campus-form.component.css',
})
export class CampusFormComponent implements OnChanges {
  @Input() submitting = false;
  @Input() title = 'Campus Registration';
  @Input() mode: 'create' | 'review' | 'edit' = 'create';
  @Input() adminEmailLocked = false;
  @Input() approveDisabled = false;
  @Input() isEditMode = false;
  @Input() verifiedPhoneNumber: string | null = null; // Phone number that has been verified

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
  @Output() verifyPhone = new EventEmitter<{ phoneNumber: string; fieldType: 'mobile' | 'adminPhone' | 'phone' }>();

  submitAttempted = false;

  get isReviewMode(): boolean {
    return this.mode === 'review';
  }

  get isFieldsDisabled(): boolean {
    return this.submitting || (this.isReviewMode && !this.isEditMode);
  }

  /**
   * Extract file name from URL for display
   */
  getExistingImageFileName(): string | undefined {
    if (!this.value.campusLogoUrl || this.value.campusLogoUrl.trim().length === 0) {
      return undefined;
    }
    
    try {
      const url = this.value.campusLogoUrl.trim();
      // Extract filename from URL
      // Handle both full URLs and relative paths
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      
      // Remove query parameters if any
      const cleanFileName = fileName.split('?')[0];
      
      // If it looks like a valid filename (has extension), return it
      if (cleanFileName && cleanFileName.includes('.')) {
        return cleanFileName;
      }
      
      // If no extension, return a generic name
      return 'Existing Image';
    } catch {
      return 'Existing Image';
    }
  }

  /**
   * Check if file upload is required
   * In edit mode, if there's an existing image, file is not required
   */
  get isFileRequired(): boolean {
    // In edit mode or when mode is 'edit', if there's an existing image, file is optional
    const isInEditMode = this.isEditMode || this.mode === 'edit';
    if (isInEditMode && this.value.campusLogoUrl && this.value.campusLogoUrl.trim().length > 0) {
      return false;
    }
    // In create mode or if no existing image, file is required
    return true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When value input changes from parent (e.g., when loading profile data), sync internal state
    if (changes['value']) {
      const newValue = changes['value'].currentValue;
      if (newValue) {
        // Create a deep copy to ensure Angular detects the change
        // Preserve campusLogoFiles if parent provides it (user just selected a file).
        // Only fall back to null when parent doesn't include a FileList (e.g., loading profile data).
        this.value = {
          campusName: newValue.campusName ?? '',
          campusLogoUrl: newValue.campusLogoUrl ?? '',
          campusLogoFiles: newValue.campusLogoFiles ?? this.value.campusLogoFiles ?? null,
          rank: newValue.rank ?? '',
          adminName: newValue.adminName ?? '',
          adminEmail: newValue.adminEmail ?? '',
          adminPhone: newValue.adminPhone ?? '',
          adminDept: newValue.adminDept ?? '',
          adminDesignation: newValue.adminDesignation ?? '',
          website: newValue.website ?? '',
          about: newValue.about ?? '',
          address: newValue.address ?? '',
          city: newValue.city ?? '',
          state: newValue.state ?? '',
          pincode: newValue.pincode ?? '',
        };
      }
    }
  }

  patch(patch: Partial<CampusFormValue>): void {
    // sanitize campus rank
if (patch.rank !== undefined) {
  // allow digits only
  const cleaned = patch.rank.replace(/\D/g, '');

  if (!cleaned) {
    patch.rank = '';
  } else {
    const num = Number(cleaned);

    // block 0 & negative
    patch.rank = num < 1 ? '1' : cleaned;
  }
}

    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    const next: CampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  isRankInvalid(): boolean {
  if (!this.submitAttempted) return false;

  const rank = Number(this.value.rank);

  return !Number.isInteger(rank) || rank < 1;
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
      // In edit mode or when mode is 'edit', if there's an existing image, file is not required
      const isInEditMode = this.isEditMode || this.mode === 'edit';
      if (isInEditMode && this.value.campusLogoUrl && this.value.campusLogoUrl.trim().length > 0) {
        return false;
      }
      // If file is not required (edit mode with existing image), don't show as invalid
      if (isInEditMode && !this.isFileRequired) {
        return false;
      }
      // Otherwise, file is required
      return !this.value.campusLogoFiles || this.value.campusLogoFiles.length === 0;
    }
    if (field === 'rank') {
  return this.isRankInvalid();
}
    if (field === 'adminPhone') {
      return this.isAdminPhoneInvalid();
    }
    if (field === 'website') {
      const raw = this.value.website ?? '';
      const trimmed = raw.trim();
      if (trimmed.length === 0) return true;
      return !isValidUrl(trimmed);
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
    // In edit mode, file is only required if there's no existing image
    const fileValid = isEditModeValidation 
      ? !!(this.value.campusLogoUrl && this.value.campusLogoUrl.trim().length > 0) || 
        !!(this.value.campusLogoFiles && this.value.campusLogoFiles.length > 0)
      : !this.isInvalid('campusLogoFiles');
    
    return (
      !this.isInvalid('campusName') &&
      fileValid &&
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
    const rank = Number(this.value.rank);

if (!Number.isInteger(rank) || rank < 1) {
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


