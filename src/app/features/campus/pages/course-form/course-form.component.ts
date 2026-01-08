import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface CourseFormValue {
  courseName: string;
  duration: string;
  totalSeats: string;
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
    duration: '',
    totalSeats: '',
    description: '',
  };

  @Output() valueChange = new EventEmitter<CourseFormValue>();
  @Output() submitted = new EventEmitter<CourseFormValue>();

  submitAttempted = false;

  patch(patch: Partial<CourseFormValue>): void {
    console.log('CampusCourseFormComponent: patch() called with:', patch);
    const next: CourseFormValue = { ...this.value, ...patch };
    this.value = next;
    console.log('CampusCourseFormComponent: Updated value:', this.value);
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
      this.value.duration.trim().length > 0 &&
      this.value.totalSeats.trim().length > 0 &&
      this.value.description.trim().length > 0
    );
  }

  onFormSubmit(event: Event): void {
    console.log('CampusCourseFormComponent: ========== onFormSubmit CALLED ==========');
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onButtonClick(event: MouseEvent): void {
    console.log('CampusCourseFormComponent: ========== onButtonClick CALLED ==========');
    console.log('CampusCourseFormComponent: Event:', event);
    event.preventDefault();
    event.stopPropagation();
    // Manually trigger form submit
    this.submit();
  }

  submit(): void {
    console.log('CampusCourseFormComponent: ========== submit() CALLED ==========');
    console.log('CampusCourseFormComponent: Current form value:', JSON.stringify(this.value));
    console.log('CampusCourseFormComponent: Value object:', this.value);
    console.log('CampusCourseFormComponent: isFormValid():', this.isFormValid());
    console.log('CampusCourseFormComponent: submitting flag:', this.submitting);
    console.log('CampusCourseFormComponent: submitAttempted before:', this.submitAttempted);
    
    this.submitAttempted = true;
    
    const validationDetails = {
      courseName: this.value.courseName?.trim().length > 0,
      duration: this.value.duration?.trim().length > 0,
      totalSeats: this.value.totalSeats?.trim().length > 0,
      description: this.value.description?.trim().length > 0,
    };
    
    console.log('CampusCourseFormComponent: Validation details:', validationDetails);
    
    if (this.isFormValid()) {
      console.log('CampusCourseFormComponent: ✅ Form is VALID, emitting submitted event');
      console.log('CampusCourseFormComponent: Emitting value:', this.value);
      this.submitted.emit(this.value);
      console.log('CampusCourseFormComponent: ✅ Event emitted successfully');
    } else {
      console.warn('CampusCourseFormComponent: ❌ Form is INVALID, not emitting event');
      console.warn('CampusCourseFormComponent: Field values:', {
        courseName: `"${this.value.courseName}" (length: ${this.value.courseName?.trim().length || 0})`,
        duration: `"${this.value.duration}" (length: ${this.value.duration?.trim().length || 0})`,
        totalSeats: `"${this.value.totalSeats}" (length: ${this.value.totalSeats?.trim().length || 0})`,
        description: `"${this.value.description}" (length: ${this.value.description?.trim().length || 0})`,
      });
    }
  }
}

