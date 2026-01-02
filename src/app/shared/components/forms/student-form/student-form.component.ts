import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';
import { DropdownComponent, DropdownItem } from '../../dropdown/dropdown.component';
import { InputComponent } from '../../input/input.component';
import { StepIndicatorComponent } from '../../step-indicator/step-indicator.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';

type YesNo = 'yes' | 'no';
type Gender = 'male' | 'female' | 'other';

export interface StudentEducationItem {
  qualification: string;
  institution: string;
  degree: string;
  specialization: string;
  yearOfPassing: string;
  percentageOrCgpa: string;
  certificateFiles: FileList | null;
  certificateFileNames: readonly string[];
}

export interface StudentTechnicalSkillItem {
  skill: string;
  proficiency: string; // keep as string; backend parsing can be done later
}

export interface StudentWorkExperienceItem {
  companyName: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyWorkingHere: boolean;
}

export interface StudentProjectItem {
  projectName: string;
  description: string;
  technologiesUsed: readonly string[];
}

export interface StudentWorkPreferences {
  jobRolesInterested: string;
  preferredLocation: string;
  availabilityToStart: string;
  expectedSalary: string;
  employmentType: {
    internship: boolean;
    fullTime: boolean;
    both: boolean;
  };
}

export interface StudentAdditionalInfo {
  govtIdProofFiles: FileList | null;
  resumeFiles: FileList | null;
  certificateFiles: FileList | null;
  certificateFileNames: readonly string[];
  portfolioUrl: string;
  otherWebsites: string;
  offersInHand: YesNo | null;
  heardAboutPortal: string;
  jobAlertsVia: string;
  agreeToTerms: boolean;
}

export interface StudentFormValue {
  // Existing minimal fields used by current API call:
  fullName: string;
  email: string;

  // Multi-step fields:
  firstName: string;
  lastName: string;
  photoFiles: FileList | null;
  dateOfBirth: string;
  gender: Gender | null;
  mobile: string;
  address: string;
  profileSummary: string;

  education: StudentEducationItem[];
  technicalSkills: StudentTechnicalSkillItem[];
  softSkills: readonly string[];
  languagesKnown: readonly string[];
  workPreferences: StudentWorkPreferences;
  workExperience: StudentWorkExperienceItem[];
  projects: StudentProjectItem[];
  additional: StudentAdditionalInfo;
}

export function createEmptyStudentFormValue(seed?: Partial<StudentFormValue>): StudentFormValue {
  const base: StudentFormValue = {
    fullName: '',
    email: '',

    firstName: '',
    lastName: '',
    photoFiles: null,
    dateOfBirth: '',
    gender: null,
    mobile: '',
    address: '',
    profileSummary: '',

    education: [createEmptyEducationItem()],
    technicalSkills: [],
    softSkills: [],
    languagesKnown: [],
    workPreferences: createEmptyWorkPreferences(),
    workExperience: [createEmptyWorkExperienceItem()],
    projects: [createEmptyProjectItem()],
    additional: createEmptyAdditionalInfo(),
  };

  return { ...base, ...seed };
}

function createEmptyEducationItem(): StudentEducationItem {
  return {
    qualification: '',
    institution: '',
    degree: '',
    specialization: '',
    yearOfPassing: '',
    percentageOrCgpa: '',
    certificateFiles: null,
    certificateFileNames: [],
  };
}

function createEmptyWorkPreferences(): StudentWorkPreferences {
  return {
    jobRolesInterested: '',
    preferredLocation: '',
    availabilityToStart: '',
    expectedSalary: '',
    employmentType: { internship: false, fullTime: false, both: false },
  };
}

function createEmptyWorkExperienceItem(): StudentWorkExperienceItem {
  return { companyName: '', role: '', startDate: '', endDate: '', currentlyWorkingHere: false };
}

function createEmptyProjectItem(): StudentProjectItem {
  return { projectName: '', description: '', technologiesUsed: [] };
}

function createEmptyAdditionalInfo(): StudentAdditionalInfo {
  return {
    govtIdProofFiles: null,
    resumeFiles: null,
    certificateFiles: null,
    certificateFileNames: [],
    portfolioUrl: '',
    otherWebsites: '',
    offersInHand: null,
    heardAboutPortal: '',
    jobAlertsVia: '',
    agreeToTerms: false,
  };
}

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
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.css',
})
export class StudentFormComponent {
  @Input() submitting = false;
  @Input() value: StudentFormValue = createEmptyStudentFormValue();
  @Input() emailLocked = false;
  @Input() mode: 'create' | 'review' = 'create';
  @Input() approveDisabled = false;
  @Input() isEditMode = false;

