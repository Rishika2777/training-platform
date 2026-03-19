import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { SalaryInputComponent } from '../../../../shared/components/salary-input/salary-input.component';
import { getSalaryAmount } from '../../../../shared/utils/salary.utils';

export interface CurrentVacancyFormValue {
  // Job Details
  jobTitle: string;
  jobType: string;
  contractDuration: string;
  jobLocation: string;
  salary: string;
  jobDescription: string;
  department: string;
  numberOfOpenings: string;
  // Eligibility Criteria
  requiredQualifications: string;
  streamsEligible: string;
  yearOfPassing: string;
  minimumCGPA: string;
  // Selection Process
  selectionRounds: {
    aptitudeTest: boolean;
    groupDiscussion: boolean;
    faceToFace: boolean;
    all: boolean;
  };
  modeOfSelection: {
    online: boolean;
    offline: boolean;
    both: boolean;
  };
}

@Component({
  selector: 'app-company-current-vacancy',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent, SalaryInputComponent],
  templateUrl: './company-current-vacancy.component.html',
  styleUrl: './company-current-vacancy.component.css',
})
export class CompanyCurrentVacancyComponent {
  @Input() submitting = false;
  @Input() value: CurrentVacancyFormValue = {
    jobTitle: '',
    jobType: '',
    contractDuration: '',
    jobLocation: '',
    salary: '',
    jobDescription: '',
    department: '',
    numberOfOpenings: '',
    requiredQualifications: '',
    streamsEligible: '',
    yearOfPassing: '',
    minimumCGPA: '',
    selectionRounds: {
      aptitudeTest: false,
      groupDiscussion: false,
      faceToFace: false,
      all: false,
    },
    modeOfSelection: {
      online: false,
      offline: false,
      both: false,
    },
  };

  @Output() valueChange = new EventEmitter<CurrentVacancyFormValue>();
  @Output() submitted = new EventEmitter<CurrentVacancyFormValue>();

  readonly salaryError = signal<string | null>(null);
  readonly modeError = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, boolean>>({});

  private getEmptyForm(): CurrentVacancyFormValue {
  return {
    jobTitle: '',
    jobType: '',
    contractDuration: '',
    jobLocation: '',
    salary: '',
    jobDescription: '',
    department: '',
    numberOfOpenings: '',
    requiredQualifications: '',
    streamsEligible: '',
    yearOfPassing: '',
    minimumCGPA: '',
    selectionRounds: {
      aptitudeTest: false,
      groupDiscussion: false,
      faceToFace: false,
      all: false,
    },
    modeOfSelection: {
      online: false,
      offline: false,
      both: false,
    },
  };
}
  readonly jobTitleItems: readonly DropdownItem<string>[] = [
    { label: 'Software Engineer', value: 'software-engineer' },
    { label: 'Product Manager', value: 'product-manager' },
    { label: 'Data Analyst', value: 'data-analyst' },
    { label: 'UI/UX Designer', value: 'ui-ux-designer' },
  ];

  readonly jobTypeItems: readonly DropdownItem<string>[] = [
    { label: 'Full-time', value: 'full-time' },
    { label: 'Part-time', value: 'part-time' },
    { label: 'Contract', value: 'contract' },
    { label: 'Internship', value: 'internship' },
  ];

  readonly contractDurationItems: readonly DropdownItem<string>[] = [
    { label: '6 months', value: '6-months' },
    { label: '1 year', value: '1-year' },
    { label: '2 years', value: '2-years' },
    { label: 'Permanent', value: 'permanent' },
  ];

