import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';

export interface ProfessionalInfo {
  designation: string;
  department: string;
  specialization: string;
  yearsOfExperience: string;
  qualifications: string;
  certificates: File | null;
}

export interface FacultyFormValue {
  fullName: string;
  photo: File | null;
  email: string;
  dateOfBirth: string;
  phoneNumber: string;
  professionalInfo: readonly ProfessionalInfo[];
}

@Component({
  selector: 'app-campus-faculty',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, DropdownComponent],
  templateUrl: './campus-faculty.component.html',
  styleUrl: './campus-faculty.component.css',
})
export class CampusFacultyComponent {
  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: FacultyFormValue = {
    fullName: '',
    photo: null,
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    professionalInfo: [
      {
        designation: '',
        department: '',
        specialization: '',
        yearsOfExperience: '',
        qualifications: '',
        certificates: null,
      },
    ],
  };

  @Output() valueChange = new EventEmitter<FacultyFormValue>();
  @Output() submitted = new EventEmitter<FacultyFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  readonly designationItems: readonly DropdownItem<string>[] = [
    { label: 'Professor', value: 'professor' },
    { label: 'Associate Professor', value: 'associate-professor' },
    { label: 'Assistant Professor', value: 'assistant-professor' },
    { label: 'Lecturer', value: 'lecturer' },
  ];

  readonly departmentItems: readonly DropdownItem<string>[] = [
    { label: 'Computer Science', value: 'cs' },
    { label: 'Mathematics', value: 'math' },
    { label: 'Physics', value: 'physics' },
    { label: 'Chemistry', value: 'chemistry' },
  ];

  readonly specializationItems: readonly DropdownItem<string>[] = [
    { label: 'Machine Learning', value: 'ml' },
    { label: 'Data Science', value: 'ds' },
    { label: 'Web Development', value: 'web' },
    { label: 'Database Systems', value: 'db' },
  ];

  readonly experienceItems: readonly DropdownItem<string>[] = [
    { label: '1-5 years', value: '1-5' },
    { label: '6-10 years', value: '6-10' },
    { label: '11-15 years', value: '11-15' },
    { label: '16+ years', value: '16+' },
  ];

  patch(patch: Partial<FacultyFormValue>): void {
    const next: FacultyFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerPhotoSelect(): void {
    this.photoFileInput?.nativeElement?.click();
  }

  onPhotoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ photo: file });
  }

  get photoName(): string {
    return this.value.photo?.name ?? '';
  }

  addProfessionalInfo(): void {
    const newInfo: ProfessionalInfo = {
      designation: '',
      department: '',
      specialization: '',
      yearsOfExperience: '',
      qualifications: '',
      certificates: null,
    };
    const next: readonly ProfessionalInfo[] = [...this.value.professionalInfo, newInfo];
    this.patch({ professionalInfo: next });
  }

  updateProfessionalInfo(index: number, field: keyof ProfessionalInfo, value: string | File | null): void {
    const next = [...this.value.professionalInfo];
    next[index] = { ...next[index], [field]: value };
    this.patch({ professionalInfo: next });
  }

  triggerCertificateSelect(index: number): void {
    const fileInput = document.getElementById(`certificate-file-input-${index}`) as HTMLInputElement;
    fileInput?.click();
  }

  onCertificateSelected(index: number, files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.updateProfessionalInfo(index, 'certificates', file);
  }

  getCertificateName(index: number): string {
    return this.value.professionalInfo[index]?.certificates?.name ?? '';
  }

  removeProfessionalInfo(index: number): void {
    if (this.value.professionalInfo.length > 1) {
      const next = [...this.value.professionalInfo];
      next.splice(index, 1);
      this.patch({ professionalInfo: next });
    }
  }

  canRemoveProfessionalInfo(): boolean {
    return this.value.professionalInfo.length > 1;
  }

  submit(): void {
    this.submitted.emit(this.value);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

