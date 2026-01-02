import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface CourseFormValue {
  courseName: string;
  courseDuration: string;
  seatsAvailable: string;
  description: string;
}

@Component({
  selector: 'app-campus-course-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './course-form.component.html',
  styleUrl: './course-form.component.css',
})
export class CampusCourseFormComponent {
  @Input() submitting = false;
  @Input() value: CourseFormValue = {
    courseName: '',
    courseDuration: '',
    seatsAvailable: '',
    description: '',
  };

  @Output() valueChange = new EventEmitter<CourseFormValue>();
  @Output() submitted = new EventEmitter<CourseFormValue>();

  submitAttempted = false;

  patch(patch: Partial<CourseFormValue>): void {
    const next: CourseFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  isInvalid(field: keyof CourseFormValue): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const raw = this.value[field];
    return typeof raw !== 'string' || raw.trim().length === 0;
  }

  isFormValid(): boolean {
    return (
      this.value.courseName.trim().length > 0 &&
      this.value.courseDuration.trim().length > 0 &&
      this.value.seatsAvailable.trim().length > 0 &&
      this.value.description.trim().length > 0
    );
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }
}

