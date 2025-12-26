import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';

export interface KeyPersonValue {
  name: string;
  designation: string;
  photo: File | null;
}

export interface CompanyFormValue {
  companyName: string;
  companyPhoto: File | null;

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
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() submitting = false;
  @Input() adminEmailLocked = false;
  @Input() value: CompanyFormValue = CompanyFormComponent.createEmptyValue();

  @Output() valueChange = new EventEmitter<CompanyFormValue>();
  @Output() submitted = new EventEmitter<CompanyFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  static createEmptyKeyPerson(): KeyPersonValue {
    return { name: '', designation: '', photo: null };
  }

  static createEmptyValue(): CompanyFormValue {
    return {
      companyName: '',
      companyPhoto: null,

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
    const next: CompanyFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  get companyPhotoPlaceholder(): string {
    return this.value.companyPhoto?.name ?? 'Upload Photo';
  }

  keyPersonPhotoPlaceholder(index: number): string {
    return this.value.keyPeople[index]?.photo?.name ?? 'Upload Photo';
  }

  onCompanyPhotoSelected(files: FileList): void {
    const file = this.pickFirstFile(files);
    this.patch({ companyPhoto: file });
  }

  onKeyPersonPhotoSelected(index: number, files: FileList): void {
    const file = this.pickFirstFile(files);
    this.patchKeyPerson(index, { photo: file });
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

  submit(): void {
    this.submitted.emit(this.value);
  }

  private pickFirstFile(files: FileList): File | null {
    return files.length > 0 ? files.item(0) : null;
  }
}


