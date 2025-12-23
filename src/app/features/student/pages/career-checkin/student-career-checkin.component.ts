import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface CareerCheckinFormValue {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  recnHelped: boolean;
}

@Component({
  selector: 'app-student-career-checkin',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent],
  templateUrl: './student-career-checkin.component.html',
  styleUrl: './student-career-checkin.component.css',
})
export class StudentCareerCheckinComponent {
  @Input() submitting = false;
  @Input() value: CareerCheckinFormValue = {
    companyName: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    recnHelped: false,
  };

  @Output() valueChange = new EventEmitter<CareerCheckinFormValue>();
  @Output() submitted = new EventEmitter<CareerCheckinFormValue>();

  readonly jobTitleItems = [
    { label: 'Software Engineer', value: 'software-engineer' },
    { label: 'Product Manager', value: 'product-manager' },
    { label: 'Data Analyst', value: 'data-analyst' },
    { label: 'UI/UX Designer', value: 'ui-ux-designer' },
    { label: 'Business Analyst', value: 'business-analyst' },
  ] as const;

  patch(patch: Partial<CareerCheckinFormValue>): void {
    const next: CareerCheckinFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  toggleCurrentlyWorking(): void {
    this.patch({ currentlyWorking: !this.value.currentlyWorking });
  }

  toggleRecnHelped(): void {
    this.patch({ recnHelped: !this.value.recnHelped });
  }

  submit(): void {
    this.submitted.emit(this.value);
  }
}

