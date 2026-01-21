import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';

export interface InvitationFormValue {
  // Campus Details
  campusName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  contactPersonDesignation: string;
  campusWebsiteUrl: string;
  campusAddress: string;
  campusProspectus: File | null;
  // Placement Drive Invitation Details
  academicYear: string;
  programsOffered: string;
  proposedDate: string;
  preferredSkills: string;
  facilitiesAvailable: string;
  // Confirmation
  confirmationChecked: boolean;
}

@Component({
  selector: 'app-company-invitation-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent, TextareaComponent],
  templateUrl: './company-invitation-form.component.html',
  styleUrl: './company-invitation-form.component.css',
})
export class CompanyInvitationFormComponent {
  @ViewChild('prospectusFileInput') prospectusFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: InvitationFormValue = {
    campusName: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonPhone: '',
    contactPersonDesignation: '',
    campusWebsiteUrl: '',
    campusAddress: '',
    campusProspectus: null,
    academicYear: '',
    programsOffered: '',
    proposedDate: '',
    preferredSkills: '',
    facilitiesAvailable: '',
    confirmationChecked: false,
  };

  @Output() valueChange = new EventEmitter<InvitationFormValue>();
  @Output() submitted = new EventEmitter<InvitationFormValue>();

  submitAttempted = false;

  // Dropdown options
  readonly academicYearOptions: DropdownItem[] = [
    { label: '2024-2025', value: '2024-2025' },
    { label: '2025-2026', value: '2025-2026' },
    { label: '2026-2027', value: '2026-2027' },
    { label: '2027-2028', value: '2027-2028' },
  ];

  readonly programsOfferedOptions: DropdownItem[] = [
    { label: 'B.Tech', value: 'btech' },
    { label: 'M.Tech', value: 'mtech' },
    { label: 'B.Sc', value: 'bsc' },
    { label: 'M.Sc', value: 'msc' },
    { label: 'MBA', value: 'mba' },
  ];

  readonly preferredSkillsOptions: DropdownItem[] = [
    { label: 'Java', value: 'java' },
    { label: 'Python', value: 'python' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'React', value: 'react' },
    { label: 'Angular', value: 'angular' },
    { label: 'Node.js', value: 'nodejs' },
    { label: 'SQL', value: 'sql' },
    { label: 'Cloud Computing', value: 'cloud' },
  ];

  patch(patch: Partial<InvitationFormValue>): void {
    const next: InvitationFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerProspectusSelect(): void {
    this.prospectusFileInput?.nativeElement?.click();
  }

  onProspectusSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ campusProspectus: file });
  }

  get prospectusName(): string {
    return this.value.campusProspectus?.name ?? '';
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  isFormValid(): boolean {
    return (
      this.value.campusName.trim().length > 0 &&
      this.value.contactPersonName.trim().length > 0 &&
      this.value.contactPersonEmail.trim().length > 0 &&
      this.value.contactPersonPhone.trim().length > 0 &&
      this.value.contactPersonDesignation.trim().length > 0 &&
      this.value.campusWebsiteUrl.trim().length > 0 &&
      this.value.campusAddress.trim().length > 0 &&
      this.value.academicYear.trim().length > 0 &&
      this.value.programsOffered.trim().length > 0 &&
      this.value.proposedDate.trim().length > 0 &&
      this.value.preferredSkills.trim().length > 0 &&
      this.value.facilitiesAvailable.trim().length > 0 &&
      this.value.confirmationChecked
    );
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onButtonClick(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }
}

