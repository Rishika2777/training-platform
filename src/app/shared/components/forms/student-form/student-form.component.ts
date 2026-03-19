import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ButtonComponent } from '../../button/button.component';
import { DropdownComponent, DropdownItem, ApiFetchFunction } from '../../dropdown/dropdown.component';
import { InputComponent } from '../../input/input.component';
import { StepIndicatorComponent } from '../../step-indicator/step-indicator.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { YearPickerComponent } from '../../year-picker/year-picker.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import { isValidUrl, isOptionalUrlInvalid } from '../../../../core/validators/url.validator';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import type { CampusResponse } from '../../../../features/student/models/student.models';
import { CampusApiService, type CampusAutocompleteResponse, type DepartmentDropdownItem } from '../../../../features/campus/services/campus-api.service';
import type {
  Gender,
  StudentAdditionalInfo,
  StudentEducationItem,
  StudentFormValue,
  StudentProjectItem,
  StudentTechnicalSkillItem,
  StudentWorkExperienceItem,
  StudentWorkPreferences,
} from './student-form.models';
import {
  createEmptyEducationItem,
  createEmptyProjectItem,
  createEmptyStudentFormValue,
  createEmptyWorkExperienceItem,
} from './student-form.utils';


@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    DropdownComponent,
    InputComponent,
    StepIndicatorComponent,
    TextareaComponent,
    YearPickerComponent,
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.css',
})
export class StudentFormComponent implements OnInit, OnChanges {
  @Input() submitting = false;
  @Input() value: StudentFormValue = createEmptyStudentFormValue();
  @Input() emailLocked = false;
  @Input() mode: 'create' | 'review' | 'edit' = 'create';
  @Input() approveDisabled = false;
  @Input() isEditMode = false;
  @Input() campuses: CampusResponse[] = []; // Campuses for institution dropdown
  @Input() verifiedPhoneNumber: string | null = null; // Phone number that has been verified

  @Output() valueChange = new EventEmitter<StudentFormValue>();
  @Output() submitted = new EventEmitter<StudentFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();
  @Output() verifyPhone = new EventEmitter<{ phoneNumber: string; fieldType: 'mobile' | 'adminPhone' | 'phone' }>();

  readonly steps = ['Personal Info', 'Education', 'Skills & Experience', 'Additional'] as const;

  readonly projectDescriptionMaxLength = 500;

  todayDate: string = new Date().toISOString().split('T')[0];

  /** Percentage/Grade/CGPA: 0–100 with up to 2 decimals, or single letter grade A–F. */
  readonly percentageOrCgpaPattern = /^(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.[0-9]{1,2})?|10(?:\.0{1,2})?|[0-9](?:\.[0-9]{1,2})?|[A-Fa-f])$/;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly campusApiService = inject(CampusApiService);
  currentStep = 0;
  submitAttempted = false;
  private stepNavLocked = false;
private readonly namePattern = /^[A-Za-z][A-Za-z\s]{1,}$/;

  /** Min resolution for profile photo (frontend validation). */
  private static readonly MIN_PHOTO_WIDTH = 300;
  private static readonly MIN_PHOTO_HEIGHT = 300;

  /** Set when selected photo fails dimension check (e.g. &lt; 300x300). */
  photoDimensionError: string | null = null;
  // Cache to store campusId -> {campusName, campusAddress} mapping from API responses
  private campusCache = new Map<string, { campusName: string; campusAddress?: string }>();
  /** Cache: campusId -> department dropdown items (loaded once when campus selected) */
  private departmentCache = new Map<string, DropdownItem<string>[]>();
  // Store pre-loaded campuses for instant dropdown display
  private readonly initialCampuses = signal<CampusAutocompleteResponse[]>([]);

  get isReviewMode(): boolean {
    return this.mode === 'review';
  }

  get isEditModeDisplay(): boolean {
    // Show all steps when mode is 'edit' (always show full form for editing)
    // Or when isEditMode is true and not in review mode
    if (this.mode === 'edit') {
      return true;
    }
    return this.isEditMode && this.mode !== 'review';
  }

