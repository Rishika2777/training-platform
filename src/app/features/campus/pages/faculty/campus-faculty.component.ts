import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService } from '../../services/campus-api.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY } from 'rxjs';

export interface ProfessionalInfo {
  designation: string;
  department: string;
  specialization: string;
  yearsOfExperience: string;
  qualifications: string;
  certificates: File | null;
}

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
  private readonly campusApi = inject(CampusApiService);
  private readonly emailCheckSubject = new Subject<string>();

  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  emailExists = false;
  checkingEmail = false;
  emailErrorMessage = '';
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

  constructor() {
    // Setup email check with debounce
    this.emailCheckSubject
      .pipe(
        debounceTime(500), // Wait 500ms after user stops typing
        distinctUntilChanged(), // Only check if email changed
        switchMap((email) => {
          if (!email || !this.isValidEmail(email)) {
            this.emailExists = false;
            this.emailErrorMessage = '';
            this.checkingEmail = false;
            return EMPTY;
          }
          this.checkingEmail = true;
          this.emailErrorMessage = '';
          return this.campusApi.checkFacultyEmail(email);
        })
      )
      .subscribe({
        next: (response) => {
          this.checkingEmail = false;
          // Swagger shows: data is boolean (false = available, true = exists)
          // If data is true, email exists; if false, email is available
          if (response?.data !== undefined) {
            this.emailExists = response.data; // data is boolean directly
            if (this.emailExists) {
              this.emailErrorMessage = 'This email is already registered';
            } else {
              this.emailErrorMessage = '';
            }
          }
        },
         
        error: () => {
          this.checkingEmail = false;
          // Don't show error for email check - just disable validation
          // User can still submit the form
          this.emailExists = false;
          this.emailErrorMessage = '';
        },
      });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  patch(patch: Partial<FacultyFormValue>): void {
    const next: FacultyFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);

    // Check email when it changes
    if (patch.email !== undefined) {
      this.checkEmailExists(next.email);
    }
  }

  checkEmailExists(email: string): void {
    if (email && email.trim()) {
      this.emailCheckSubject.next(email.trim());
    } else {
      this.emailExists = false;
      this.emailErrorMessage = '';
      this.checkingEmail = false;
    }
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
    console.log('FacultyComponent: ========== SUBMIT METHOD CALLED ==========');
    console.log('FacultyComponent: Form value:', this.value);
    console.log('FacultyComponent: Email exists?', this.emailExists);
    console.log('FacultyComponent: Checking email?', this.checkingEmail);
    console.log('FacultyComponent: Email error message:', this.emailErrorMessage);
    console.log('FacultyComponent: Submitting flag:', this.submitting);
    
    // Prevent submission if email already exists
    if (this.emailExists) {
      console.warn('FacultyComponent: ⚠️ Cannot submit - email already exists');
      console.warn('FacultyComponent: Email:', this.value.email);
      return;
    }
    
    // Prevent submission if email is being checked
    if (this.checkingEmail) {
      console.warn('FacultyComponent: ⚠️ Cannot submit - email check in progress');
      return;
    }
    
    console.log('FacultyComponent: ✅ All checks passed, emitting submitted event...');
    console.log('FacultyComponent: Emitting value:', this.value);
    this.submitted.emit(this.value);
    console.log('FacultyComponent: ✅ Event emitted successfully');
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

