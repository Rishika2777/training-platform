import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { map } from 'rxjs/operators';
import { CompanyApiService } from '../../services/company-api.service';


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

  // CHANGE: backend expects array
  programsOffered: string | string[];

  proposedDate: string;

  // CHANGE: backend expects array
  preferredSkills: string | string[];

  facilitiesAvailable: string;

  // Confirmation
  confirmationChecked: boolean;
}

interface CampusSearchResponse {
  data?: {
    content?: { campusName: string; id: string }[];
  };
}

@Component({
  selector: 'app-company-invitation-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent, TextareaComponent],
  templateUrl: './company-invitation-form.component.html',
  styleUrl: './company-invitation-form.component.css',
})
export class CompanyInvitationFormComponent {

  fetchLastLabel = ''; 
private readonly companyApi = inject(CompanyApiService);

fetchCampuses = (term: string) => {
  return this.companyApi.getCampusesBySearch(term).pipe(
    map((res: CampusSearchResponse) =>
      (res.data?.content ?? []).map((c) => {
        this.fetchLastLabel = c.campusName;
        return {
          label: c.campusName,
          value: c.id,
        };
      })
    )
  );
};


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
  programsOffered: '',   // still works with dropdown
  proposedDate: '',
  preferredSkills: '',   // still works with dropdown
  facilitiesAvailable: '',

  confirmationChecked: false,
};

  @Input() campusOptions: DropdownItem[] = [];
  @Input() selectedCampusId: string | null = null;
  @Output() campusChange = new EventEmitter<string>();

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
  { label: 'B.Tech Computer Science', value: 'B.Tech Computer Science' },
  { label: 'B.Tech Information Technology', value: 'B.Tech Information Technology' },
  { label: 'MCA', value: 'MCA' },
];

readonly preferredSkillsOptions: DropdownItem[] = [
  { label: 'Java', value: 'Java' },
  { label: 'Angular', value: 'Angular' },
  { label: 'Spring Boot', value: 'Spring Boot' },
  { label: 'SQL', value: 'SQL' },
];

isArray(value: unknown): value is string[] {
  return Array.isArray(value);
}

firstOrSelf(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? '' : value;
}

hasValue(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : !!value;
}

onCampusPicked(id: string): void {
  this.campusChange.emit(id);

  const name = this.fetchLastLabel || '';

  this.patch({
    campusName: name
  });
}



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
  const hasPrograms =
    Array.isArray(this.value.programsOffered)
      ? this.value.programsOffered.length > 0
      : this.value.programsOffered.trim().length > 0;

  const hasSkills =
    Array.isArray(this.value.preferredSkills)
      ? this.value.preferredSkills.length > 0
      : this.value.preferredSkills.trim().length > 0;

  return (
    this.value.campusName.trim().length > 0 &&
    this.value.contactPersonName.trim().length > 0 &&
    this.value.contactPersonEmail.trim().length > 0 &&
    this.value.contactPersonPhone.trim().length > 0 &&
    this.value.contactPersonDesignation.trim().length > 0 &&
    this.value.campusWebsiteUrl.trim().length > 0 &&
    this.value.campusAddress.trim().length > 0 &&
    this.value.academicYear.trim().length > 0 &&
    hasPrograms &&
    this.value.proposedDate.trim().length > 0 &&
    hasSkills &&
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