isNameInvalid(name: string, isRequired = true): boolean {
  if (!this.submitAttempted) return false;

  const value = (name || '').trim();

  // optional field → empty allowed
  if (!isRequired && value.length === 0) return false;

  // required field → empty not allowed
  if (isRequired && value.length === 0) return true;

  // if user typed → must be minimum 2 letters
  if (value.length < 2) return true;

  return !this.namePattern.test(value);
}
  get isFieldsDisabled(): boolean {
    return this.submitting || (this.isReviewMode && !this.isEditMode);
  }

  ngOnInit(): void {
    this.loadInitialCampuses();
    this.prePopulateCampusCache();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When value changes (e.g., when loading existing data), pre-populate the cache
    if (changes['value']) {
      this.prePopulateCampusCache();
    }
  }

  /**
   * Pre-populate campus cache with existing education data
   * This ensures the dropdown can display institution names even if those campuses
   * aren't in the current API results
   */
  private prePopulateCampusCache(): void {
    if (!this.value.education || this.value.education.length === 0) {
      return;
    }

    this.value.education.forEach((edu) => {
      if (edu.campusId && edu.institution) {
        this.campusCache.set(edu.campusId, {
          campusName: edu.institution,
          campusAddress: edu.campusAddress,
        });
        if (!this.departmentCache.has(edu.campusId)) {
          this.loadDepartmentsForCampus(edu.campusId);
        }
      }
    });
  }

  /**
   * Load initial campuses on component init using search API
   * This populates the dropdown with initial data so users see options immediately on focus
   */
  private loadInitialCampuses(): void {
    this.campusApiService.getCampusBySearch('', 0, 20).subscribe({
      next: (response) => {        
        const content = this.extractCampusContent(response);
        if (content.length > 0) {
          this.initialCampuses.set(content);
          // Pre-populate the cache with initial campuses
          content.forEach((campus) => {
            const campusId = campus.campusId || campus.id;
            if (campusId && campus.campusName) {
              this.campusCache.set(campusId, {
                campusName: campus.campusName,
                campusAddress: campus.campusAddress,
              });
            }
          });
        } else {
          console.warn('StudentFormComponent: No campus content in initial response');
        }
      },
      error: (error) => {
        console.error('StudentFormComponent: Failed to load initial campuses:', error);
      },
    });
  }

  readonly yearOfPassingMin = '1900-01-01'; // Allow all past years - set to a very old date

  get yearOfPassingMax(): string {
    // Allow next 5 years from current year
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 5;
    return `${maxYear}-12-31`;
  }

  readonly genderItems: readonly DropdownItem<Gender>[] = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  // “Free text” dropdowns are still compatible with our shared dropdown by using string values.
  readonly heardAboutItems: readonly DropdownItem<string>[] = [
    { label: 'LinkedIn', value: 'LinkedIn' },
    { label: 'Instagram', value: 'Instagram' },
    { label: 'Friend', value: 'Friend' },
    { label: 'College', value: 'College' },
  ];

  /** Matches backend enum JobAlertPreference: NONE, EMAIL, SMS, BOTH */
  readonly jobAlertsViaItems: readonly DropdownItem<string>[] = [
    { label: 'None', value: 'NONE' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'SMS', value: 'SMS' },
    { label: 'Email & SMS', value: 'BOTH' },
  ];

  // Education dropdown items
  readonly qualificationItems: readonly DropdownItem<string>[] = [
    { label: '10th', value: '10th' },
    { label: '12th', value: '12th' },
    { label: 'Diploma', value: 'Diploma' },
    { label: 'Bachelor\'s Degree', value: 'Bachelor\'s Degree' },
    { label: 'Master\'s Degree', value: 'Master\'s Degree' },
    { label: 'PhD', value: 'PhD' },
  ];

  // Use campuses if available, otherwise fallback to hardcoded list
  get institutionItems(): readonly DropdownItem<string>[] {
    if (this.campuses && this.campuses.length > 0) {
      return this.campuses.map((campus) => ({
        label: campus.campusName || '',
        value: campus.campusId || '',
      })).filter((item) => item.label && item.value);
    }
    // Fallback to hardcoded list if no campuses provided
    return [
      { label: 'University of Technology', value: 'University of Technology' },
      { label: 'State University', value: 'State University' },
      { label: 'Private University', value: 'Private University' },
      { label: 'Institute of Technology', value: 'Institute of Technology' },
      { label: 'Other', value: 'Other' },
    ];
  }

  // API fetch function for campus autocomplete
  fetchCampuses: ApiFetchFunction<string> = (searchTerm: string): Observable<DropdownItem<string>[]> => {    
    // Get existing campuses from the form to include in results
    const existingCampuses = this.value.education
      .filter((edu) => edu.campusId && edu.institution)
      .map((edu) => ({
        label: edu.institution,
        value: edu.campusId!,
      }));
    
    // Always call the API to ensure fresh data
    return this.campusApiService.getCampusBySearch(searchTerm || '', 0, 20).pipe(
      map((response) => {        
        const items: DropdownItem<string>[] = [];
        
        const content = this.extractCampusContent(response);
        if (content.length > 0) {
          const campusItems = content
            .filter((campus) => {
              // Support both 'id' and 'campusId' properties
              const campusId = campus.campusId || campus.id;
              const hasId = !!campusId;
              const hasName = !!campus.campusName;
              return hasId && hasName;
            })
            .map((campus) => {
              // Use 'id' if 'campusId' is not available (API returns 'id')
              const campusId = campus.campusId || campus.id || '';
              const campusName = campus.campusName || '';
              const campusAddress = campus.campusAddress || '';
              
              // Cache the mapping for later use (store both name and address)
              if (campusId && campusName) {
                this.campusCache.set(campusId, {
                  campusName,
                  campusAddress: campusAddress || undefined,
                });
              }
              
              return {
                label: campusName,
                value: campusId,
              };
            });
          items.push(...campusItems);
        }
        
        // Merge with existing campuses from the form (avoid duplicates)
        const existingNotInApi = existingCampuses.filter(
          (existing) => !items.some((item) => item.value === existing.value)
        );
        items.unshift(...existingNotInApi); // Add existing campuses at the beginning
        
        // Always add "Other" option at the end
        items.push({ label: 'Other', value: 'OTHER' });
        return items;
      }),
      catchError((error) => {
        console.error('StudentFormComponent: Error in fetchCampuses:', error);
        // On error, return existing campuses + "Other" option
        return of([...existingCampuses, { label: 'Other', value: 'OTHER' }]);
      })
    );
  };

  private extractCampusContent(response: unknown): CampusAutocompleteResponse[] {
    const content = unwrapApiResponse<CampusAutocompleteResponse[]>(response);
    return Array.isArray(content) ? content : [];
  }

  readonly degreeItems: readonly DropdownItem<string>[] = [
    { label: 'B.Tech', value: 'B.Tech' },
    { label: 'B.E.', value: 'B.E.' },
    { label: 'B.Sc', value: 'B.Sc' },
    { label: 'B.Com', value: 'B.Com' },
    { label: 'B.A.', value: 'B.A.' },
    { label: 'M.Tech', value: 'M.Tech' },
    { label: 'M.E.', value: 'M.E.' },
    { label: 'M.Sc', value: 'M.Sc' },
    { label: 'MBA', value: 'MBA' },
    { label: 'MCA', value: 'MCA' },
  ];

  readonly specializationItems: readonly DropdownItem<string>[] = [
    { label: 'Computer Science', value: 'Computer Science' },
    { label: 'Information Technology', value: 'Information Technology' },
    { label: 'Electrical Engineering', value: 'Electrical Engineering' },
    { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
    { label: 'Civil Engineering', value: 'Civil Engineering' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Mechanical', value: 'Mechanical' },
    { label: 'Civil', value: 'Civil' },
    { label: 'Electrical', value: 'Electrical' },
    { label: 'Chemical', value: 'Chemical' },
    { label: 'Aerospace', value: 'Aerospace' },
    { label: 'Biotechnology', value: 'Biotechnology' },
    { label: 'Data Science', value: 'Data Science' },
    { label: 'Business Administration', value: 'Business Administration' },
  ];

  readonly yearOfPassingItems: readonly DropdownItem<string>[] = (() => {
    const currentYear = new Date().getFullYear();
    const years: DropdownItem<string>[] = [];
    for (let year = currentYear; year >= currentYear - 20; year--) {
      years.push({ label: String(year), value: String(year) });
    }
    return years;
  })();

  // Skills dropdown items
  readonly technicalSkillItems: readonly DropdownItem<string>[] = [
    { label: 'JavaScript', value: 'JavaScript' },
    { label: 'TypeScript', value: 'TypeScript' },
    { label: 'Python', value: 'Python' },
    { label: 'Java', value: 'Java' },
    { label: 'C++', value: 'C++' },
    { label: 'React', value: 'React' },
    { label: 'Angular', value: 'Angular' },
    { label: 'Node.js', value: 'Node.js' },
    { label: 'SQL', value: 'SQL' },
    { label: 'MongoDB', value: 'MongoDB' },
  ];

  readonly softSkillItems: readonly DropdownItem<string>[] = [
    { label: 'Communication', value: 'Communication' },
    { label: 'Leadership', value: 'Leadership' },
    { label: 'Teamwork', value: 'Teamwork' },
    { label: 'Problem Solving', value: 'Problem Solving' },
    { label: 'Time Management', value: 'Time Management' },
    { label: 'Adaptability', value: 'Adaptability' },
    { label: 'Critical Thinking', value: 'Critical Thinking' },
    { label: 'Creativity', value: 'Creativity' },
  ];

  readonly languageItems: readonly DropdownItem<string>[] = [
    { label: 'English', value: 'English' },
    { label: 'Hindi', value: 'Hindi' },
    { label: 'Spanish', value: 'Spanish' },
    { label: 'French', value: 'French' },
    { label: 'German', value: 'German' },
    { label: 'Mandarin', value: 'Mandarin' },
    { label: 'Japanese', value: 'Japanese' },
  ];

  // Work preferences dropdown items
  readonly jobRolesItems: readonly DropdownItem<string>[] = [
    { label: 'Software Developer', value: 'Software Developer' },
    { label: 'Full Stack Developer', value: 'Full Stack Developer' },
    { label: 'Frontend Developer', value: 'Frontend Developer' },
    { label: 'Backend Developer', value: 'Backend Developer' },
    { label: 'Data Scientist', value: 'Data Scientist' },
    { label: 'DevOps Engineer', value: 'DevOps Engineer' },
    { label: 'Product Manager', value: 'Product Manager' },
  ];

  readonly preferredLocationItems: readonly DropdownItem<string>[] = [
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'Delhi', value: 'Delhi' },
    { label: 'Bangalore', value: 'Bangalore' },
    { label: 'Hyderabad', value: 'Hyderabad' },
    { label: 'Chennai', value: 'Chennai' },
    { label: 'Pune', value: 'Pune' },
    { label: 'Kolkata', value: 'Kolkata' },
    { label: 'Remote', value: 'Remote' },
  ];

  // Work experience dropdown items
  readonly workExperienceRoleItems: readonly DropdownItem<string>[] = [
    { label: 'Software Developer', value: 'Software Developer' },
    { label: 'Senior Software Developer', value: 'Senior Software Developer' },
    { label: 'Software Engineer', value: 'Software Engineer' },
    { label: 'Junior Developer', value: 'Junior Developer' },
    { label: 'Intern', value: 'Intern' },
  ];

  // Project technologies dropdown items
  /** Matches backend enum Technology */
  readonly projectTechnologyItems: readonly DropdownItem<string>[] = [
    { label: 'HTML', value: 'HTML' },
    { label: 'CSS', value: 'CSS' },
    { label: 'JavaScript', value: 'JAVASCRIPT' },
    { label: 'React', value: 'REACT' },
    { label: 'Node', value: 'NODE' },
    { label: 'MongoDB', value: 'MONGODB' },
    { label: 'Java', value: 'JAVA' },
    { label: 'Spring Boot', value: 'SPRINGBOOT' },
    { label: 'Python', value: 'PYTHON' },
    { label: 'jQuery', value: 'JQUERY' },
    { label: 'Bootstrap', value: 'BOOTSTRAP' },
  ];

  // Draft inputs for tag-like lists
  newTechnicalSkill: StudentTechnicalSkillItem = { skill: '', proficiency: '' };
  newSoftSkill = '';
  newLanguage = '';
  newProjectTechnology = '';
  projectTechnologyValues: Record<number, string | null> = {};

  setNewTechnicalSkillSkill(value: string): void {
    this.newTechnicalSkill = { ...this.newTechnicalSkill, skill: value };
  }

  setNewTechnicalSkillProficiency(value: string): void {
    this.newTechnicalSkill = { ...this.newTechnicalSkill, proficiency: value };
  }

  /** True if new technical skill proficiency is out of range (must be 1–10 or empty). */
  get isNewTechnicalSkillProficiencyInvalid(): boolean {
    const p = this.newTechnicalSkill.proficiency.trim();
    if (!p) return false;
    const num = Number(p);
    if (!Number.isFinite(num)) return false;
    return num < 1 || num > 10;
  }

  setWorkPreferenceField<K extends keyof Omit<StudentWorkPreferences, 'employmentType'>>(
    field: K,
    value: StudentWorkPreferences[K],
  ): void {
    this.patch({
      workPreferences: {
        ...this.value.workPreferences,
        [field]: value,
      },
    });
  }

 toggleEmploymentType(key: keyof StudentWorkPreferences['employmentType']): void {
  this.patch({
    workPreferences: {
      ...this.value.workPreferences,
      employmentType: {
        internship: false,
        fullTime: false,
        both: false,
        [key]: true,
      },
    },
  });
}


  setAdditionalField<
    K extends keyof Omit<StudentAdditionalInfo, 'certificateFiles' | 'certificateFileNames'>
  >(field: K, value: StudentAdditionalInfo[K]): void {
    this.patch({
      additional: {
        ...this.value.additional,
        [field]: value,
      },
    });
  }

  /**
   * Validates selected photo file: must be image and at least 300x300.
   * Sets photoDimensionError and patches photoFiles; Save and Next is disabled when invalid.
   */
  onPhotoFilesSelected(files: FileList): void {
    this.photoDimensionError = null;
    if (!files || files.length === 0) {
      this.patch({ photoFiles: files ?? null });
      this.cdr.markForCheck();
      return;
    }
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      this.photoDimensionError = 'Please upload an image file (e.g. JPG, PNG).';
      this.patch({ photoFiles: files });
      this.cdr.markForCheck();
      return;
    }
    this.patch({ photoFiles: files });
    const url = URL.createObjectURL(file);
    const img = new Image();
  img.onload = (): void => {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  URL.revokeObjectURL(url);

  // Minimum resolution check
  if (w < StudentFormComponent.MIN_PHOTO_WIDTH || h < StudentFormComponent.MIN_PHOTO_HEIGHT) {
    this.photoDimensionError =
      `Image dimensions too small. Minimum resolution is ${StudentFormComponent.MIN_PHOTO_WIDTH}x${StudentFormComponent.MIN_PHOTO_HEIGHT} pixels.`;
    this.cdr.markForCheck();
    return;
  }

  // Aspect ratio check (must be square)
  const ratio = w / h;
  if (ratio < 0.9 || ratio > 1.1) {
    this.photoDimensionError = 'Image must be square (1:1 aspect ratio).';
    this.cdr.markForCheck();
    return;
  }

  this.photoDimensionError = null;
  this.cdr.markForCheck();
};
    img.onerror = (): void => {
      URL.revokeObjectURL(url);
      this.photoDimensionError = 'Failed to load image. Please choose a valid image file.';
      this.cdr.markForCheck();
    };
    img.src = url;
  }

  isPhotoDimensionValid(): boolean {
    return !this.photoDimensionError;
  }

 patch(patch: Partial<StudentFormValue>): void {
  if (this.isReviewMode && !this.isEditMode) {
    return;
  }

  const next: StudentFormValue = { ...this.value, ...patch };

  // MOBILE HARD CONTROL
  if (patch.mobile !== undefined) {
    let mobile = String(patch.mobile);

    mobile = mobile.replace(/\D/g, '');
    mobile = mobile.slice(0, 10);

    next.mobile = mobile;
  }

 if (patch.firstName !== undefined) {
  let first = patch.firstName.replace(/[^A-Za-z\s]/g, '');

  // split by space and take only first word
  first = first.trim().split(' ')[0];

  next.firstName = first;
}

  //  LAST NAME HARD VALIDATION
  if (patch.lastName !== undefined) {
    next.lastName = patch.lastName.replace(/[^A-Za-z]/g, '');
  }

  // Keep derived fields in sync.
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    next.fullName = buildFullName(next.firstName, next.lastName);
  }

  this.value = next;
  this.valueChange.emit(next);
}

  setStep(step: number): void {
    if (this.submitting) {
      return;
    }
    // Guard against duplicate click emissions (can cause skipping steps).
    if (this.stepNavLocked) {
      return;
    }
    this.stepNavLocked = true;
    queueMicrotask(() => {
      this.stepNavLocked = false;
    });

    this.currentStep = clamp(step, 0, this.steps.length - 1);
    this.submitAttempted = false;
  }

  prevStep(): void {
    this.setStep(this.currentStep - 1);
  }

  nextStep(): void {
    this.submitAttempted = true;
    if (!this.isCurrentStepValid()) {
      return;
    }
    this.setStep(this.currentStep + 1);
  }

  addEducation(): void {
    this.patch({ education: [...this.value.education, createEmptyEducationItem()] });
  }

  removeEducationAt(index: number): void {
    if (this.value.education.length <= 1) {
      return;
    }
    const next = this.value.education.filter((_, i) => i !== index);
    this.patch({ education: next });
  }

  patchEducationAt(index: number, patch: Partial<StudentEducationItem>): void {
    // If institution is being updated, handle campusId
    if (patch.institution) {
      // The value from API dropdown will be the campus ID (could be UUID, MongoDB ObjectId, or CAMPUS-xxx format)
      // Check if it looks like a campusId
      const value = patch.institution.trim();
      
      // Check if "Other" was selected
      if (value === 'OTHER') {
        patch.campusId = undefined;
        patch.campusAddress = undefined;
        patch.departmentId = undefined;
        patch.institution = 'OTHER';
      } else {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        const isMongoObjectId = /^[0-9a-f]{24}$/i.test(value); // MongoDB ObjectId: 24 hex characters
        const isCampusPrefix = value.startsWith('CAMPUS-');
        const isCampusId = isUUID || isMongoObjectId || isCampusPrefix || value.length > 20;
        
        if (isCampusId) {
          patch.campusId = value;
          patch.departmentId = undefined; // Clear department when institution changes
          
          // Look up campus name and address from cache (populated when fetching campuses)
          const cachedCampus = this.campusCache.get(value);
          if (cachedCampus) {
            patch.institution = cachedCampus.campusName;
            if (cachedCampus.campusAddress) {
              patch.campusAddress = cachedCampus.campusAddress;
            }
          } else {
            // If not in cache, try to find in existing campuses input
            if (this.campuses && this.campuses.length > 0) {
              const selectedCampus = this.campuses.find((c) => c.campusId === value);
              if (selectedCampus && selectedCampus.campusName) {
                patch.institution = selectedCampus.campusName;
                if (selectedCampus.campusAddress) {
                  patch.campusAddress = selectedCampus.campusAddress;
                }
                // Also cache it for future use
                this.campusCache.set(value, {
                  campusName: selectedCampus.campusName,
                  campusAddress: selectedCampus.campusAddress,
                });
              }
            }
          }
        } else {
          // Value might be from static list or typed manually
          // Try to find in existing campuses if available
          if (this.campuses && this.campuses.length > 0) {
            const selectedCampus = this.campuses.find((c) => c.campusId === value || c.campusName === value);
            if (selectedCampus && selectedCampus.campusId) {
              patch.campusId = selectedCampus.campusId;
              if (selectedCampus.campusName) {
                patch.institution = selectedCampus.campusName;
              }
              if (selectedCampus.campusAddress) {
                patch.campusAddress = selectedCampus.campusAddress;
              }
            }
          }
        }
      }
    }
    const next = this.value.education.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.patch({ education: next });

    const newCampusId = patch.campusId ?? next[index]?.campusId;
    if (newCampusId && !this.departmentCache.has(newCampusId)) {
      this.loadDepartmentsForCampus(newCampusId);
    }
  }

  private loadDepartmentsForCampus(campusId: string): void {
    this.campusApiService.getAllDepartmentsByCampus(campusId).subscribe({
      next: (res) => {
        const data = res?.data ?? unwrapApiResponse<DepartmentDropdownItem[]>(res);
        const items = Array.isArray(data)
          ? data.map((d: DepartmentDropdownItem) => ({ value: d.departmentId, label: d.departmentName }))
          : [];
        this.departmentCache.set(campusId, items);
        this.cdr.markForCheck();
      },
      error: () => {
        this.departmentCache.set(campusId, []);
        this.cdr.markForCheck();
      },
    });
  }

  getDepartmentItemsForIndex(index: number): DropdownItem<string>[] {
    const edu = this.value.education[index];
    const campusId = edu?.campusId;
    if (!campusId) return [];
    return this.departmentCache.get(campusId) ?? [];
  }
  

  // Check if "Other" is selected for a specific education item
  isOtherInstitutionSelected(index: number): boolean {
    const edu = this.value.education[index];
    if (!edu) return false;
    // If institution is "OTHER" or if there's no campusId (meaning it's a custom institution), show the input
    return edu.institution === 'OTHER' || (!edu.campusId && !!edu.institution);
  }


  // Handle custom institution name input
  onCustomInstitutionChange(index: number, customName: string): void {
    const trimmedName = customName.trim();
    // When typing in custom input, directly update the education item without going through patchEducationAt logic
    // This prevents the campus matching logic from interfering
    const next = this.value.education.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          institution: trimmedName || 'OTHER',
          campusId: undefined,
          campusAddress: undefined,
          departmentId: undefined,
        };
      }
      return item;
    });
    this.patch({ education: next });
  }

  setEducationCertificates(index: number, files: FileList): void {
    const names = fileNames(files);
    this.patchEducationAt(index, { certificateFiles: files, certificateFileNames: names });
  }

  addTechnicalSkill(): void {
    const skill = this.newTechnicalSkill.skill.trim();
    if (!skill) {
      return;
    }
    const next: StudentTechnicalSkillItem = {
      skill,
      proficiency: this.newTechnicalSkill.proficiency.trim(),
    };
    this.patch({ technicalSkills: [...this.value.technicalSkills, next] });
    this.newTechnicalSkill = { skill: '', proficiency: '' };
  }

  removeTechnicalSkillAt(index: number): void {
    this.patch({ technicalSkills: this.value.technicalSkills.filter((_, i) => i !== index) });
  }

  addSoftSkill(): void {
    const next = this.newSoftSkill.trim();
    if (!next) {
      return;
    }
    this.patch({ softSkills: uniqueStrings([...this.value.softSkills, next]) });
    this.newSoftSkill = '';
  }

  removeSoftSkillAt(index: number): void {
    this.patch({ softSkills: this.value.softSkills.filter((_, i) => i !== index) });
  }

  addLanguage(): void {
    const next = this.newLanguage.trim();
    if (!next) {
      return;
    }
    this.patch({ languagesKnown: uniqueStrings([...this.value.languagesKnown, next]) });
    this.newLanguage = '';
  }

  removeLanguageAt(index: number): void {
    this.patch({ languagesKnown: this.value.languagesKnown.filter((_, i) => i !== index) });
  }

  addWorkExperience(): void {
    this.patch({ workExperience: [...this.value.workExperience, createEmptyWorkExperienceItem()] });
  }

  removeWorkExperienceAt(index: number): void {
    if (this.value.workExperience.length <= 1) {
      return;
    }
    this.patch({ workExperience: this.value.workExperience.filter((_, i) => i !== index) });
  }

 patchWorkExperienceAt(index: number, patch: Partial<StudentWorkExperienceItem>): void {
  const item = this.value.workExperience[index];
  if (!item) return;

  let resolved = { ...item, ...patch };

  if (patch.endDate !== undefined && (patch.endDate?.trim() ?? '').length > 0) {
    resolved = { ...resolved, currentlyWorkingHere: false };
  }

  if (patch.currentlyWorkingHere === true) {
    resolved = { ...resolved, endDate: '' };
  }

  const next = this.value.workExperience.map((it, i) =>
    i === index ? resolved : it
  );

  this.patch({ workExperience: next });

  // ADD THIS LINE
  this.validateWorkExperienceDates(index);
}
  hasWorkExperienceEndDate(exp: StudentWorkExperienceItem): boolean {
    return (exp.endDate?.trim() ?? '').length > 0;
  }

  addProject(): void {
    if (this.hasAnyProjectDescriptionOverLimit()) {
      return;
    }
    this.patch({ projects: [...this.value.projects, createEmptyProjectItem()] });
  }

  hasAnyProjectDescriptionOverLimit(): boolean {
    return this.value.projects.some(
      (p) => (p.description?.length ?? 0) > this.projectDescriptionMaxLength
    );
  }

  /** True if project has projectName or description filled (trimmed non-empty). */
  projectHasContent(proj: StudentProjectItem): boolean {
    return (
      (proj.projectName?.trim().length ?? 0) > 0 ||
      (proj.description?.trim().length ?? 0) > 0
    );
  }

  /** True if any project has name/description filled but no technologies selected. */
  hasProjectWithContentButNoTechnologies(): boolean {
    return this.value.projects.some(
      (p) =>
        this.projectHasContent(p) &&
        (!p.technologiesUsed || p.technologiesUsed.length === 0)
    );
  }

  /** Step 2 is invalid if any project has content but no technologies. */
  isProjectsValid(): boolean {
    return !this.hasProjectWithContentButNoTechnologies();
  }

  /** Show Technologies as invalid when this project has content but no technologies (after submit attempt). */
  isProjectTechnologiesInvalid(projectIndex: number): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const proj = this.value.projects[projectIndex];
    if (!proj) {
      return false;
    }
    return (
      this.projectHasContent(proj) &&
      (!proj.technologiesUsed || proj.technologiesUsed.length === 0)
    );
  }

  removeProjectAt(index: number): void {
    if (this.value.projects.length <= 1) {
      return;
    }
    this.patch({ projects: this.value.projects.filter((_, i) => i !== index) });
  }

  patchProjectAt(index: number, patch: Partial<StudentProjectItem>): void {
    const next = this.value.projects.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.patch({ projects: next });
  }

  addProjectTechnologyAt(projectIndex: number): void {
    const tech = this.newProjectTechnology.trim();
    if (!tech) {
      return;
    }
    const project = this.value.projects[projectIndex];
    if (!project) {
      return;
    }
    const nextTechs = uniqueStrings([...(project.technologiesUsed ?? []), tech]);
    this.patchProjectAt(projectIndex, { technologiesUsed: nextTechs });
    this.newProjectTechnology = '';
  }

  getProjectTechnologyValue(projectIndex: number): string | null {
    return this.projectTechnologyValues[projectIndex] ?? null;
  }

  onProjectTechnologySelected(projectIndex: number, selectedTech: string): void {
    if (!selectedTech || !selectedTech.trim()) {
      return;
    }
    const project = this.value.projects[projectIndex];
    if (!project) {
      return;
    }
    const tech = selectedTech.trim();
    // Check if technology already exists
    if (project.technologiesUsed.includes(tech)) {
      // Reset dropdown even if already exists (clear input so it doesn't keep showing selection)
      this.projectTechnologyValues[projectIndex] = null;
      this.cdr.detectChanges();
      return;
    }
    const nextTechs = uniqueStrings([...(project.technologiesUsed ?? []), tech]);
    this.patchProjectAt(projectIndex, { technologiesUsed: nextTechs });
    // Reset dropdown after adding so the input clears and doesn't keep showing the selected value
    this.projectTechnologyValues[projectIndex] = null;
    this.cdr.detectChanges();
  }

  removeProjectTechnologyAt(projectIndex: number, techIndex: number): void {
    const project = this.value.projects[projectIndex];
    if (!project) {
      return;
    }
    const nextTechs = project.technologiesUsed.filter((_, i) => i !== techIndex);
    this.patchProjectAt(projectIndex, { technologiesUsed: nextTechs });
  }

  setAdditionalCertificates(files: FileList): void {
    this.patch({
      additional: {
        ...this.value.additional,
        certificateFiles: files,
        certificateFileNames: fileNames(files),
      },
    });
  }

  isRequiredInvalidText(value: string): boolean {
    return this.submitAttempted && value.trim().length === 0;
  }

  isRequiredInvalidDropdown<T extends string>(value: T | null): boolean {
    return this.submitAttempted && (!value || String(value).trim().length === 0);
  }

  isRequiredInvalidFiles(files: FileList | null): boolean {
    return this.submitAttempted && (!files || files.length === 0);
  }

  isRequiredInvalidFilesWithUrl(files: FileList | null, existingUrl: string | undefined): boolean {
    // Valid if either has new files OR has existing URL
    return this.submitAttempted && (!files || files.length === 0) && (!existingUrl || existingUrl.trim() === '');
  }

