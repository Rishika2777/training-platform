import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface CompaniesVisitedFormValue {
  companyLogo: File | null;
  companyName: string;
}

@Component({
  selector: 'app-campus-companies-visited',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './campus-companies-visited.component.html',
  styleUrl: './campus-companies-visited.component.css',
})
export class CampusCompaniesVisitedComponent {
  @ViewChild('companyLogoFileInput') companyLogoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: CompaniesVisitedFormValue = {
    companyLogo: null,
    companyName: '',
  };

  @Output() valueChange = new EventEmitter<CompaniesVisitedFormValue>();
  @Output() submitted = new EventEmitter<CompaniesVisitedFormValue>();

  submitAttempted = false;

  /**
   * Reset form to initial empty state
   * Called when modal opens or after successful submission
   */
  resetForm(): void {
    this.value = {
      companyLogo: null,
      companyName: '',
    };
    this.submitAttempted = false;
    // Clear file input
    if (this.companyLogoFileInput?.nativeElement) {
      this.companyLogoFileInput.nativeElement.value = '';
    }
    this.valueChange.emit(this.value);
  }

  patch(patch: Partial<CompaniesVisitedFormValue>): void {
    const next: CompaniesVisitedFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerCompanyLogoSelect(): void {
    this.companyLogoFileInput?.nativeElement?.click();
  }

  onCompanyLogoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ companyLogo: file });
  }

  get companyLogoName(): string {
    return this.value.companyLogo?.name ?? '';
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  isFormValid(): boolean {
    return this.value.companyLogo !== null && this.value.companyName.trim().length > 0;
  }

  onFormSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }

  onButtonClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }
}

