import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService } from '../../services/campus-api.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY } from 'rxjs';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { StorageService } from '../../../../core/storage/storage.service';




export interface ProfessionalInfo {
  designation: string;
  department: string;
   specialization: string | null;
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
export class CampusFacultyComponent implements OnInit {
  private readonly campusApi = inject(CampusApiService);
  private readonly emailCheckSubject = new Subject<string>();

private readonly storage = inject(StorageService);
existingFacultyPhones: string[] = [];
  phoneExists = false;
checkingPhone = false;
phoneErrorMessage = '';



// DOB restrictions
maxDobDate!: string;
minDobDate!: string;


private setDobLimits(): void {
  const today = new Date();

  // Faculty minimum age 21
  const maxYear = today.getFullYear() - 21;

  // Faculty max age 70
  const minYear = today.getFullYear() - 70;

  const maxDate = new Date(maxYear, today.getMonth(), today.getDate());
  const minDate = new Date(minYear, 0, 1);

  this.maxDobDate = maxDate.toISOString().split('T')[0];
  this.minDobDate = minDate.toISOString().split('T')[0];
}

  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() showDepartment = true;
  @Input() editMode = false;
@Input() editData: FacultyFormValue | null = null;

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
        specialization: null,
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
  readonly designationItems: readonly DropdownItem<string>[] = [
    { label: 'Principal', value: 'PRINCIPAL' },
    { label: 'Professor', value: 'PROFESSOR' },
    { label: 'Associate Professor', value: 'ASSOCIATE_PROFESSOR' },
    { label: 'Assistant Professor', value: 'ASSISTANT_PROFESSOR' },
    { label: 'Lecturer', value: 'LECTURER' },
    { label: 'Head of Department', value: 'HEAD_OF_DEPARTMENT' },
    { label: 'Dean', value: 'DEAN' },
    { label: 'Director', value: 'DIRECTOR' },
  ];

  // Department items - from @Input or loaded via API
  departmentItems: { label: string; value: string }[] = [];


  readonly specializationItems: readonly DropdownItem<string>[] = [
    { label: 'Machine Learning', value: 'Machine Learning' },
    { label: 'Data Science', value: 'Data Science' },
    { label: 'Web Development', value: 'Web Development' },
    { label: 'Database Systems', value: 'Database Systems' },
    { label: 'Academic Management', value: 'Academic Management' },
    { label: 'Educational Leadership', value: 'Educational Leadership' },
    { label: 'Computer Science', value: 'ComputerScience' },
    { label: 'Software Engineering', value: 'SoftwareEngineering' },
    { label: 'Artificial Intelligence', value: 'ArtificialIntelligence' },
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
      //  this.loadDesignations();

 
      
  }



  ngOnInit(): void {
    this.loadExistingFacultyPhones();
    this.loadDepartments();
    this.setDobLimits();
  }

  /** When value is department name (from edit) but items use ID, show name via displayText */
  departmentDisplayText(index: number): string {
    const dept = this.value.professionalInfo[index]?.department;
    if (!dept) return '';
    const found = this.departmentItems.find((i) => i.value === dept);
    if (found) return found.label;
    return dept;
  }

private loadExistingFacultyPhones(): void {
  this.campusApi.getAllFaculties().subscribe({
    next: (response) => {
      const facultyList = response?.data ?? [];

      this.existingFacultyPhones = facultyList
        .map((f: unknown) => {
          const obj = f as Record<string, unknown>;

          const possiblePhone =
            (obj['phoneNumber'] as string) ||
            ((obj['basicInformation'] as Record<string, unknown>)?.['phoneNumber'] as string) ||
            '';

          return possiblePhone;
        })
        .map((p) => p.replace(/\D/g, '').slice(-10))
        .filter((p) => p.length === 10);
    },
    error: () => {
      this.existingFacultyPhones = [];
    }
  });
}

private loadDepartments(): void {
  const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string;

  if (!campusId) return;

  this.campusApi.getAllDepartmentsByCampus(campusId).subscribe({
    next: (res) => {
      if (res?.success && res.data) {
        this.departmentItems = res.data.map((dept: { id: string; departmentName: string }) => ({

          label: dept.departmentName,
          value: dept.id
        }));
      } else {
        this.departmentItems = [];
      }
    },
    error: () => {
      this.departmentItems = [];
    }
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

  private isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}


  private getEmptyFormValue(): FacultyFormValue {
  return {
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
}

resetForm(): void {
  this.value = this.getEmptyFormValue();
  this.valueChange.emit(this.value);

  // reset email validation state
  this.emailExists = false;
  this.checkingEmail = false;
  this.emailErrorMessage = '';

  // reset photo file input
  if (this.photoFileInput?.nativeElement) {
    this.photoFileInput.nativeElement.value = '';
  }
}



  patch(patch: Partial<FacultyFormValue>): void {
    const next: FacultyFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);

    // Check email when it changes (skip if in edit mode)
    if (patch.email !== undefined && !this.isEditMode) {
      this.checkEmailExists(next.email);
    }

if (patch.phoneNumber !== undefined && !this.isEditMode) {
  this.checkPhoneExists(next.phoneNumber);
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

checkPhoneExists(phone: string): void {
  const digits = phone.replace(/\D/g, '');
  const cleaned = digits.length > 10 ? digits.slice(-10) : digits;

  if (!cleaned || cleaned.length !== 10) {
    this.phoneExists = false;
    this.phoneErrorMessage = '';
    return;
  }

  const duplicate = this.existingFacultyPhones.includes(cleaned);

  this.phoneExists = duplicate;

  if (duplicate) {
    this.phoneErrorMessage =
      'This phone number is already registered with another faculty';
  } else {
    this.phoneErrorMessage = '';
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

 const cleanedInfo = this.value.professionalInfo.map((info: ProfessionalInfo) => {
  const updated: Partial<ProfessionalInfo> = { ...info };

 

  // remove department if not needed
  if (!this.showDepartment) {
    delete updated.department;
  }

  return updated as ProfessionalInfo;
});
  this.value = {
    ...this.value,
    professionalInfo: cleanedInfo
  };

  if (!this.isEditMode) {
    if (this.emailExists || this.checkingEmail || this.phoneExists || this.checkingPhone) {
      return;
    }
  }

  this.submitted.emit(this.value);
  // Do not reset here: parent validates and may show error; form should keep values on validation failure.
  // Parent will close modal on success; reset happens on cancel or when reopening modal.
}




  cancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }
}