isPortfolioUrlInvalid(): boolean {
  if (!this.submitAttempted) return false;

  const s = (this.value.additional.portfolioUrl ?? '').trim();

  // optional field → empty is allowed
  if (s.length === 0) return false;

  // if provided → must be valid URL
  return !isValidUrl(s);
}


  isOffersInHandInvalid(): boolean {
    return this.submitAttempted && this.value.additional.offersInHand === null;
  }

  isEducationFieldInvalid(
    index: number,
    field: keyof Pick<
      StudentEducationItem,
      'qualification' | 'institution' | 'degree' | 'specialization' | 'yearOfPassing' | 'percentageOrCgpa'
    >,
  ): boolean {
    const item = this.value.education[index];
    if (!item) {
      return false;
    }
    const val = String(item[field] ?? '').trim();
    if (field === 'percentageOrCgpa') {
      return this.isPercentageOrCgpaInvalid(index);
    }
    return this.submitAttempted && val.length === 0;
  }

  /** Invalid when empty or when value does not match Percentage/Grade/CGPA pattern. */
  isPercentageOrCgpaInvalid(index: number): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const item = this.value.education[index];
    if (!item) {
      return false;
    }
    const val = String(item.percentageOrCgpa ?? '').trim();
    if (val.length === 0) {
      return true;
    }
    return !this.percentageOrCgpaPattern.test(val);
  }

  isWorkExperienceFieldInvalid(
    index: number,
    field: keyof Pick<StudentWorkExperienceItem, 'companyName' | 'role' | 'startDate' | 'endDate'>,
  ): boolean {
    const item = this.value.workExperience[index];
    if (!item) {
      return false;
    }
    if (field === 'endDate' && item.currentlyWorkingHere) {
      return false;
    }
    const val = String(item[field] ?? '').trim();
    return this.submitAttempted && val.length === 0;
  }

  private validateWorkExperienceDates(index: number): void {
  const exp = this.value.workExperience[index];
  if (!exp) return;

  const start = parseDateInput(exp.startDate);
  const end = parseDateInput(exp.endDate);
  const today = startOfDay(new Date());

  // Clear previous error
  delete this.workDateErrors[index];

  if (start && start > today) {
    this.workDateErrors[index] = 'Start date cannot be in the future.';
    return;
  }

  if (start && end && start > end) {
    this.workDateErrors[index] = 'Start date cannot be after End date.';
    return;
  }
}

