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

  patch(patch: Partial<CourseFormValue>): void {
    const next: CourseFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    this.submitted.emit(this.value);
  }
}

