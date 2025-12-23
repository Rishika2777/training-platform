import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

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
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent],
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

  readonly yearItems: readonly DropdownItem<string>[] = [
    { label: '2024', value: '2024' },
    { label: '2025', value: '2025' },
    { label: '2026', value: '2026' },
  ];

  updateField(field: keyof CurrentVacancyFormValue, value: string): void {
    const next = { ...this.value, [field]: value };
    this.value = next;
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
    const modeOfSelection = { ...this.value.modeOfSelection };
    modeOfSelection[mode] = !modeOfSelection[mode];
    const next = { ...this.value, modeOfSelection };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    this.submitted.emit(this.value);
  }
}