workDateErrors: Record<number, string> = {};

  submit(): void {
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    this.submitAttempted = true;
    if (!this.isFormValid()) {
      return;
    }
    this.submitted.emit(this.value);
  }

  emitReviewAction(status: EnumLoginStatus): void {
    this.reviewAction.emit(status);
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: {
       const mobile = (this.value.mobile || '').trim();

return (
!this.isNameInvalid(this.value.firstName, true) &&
!this.isNameInvalid(this.value.lastName, false) &&
  this.value.dateOfBirth.trim().length > 0 &&
  isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
  !!this.value.gender &&
  mobile.length > 0 &&
  !this.isMobileInvalid() &&
  this.value.email.trim().length > 0 &&
  this.value.address.trim().length > 0 &&
  this.value.profileSummary.trim().length > 0 &&
  !!this.value.photoFiles &&
  this.value.photoFiles.length > 0 &&
  this.isPhotoDimensionValid()
);

      }
      case 1:
        return this.isEducationValid();
    case 2:
  return (
    this.isWorkPreferencesValid() &&
    !this.hasAnyProjectDescriptionOverLimit() &&
    this.isProjectsValid() &&
    Object.keys(this.workDateErrors).length === 0
  );
      case 3:
        return this.isAdditionalValid();
      default:
        return true;
    }
  }

  private isFormValid(): boolean {
    // Basic required checks; we can tighten once backend contract is confirmed.
    const isEditModeValidation = this.isReviewMode && this.isEditMode;
    // Check if photo is valid: either new files uploaded OR existing photoUrl present OR in edit mode
    const hasValidPhoto = isEditModeValidation || 
                         (!!this.value.photoFiles && this.value.photoFiles.length > 0) || 
                         (this.isEditModeDisplay && !!this.value.photoUrl && this.value.photoUrl.trim().length > 0);
  return (
  !this.isNameInvalid(this.value.firstName, true) &&
  !this.isNameInvalid(this.value.lastName, false) &&
  this.value.dateOfBirth.trim().length > 0 &&
  isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
  !!this.value.gender &&
  this.value.mobile.trim().length > 0 &&
  !this.isMobileInvalid() &&
  this.value.email.trim().length > 0 &&
  this.value.address.trim().length > 0 &&
  this.value.profileSummary.trim().length > 0 &&
  hasValidPhoto &&
  this.isEducationValid() &&
  this.isWorkPreferencesValid() &&
  this.isProjectsValid() &&
  this.isAdditionalValid() &&
  !this.isExpectedSalaryInvalid() &&
  Object.keys(this.workDateErrors).length === 0
);
  }

  isDobTooYoung(): boolean {
    return this.value.dateOfBirth.trim().length > 0 && !isAtLeastAgeYears(this.value.dateOfBirth, 15);
  }

 isDobInvalid(): boolean {
  if (!this.submitAttempted) return false;

  const dobStr = this.value.dateOfBirth.trim();
  if (!dobStr) return true;

  const dob = parseDateInput(dobStr);
  if (!dob) return true;

  const today = startOfDay(new Date());

  if (dob > today) return true;

  if (!isAtLeastAgeYears(dobStr, 15)) return true;

  return false;
}

  isExpectedSalaryInvalid(): boolean {
  if (!this.submitAttempted) return false;

  const salaryStr = (this.value.workPreferences.expectedSalary || '').trim();
  const salary = Number(salaryStr);

  if (!salaryStr) return true;          // empty
  if (!Number.isFinite(salary)) return true; // not number
  if (salary <= 0) return true;         // negative or zero

  return false;
}


