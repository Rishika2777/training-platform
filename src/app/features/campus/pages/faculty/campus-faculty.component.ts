import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild, signal } from '@angular/core';
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
  @Input() isEditMode = false; // When true, skip email validation
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

  // Designation items - Hardcoded enum values (API commented out)
  // Backend expects enum values: PRINCIPAL, PROFESSOR, ASSOCIATE_PROFESSOR, ASSISTANT_PROFESSOR, LECTURER, HEAD_OF_DEPARTMENT, DEAN, DIRECTOR
  readonly designationItems = signal<readonly DropdownItem<string>[]>([
    { label: 'Principal', value: 'PRINCIPAL' },
    { label: 'Professor', value: 'PROFESSOR' },
    { label: 'Associate Professor', value: 'ASSOCIATE_PROFESSOR' },
    { label: 'Assistant Professor', value: 'ASSISTANT_PROFESSOR' },
    { label: 'Lecturer', value: 'LECTURER' },
    { label: 'Head of Department', value: 'HEAD_OF_DEPARTMENT' },
    { label: 'Dean', value: 'DEAN' },
    { label: 'Director', value: 'DIRECTOR' },
  ]);
  loadingDesignations = signal(false);

  // Department items (hardcoded - no API available)
  readonly departmentItems: readonly DropdownItem<string>[] = [
    { label: 'Computer Science', value: 'Computer Science' },
    { label: 'Mathematics', value: 'Mathematics' },
    { label: 'Physics', value: 'Physics' },
    { label: 'Chemistry', value: 'Chemistry' },
  ];

  readonly specializationItems: readonly DropdownItem<string>[] = [
    { label: 'Machine Learning', value: 'Machine Learning' },
    { label: 'Data Science', value: 'Data Science' },
    { label: 'Web Development', value: 'Web Development' },
    { label: 'Database Systems', value: 'Database Systems' },
    { label: 'Academic Management', value: 'Academic Management' },
    { label: 'Educational Leadership', value: 'Educational Leadership' },
    { label: 'Computer Science', value: 'Computer Science' },
    { label: 'Software Engineering', value: 'Software Engineering' },
    { label: 'Artificial Intelligence', value: 'Artificial Intelligence' },
    { label: 'Cybersecurity', value: 'Cybersecurity' },
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


  /**
   * Load designations from API - COMMENTED OUT: Using hardcoded enum values instead
   * Backend expects enum values: PRINCIPAL, PROFESSOR, ASSOCIATE_PROFESSOR, ASSISTANT_PROFESSOR, LECTURER, HEAD_OF_DEPARTMENT, DEAN, DIRECTOR
   */
  // loadDesignations(): void {
  //   this.loadingDesignations.set(true);
  //   this.campusApi.getDesignations().subscribe({
  //     next: (designations) => {
  //       this.loadingDesignations.set(false);
  //       if (designations && designations.length > 0) {
  //         // Convert API response (string[]) to DropdownItem[]
  //         const items: DropdownItem<string>[] = designations.map((designation) => ({
  //           label: designation,
  //           value: designation,
  //         }));
  //         this.designationItems.set(items);
  //         console.log('Faculty Component: Designations loaded successfully:', items.length, 'items');
  //       } else {
  //         console.warn('Faculty Component: API returned empty designations, using fallback');
  //         // Fallback to static data if API returns empty
  //         this.designationItems.set([
  //           { label: 'Professor', value: 'Professor' },
  //           { label: 'Associate Professor', value: 'Associate Professor' },
  //           { label: 'Assistant Professor', value: 'Assistant Professor' },
  //           { label: 'Lecturer', value: 'Lecturer' },
  //         ]);
  //       }
  //     },
  //     error: (error) => {
  //       this.loadingDesignations.set(false);
  //       console.error('Faculty Component: Failed to load designations from API:', error);
  //       console.error('Error details:', {
  //         status: error?.status,
  //         statusText: error?.statusText,
  //         error: error?.error,
  //         message: error?.message
  //       });
  //       // Fallback to static data on error
  //       this.designationItems.set([
  //         { label: 'Professor', value: 'Professor' },
  //         { label: 'Associate Professor', value: 'Associate Professor' },
  //         { label: 'Assistant Professor', value: 'Assistant Professor' },
  //         { label: 'Lecturer', value: 'Lecturer' },
  //       ]);
  //     },
  //   });
  // }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  patch(patch: Partial<FacultyFormValue>): void {
    const next: FacultyFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);

    // Check email when it changes (skip if in edit mode)
    if (patch.email !== undefined && !this.isEditMode) {
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
    // Skip email validation if in edit mode
    if (!this.isEditMode) {
      // Prevent submission if email already exists
      if (this.emailExists) {
        return;
      }
      
      // Prevent submission if email is being checked
      if (this.checkingEmail) {
        return;
      }
    }
    
    this.submitted.emit(this.value);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }
}

