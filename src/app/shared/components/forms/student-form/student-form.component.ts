import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  projectUrl: string;
  githubUrl: string;
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
  about: string;

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
    about: '',

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
  return { projectName: '', description: '', projectUrl: '', githubUrl: '', technologiesUsed: [] };
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

  @Output() valueChange = new EventEmitter<StudentFormValue>();
  @Output() submitted = new EventEmitter<StudentFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() reviewAction = new EventEmitter<EnumLoginStatus>();

  readonly steps = ['Personal Info', 'Education', 'Skills & Experience', 'Additional'] as const;
  currentStep = 0;
  submitAttempted = false;
  private stepNavLocked = false;

  get isReviewMode(): boolean {
    return this.mode === 'review';
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

  // Draft inputs for tag-like lists
  newTechnicalSkill: StudentTechnicalSkillItem = { skill: '', proficiency: '' };
  newSoftSkill = '';
  newLanguage = '';
  newProjectTechnology = '';

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
    if (this.isReviewMode) {
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
    if (this.isReviewMode) {
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
      case 0:
        return (
          this.value.firstName.trim().length > 0 &&
          this.value.dateOfBirth.trim().length > 0 &&
          isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
          !!this.value.gender &&
          this.value.mobile.trim().length > 0 &&
          this.value.email.trim().length > 0
        );
      case 1:
        return this.isEducationValid();
      case 2:
        return this.isWorkExperienceValid();
      case 3:
        return this.isAdditionalValid();
      default:
        return true;
    }
  }

  private isFormValid(): boolean {
    // Basic required checks; we can tighten once backend contract is confirmed.
    return (
      this.value.firstName.trim().length > 0 &&
      this.value.dateOfBirth.trim().length > 0 &&
      isAtLeastAgeYears(this.value.dateOfBirth, 15) &&
      !!this.value.gender &&
      this.value.mobile.trim().length > 0 &&
      this.value.email.trim().length > 0 &&
      this.isEducationValid() &&
      this.isWorkExperienceValid() &&
      this.isAdditionalValid()
    );
  }

  isDobTooYoung(): boolean {
    return this.value.dateOfBirth.trim().length > 0 && !isAtLeastAgeYears(this.value.dateOfBirth, 15);
  }

  isDobInvalid(): boolean {
    return this.submitAttempted && (this.value.dateOfBirth.trim().length === 0 || this.isDobTooYoung());
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

  private isWorkExperienceValid(): boolean {
    if (this.value.workExperience.length === 0) {
      return false;
    }
    return this.value.workExperience.every((e) => {
      const baseOk =
        e.companyName.trim().length > 0 && e.role.trim().length > 0 && e.startDate.trim().length > 0;
      if (!baseOk) {
        return false;
      }
      if (e.currentlyWorkingHere) {
        return true;
      }
      return e.endDate.trim().length > 0;
    });
  }

  private isAdditionalValid(): boolean {
    return (
      !!this.value.additional.govtIdProofFiles &&
      this.value.additional.govtIdProofFiles.length > 0 &&
      !!this.value.additional.resumeFiles &&
      this.value.additional.resumeFiles.length > 0 &&
      this.value.additional.offersInHand !== null &&
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