isMobileInvalid(): boolean {
  if (!this.submitAttempted) return false;

  const mobile = (this.value.mobile || '').trim();

  // must be digits only
  if (!/^\d+$/.test(mobile)) return true;

  // must be exactly 10 digits
  if (mobile.length !== 10) return true;

  // must start with 6–9
  if (!/^[6-9]/.test(mobile)) return true;

  // block fake patterns
  if (/^(\d)\1{9}$/.test(mobile)) return true; // 0000000000, 9999999999 etc

  if (mobile === '1234567890') return true;

  return false;
}

  isMobileNotTenDigits(): boolean {
    const mobile = this.value.mobile.trim();
    if (mobile.length === 0) {
      return false;
    }
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length !== 10;
  }

  private isEducationValid(): boolean {
    if (this.value.education.length === 0) {
      return false;
    }
    return this.value.education.every((e) => {
      const pct = e.percentageOrCgpa.trim();
      const pctValid = pct.length > 0 && this.percentageOrCgpaPattern.test(pct);
      return (
        e.qualification.trim().length > 0 &&
        e.institution.trim().length > 0 &&
        e.degree.trim().length > 0 &&
        e.specialization.trim().length > 0 &&
        e.yearOfPassing.trim().length > 0 &&
        pctValid
      );
    });
  }

