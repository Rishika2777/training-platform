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
  timeOfVisitAmPm: 'AM' | 'PM';
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
    timeOfVisitAmPm: 'AM',
    additionalRequirements: '',
    attachments: null,
  };

  @Output() valueChange = new EventEmitter<VisitCampusFormValue>();
  @Output() submitted = new EventEmitter<VisitCampusFormValue>();

  // Default form value for reset
  private readonly defaultFormValue: VisitCampusFormValue = {
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
    timeOfVisitAmPm: 'AM',
    additionalRequirements: '',
    attachments: null,
  };

  /**
   * Reset the form to default values
   */
  resetForm(): void {
    this.value = { ...this.defaultFormValue };
    this.valueChange.emit(this.value);
    // Clear file input
    if (this.attachmentsFileInput?.nativeElement) {
      this.attachmentsFileInput.nativeElement.value = '';
    }
  }

  patch(patch: Partial<VisitCampusFormValue>): void {
    const next: VisitCampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  /**
   * Handle time input change - format to HH:MM and ensure 12-hour format
   */
  onTimeInputChange(inputValue: string): void {
    // Remove any non-digit and colon characters
    let cleaned = inputValue.replace(/[^\d:]/g, '');
    
    // If user is typing, format it as they type
    if (cleaned.length > 0) {
      // Remove extra colons
      const parts = cleaned.split(':');
      let hours = parts[0] || '';
      let minutes = parts[1] || '';
      
      // Limit hours to 2 digits (max 12 for 12-hour format)
      if (hours.length > 2) {
        hours = hours.substring(0, 2);
      }
      
      // Limit minutes to 2 digits
      if (minutes.length > 2) {
        minutes = minutes.substring(0, 2);
      }
      
      // Ensure hours is valid (1-12 for 12-hour format)
      const hoursNum = parseInt(hours, 10);
      if (hours && !isNaN(hoursNum)) {
        if (hoursNum > 12) {
          hours = '12';
        } else if (hoursNum < 1 && hours.length === 2) {
          hours = '01';
        }
      }
      
      // Ensure minutes is valid (0-59)
      const minutesNum = parseInt(minutes, 10);
      if (minutes && !isNaN(minutesNum)) {
        if (minutesNum > 59) {
          minutes = '59';
        }
      }
      
      // Format as HH:MM
      if (hours && minutes) {
        cleaned = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      } else if (hours) {
        cleaned = hours;
      }
    }
    
    this.patch({ timeOfVisit: cleaned });
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
    // Convert 12-hour format with AM/PM to 24-hour format for API
    const time24Hour = this.convertTo24Hour(this.value.timeOfVisit, this.value.timeOfVisitAmPm);
    const valueToSubmit = {
      ...this.value,
      timeOfVisit: time24Hour,
    };
    this.submitted.emit(valueToSubmit);
  }

  /**
   * Convert 12-hour time format (HH:MM AM/PM) to 24-hour format (HH:MM)
   */
  private convertTo24Hour(time12Hour: string, amPm: 'AM' | 'PM'): string {
    if (!time12Hour || !time12Hour.includes(':')) {
      return time12Hour;
    }

    const [hours, minutes] = time12Hour.split(':').map(Number);
    let hours24 = hours;

    if (amPm === 'PM' && hours !== 12) {
      hours24 = hours + 12;
    } else if (amPm === 'AM' && hours === 12) {
      hours24 = 0;
    }

    return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Convert 24-hour format to 12-hour format for display
   */
  convertTo12Hour(time24Hour: string): { time: string; amPm: 'AM' | 'PM' } {
    if (!time24Hour || !time24Hour.includes(':')) {
      return { time: time24Hour, amPm: 'AM' };
    }

    const [hours, minutes] = time24Hour.split(':').map(Number);
    let hours12 = hours;
    let amPm: 'AM' | 'PM' = 'AM';

    if (hours === 0) {
      hours12 = 12;
      amPm = 'AM';
    } else if (hours === 12) {
      hours12 = 12;
      amPm = 'PM';
    } else if (hours > 12) {
      hours12 = hours - 12;
      amPm = 'PM';
    } else {
      hours12 = hours;
      amPm = 'AM';
    }

    return {
      time: `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      amPm,
    };
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

