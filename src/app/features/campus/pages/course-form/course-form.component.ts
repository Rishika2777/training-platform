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

  /**
   * Reset form to initial empty state
   * Called when modal opens or after successful submission
   */
  resetForm(): void {
    this.value = {
      courseName: '',
      duration: '',
      totalSeats: '',
      description: '',
    };
    this.submitAttempted = false;
    this.valueChange.emit(this.value);
  }

  patch(patch: Partial<CourseFormValue>): void {
    console.log('CampusCourseFormComponent: patch() called with:', patch);
    const next: CourseFormValue = { ...this.value, ...patch };
    this.value = next;
    console.log('CampusCourseFormComponent: Updated value:', this.value);
    this.valueChange.emit(next);
  }

  /**
   * Validate if the input contains only allowed characters
   * Allowed: Alphabets (A-Z, a-z), Numbers (0-9), Spaces, and special characters: . - &
   * Examples: "B.tech", "B-Tech", "R&D", "Computer Science 101"
   */
  isValidCourseNameOrDescription(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return false;
    }
    
    // Regex pattern: allows alphabets, numbers, spaces, and special characters: . - &
    // Pattern breakdown: 
    // - A-Za-z (alphabets)
    // - 0-9 (numbers)
    // - \s (spaces)
    // - . (dot)
    // - \- (hyphen, escaped)
    // - & (ampersand)
    // Test the trimmed value to ensure it contains only allowed characters
    const allowedPattern = /^[A-Za-z0-9\s.\-&]+$/;
    const isValid = allowedPattern.test(trimmedValue);
    return isValid;
  }

  isInvalid(field: keyof CourseFormValue): boolean {
    if (!this.submitAttempted) {
      return false;
    }
    const raw = this.value[field];
    
    // Check if field is empty
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return true;
    }
    
    // For courseName and description, validate allowed characters
    if (field === 'courseName' || field === 'description') {
      const isValid = this.isValidCourseNameOrDescription(raw);
      return !isValid;
    }
    
    return false;
  }

  isFormValid(): boolean {
    // Check all fields are not empty and pass validation
    return (
      !this.isInvalid('courseName') &&
      !this.isInvalid('duration') &&
      !this.isInvalid('totalSeats') &&
      !this.isInvalid('description')
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
    console.log('CampusCourseFormComponent: submitting flag:', this.submitting);
    console.log('CampusCourseFormComponent: submitAttempted before:', this.submitAttempted);
    
    this.submitAttempted = true;
    
    // Detailed validation logging
    const courseNameValid = this.isValidCourseNameOrDescription(this.value.courseName);
    const descriptionValid = this.isValidCourseNameOrDescription(this.value.description);
    
    console.log('CampusCourseFormComponent: Validation check:', {
      courseName: {
        value: `"${this.value.courseName}"`,
        trimmed: `"${this.value.courseName?.trim()}"`,
        isValid: courseNameValid,
        isInvalid: this.isInvalid('courseName')
      },
      description: {
        value: `"${this.value.description}"`,
        trimmed: `"${this.value.description?.trim()}"`,
        isValid: descriptionValid,
        isInvalid: this.isInvalid('description')
      },
      duration: { isInvalid: this.isInvalid('duration') },
      totalSeats: { isInvalid: this.isInvalid('totalSeats') }
    });
    
    const formValid = this.isFormValid();
    console.log('CampusCourseFormComponent: isFormValid():', formValid);
    
    if (formValid) {
      console.log('CampusCourseFormComponent: ✅ Form is VALID, emitting submitted event');
      console.log('CampusCourseFormComponent: Emitting value:', this.value);
      this.submitted.emit(this.value);
      console.log('CampusCourseFormComponent: ✅ Event emitted successfully');
    } else {
      console.warn('CampusCourseFormComponent: ❌ Form is INVALID, not emitting event');
      console.warn('CampusCourseFormComponent: Invalid fields:', {
        courseName: this.isInvalid('courseName'),
        duration: this.isInvalid('duration'),
        totalSeats: this.isInvalid('totalSeats'),
        description: this.isInvalid('description')
      });
    }
  }
}