private isWorkPreferencesValid(): boolean {
  const wp = this.value.workPreferences;
  const isEditModeValidation = this.isReviewMode && this.isEditMode;

  const oneSelected =
    wp.employmentType.internship ||
    wp.employmentType.fullTime ||
    wp.employmentType.both;

  return (
    (isEditModeValidation || wp.jobRolesInterested.trim().length > 0) &&
    (isEditModeValidation || wp.preferredLocation.trim().length > 0) &&
    (isEditModeValidation || wp.availabilityToStart.trim().length > 0) &&
(isEditModeValidation || !this.isExpectedSalaryInvalid()) &&
    oneSelected
  );
}

  private isAdditionalValid(): boolean {
    const isEditModeValidation = this.isReviewMode && this.isEditMode;
    // Check if files are valid: either new files uploaded OR existing URLs present OR in edit mode
    const hasValidGovtIdProof = isEditModeValidation ||
                                (!!this.value.additional.govtIdProofFiles && this.value.additional.govtIdProofFiles.length > 0) ||
                                (this.isEditModeDisplay && !!this.value.additional.govtIdProofUrl && this.value.additional.govtIdProofUrl.trim().length > 0);
    const hasValidResume = isEditModeValidation ||
                          (!!this.value.additional.resumeFiles && this.value.additional.resumeFiles.length > 0) ||
                          (this.isEditModeDisplay && !!this.value.additional.resumeUrl && this.value.additional.resumeUrl.trim().length > 0);
const portfolioValid = !this.isPortfolioUrlInvalid();
    const optionalUrlValid =
      !isOptionalUrlInvalid(this.value.photoUrl) &&
      !isOptionalUrlInvalid(this.value.additional.govtIdProofUrl) &&
      !isOptionalUrlInvalid(this.value.additional.resumeUrl);
    return (
      hasValidGovtIdProof &&
      hasValidResume &&
      portfolioValid &&
      optionalUrlValid &&
      (isEditModeValidation || this.value.additional.offersInHand !== null) &&
      (isEditModeValidation || this.value.additional.heardAboutPortal.trim().length > 0) &&
      (isEditModeValidation || this.value.additional.jobAlertsVia.trim().length > 0) &&
      (isEditModeValidation || this.value.additional.agreeToTerms)
    );
  }
}


function buildFullName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(' ').trim();
}



function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fileNames(files: FileList): readonly string[] {
  return Array.from(files)
    .map((f) => f.name)
    .filter((name) => name.length > 0);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = v.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function isAtLeastAgeYears(dateStr: string, ageYears: number): boolean {
  const dob = parseDateInput(dateStr);
  if (!dob) {
    return false;
  }
  const today = startOfDay(new Date());
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - ageYears);
  // If born on the cutoff day or earlier => meets minimum age.
  return dob.getTime() <= cutoff.getTime();
}

function parseDateInput(value: string): Date | null {
  // input[type=date] yields YYYY-MM-DD
  const parts = value.split('-');
  if (parts.length !== 3) {
    return null;
  }
  const [yStr, mStr, dStr] = parts;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  // Create local date at start of day.
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return startOfDay(dt);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

