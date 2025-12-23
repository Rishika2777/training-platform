import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';

export interface FacultyFormValue {
  fullName: string;
  photo: File | null;
  email: string;
  dateOfBirth: string;
  designation: string;
  department: string;
  specialization: string;
  yearsOfExperience: string;
  qualifications: readonly string[];
  certificates: readonly string[];
}

@Component({
  selector: 'app-campus-faculty',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, DropdownComponent],
  templateUrl: './campus-faculty.component.html',
  styleUrl: './campus-faculty.component.css',
})
export class CampusFacultyComponent {
  @Input() submitting = false;
  @Input() value: FacultyFormValue = {
    fullName: '',
    photo: null,
    email: '',
    dateOfBirth: '',
    designation: '',
    department: '',
    specialization: '',
    yearsOfExperience: '',
    qualifications: [],
    certificates: [],
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

  onPhotoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ photo: file });
  }

  addQualification(): void {
    const next: readonly string[] = [...this.value.qualifications, ''];
    this.patch({ qualifications: next });
  }

  updateQualification(index: number, value: string): void {
    const next = [...this.value.qualifications];
    next[index] = value;
    this.patch({ qualifications: next });
  }

  addCertificate(): void {
    const next: readonly string[] = [...this.value.certificates, ''];
    this.patch({ certificates: next });
  }

  updateCertificate(index: number, value: string): void {
    const next = [...this.value.certificates];
    next[index] = value;
    this.patch({ certificates: next });
  }

  submit(): void {
    this.submitted.emit(this.value);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

