import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';

export interface VisitCampusFormValue {
  companyName: string;
  contactPersonName: string;
  contactPersonPhoneNo: string;
  contactPersonEmail: string;
  recruitmentType: {
    internship: boolean;
    fullTime: boolean;
    both: boolean;
  };
  numberOfPositions: string;
  package: string;
  dateOfVisit: string;
  timeOfVisit: string;
  additionalRequirements: string;
  attachments: File | null;
}

@Component({
  selector: 'app-campus-visit-campus',
  standalone: true,
  imports: [CommonModule, InputComponent, TextareaComponent],
  templateUrl: './campus-visit-campus.component.html',
  styleUrl: './campus-visit-campus.component.css',
})
export class CampusVisitCampusComponent {
  @ViewChild('attachmentsFileInput') attachmentsFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: VisitCampusFormValue = {
    companyName: '',
    contactPersonName: '',
    contactPersonPhoneNo: '',
    contactPersonEmail: '',
    recruitmentType: {
      internship: false,
      fullTime: false,
      both: false,
    },
    numberOfPositions: '',
    package: '',
    dateOfVisit: '',
    timeOfVisit: '',
    additionalRequirements: '',
    attachments: null,
  };

  @Output() valueChange = new EventEmitter<VisitCampusFormValue>();
  @Output() submitted = new EventEmitter<VisitCampusFormValue>();

  patch(patch: Partial<VisitCampusFormValue>): void {
    const next: VisitCampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  patchRecruitmentType(type: 'internship' | 'fullTime' | 'both', checked: boolean): void {
    const recruitmentType = { ...this.value.recruitmentType };
    recruitmentType[type] = checked;
    this.patch({ recruitmentType });
  }

  triggerAttachmentsSelect(): void {
    this.attachmentsFileInput?.nativeElement?.click();
  }

  onAttachmentsSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ attachments: file });
  }

  get attachmentsName(): string {
    return this.value.attachments?.name ?? '';
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onButtonClickDirect(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  submit(): void {
    this.submitted.emit(this.value);
  }

  private isFormValid(): boolean {
    return (
      this.value.companyName.trim().length > 0 &&
      this.value.contactPersonName.trim().length > 0 &&
      this.value.contactPersonPhoneNo.trim().length > 0 &&
      this.value.contactPersonEmail.trim().length > 0 &&
      (this.value.recruitmentType.internship || this.value.recruitmentType.fullTime || this.value.recruitmentType.both) &&
      this.value.dateOfVisit.trim().length > 0 &&
      this.value.timeOfVisit.trim().length > 0
    );
  }
}

