import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';

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

  @Output() valueChange = new EventEmitter<CompanyFormValue>();
  @Output() submitted = new EventEmitter<CompanyFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();

  submitAttempted = false;

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
    const file = this.pickFirstFile(files);
    // Clear URL when new file is selected
    this.patch({ companyPhoto: file, companyPhotoUrl: undefined });
  }

  onKeyPersonPhotoSelected(index: number, files: FileList): void {
    const file = this.pickFirstFile(files);
    // Clear URL when new file is selected
    this.patchKeyPerson(index, { photo: file, photoUrl: undefined });
  }

  addKeyPerson(): void {
    const next = [...this.value.keyPeople, CompanyFormComponent.createEmptyKeyPerson()];
    this.patch({ keyPeople: next });
  }

  removeKeyPerson(index: number): void {
    if (this.value.keyPeople.length <= 1) {
      return;
    }
    const next = this.value.keyPeople.filter((_, i) => i !== index);
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

  submit(): void {
    // In review mode, use the explicit Approve/Reject buttons instead of form submit.
    // But allow submission when edit mode is enabled.
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    this.submitAttempted = true;
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


