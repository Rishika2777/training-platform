import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import { isValidUrl } from '../../../../core/validators/url.validator';

export interface KeyPersonValue {
  name: string;
  designation: string;
  photo: File | null;
  photoUrl?: string; // URL from API response
}

export interface CompanyFormValue {
  companyName: string;
  companyPhoto: File | null;
  companyPhotoUrl?: string; // URL from API response

  adminName: string;
  adminDesignation: string;
  adminEmail: string;
  adminPhone: string;

  companyWebsiteUrl: string;
  otherWebsiteUrl: string;
  registerNumber: string;

  keyPeople: KeyPersonValue[];

  aboutCompany: string;
  companyAddress: string;
}

const MIN_PHOTO_WIDTH = 300;
const MIN_PHOTO_HEIGHT = 300;

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, TextareaComponent],
  templateUrl: './company-form.component.html',
  styleUrl: './company-form.component.css',
})
export class CompanyFormComponent {
  @Input() title: string | null = null;
  @Input() mode: 'create' | 'edit' | 'review' = 'create';
  @Input() submitting = false;
  @Input() adminEmailLocked = false;
  @Input() approveDisabled = false;
  @Input() isEditMode = false;
  @Input() value: CompanyFormValue = CompanyFormComponent.createEmptyValue();
  @Input() verifiedPhoneNumber: string | null = null; // Phone number that has been verified

  @Output() valueChange = new EventEmitter<CompanyFormValue>();
  @Output() submitted = new EventEmitter<CompanyFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();
  @Output() verifyPhone = new EventEmitter<{ phoneNumber: string; fieldType: 'mobile' | 'adminPhone' | 'phone' }>();

  submitAttempted = false;

  /** 300x300 validation: company photo */
  companyPhotoDimensionError: string | null = null;
  /** 300x300 validation: key person photos by index */
  keyPersonDimensionErrors: (string | null)[] = [];

  private readonly cdr = inject(ChangeDetectorRef);

  get isReviewMode(): boolean {
    return this.mode === 'review';
  }

  get isFieldsDisabled(): boolean {
    return this.submitting || (this.isReviewMode && !this.isEditMode);
  }

  static createEmptyKeyPerson(): KeyPersonValue {
    return { name: '', designation: '', photo: null, photoUrl: undefined };
  }

  static createEmptyValue(): CompanyFormValue {
    return {
      companyName: '',
      companyPhoto: null,
      companyPhotoUrl: undefined,

      adminName: '',
      adminDesignation: '',
      adminEmail: '',
      adminPhone: '',

      companyWebsiteUrl: '',
      otherWebsiteUrl: '',
      registerNumber: '',

      keyPeople: [CompanyFormComponent.createEmptyKeyPerson()],

      aboutCompany: '',
      companyAddress: '',
    };
  }

  patch(patch: Partial<CompanyFormValue>): void {
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    const next: CompanyFormValue = { ...this.value, ...patch };
    this.value = next;
    if (patch.keyPeople && patch.keyPeople.length !== this.keyPersonDimensionErrors.length) {
      const len = patch.keyPeople.length;
      this.keyPersonDimensionErrors = [...this.keyPersonDimensionErrors.slice(0, len)];
      while (this.keyPersonDimensionErrors.length < len) {
        this.keyPersonDimensionErrors.push(null);
      }
    }
    this.valueChange.emit(next);
  }

  get companyPhotoPlaceholder(): string {
    if (this.value.companyPhoto?.name) {
      return this.value.companyPhoto.name;
    }
    if (this.value.companyPhotoUrl) {
      return 'Photo uploaded';
    }
    return 'Upload Photo';
  }

  keyPersonPhotoPlaceholder(index: number): string {
    const person = this.value.keyPeople[index];
    if (person?.photo?.name) {
      return person.photo.name;
    }
    if (person?.photoUrl) {
      return 'Photo uploaded';
    }
    return 'Upload Photo';
  }

  onCompanyPhotoSelected(files: FileList): void {
    this.companyPhotoDimensionError = null;
    const file = this.pickFirstFile(files);
    this.patch({ companyPhoto: file, companyPhotoUrl: undefined });
    if (!file) {
      this.cdr.markForCheck();
      return;
    }
    this.validatePhotoDimensions(file, (err) => {
      this.companyPhotoDimensionError = err;
      this.cdr.markForCheck();
    });
  }

