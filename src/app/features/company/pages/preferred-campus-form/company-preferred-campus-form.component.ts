import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface PreferredCampusFormValue {
  photo: File | null;
  campusName: string;
}

@Component({
  selector: 'app-company-preferred-campus-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './company-preferred-campus-form.component.html',
  styleUrl: './company-preferred-campus-form.component.css',
})
export class CompanyPreferredCampusFormComponent {
  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: PreferredCampusFormValue = {
    photo: null,
    campusName: '',
  };

  @Output() valueChange = new EventEmitter<PreferredCampusFormValue>();
  @Output() submitted = new EventEmitter<PreferredCampusFormValue>();

  submitAttempted = false;

  patch(patch: Partial<PreferredCampusFormValue>): void {
    const next: PreferredCampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerPhotoSelect(): void {
    this.photoFileInput?.nativeElement?.click();
  }

  onPhotoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ photo: file });
  }

  get photoName(): string {
    return this.value.photo?.name ?? '';
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  isFormValid(): boolean {
    return this.value.photo !== null && this.value.campusName.trim().length > 0;
  }

  onFormSubmit(): void {
    this.submit();
  }

  onButtonClick(): void {
    this.submit();
  }
}

