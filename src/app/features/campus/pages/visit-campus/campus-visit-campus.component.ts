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
  attachments: File[]; // Array of files for upload
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
    attachments: [],
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
    attachments: [],
  };

  todayDate: string = new Date().toISOString().split('T')[0];

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

    // restrict phone input to digits only & max 10
if (patch.contactPersonPhoneNo !== undefined) {
  patch.contactPersonPhoneNo = patch.contactPersonPhoneNo
    .replace(/\D/g, '')
    .slice(0, 10);
}

      // block special chars in contact name
  if (patch.contactPersonName !== undefined) {
    patch.contactPersonName = patch.contactPersonName.replace(/[^A-Za-z\s]/g, '');
  }

  // block special chars in company name
  if (patch.companyName !== undefined) {
    patch.companyName = patch.companyName.replace(/[^A-Za-z\s&.]/g, '');
  }

    const next: VisitCampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  /**
   * Handle time input change - format to HH:MM and ensure 12-hour format
   */
onTimeInputChange(inputValue: string): void {

  if (!inputValue) {
    this.patch({ timeOfVisit: '' });
    return;
  }

  // allow digits + colon only
 const  value = inputValue.replace(/[^\d:]/g, '');

  const parts = value.split(':');

  let hours = parts[0] || '';
  let minutes = parts[1] || '';

  // limit digits
  hours = hours.slice(0, 2);
  minutes = minutes.slice(0, 2);

  // validate hours (1–12)
  if (hours) {
    let h = Number(hours);
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    hours = String(h);
  }

  // validate minutes (0–59)
  if (minutes) {
    let m = Number(minutes);
    if (m > 59) m = 59;
    minutes = String(m);
  }

  // IMPORTANT: pad only AFTER user finishes typing
  if (hours.length === 1 && minutes.length === 2) {
    hours = hours.padStart(2, '0');
  }

  if (minutes.length === 1 && inputValue.endsWith(':')) {
    minutes = minutes.padStart(2, '0');
  }

  const formatted =
    hours && minutes ? `${hours}:${minutes}` :
    hours ? hours :
    '';

  this.patch({ timeOfVisit: formatted });
}

  // Block paste of special characters in phone field
onPhonePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text') || '';

  if (/[^0-9]/.test(pastedText)) {
    event.preventDefault();
    alert('Only digits allowed in phone number');
  }
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
    if (!files || files.length === 0) {
      return;
    }

    // Add all selected files to attachments array
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        // Check if file already exists (by name and size)
        const exists = this.value.attachments.some(
          f => f.name === file.name && f.size === file.size
        );
        if (!exists) {
          newFiles.push(file);
        }
      }
    }

    if (newFiles.length > 0) {
      this.patch({ attachments: [...this.value.attachments, ...newFiles] });
    }
  }

  removeAttachment(index: number): void {
    const files = [...this.value.attachments];
    files.splice(index, 1);
    this.patch({ attachments: files });
  }

  get attachmentsList(): File[] {
    return this.value.attachments || [];
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

    const phoneError = this.isValidIndianPhone(this.value.contactPersonPhoneNo);

if (phoneError) {
  alert(phoneError);
  return;
}




    //  Contact person name special characters block
if (!this.isValidPersonName(this.value.contactPersonName)) {
  alert('Contact person name should contain only alphabets');
  return;
}

//  Company name special characters block
if (!this.isValidCompanyName(this.value.companyName)) {
  alert('Company name should not contain special characters');
  return;
}

// Package validation
const pkg = Number(this.value.package);

if (!this.value.package || isNaN(pkg) || pkg <= 0) {
  alert('Package must be a positive number');
  return;
}

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


  // ================= PHONE VALIDATION =================

private isValidIndianPhone(phone: string): string | null {

  const cleaned = phone.trim();

  if (!/^\d+$/.test(cleaned)) {
    return 'Phone number must contain digits only';
  }

  if (cleaned.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }

  if (!/^[6-9]/.test(cleaned)) {
    return 'Phone number must start with 6, 7, 8, or 9';
  }

  if (/^(\d)\1{9}$/.test(cleaned)) {
    return 'Invalid phone number pattern';
  }

  if (cleaned === '1234567890' || cleaned === '9876543210') {
    return 'Invalid phone number pattern';
  }

  return null;
}
  // ================= NAME VALIDATIONS =================

// Only alphabets and spaces allowed
private isValidPersonName(name: string): boolean {
  return /^[A-Za-z\s]+$/.test(name);
}

// Alphabets + spaces + & + . allowed for company
private isValidCompanyName(name: string): boolean {
  return /^[A-Za-z\s&.]+$/.test(name);
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