  @Output() valueChange = new EventEmitter<StudentFormValue>();
  @Output() submitted = new EventEmitter<StudentFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();

  readonly steps = ['Personal Info', 'Education', 'Skills & Experience', 'Additional'] as const;
  
  private readonly cdr = inject(ChangeDetectorRef);
  currentStep = 0;
  submitAttempted = false;
  private stepNavLocked = false;

  get isReviewMode(): boolean {
    return this.mode === 'review';
  }

  get isFieldsDisabled(): boolean {
    return this.submitting || (this.isReviewMode && !this.isEditMode);
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
    { label: 'Other', value: 'Other' },
  ];

  readonly jobAlertsViaItems: readonly DropdownItem<string>[] = [
    { label: 'Email', value: 'Email' },
    { label: 'SMS', value: 'SMS' },
    { label: 'Email & SMS', value: 'Email & SMS' },
  ];

  // Education dropdown items
  readonly qualificationItems: readonly DropdownItem<string>[] = [
    { label: '10th', value: '10th' },
    { label: '12th', value: '12th' },
    { label: 'Diploma', value: 'Diploma' },
    { label: 'Bachelor\'s Degree', value: 'Bachelor\'s Degree' },
    { label: 'Master\'s Degree', value: 'Master\'s Degree' },
    { label: 'PhD', value: 'PhD' },
    { label: 'Other', value: 'Other' },
  ];