  readonly jobLocationItems: readonly DropdownItem<string>[] = [
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'On-site', value: 'on-site' },
  ];

  readonly departmentItems: readonly DropdownItem<string>[] = [
    { label: 'Engineering', value: 'engineering' },
    { label: 'Product', value: 'product' },
    { label: 'Design', value: 'design' },
    { label: 'Marketing', value: 'marketing' },
  ];

  readonly numberOfOpeningsItems: readonly DropdownItem<string>[] = [
    { label: '1', value: '1' },
    { label: '2-5', value: '2-5' },
    { label: '5-10', value: '5-10' },
    { label: '10+', value: '10+' },
  ];

  readonly qualificationsItems: readonly DropdownItem<string>[] = [
    { label: 'B.Tech', value: 'btech' },
    { label: 'M.Tech', value: 'mtech' },
    { label: 'B.Sc', value: 'bsc' },
    { label: 'M.Sc', value: 'msc' },
  ];

  readonly streamsItems: readonly DropdownItem<string>[] = [
    { label: 'Computer Science', value: 'cs' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Mechanical', value: 'mechanical' },
  ];

  /** Year options: current year and 5 years back (6 years total) */
  readonly yearItems: readonly DropdownItem<string>[] = (() => {
    const currentYear = new Date().getFullYear();
    const years: DropdownItem<string>[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ label: y.toString(), value: y.toString() });
    }
    return years;
  })();

  updateField(field: keyof CurrentVacancyFormValue, value: string): void {
    if (field === 'salary') {
      this.salaryError.set(null);
    }

    const next = { ...this.value, [field]: value };
    this.value = next;

    // Clear any existing validation error for this field when user updates it
    const currentErrors = { ...this.fieldErrors() };
    if (currentErrors[field as string]) {
      delete currentErrors[field as string];
      this.fieldErrors.set(currentErrors);
    }

    this.valueChange.emit(next);
  }

  toggleSelectionRound(round: keyof CurrentVacancyFormValue['selectionRounds']): void {
    const selectionRounds = { ...this.value.selectionRounds };
    selectionRounds[round] = !selectionRounds[round];
    const next = { ...this.value, selectionRounds };
    this.value = next;
    this.valueChange.emit(next);
  }

  toggleModeOfSelection(mode: keyof CurrentVacancyFormValue['modeOfSelection']): void {
    this.modeError.set(null);
    const modeOfSelection = {
      online: false,
      offline: false,
      both: false,
      [mode]: true
    };
    const next = { ...this.value, modeOfSelection };
    this.value = next;
    this.valueChange.emit(next);
  }
  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onButtonClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('CompanyCurrentVacancyComponent: onButtonClick() called');
    this.submit();
  }

private validateRequiredFields(): boolean {
  const errors: Record<string, boolean> = {};

  const requiredFields: (keyof CurrentVacancyFormValue)[] = [
    'jobTitle',
    'jobType',
    'contractDuration',
    'jobLocation',
    // salary handled via numeric validation below
    'jobDescription',
    'department',
    'numberOfOpenings',
    'requiredQualifications',
    'streamsEligible',
    'yearOfPassing',
    'minimumCGPA'
  ];

  requiredFields.forEach(field => {
    const value = this.value[field];
    if (!value || !value.toString().trim()) {
      errors[field] = true;
    }
  });

  const rounds = this.value.selectionRounds;
  if (!rounds.aptitudeTest && !rounds.groupDiscussion && !rounds.faceToFace && !rounds.all) {
    errors['selectionRounds'] = true;
  }

  const mode = this.value.modeOfSelection;
  if (!mode.online && !mode.offline && !mode.both) {
    errors['modeOfSelection'] = true;
  }

  this.fieldErrors.set(errors);
  return Object.keys(errors).length === 0;
}


  submit(): void {
  this.salaryError.set(null);
  this.modeError.set(null);

  const errors: Record<string, boolean> = {};

  // ================= REQUIRED FIELD VALIDATION =================
  const requiredFields: (keyof CurrentVacancyFormValue)[] = [
    'jobTitle',
    'jobType',
    'contractDuration',
    'jobLocation',
    // salary handled via numeric validation below
    'jobDescription',
    'department',
    'numberOfOpenings',
    'requiredQualifications',
    'streamsEligible',
    'yearOfPassing',
    'minimumCGPA'
  ];

  requiredFields.forEach(field => {
    const value = this.value[field];
    if (!value || !value.toString().trim()) {
      errors[field] = true;
    }
  });

  // Selection Rounds required
  const rounds = this.value.selectionRounds;
  if (!rounds.aptitudeTest && !rounds.groupDiscussion && !rounds.faceToFace && !rounds.all) {
    errors['selectionRounds'] = true;
  }

  // Mode required
  const mode = this.value.modeOfSelection;
  if (!mode.online && !mode.offline && !mode.both) {
    errors['modeOfSelection'] = true;
  }

  this.fieldErrors.set(errors);

  if (Object.keys(errors).length > 0) {
    return;
  }

  // ================= SALARY NUMBER VALIDATION =================
  const salary = getSalaryAmount(this.value.salary);

  if (isNaN(salary)) {
    this.salaryError.set('Enter a valid salary amount');
    return;
  }

  if (salary <= 0) {
    this.salaryError.set('Salary must be greater than 0');
    return;
  }

  // ================= SUCCESS =================
  this.submitted.emit(this.value);
}

  /** Call this from parent after successful submit to clear the form. */
  resetForm(): void {
    this.salaryError.set(null);
    this.modeError.set(null);
    this.value = this.getEmptyForm();
    this.valueChange.emit(this.value);
  }
}