  onKeyPersonPhotoSelected(index: number, files: FileList): void {
    while (this.keyPersonDimensionErrors.length <= index) {
      this.keyPersonDimensionErrors.push(null);
    }
    this.keyPersonDimensionErrors[index] = null;
    const file = this.pickFirstFile(files);
    this.patchKeyPerson(index, { photo: file, photoUrl: undefined });
    if (!file) {
      this.cdr.markForCheck();
      return;
    }
    this.validatePhotoDimensions(file, (err) => {
      this.keyPersonDimensionErrors[index] = err;
      this.cdr.markForCheck();
    });
  }

  private validatePhotoDimensions(file: File, onDone: (error: string | null) => void): void {
    if (!file.type.startsWith('image/')) {
      onDone('Please upload an image file (e.g. JPG, PNG).');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = (): void => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (w < MIN_PHOTO_WIDTH || h < MIN_PHOTO_HEIGHT) {
        onDone(`Image must be at least ${MIN_PHOTO_WIDTH}x${MIN_PHOTO_HEIGHT} pixels.`);
      } else {
        onDone(null);
      }
    };
    img.onerror = (): void => {
      URL.revokeObjectURL(url);
      onDone('Failed to load image. Please choose a valid image file.');
    };
    img.src = url;
  }

  getCompanyPhotoDimensionError(): string | null {
    return this.companyPhotoDimensionError;
  }

  getKeyPersonDimensionError(index: number): string | null {
    if (index >= this.keyPersonDimensionErrors.length) {
      return null;
    }
    return this.keyPersonDimensionErrors[index] ?? null;
  }

  /** True when any upload photo fails 300x300 validation – used to disable Submit. */
  hasPhotoDimensionErrors(): boolean {
    if (this.companyPhotoDimensionError) {
      return true;
    }
    for (let i = 0; i < this.value.keyPeople.length; i++) {
      if (this.getKeyPersonDimensionError(i)) {
        return true;
      }
    }
    return false;
  }

  addKeyPerson(): void {
    const next = [...this.value.keyPeople, CompanyFormComponent.createEmptyKeyPerson()];
    this.keyPersonDimensionErrors = [...this.keyPersonDimensionErrors, null];
    this.patch({ keyPeople: next });
  }

  removeKeyPerson(index: number): void {
    if (this.value.keyPeople.length <= 1) {
      return;
    }
    const next = this.value.keyPeople.filter((_, i) => i !== index);
    this.keyPersonDimensionErrors = this.keyPersonDimensionErrors.filter((_, i) => i !== index);
    this.patch({ keyPeople: next.length ? next : [CompanyFormComponent.createEmptyKeyPerson()] });
  }

  patchKeyPerson(index: number, patch: Partial<KeyPersonValue>): void {
    const current = this.value.keyPeople[index];
    if (!current) {
      return;
    }
    const nextPerson: KeyPersonValue = { ...current, ...patch };
    const nextPeople = this.value.keyPeople.map((p, i) => (i === index ? nextPerson : p));
    this.patch({ keyPeople: nextPeople });
  }

  isLastKeyPerson(index: number): boolean {
    return index === this.value.keyPeople.length - 1;
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

  isCompanyWebsiteUrlInvalid(): boolean {
    if (!this.submitAttempted) return false;
    const s = (this.value.companyWebsiteUrl ?? '').trim();
    if (s.length === 0) return true;
    return !isValidUrl(s);
  }

isOtherWebsiteUrlInvalid(): boolean {

  if (!this.submitAttempted) return false;

  const s = (this.value.otherWebsiteUrl ?? '').trim();

  if (s.length === 0) return false;

  return !isValidUrl(s);
}

  private isFormValid(): boolean {
    const required =
      this.value.companyName.trim().length > 0 &&
      this.value.adminName.trim().length > 0 &&
      this.value.adminDesignation.trim().length > 0 &&
      this.value.adminEmail.trim().length > 0 &&
      !this.isAdminPhoneInvalid() &&
      this.value.registerNumber.trim().length > 0 &&
      this.value.aboutCompany.trim().length > 0 &&
      this.value.companyAddress.trim().length > 0;
const urlValid =
  !this.isCompanyWebsiteUrlInvalid() &&
  (!this.value.otherWebsiteUrl || !this.isOtherWebsiteUrlInvalid());
    const keyPeopleValid = this.value.keyPeople.every(
      (p) => p.name.trim().length > 0 && p.designation.trim().length > 0,
    );
    const photoValid =
      !this.companyPhotoDimensionError &&
      this.value.keyPeople.every((_, i) => !this.getKeyPersonDimensionError(i));
    return required && urlValid && keyPeopleValid && photoValid;
  }

  submit(): void {
    // In review mode, use the explicit Approve/Reject buttons instead of form submit.
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

  private pickFirstFile(files: FileList): File | null {
    return files.length > 0 ? files.item(0) : null;
  }
}