  readonly institutionItems: readonly DropdownItem<string>[] = [
    { label: 'University of Technology', value: 'University of Technology' },
    { label: 'State University', value: 'State University' },
    { label: 'Private University', value: 'Private University' },
    { label: 'Institute of Technology', value: 'Institute of Technology' },
    { label: 'Other', value: 'Other' },
  ];

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
    { label: 'Other', value: 'Other' },
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
    { label: 'Other', value: 'Other' },
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
    { label: 'Other', value: 'Other' },
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
    { label: 'Other', value: 'Other' },
  ];

  readonly languageItems: readonly DropdownItem<string>[] = [
    { label: 'English', value: 'English' },
    { label: 'Hindi', value: 'Hindi' },
    { label: 'Spanish', value: 'Spanish' },
    { label: 'French', value: 'French' },
    { label: 'German', value: 'German' },
    { label: 'Mandarin', value: 'Mandarin' },
    { label: 'Japanese', value: 'Japanese' },
    { label: 'Other', value: 'Other' },
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
    { label: 'Other', value: 'Other' },
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
    { label: 'Other', value: 'Other' },
  ];

  // Work experience dropdown items
  readonly workExperienceRoleItems: readonly DropdownItem<string>[] = [
    { label: 'Software Developer', value: 'Software Developer' },
    { label: 'Senior Software Developer', value: 'Senior Software Developer' },
    { label: 'Software Engineer', value: 'Software Engineer' },
    { label: 'Junior Developer', value: 'Junior Developer' },
    { label: 'Intern', value: 'Intern' },
    { label: 'Other', value: 'Other' },
  ];

  // Project technologies dropdown items
  readonly projectTechnologyItems: readonly DropdownItem<string>[] = [
    { label: 'React', value: 'REACT' },
    { label: 'Angular', value: 'ANGULAR' },
    { label: 'Vue.js', value: 'VUEJS' },
    { label: 'Node.js', value: 'NODEJS' },
    { label: 'Python', value: 'PYTHON' },
    { label: 'Java', value: 'JAVA' },
    { label: 'Spring Boot', value: 'SPRINGBOOT' },
    { label: 'Django', value: 'DJANGO' },
    { label: 'MongoDB', value: 'MONGODB' },
    { label: 'PostgreSQL', value: 'POSTGRESQL' },
    { label: 'Other', value: 'Other' },
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
    const current = this.value.workPreferences.employmentType[key];
    this.patch({
      workPreferences: {
        ...this.value.workPreferences,
        employmentType: {
          ...this.value.workPreferences.employmentType,
          [key]: !current,
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

  patch(patch: Partial<StudentFormValue>): void {
    if (this.isReviewMode && !this.isEditMode) {
      return;
    }
    const next: StudentFormValue = { ...this.value, ...patch };

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
    const next = this.value.education.map((item, i) => (i === index ? { ...item, ...patch } : item));
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
    const next = this.value.workExperience.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    this.patch({ workExperience: next });
  }

  addProject(): void {
    this.patch({ projects: [...this.value.projects, createEmptyProjectItem()] });
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
      // Reset dropdown even if already exists
      this.projectTechnologyValues[projectIndex] = null;
      this.cdr.markForCheck();
      return;
    }
    const nextTechs = uniqueStrings([...(project.technologiesUsed ?? []), tech]);
    this.patchProjectAt(projectIndex, { technologiesUsed: nextTechs });
    // Reset dropdown after adding
    this.projectTechnologyValues[projectIndex] = null;
    this.cdr.markForCheck();
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

  isOffersInHandInvalid(): boolean {
    return this.submitAttempted && this.value.additional.offersInHand === null;
  }

  isEducationFieldInvalid(
    index: number,
    field: keyof Pick<
      StudentEducationItem,
      'qualification' | 'institution' | 'degree' | 'specialization' | 'yearOfPassing'
    >,
  ): boolean {
    const item = this.value.education[index];
    if (!item) {
      return false;
    }
    const val = String(item[field] ?? '').trim();
    return this.submitAttempted && val.length === 0;
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

  private isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: {
        const mobileDigits = this.value.mobile.trim().replace(/\D/g, '');
        return (
          this.value.firstName.trim().length > 0 &&
          this.value.lastName.trim().length > 0 &&
          this.value.dateOfBirth.trim().length > 0 &&
          isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
          !!this.value.gender &&
          this.value.mobile.trim().length > 0 &&
          mobileDigits.length === 10 &&
          this.value.email.trim().length > 0 &&
          this.value.address.trim().length > 0 &&
          this.value.profileSummary.trim().length > 0 &&
          !!this.value.photoFiles &&
          this.value.photoFiles.length > 0
        );
      }
      case 1:
        return this.isEducationValid();
      case 2:
        return this.isWorkPreferencesValid();
      case 3:
        return this.isAdditionalValid();
      default:
        return true;
    }
  }

  private isFormValid(): boolean {
    // Basic required checks; we can tighten once backend contract is confirmed.
    const mobileDigits = this.value.mobile.trim().replace(/\D/g, '');
    const isEditModeValidation = this.isReviewMode && this.isEditMode;
    return (
      this.value.firstName.trim().length > 0 &&
      this.value.lastName.trim().length > 0 &&
      this.value.dateOfBirth.trim().length > 0 &&
      isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
      !!this.value.gender &&
      this.value.mobile.trim().length > 0 &&
      mobileDigits.length === 10 &&
      this.value.email.trim().length > 0 &&
      this.value.address.trim().length > 0 &&
      this.value.profileSummary.trim().length > 0 &&
      (isEditModeValidation || (!!this.value.photoFiles && this.value.photoFiles.length > 0)) &&
      this.isEducationValid() &&
      this.isWorkPreferencesValid() &&
      this.isAdditionalValid()
    );
  }

  isDobTooYoung(): boolean {
    return this.value.dateOfBirth.trim().length > 0 && !isAtLeastAgeYears(this.value.dateOfBirth, 15);
  }

  isDobInvalid(): boolean {
    return this.submitAttempted && (this.value.dateOfBirth.trim().length === 0 || this.isDobTooYoung());
  }

  isMobileInvalid(): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const mobile = this.value.mobile.trim();
    if (mobile.length === 0) {
      return true;
    }
    // Check if mobile is exactly 10 digits
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length !== 10;
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
      return (
        e.qualification.trim().length > 0 &&
        e.institution.trim().length > 0 &&
        e.degree.trim().length > 0 &&
        e.specialization.trim().length > 0 &&
        e.yearOfPassing.trim().length > 0
      );
    });
  }

  private isWorkPreferencesValid(): boolean {
    return (
      this.value.workPreferences.jobRolesInterested.trim().length > 0 &&
      this.value.workPreferences.preferredLocation.trim().length > 0 &&
      this.value.workPreferences.availabilityToStart.trim().length > 0 &&
      this.value.workPreferences.expectedSalary.trim().length > 0
    );
  }

  private isAdditionalValid(): boolean {
    const isEditModeValidation = this.isReviewMode && this.isEditMode;
    return (
      (isEditModeValidation || (!!this.value.additional.govtIdProofFiles && this.value.additional.govtIdProofFiles.length > 0)) &&
      (isEditModeValidation || (!!this.value.additional.resumeFiles && this.value.additional.resumeFiles.length > 0)) &&
      this.value.additional.portfolioUrl.trim().length > 0 &&
      this.value.additional.offersInHand !== null &&
      this.value.additional.heardAboutPortal.trim().length > 0 &&
      this.value.additional.jobAlertsVia.trim().length > 0 &&
      this.value.additional.agreeToTerms
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


